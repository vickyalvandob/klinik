<?php

namespace Database\Factories;

use App\Models\Medicine;
use App\Models\Scopes\TenantScope;
use App\Models\StockMovement;
use App\Models\User;
use App\StockMovementType;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<StockMovement>
 */
class StockMovementFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $medicine = Medicine::factory()->create();
        $before = fake()->randomFloat(2, 10, 500);
        $change = fake()->randomFloat(2, 1, 20);

        return [
            'medicine_id' => $medicine->id,
            'clinic_id' => $medicine->clinic_id,
            'tenant_id' => (int) Medicine::withoutGlobalScope(TenantScope::class)
                ->whereKey($medicine->id)->value('tenant_id'),
            'prescription_id' => null,
            'prescription_item_id' => null,
            'type' => StockMovementType::Adjustment,
            'quantity_change' => $change,
            'quantity_before' => $before,
            'quantity_after' => $before + $change,
            'reason' => fake()->sentence(),
            'actor_id' => User::factory(),
        ];
    }
}
