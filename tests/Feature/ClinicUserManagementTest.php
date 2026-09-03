<?php

use App\Models\ClinicMembership;
use App\Models\Role;
use App\Models\StaffProfile;
use App\Models\User;
use App\SystemRole;

test('an owner can create and update a tenant-scoped clinic user', function () {
    ['tenant' => $tenant, 'clinic' => $clinic, 'user' => $owner] = createClinicUser();
    $staff = StaffProfile::factory()->create(['tenant_id' => $tenant->id, 'clinic_id' => $clinic->id]);
    $frontOffice = Role::query()->where('code', SystemRole::FrontOffice->value)->firstOrFail();

    $this->actingAs($owner)->post(route('clinic-users.store'), [
        'name' => 'Nadia Front Office',
        'email' => 'NADIA@CLINIC.TEST',
        'password' => 'password',
        'password_confirmation' => 'password',
        'role_id' => $frontOffice->id,
        'staff_profile_id' => $staff->id,
        'permissions' => ['report.export'],
    ])->assertRedirect();

    $user = User::query()->where('email', 'nadia@clinic.test')->firstOrFail();
    $membership = ClinicMembership::withoutGlobalScopes()->where('clinic_id', $clinic->id)->where('user_id', $user->id)->firstOrFail();
    expect($membership->staff_profile_id)->toBe($staff->id)
        ->and($membership->role_id)->toBe($frontOffice->id)
        ->and($membership->permissions()->pluck('key')->all())->toBe(['report.export']);

    $this->actingAs($owner)->put(route('clinic-users.update', $membership), [
        'role_id' => $frontOffice->id,
        'staff_profile_id' => $staff->id,
        'is_active' => false,
        'permissions' => [],
    ])->assertRedirect(route('clinic-users.index'));

    expect($membership->refresh()->is_active)->toBeFalse()
        ->and($membership->permissions()->count())->toBe(0);
});

test('an owner cannot deactivate or demote their own membership', function () {
    ['user' => $owner, 'membership' => $membership] = createClinicUser();
    $doctorRole = Role::query()->where('code', SystemRole::Doctor->value)->firstOrFail();

    $this->actingAs($owner)->put(route('clinic-users.update', $membership), [
        'role_id' => $doctorRole->id,
        'staff_profile_id' => null,
        'is_active' => false,
        'permissions' => [],
    ])->assertSessionHasErrors('is_active');

    expect($membership->refresh()->is_active)->toBeTrue()
        ->and($membership->role->code)->toBe(SystemRole::OwnerAdmin->value);
});

test('clinic users cannot be managed across tenants', function () {
    ['user' => $owner] = createClinicUser();
    ['membership' => $foreignMembership] = createClinicUser();
    $role = Role::query()->where('code', SystemRole::FrontOffice->value)->firstOrFail();

    $this->actingAs($owner)->put(route('clinic-users.update', $foreignMembership), [
        'role_id' => $role->id,
        'staff_profile_id' => null,
        'is_active' => true,
        'permissions' => [],
    ])->assertNotFound();
});

test('a doctor cannot access clinic user management', function () {
    ['user' => $doctor] = createClinicUser(SystemRole::Doctor);

    $this->actingAs($doctor)->get(route('clinic-users.index'))->assertForbidden();
});
