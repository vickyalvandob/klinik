<?php

use App\Actions\SyncAuthorizationCatalog;
use App\Models\Clinic;
use App\Models\ClinicMembership;
use App\Models\Role;
use App\Models\Tenant;
use App\Models\User;
use App\SystemRole;
use Illuminate\Database\QueryException;

test('tenant member can open only the clinic from the active membership', function () {
    ['user' => $tenantAUser, 'clinic' => $tenantAClinic] = createClinicUser();
    ['clinic' => $tenantBClinic] = createClinicUser();

    $ownClinicResponse = $this->actingAs($tenantAUser)
        ->get(route('clinics.show', $tenantAClinic));

    $ownClinicResponse
        ->assertOk()
        ->assertDontSee($tenantBClinic->name)
        ->assertInertia(fn ($page) => $page
            ->component('clinics/show')
            ->where('clinic.uuid', $tenantAClinic->uuid)
            ->where('currentClinic.uuid', $tenantAClinic->uuid)
        );

    $this->actingAs($tenantAUser)
        ->get(route('clinics.show', $tenantBClinic))
        ->assertNotFound();
});

test('a clinic id placed in the session must belong to the authenticated user', function () {
    ['user' => $tenantAUser] = createClinicUser();
    ['clinic' => $tenantBClinic] = createClinicUser();

    $this->actingAs($tenantAUser)
        ->withSession(['current_clinic_id' => $tenantBClinic->id])
        ->get(route('dashboard'))
        ->assertNotFound()
        ->assertSessionMissing('current_clinic_id');
});

test('inactive memberships and suspended tenants cannot enter clinic routes', function () {
    ['user' => $inactiveUser, 'membership' => $inactiveMembership] = createClinicUser();
    $inactiveMembership->forceFill(['is_active' => false])->save();

    $this->actingAs($inactiveUser)->get(route('dashboard'))->assertForbidden();

    ['tenant' => $suspendedTenant, 'user' => $suspendedUser] = createClinicUser();
    $suspendedTenant->forceFill(['status' => 'suspended'])->save();

    $this->actingAs($suspendedUser)->get(route('dashboard'))->assertForbidden();
});

test('authenticated users without a clinic membership cannot enter tenant operations', function () {
    $user = User::factory()->create();

    $this->actingAs($user)->get(route('dashboard'))->assertForbidden();
});

test('database rejects a membership whose clinic belongs to another tenant', function () {
    app(SyncAuthorizationCatalog::class)->execute();
    $tenantA = Tenant::factory()->create();
    $tenantB = Tenant::factory()->create();
    $tenantBClinic = Clinic::factory()->for($tenantB)->create();
    $user = User::factory()->create();
    $role = Role::query()->where('code', SystemRole::OwnerAdmin->value)->firstOrFail();

    expect(fn () => ClinicMembership::withoutEvents(fn () => ClinicMembership::query()->forceCreate([
        'tenant_id' => $tenantA->id,
        'clinic_id' => $tenantBClinic->id,
        'user_id' => $user->id,
        'role_id' => $role->id,
        'is_active' => true,
    ])))->toThrow(QueryException::class);
});
