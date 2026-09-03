<?php

namespace Database\Factories;

use App\Models\Clinic;
use App\Models\ClinicMembership;
use App\Models\Role;
use App\Models\Scopes\TenantScope;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ClinicMembership>
 */
class ClinicMembershipFactory extends Factory
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
            'tenant_id' => fn (array $attributes): int => (int) Clinic::withoutGlobalScope(TenantScope::class)
                ->whereKey($attributes['clinic_id'])
                ->value('tenant_id'),
            'user_id' => User::factory(),
            'staff_profile_id' => null,
            'role_id' => Role::factory(),
            'is_active' => true,
        ];
    }

    public function forClinic(Clinic $clinic): static
    {
        return $this->state(fn (): array => [
            'tenant_id' => $clinic->tenant_id,
            'clinic_id' => $clinic->id,
        ]);
    }

    public function inactive(): static
    {
        return $this->state(fn (): array => [
            'is_active' => false,
        ]);
    }
}
