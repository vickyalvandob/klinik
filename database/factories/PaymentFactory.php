<?php

namespace Database\Factories;

use App\Models\Invoice;
use App\Models\Payment;
use App\Models\Scopes\TenantScope;
use App\PaymentMethod;
use App\PaymentStatus;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Payment>
 */
class PaymentFactory extends Factory
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
            'payment_number' => fake()->unique()->numerify('PAY-########-####'),
            'amount' => 100000,
            'method' => PaymentMethod::Cash,
            'status' => PaymentStatus::Received,
            'received_at' => now(),
        ];
    }
}
