<?php

namespace Database\Factories;

use App\Models\ClinicService;
use App\Models\Scopes\TenantScope;
use App\Models\ServiceUnit;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ClinicService>
 */
class ClinicServiceFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'service_unit_id' => ServiceUnit::factory(),
            'clinic_id' => fn (array $attributes): int => (int) ServiceUnit::withoutGlobalScope(TenantScope::class)->whereKey($attributes['service_unit_id'])->value('clinic_id'),
            'tenant_id' => fn (array $attributes): int => (int) ServiceUnit::withoutGlobalScope(TenantScope::class)->whereKey($attributes['service_unit_id'])->value('tenant_id'),
            'code' => fake()->unique()->regexify('LYN-[A-Z]{4}[0-9]{2}'),
            'name' => fake()->unique()->words(3, true),
            'description' => fake()->sentence(),
            'price' => fake()->numberBetween(5, 300) * 1000,
            'duration_minutes' => 15,
            'is_active' => true,
        ];
    }
}
