<?php

namespace Database\Factories;

use App\EncounterStatus;
use App\Models\Encounter;
use App\Models\EncounterStatusHistory;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<EncounterStatusHistory>
 */
class EncounterStatusHistoryFactory extends Factory
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
            'from_status' => null,
            'to_status' => EncounterStatus::WaitingTriage,
            'reason' => 'Pendaftaran pasien',
            'changed_by' => User::factory(),
        ];
    }
}
