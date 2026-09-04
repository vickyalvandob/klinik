<?php

namespace Database\Factories;

use App\Models\Prescription;
use App\Models\PrescriptionAudit;
use App\Models\Scopes\TenantScope;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<PrescriptionAudit>
 */
class PrescriptionAuditFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $prescription = Prescription::factory()->create();

        return [
            'prescription_id' => $prescription->id,
            'clinic_id' => $prescription->clinic_id,
            'tenant_id' => (int) Prescription::withoutGlobalScope(TenantScope::class)
                ->whereKey($prescription->id)->value('tenant_id'),
            'action' => 'processing_started',
            'before_values' => ['status' => 'prescribed'],
            'after_values' => ['status' => 'processing'],
            'actor_id' => User::factory(),
        ];
    }
}
