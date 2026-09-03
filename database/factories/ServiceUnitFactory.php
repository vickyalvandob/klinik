<?php

namespace Database\Factories;

use App\Models\Clinic;
use App\Models\Scopes\TenantScope;
use App\Models\ServiceUnit;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ServiceUnit>
 */
class ServiceUnitFactory extends Factory
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
            'code' => fake()->unique()->regexify('[A-Z]{3}[0-9]{2}'),
            'name' => 'Unit '.fake()->unique()->company(),
            'type' => 'outpatient',
            'queue_prefix' => fake()->unique()->regexify('[A-Z]{1,2}'),
            'description' => fake()->sentence(),
            'is_active' => true,
        ];
    }
}
