<?php

namespace Database\Factories;

use App\Models\BillingAudit;
use App\Models\Invoice;
use App\Models\Scopes\TenantScope;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<BillingAudit>
 */
class BillingAuditFactory extends Factory
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
            'action' => 'invoice_created',
            'before_values' => null,
            'after_values' => [],
        ];
    }
}
