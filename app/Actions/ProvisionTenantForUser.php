<?php

namespace App\Actions;

use App\Models\Clinic;
use App\Models\ClinicMembership;
use App\Models\Role;
use App\Models\Tenant;
use App\Models\User;
use App\Support\Tenancy\CurrentTenant;
use App\SystemRole;
use App\TenantStatus;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use LogicException;

final class ProvisionTenantForUser
{
    public function __construct(
        private readonly CurrentTenant $currentTenant,
        private readonly SyncAuthorizationCatalog $syncAuthorizationCatalog,
        private readonly EnsureClinicRoles $ensureClinicRoles,
    ) {}

    public function execute(User $user): ClinicMembership
    {
        $this->syncAuthorizationCatalog->execute();

        return DB::transaction(function () use ($user): ClinicMembership {
            User::query()->whereKey($user->id)->lockForUpdate()->firstOrFail();

            $hasMembership = ClinicMembership::withoutGlobalScopes()
                ->where('user_id', $user->id)
                ->exists();

            if ($hasMembership) {
                throw new LogicException('The user already has a clinic membership.');
            }

            $clinicName = 'Klinik '.$user->name;
            $tenant = Tenant::query()->create([
                'name' => $clinicName,
                'slug' => Str::slug($clinicName).'-'.Str::lower(Str::random(8)),
                'status' => TenantStatus::Active,
                'trial_ends_at' => now()->addDays(14),
            ]);

            $this->currentTenant->set($tenant);

            $clinic = Clinic::query()->create([
                'name' => $clinicName,
                'facility_type' => 'clinic',
                'address' => 'Belum dilengkapi',
                'phone' => '-',
                'email' => $user->email,
                'timezone' => 'Asia/Jakarta',
                'is_active' => true,
            ]);

            $role = Role::query()->where('code', SystemRole::OwnerAdmin->value)->firstOrFail();
            $membership = new ClinicMembership([
                'user_id' => $user->id,
                'role_id' => $role->id,
                'is_active' => true,
            ]);
            $membership->clinic_id = $clinic->id;
            $membership->save();

            $this->ensureClinicRoles->execute($clinic);

            return $membership;
        });
    }
}
