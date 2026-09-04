<?php

namespace Database\Factories;

use App\EncounterStatus;
use App\Models\Clinic;
use App\Models\Encounter;
use App\Models\Patient;
use App\Models\Practitioner;
use App\Models\ServiceUnit;
use App\Models\StaffProfile;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Encounter>
 */
class EncounterFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $clinic = Clinic::factory()->create();
        $patient = Patient::factory()->create(['tenant_id' => $clinic->tenant_id]);
        $serviceUnit = ServiceUnit::factory()->create([
            'tenant_id' => $clinic->tenant_id,
            'clinic_id' => $clinic->id,
        ]);
        $staffProfile = StaffProfile::factory()->create([
            'tenant_id' => $clinic->tenant_id,
            'clinic_id' => $clinic->id,
        ]);
        $practitioner = Practitioner::factory()->create([
            'tenant_id' => $clinic->tenant_id,
            'clinic_id' => $clinic->id,
            'staff_profile_id' => $staffProfile->id,
        ]);
        $sequence = fake()->unique()->numberBetween(1, 9999);

        return [
            'tenant_id' => $clinic->tenant_id,
            'clinic_id' => $clinic->id,
            'patient_id' => $patient->id,
            'service_unit_id' => $serviceUnit->id,
            'practitioner_id' => $practitioner->id,
            'encounter_date' => now()->toDateString(),
            'registration_sequence' => $sequence,
            'registration_number' => 'REG-'.now()->format('Ymd').'-'.str_pad((string) $sequence, 4, '0', STR_PAD_LEFT),
            'registration_type' => 'walk_in',
            'chief_complaint' => fake()->sentence(),
            'status' => EncounterStatus::WaitingTriage,
            'registered_at' => now(),
            'registered_by' => User::factory(),
        ];
    }
}
