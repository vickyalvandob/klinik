<?php

namespace Database\Factories;

use App\Models\Clinic;
use App\Models\ClinicWorkflowSetting;
use App\Models\Scopes\TenantScope;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ClinicWorkflowSetting>
 */
class ClinicWorkflowSettingFactory extends Factory
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
            'opening_time' => '08:00',
            'closing_time' => '17:00',
            'default_visit_duration_minutes' => 15,
            'require_triage' => true,
            'allow_walk_in' => true,
            'pharmacy_enabled' => true,
            'billing_enabled' => true,
            'require_primary_diagnosis' => true,
            'require_final_medical_record' => true,
            'allow_partial_payment' => false,
            'auto_send_prescription_to_pharmacy' => true,
        ];
    }
}
