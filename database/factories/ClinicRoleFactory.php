<?php

namespace Database\Factories;

use App\Models\Clinic;
use App\Models\ClinicRole;
use App\Models\Role;
use App\Models\Scopes\TenantScope;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ClinicRole>
 */
class ClinicRoleFactory extends Factory
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
            'role_id' => Role::factory(),
        ];
    }
}
