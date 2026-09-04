<?php

namespace Database\Factories;

use App\Models\Clinic;
use App\Models\DailySequence;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<DailySequence>
 */
class DailySequenceFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $clinic = Clinic::factory()->create();

        return [
            'tenant_id' => $clinic->tenant_id,
            'clinic_id' => $clinic->id,
            'sequence_date' => now()->toDateString(),
            'scope' => 'encounter-registration',
            'last_number' => 1,
        ];
    }
}
