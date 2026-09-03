<?php

namespace Database\Factories;

use App\Models\Patient;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Patient>
 */
class PatientFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $sequence = fake()->unique()->numberBetween(1, 999999);

        return [
            'tenant_id' => Tenant::factory(),
            'medical_record_sequence' => $sequence,
            'medical_record_number' => 'RM'.str_pad((string) $sequence, 6, '0', STR_PAD_LEFT),
            'national_id_number' => fake()->optional()->numerify('################'),
            'satusehat_patient_id' => null,
            'name' => fake()->name(),
            'birth_date' => fake()->dateTimeBetween('-80 years', '-1 year')->format('Y-m-d'),
            'gender' => fake()->randomElement(['male', 'female']),
            'phone' => fake()->optional()->numerify('08##########'),
            'email' => fake()->optional()->safeEmail(),
            'address' => fake()->optional()->address(),
            'province_code' => null,
            'city_code' => null,
            'district_code' => null,
            'village_code' => null,
            'blood_type' => fake()->optional()->randomElement(['A', 'B', 'AB', 'O']),
            'occupation' => fake()->optional()->jobTitle(),
            'emergency_contact_name' => fake()->optional()->name(),
            'emergency_contact_phone' => fake()->optional()->numerify('08##########'),
            'created_by' => User::factory(),
        ];
    }
}
