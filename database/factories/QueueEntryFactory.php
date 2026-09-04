<?php

namespace Database\Factories;

use App\Models\Encounter;
use App\Models\QueueEntry;
use App\QueueStatus;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<QueueEntry>
 */
class QueueEntryFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $encounter = Encounter::factory()->create();

        return [
            'tenant_id' => $encounter->tenant_id,
            'clinic_id' => $encounter->clinic_id,
            'encounter_id' => $encounter->id,
            'service_unit_id' => $encounter->service_unit_id,
            'practitioner_id' => $encounter->practitioner_id,
            'queue_date' => $encounter->encounter_date->toDateString(),
            'queue_sequence' => $encounter->registration_sequence,
            'queue_number' => 'A'.str_pad((string) $encounter->registration_sequence, 3, '0', STR_PAD_LEFT),
            'status' => QueueStatus::Waiting,
        ];
    }
}
