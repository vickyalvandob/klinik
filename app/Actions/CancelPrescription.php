<?php

namespace App\Actions;

use App\EncounterStatus;
use App\Models\ClinicWorkflowSetting;
use App\Models\Prescription;
use App\PrescriptionStatus;
use App\Support\Tenancy\CurrentClinic;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CancelPrescription
{
    public function __construct(
        private readonly CurrentClinic $currentClinic,
        private readonly TransitionEncounter $transitionEncounter,
    ) {}

    public function execute(Prescription $prescription, string $reason, int $userId): Prescription
    {
        return DB::transaction(function () use ($prescription, $reason, $userId): Prescription {
            $lockedPrescription = Prescription::query()
                ->whereKey($prescription->id)
                ->where('clinic_id', $this->currentClinic->id())
                ->lockForUpdate()
                ->firstOrFail();

            if (! in_array($lockedPrescription->status, [
                PrescriptionStatus::Prescribed,
                PrescriptionStatus::Processing,
            ], true)) {
                throw ValidationException::withMessages([
                    'status' => 'Resep yang sudah selesai atau dibatalkan tidak dapat dibatalkan kembali.',
                ]);
            }

            $before = $this->snapshot($lockedPrescription);
            $lockedPrescription->update([
                'status' => PrescriptionStatus::Cancelled,
                'cancelled_at' => now(),
                'cancelled_by' => $userId,
                'cancellation_reason' => $reason,
            ]);
            $this->audit($lockedPrescription, 'cancelled', $before, $userId);

            $settings = ClinicWorkflowSetting::query()
                ->where('clinic_id', $this->currentClinic->id())
                ->firstOrNew();
            $billingEnabled = $settings->exists ? $settings->billing_enabled : true;
            $this->transitionEncounter->execute(
                $lockedPrescription->encounter,
                $billingEnabled ? EncounterStatus::WaitingPayment : EncounterStatus::Completed,
                $userId,
                'Resep dibatalkan: '.$reason,
            );

            return $lockedPrescription;
        }, attempts: 3);
    }

    /** @return array<string, mixed> */
    private function snapshot(Prescription $prescription): array
    {
        return $prescription->only([
            'status', 'processing_started_at', 'processing_started_by',
            'dispensed_at', 'dispensed_by', 'cancelled_at', 'cancelled_by',
            'cancellation_reason',
        ]);
    }

    /** @param array<string, mixed> $before */
    private function audit(Prescription $prescription, string $action, array $before, int $userId): void
    {
        $audit = $prescription->audits()->make([
            'action' => $action,
            'before_values' => $before,
            'after_values' => $this->snapshot($prescription),
            'actor_id' => $userId,
        ]);
        $audit->forceFill(['clinic_id' => $prescription->clinic_id]);
        $audit->save();
    }
}
