<?php

namespace Database\Factories;

use App\Models\Patient;
use App\Models\PatientAllergy;
use App\Models\Scopes\TenantScope;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<PatientAllergy>
 */
class PatientAllergyFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'patient_id' => Patient::factory(),
            'tenant_id' => fn (array $attributes): int => (int) Patient::withoutGlobalScope(TenantScope::class)
                ->whereKey($attributes['patient_id'])
                ->value('tenant_id'),
            'substance' => fake()->randomElement(['Penisilin', 'Udang', 'Ibuprofen', 'Debu']),
            'code_system' => null,
            'code' => null,
            'reaction' => fake()->optional()->randomElement(['Ruam', 'Sesak napas', 'Gatal']),
            'severity' => fake()->randomElement(['mild', 'moderate', 'severe']),
            'status' => 'active',
            'noted_by' => User::factory(),
            'noted_at' => now(),
        ];
    }
}
