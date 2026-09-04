<?php

namespace Database\Factories;

use App\Models\Encounter;
use App\Models\Triage;
use App\Models\User;
use App\TriageStatus;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Triage>
 */
class TriageFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $encounter = Encounter::factory()->create();

        return [
            'tenant_id' => $encounter->tenant_id,
            'clinic_id' => $encounter->clinic_id,
            'encounter_id' => $encounter->id,
            'practitioner_id' => null,
            'chief_complaint' => $encounter->chief_complaint,
            'systolic_bp' => 120,
            'diastolic_bp' => 80,
            'heart_rate' => 80,
            'respiratory_rate' => 18,
            'temperature' => 36.8,
            'spo2' => 98,
            'weight' => 60,
            'height' => 165,
            'pain_scale' => 2,
            'notes' => null,
            'status' => TriageStatus::Draft,
            'completed_at' => null,
            'created_by' => User::factory(),
            'updated_by' => User::factory(),
        ];
    }
}
