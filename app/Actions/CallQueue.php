<?php

namespace App\Actions;

use App\EncounterStatus;
use App\Models\Encounter;
use App\Models\QueueCall;
use App\Models\QueueEntry;
use App\Models\ServiceUnit;
use App\QueueStatus;
use App\Support\Tenancy\CurrentClinic;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\ValidationException;

class CallQueue
{
    public function __construct(private readonly CurrentClinic $currentClinic) {}

    /** @param array{service_unit_id: string, stage: string, queue_id?: ?string, intent: string, request_key: string} $data */
    public function execute(array $data, int $actorId): QueueCall
    {
        return DB::transaction(function () use ($data, $actorId): QueueCall {
            $clinic = $this->currentClinic->get();
            $unit = ServiceUnit::query()->where('clinic_id', $clinic->id)
                ->where('uuid', $data['service_unit_id'])->where('is_active', true)
                ->lockForUpdate()->firstOrFail();

            $existing = QueueCall::query()->where('clinic_id', $clinic->id)
                ->where('request_key', $data['request_key'])->first();
            if ($existing !== null) {
                return $existing;
            }

            $today = now($clinic->timezone)->startOfDay();
            $stage = $data['stage'] === 'triage' ? EncounterStatus::WaitingTriage : EncounterStatus::WaitingDoctor;
            $queueId = $data['queue_id'] ?? null;
            $candidate = QueueEntry::query()->where('clinic_id', $clinic->id)
                ->where('service_unit_id', $unit->id)
                ->where('queue_date', '>=', $today->toDateString())
                ->where('queue_date', '<', $today->copy()->addDay()->toDateString())
                ->when($queueId !== null, fn (Builder $query) => $query->where('uuid', $queueId))
                ->when($queueId === null, fn (Builder $query) => $query
                    ->where('status', QueueStatus::Waiting)
                    ->whereHas('encounter', fn (Builder $query) => $query->where('status', $stage)))
                ->orderBy('queue_sequence')->orderBy('id')->first();

            if ($candidate === null) {
                if ($queueId !== null) {
                    abort(404);
                }
                throw ValidationException::withMessages(['queue' => 'Tidak ada antrean yang menunggu pada tahap ini.']);
            }

            $encounter = Encounter::query()->where('clinic_id', $clinic->id)
                ->whereKey($candidate->encounter_id)->lockForUpdate()->firstOrFail();
            Gate::authorize('update', $encounter);
            $queue = QueueEntry::query()->whereKey($candidate->id)->lockForUpdate()->firstOrFail();
            $requiredStatus = $data['intent'] === 'recall' ? QueueStatus::Called : QueueStatus::Waiting;
            if ($encounter->status !== $stage || $queue->status !== $requiredStatus) {
                throw ValidationException::withMessages(['queue' => 'Antrean sudah berubah. Perbarui daftar sebelum memanggil kembali.']);
            }
            if ($queue->called_at?->gt(now()->subSeconds(5))) {
                throw ValidationException::withMessages(['queue' => 'Tunggu 5 detik sebelum memanggil ulang nomor yang sama.']);
            }

            $queue->update(['status' => QueueStatus::Called, 'called_at' => now()]);
            $call = new QueueCall([
                'queue_entry_id' => $queue->id,
                'service_unit_id' => $unit->id,
                'actor_id' => $actorId,
                'queue_date' => $today->toDateString(),
                'queue_number' => $queue->queue_number,
                'destination' => ($data['stage'] === 'triage' ? 'Pemeriksaan Awal · ' : '').$unit->name,
                'stage' => $data['stage'],
                'request_key' => $data['request_key'],
            ]);
            $call->clinic_id = $clinic->id;
            $call->save();

            return $call;
        }, attempts: 3);
    }
}
