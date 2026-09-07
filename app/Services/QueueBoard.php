<?php

namespace App\Services;

use App\EncounterStatus;
use App\Models\Clinic;
use App\Models\QueueCall;
use App\Models\QueueEntry;
use App\Models\Scopes\TenantScope;
use App\Models\ServiceUnit;
use App\QueueStatus;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\Relation;

class QueueBoard
{
    /** @return array<string, mixed> */
    public function snapshot(Clinic $clinic): array
    {
        $today = now($clinic->timezone)->startOfDay();
        $date = $today->toDateString();
        $tomorrow = $today->copy()->addDay()->toDateString();

        $waiting = function (Builder|Relation $query) use ($clinic, $date, $tomorrow): void {
            $query->withoutGlobalScope(TenantScope::class)
                ->where('queue_entries.tenant_id', $clinic->tenant_id)->where('queue_entries.clinic_id', $clinic->id)
                ->where('queue_date', '>=', $date)->where('queue_date', '<', $tomorrow)
                ->where('status', QueueStatus::Waiting)
                ->whereHas('encounter', fn (Builder $encounters) => $encounters
                    ->withoutGlobalScope(TenantScope::class)
                    ->where('tenant_id', $clinic->tenant_id)->where('clinic_id', $clinic->id)
                    ->whereIn('status', [EncounterStatus::WaitingTriage, EncounterStatus::WaitingDoctor]));
        };

        $units = ServiceUnit::query()->withoutGlobalScope(TenantScope::class)
            ->where('tenant_id', $clinic->tenant_id)->where('clinic_id', $clinic->id)
            ->where('is_active', true)->where('type', 'outpatient')
            ->select(['id', 'name', 'uuid'])
            ->withCount(['queueEntries as waiting_count' => $waiting])
            ->with(['queueEntries' => function (Relation $query) use ($waiting): void {
                $waiting($query);
                $query->select(['id', 'service_unit_id', 'queue_number'])
                    ->orderBy('queue_sequence')->orderBy('id')->limit(5);
            }])->orderBy('name')->orderBy('id')->get();

        $calls = QueueCall::query()->withoutGlobalScope(TenantScope::class)
            ->where('tenant_id', $clinic->tenant_id)->where('clinic_id', $clinic->id)
            ->where('queue_date', '>=', $date)->where('queue_date', '<', $tomorrow)
            ->latest('id')->limit(30)->get()
            ->reverse()->values()->map(fn (QueueCall $call): array => [
                'id' => $call->id,
                'number' => $call->queue_number,
                'destination' => $call->destination,
                'called_at' => $call->created_at->toIso8601String(),
            ]);

        return [
            'clinic_name' => $clinic->name,
            'timezone' => $clinic->timezone,
            'date' => $date,
            'updated_at' => now()->toIso8601String(),
            'calls' => $calls,
            'units' => $units->map(fn (ServiceUnit $unit): array => [
                'uuid' => $unit->uuid,
                'name' => $unit->name,
                'waiting_count' => (int) $unit->getAttribute('waiting_count'),
                'next' => $unit->queueEntries->map(fn (QueueEntry $queue): string => $queue->queue_number),
            ]),
        ];
    }
}
