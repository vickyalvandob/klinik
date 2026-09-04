<?php

namespace Database\Factories;

use App\InvoiceItemType;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\Scopes\TenantScope;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<InvoiceItem>
 */
class InvoiceItemFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'invoice_id' => Invoice::factory(),
            'tenant_id' => fn (array $attributes): int => (int) Invoice::withoutGlobalScope(TenantScope::class)
                ->whereKey($attributes['invoice_id'])->value('tenant_id'),
            'clinic_id' => fn (array $attributes): int => (int) Invoice::withoutGlobalScope(TenantScope::class)
                ->whereKey($attributes['invoice_id'])->value('clinic_id'),
            'item_type' => InvoiceItemType::Procedure,
            'description_snapshot' => fake()->words(3, true),
            'quantity' => 1,
            'unit' => 'tindakan',
            'unit_price' => 100000,
            'line_total' => 100000,
        ];
    }
}
