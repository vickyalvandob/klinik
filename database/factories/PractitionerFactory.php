<?php

namespace Database\Factories;

use App\Models\Practitioner;
use App\Models\Scopes\TenantScope;
use App\Models\StaffProfile;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Practitioner>
 */
class PractitionerFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'staff_profile_id' => StaffProfile::factory(),
            'clinic_id' => fn (array $attributes): int => (int) StaffProfile::withoutGlobalScope(TenantScope::class)->whereKey($attributes['staff_profile_id'])->value('clinic_id'),
            'tenant_id' => fn (array $attributes): int => (int) StaffProfile::withoutGlobalScope(TenantScope::class)->whereKey($attributes['staff_profile_id'])->value('tenant_id'),
            'profession' => 'doctor',
            'specialization' => 'Dokter umum',
            'license_number' => fake()->unique()->numerify('STR##########'),
            'practice_license_number' => fake()->unique()->numerify('SIP##########'),
            'schedule_notes' => null,
            'is_active' => true,
        ];
    }
}
