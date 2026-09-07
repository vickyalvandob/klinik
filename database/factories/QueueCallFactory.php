<?php

namespace Database\Factories;

use App\Models\QueueCall;
use App\Models\QueueEntry;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<QueueCall> */
class QueueCallFactory extends Factory
{
    /** @return array<string, mixed> */
    public function definition(): array
    {
        return [
            'queue_entry_id' => QueueEntry::factory(),
            'tenant_id' => fn (array $attributes) => QueueEntry::withoutGlobalScopes()->whereKey($attributes['queue_entry_id'])->firstOrFail()->tenant_id,
            'clinic_id' => fn (array $attributes) => QueueEntry::withoutGlobalScopes()->whereKey($attributes['queue_entry_id'])->firstOrFail()->clinic_id,
            'service_unit_id' => fn (array $attributes) => QueueEntry::withoutGlobalScopes()->whereKey($attributes['queue_entry_id'])->firstOrFail()->service_unit_id,
            'actor_id' => User::factory(),
            'queue_date' => now()->toDateString(),
            'queue_number' => 'A001',
            'destination' => 'Pemeriksaan Awal · Poli Umum',
            'stage' => 'triage',
            'request_key' => fake()->uuid(),
        ];
    }
}
