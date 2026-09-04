<?php

namespace Database\Factories;

use App\InvoiceStatus;
use App\Models\Encounter;
use App\Models\Invoice;
use App\Models\Scopes\TenantScope;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Invoice>
 */
class InvoiceFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'encounter_id' => Encounter::factory(),
            'tenant_id' => fn (array $attributes): int => (int) Encounter::withoutGlobalScope(TenantScope::class)
                ->whereKey($attributes['encounter_id'])->value('tenant_id'),
            'clinic_id' => fn (array $attributes): int => (int) Encounter::withoutGlobalScope(TenantScope::class)
                ->whereKey($attributes['encounter_id'])->value('clinic_id'),
            'patient_id' => fn (array $attributes): int => (int) Encounter::withoutGlobalScope(TenantScope::class)
                ->whereKey($attributes['encounter_id'])->value('patient_id'),
            'invoice_number' => fake()->unique()->numerify('INV-########-####'),
            'status' => InvoiceStatus::Issued,
            'subtotal' => 100000,
            'total_amount' => 100000,
            'paid_amount' => 0,
            'balance_due' => 100000,
            'issued_at' => now(),
        ];
    }
}
