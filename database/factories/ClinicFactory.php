<?php

namespace Database\Factories;

use App\Models\Clinic;
use App\Models\Tenant;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Clinic>
 */
class ClinicFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'tenant_id' => Tenant::factory(),
            'name' => 'Klinik '.fake()->unique()->company(),
            'legal_name' => fake()->company(),
            'facility_type' => 'clinic',
            'facility_identifier' => fake()->optional()->numerify('KLINIK-######'),
            'address' => fake()->address(),
            'province_code' => null,
            'city_code' => null,
            'district_code' => null,
            'village_code' => null,
            'phone' => fake()->phoneNumber(),
            'email' => fake()->unique()->companyEmail(),
            'timezone' => 'Asia/Jakarta',
            'logo_path' => null,
            'satusehat_organization_id' => null,
            'is_active' => true,
            'onboarding_step' => 6,
            'onboarding_completed_at' => now(),
        ];
    }

    public function inactive(): static
    {
        return $this->state(fn (): array => [
            'is_active' => false,
        ]);
    }

    public function onboarding(): static
    {
        return $this->state(fn (): array => [
            'onboarding_step' => 1,
            'onboarding_completed_at' => null,
        ]);
    }
}
