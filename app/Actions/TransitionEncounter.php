<?php

namespace App\Actions;

use App\EncounterStatus;
use App\Models\Encounter;
use App\Models\QueueEntry;
use App\QueueStatus;
use App\Support\Tenancy\CurrentClinic;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class TransitionEncounter
{
    public function __construct(private readonly CurrentClinic $currentClinic) {}

    public function execute(
        Encounter $encounter,
        EncounterStatus $toStatus,
        int $userId,
        ?string $reason = null,
    ): Encounter {
        return DB::transaction(function () use ($encounter, $toStatus, $userId, $reason): Encounter {
            $lockedEncounter = Encounter::query()
                ->whereKey($encounter->id)
                ->where('clinic_id', $this->currentClinic->id())
                ->lockForUpdate()
                ->firstOrFail();
            $fromStatus = $lockedEncounter->status;

            if (! $lockedEncounter->canTransitionTo($toStatus)) {
                throw ValidationException::withMessages([
                    'status' => "Status {$fromStatus->label()} tidak dapat diubah menjadi {$toStatus->label()}.",
                ]);
            }

            $changes = ['status' => $toStatus];

            if ($toStatus === EncounterStatus::Cancelled) {
                $changes = [
                    ...$changes,
                    'cancelled_at' => now(),
                    'cancelled_by' => $userId,
                    'cancellation_reason' => $reason,
                ];
            }

            if ($toStatus === EncounterStatus::InConsultation) {
                $changes['started_at'] = $lockedEncounter->started_at ?? now();
            }

            if (in_array($toStatus, [
                EncounterStatus::WaitingPharmacy,
                EncounterStatus::WaitingPayment,
                EncounterStatus::Completed,
            ], true)) {
                $changes['clinical_finished_at'] = $lockedEncounter->clinical_finished_at ?? now();
            }

            if ($toStatus === EncounterStatus::Completed) {
                $changes['completed_at'] = $lockedEncounter->completed_at ?? now();
            }

            $lockedEncounter->update($changes);
            $this->synchronizeQueue($lockedEncounter, $toStatus);

            $history = $lockedEncounter->statusHistories()->make([
                'from_status' => $fromStatus,
                'to_status' => $toStatus,
                'reason' => $reason,
                'changed_by' => $userId,
            ]);
            $history->clinic_id = $lockedEncounter->clinic_id;
            $history->save();

            return $lockedEncounter;
        }, attempts: 3);
    }

    private function synchronizeQueue(Encounter $encounter, EncounterStatus $status): void
    {
        $queueEntry = QueueEntry::query()
            ->where('encounter_id', $encounter->id)
            ->where('clinic_id', $this->currentClinic->id())
            ->lockForUpdate()
            ->first();

        if ($queueEntry === null) {
            return;
        }

        match ($status) {
            EncounterStatus::Cancelled => $queueEntry->update([
                'status' => QueueStatus::Cancelled,
                'cancelled_at' => now(),
            ]),
            EncounterStatus::InConsultation => $queueEntry->update([
                'status' => QueueStatus::InService,
                'service_started_at' => now(),
            ]),
            EncounterStatus::WaitingPharmacy,
            EncounterStatus::WaitingPayment,
            EncounterStatus::Completed => $queueEntry->update([
                'status' => QueueStatus::Completed,
                'completed_at' => now(),
            ]),
            default => null,
        };
    }
}
