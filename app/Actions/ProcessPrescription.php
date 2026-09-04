<?php

namespace App\Actions;

use App\Models\Prescription;
use App\PrescriptionStatus;
use App\Support\Tenancy\CurrentClinic;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ProcessPrescription
{
    public function __construct(private readonly CurrentClinic $currentClinic) {}

    public function execute(Prescription $prescription, int $userId): Prescription
    {
        return DB::transaction(function () use ($prescription, $userId): Prescription {
            $lockedPrescription = Prescription::query()
                ->whereKey($prescription->id)
                ->where('clinic_id', $this->currentClinic->id())
                ->lockForUpdate()
                ->firstOrFail();

            if ($lockedPrescription->status !== PrescriptionStatus::Prescribed) {
                throw ValidationException::withMessages([
                    'status' => 'Hanya resep baru yang dapat mulai disiapkan.',
                ]);
            }

            $before = $this->snapshot($lockedPrescription);
            $lockedPrescription->update([
                'status' => PrescriptionStatus::Processing,
                'processing_started_at' => now(),
                'processing_started_by' => $userId,
            ]);
            $this->audit($lockedPrescription, 'processing_started', $before, $userId);

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
