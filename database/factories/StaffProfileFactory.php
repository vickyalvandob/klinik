<?php

namespace Database\Factories;

use App\Models\Clinic;
use App\Models\Scopes\TenantScope;
use App\Models\StaffProfile;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<StaffProfile>
 */
class StaffProfileFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'clinic_id' => Clinic::factory(),
            'tenant_id' => fn (array $attributes): int => (int) Clinic::withoutGlobalScope(TenantScope::class)->whereKey($attributes['clinic_id'])->value('tenant_id'),
            'employee_number' => fake()->unique()->numerify('STF-####'),
            'name' => fake()->name(),
            'email' => fake()->unique()->safeEmail(),
            'phone' => fake()->phoneNumber(),
            'position' => fake()->jobTitle(),
            'employment_type' => 'permanent',
            'joined_on' => fake()->dateTimeBetween('-5 years', 'now'),
            'is_active' => true,
        ];
    }
}
