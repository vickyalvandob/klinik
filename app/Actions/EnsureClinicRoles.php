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
            $roles = Role::query()->whereIn('code', array_column(SystemRole::cases(), 'value'))
                ->with('permissions:id')->get()->keyBy('code');
            $clinicRoles = ClinicRole::query()->where('clinic_id', $clinic->id)
                ->with('permissions:id')->get()->keyBy('role_id');

            foreach (SystemRole::cases() as $systemRole) {
                $role = $roles->get($systemRole->value);
                abort_if($role === null, 404);

                $clinicRole = $clinicRoles->get($role->id) ?? new ClinicRole([
                    'role_id' => $role->id,
                ]);
                $clinicRole->clinic_id = $clinic->id;

                if (! $clinicRole->exists) {
                    $clinicRole->save();
                    $clinicRole->permissions()->sync($role->permissions->modelKeys());
                }

                if ($systemRole === SystemRole::OwnerAdmin
                    && $clinicRole->permissions->modelKeys() !== $role->permissions->modelKeys()) {
                    $clinicRole->permissions()->sync($role->permissions->modelKeys());
                }
            }
        });
    }
}
