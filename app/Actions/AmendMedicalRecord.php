<?php

namespace App\Actions;

use App\MedicalRecordStatus;
use App\Models\MedicalRecord;
use App\Models\MedicalRecordAmendment;
use App\Support\Tenancy\CurrentClinic;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class AmendMedicalRecord
{
    public function __construct(private readonly CurrentClinic $currentClinic) {}

    /** @param array{reason: string, content: string} $attributes */
    public function execute(MedicalRecord $medicalRecord, array $attributes, int $userId): MedicalRecordAmendment
    {
        return DB::transaction(function () use ($medicalRecord, $attributes, $userId): MedicalRecordAmendment {
            $lockedRecord = MedicalRecord::query()
                ->whereKey($medicalRecord->id)
                ->where('clinic_id', $this->currentClinic->id())
                ->lockForUpdate()
                ->firstOrFail();

            if (! in_array($lockedRecord->status, [MedicalRecordStatus::Final, MedicalRecordStatus::Amended], true)) {
                throw ValidationException::withMessages([
                    'reason' => 'Koreksi hanya dapat ditambahkan pada rekam medis yang sudah final.',
                ]);
            }

            $amendment = new MedicalRecordAmendment([
                ...$attributes,
                'medical_record_id' => $lockedRecord->id,
                'created_by' => $userId,
            ]);
            $amendment->forceFill(['clinic_id' => $lockedRecord->clinic_id]);
            $amendment->save();

            $lockedRecord->update(['status' => MedicalRecordStatus::Amended]);
            $audit = $lockedRecord->audits()->make([
                'encounter_id' => $lockedRecord->encounter_id,
                'action' => 'amended',
                'before_values' => null,
                'after_values' => [
                    'amendment_uuid' => $amendment->uuid,
                    'reason' => $amendment->reason,
                ],
                'actor_id' => $userId,
            ]);
            $audit->forceFill(['clinic_id' => $lockedRecord->clinic_id]);
            $audit->save();

            return $amendment;
        }, attempts: 3);
    }
}
