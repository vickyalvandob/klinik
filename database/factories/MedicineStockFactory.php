<?php

namespace Database\Factories;

use App\Models\Medicine;
use App\Models\MedicineStock;
use App\Models\Scopes\TenantScope;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<MedicineStock>
 */
class MedicineStockFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $medicine = Medicine::factory()->create();

        return [
            'medicine_id' => $medicine->id,
            'clinic_id' => $medicine->clinic_id,
            'tenant_id' => (int) Medicine::withoutGlobalScope(TenantScope::class)
                ->whereKey($medicine->id)->value('tenant_id'),
            'quantity' => fake()->randomFloat(2, 0, 500),
            'last_movement_at' => now(),
        ];
    }
}
