<?php

use App\Models\ClinicMembership;
use App\Models\ClinicRole;
use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use App\Support\Tenancy\CurrentTenant;
use App\SystemRole;

test('an owner can customize a clinic role without changing global presets', function () {
    ['tenant' => $tenant, 'clinic' => $clinic, 'user' => $owner] = createClinicUser();

    $this->actingAs($owner)->get(route('clinic-roles.index'))->assertOk();

    $doctorRole = Role::query()->where('code', SystemRole::Doctor->value)->firstOrFail();
    $clinicRole = ClinicRole::withoutGlobalScopes()
        ->where('clinic_id', $clinic->id)
        ->where('role_id', $doctorRole->id)
        ->firstOrFail();

    $this->actingAs($owner)->put(route('clinic-roles.update', $clinicRole), [
        'permissions' => ['patient.view'],
    ])->assertRedirect();

    expect($clinicRole->permissions()->pluck('key')->all())->toBe(['patient.view'])
        ->and($doctorRole->permissions()->where('key', 'medical_record.finalize')->exists())->toBeTrue();

    $doctor = User::factory()->create();
    $doctorMembership = ClinicMembership::factory()
        ->forClinic($clinic)
        ->for($doctor)
        ->for($doctorRole)
        ->create();
    app(CurrentTenant::class)->set($tenant);

    expect($doctorMembership->grantsPermission('patient.view'))->toBeTrue()
        ->and($doctorMembership->grantsPermission('medical_record.finalize'))->toBeFalse();
});

test('the owner role permission set cannot be reduced', function () {
    ['clinic' => $clinic, 'user' => $owner] = createClinicUser();
    $this->actingAs($owner)->get(route('clinic-roles.index'))->assertOk();
    $ownerRole = Role::query()->where('code', SystemRole::OwnerAdmin->value)->firstOrFail();
    $clinicRole = ClinicRole::withoutGlobalScopes()->where('clinic_id', $clinic->id)->where('role_id', $ownerRole->id)->firstOrFail();

    $this->actingAs($owner)->put(route('clinic-roles.update', $clinicRole), [
        'permissions' => ['patient.view'],
    ])->assertForbidden();

    expect($clinicRole->permissions()->count())->toBe(Permission::query()->count());
});

test('users without role management permission cannot change clinic roles', function () {
    ['user' => $doctor] = createClinicUser(SystemRole::Doctor);

    $this->actingAs($doctor)->get(route('clinic-roles.index'))->assertForbidden();
});
