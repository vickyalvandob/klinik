<?php

namespace Database\Factories;

use App\Models\Clinic;
use App\Models\Medicine;
use App\Models\Scopes\TenantScope;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Medicine>
 */
class MedicineFactory extends Factory
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
            'code' => fake()->unique()->numerify('OBT-####'),
            'name' => fake()->unique()->word(),
            'generic_name' => fake()->word(),
            'category' => 'Obat bebas',
            'dosage_form' => 'Tablet',
            'strength' => '500 mg',
            'unit' => 'tablet',
            'purchase_price' => 500,
            'selling_price' => 1000,
            'minimum_stock' => 20,
            'is_active' => true,
        ];
    }
}
