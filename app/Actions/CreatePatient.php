<?php

namespace App\Actions;

use App\Models\Patient;
use App\Services\PatientMedicalRecordNumberGenerator;
use Illuminate\Support\Facades\DB;

class CreatePatient
{
    public function __construct(
        private readonly PatientMedicalRecordNumberGenerator $numberGenerator,
    ) {}

    /**
     * @param  array<string, mixed>  $attributes
     * @param  list<array<string, mixed>>  $allergies
     */
    public function execute(array $attributes, array $allergies, int $userId): Patient
    {
        return DB::transaction(function () use ($attributes, $allergies, $userId): Patient {
            $medicalRecord = $this->numberGenerator->generate();
            $patient = Patient::query()->create([
                ...$attributes,
                'medical_record_sequence' => $medicalRecord['sequence'],
                'medical_record_number' => $medicalRecord['number'],
                'created_by' => $userId,
            ]);

            foreach ($allergies as $allergy) {
                $patient->allergies()->create([
                    ...$allergy,
                    'noted_by' => $userId,
                    'noted_at' => now(),
                ]);
            }

            return $patient;
        });
    }
}
