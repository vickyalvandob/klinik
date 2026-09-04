<?php

namespace Database\Factories;

use App\Models\Triage;
use App\Models\TriageAudit;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<TriageAudit>
 */
class TriageAuditFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $triage = Triage::factory()->create();

        return [
            'tenant_id' => $triage->tenant_id,
            'clinic_id' => $triage->clinic_id,
            'triage_id' => $triage->id,
            'encounter_id' => $triage->encounter_id,
            'action' => 'draft_saved',
            'before_values' => null,
            'after_values' => $triage->only([
                'chief_complaint', 'systolic_bp', 'diastolic_bp', 'heart_rate',
                'respiratory_rate', 'temperature', 'spo2', 'weight', 'height',
                'pain_scale', 'notes', 'status', 'completed_at',
            ]),
            'actor_id' => User::factory(),
        ];
    }
}
