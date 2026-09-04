<?php

namespace Database\Factories;

use App\MedicalRecordStatus;
use App\Models\Encounter;
use App\Models\MedicalRecord;
use App\Models\Prescription;
use App\PrescriptionStatus;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Prescription>
 */
class PrescriptionFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $encounter = Encounter::factory()->create();
        $medicalRecord = MedicalRecord::factory()->create([
            'tenant_id' => $encounter->tenant_id,
            'clinic_id' => $encounter->clinic_id,
            'encounter_id' => $encounter->id,
            'patient_id' => $encounter->patient_id,
            'practitioner_id' => $encounter->practitioner_id,
            'subjective' => fake()->sentence(),
            'assessment' => fake()->sentence(),
            'plan' => fake()->sentence(),
            'status' => MedicalRecordStatus::Final,
            'finalized_at' => now(),
            'created_by' => $encounter->registered_by,
            'updated_by' => $encounter->registered_by,
        ]);

        return [
            'tenant_id' => $encounter->tenant_id,
            'clinic_id' => $encounter->clinic_id,
            'encounter_id' => $encounter->id,
            'medical_record_id' => $medicalRecord->id,
            'patient_id' => $encounter->patient_id,
            'practitioner_id' => $encounter->practitioner_id,
            'status' => PrescriptionStatus::Prescribed,
            'prescribed_at' => now(),
            'notes' => fake()->optional()->sentence(),
            'created_by' => $encounter->registered_by,
        ];
    }
}
