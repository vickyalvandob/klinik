<?php

namespace App\Actions;

use App\Models\Clinic;
use App\Models\ClinicRole;
use App\Models\Role;
use App\SystemRole;
use Illuminate\Support\Facades\DB;

class EnsureClinicRoles
{
    public function execute(Clinic $clinic): void
    {
        DB::transaction(function () use ($clinic): void {
            foreach (SystemRole::cases() as $systemRole) {
                $role = Role::query()
                    ->where('code', $systemRole->value)
                    ->with('permissions:id')
                    ->firstOrFail();

                $clinicRole = ClinicRole::query()->firstOrNew([
                    'clinic_id' => $clinic->id,
                    'role_id' => $role->id,
                ]);
                $clinicRole->clinic_id = $clinic->id;

                if (! $clinicRole->exists) {
                    $clinicRole->save();
                    $clinicRole->permissions()->sync($role->permissions->modelKeys());
                }

                if ($systemRole === SystemRole::OwnerAdmin) {
                    $clinicRole->permissions()->sync($role->permissions->modelKeys());
                }
            }
        });
    }
}
