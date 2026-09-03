<?php

use App\Actions\SyncAuthorizationCatalog;
use App\Models\ClinicMembership;
use App\Models\Permission;
use App\Models\Role;
use App\Support\Authorization\PermissionCatalog;
use App\Support\Tenancy\CurrentClinic;
use App\Support\Tenancy\CurrentTenant;
use App\SystemRole;
use Illuminate\Support\Facades\Gate;

test('authorization catalog seeds all permission and role presets idempotently', function () {
    $sync = app(SyncAuthorizationCatalog::class);
    $sync->execute();
    $sync->execute();

    expect(Permission::query()->count())->toBe(count(PermissionCatalog::permissions()))
        ->and(Role::query()->count())->toBe(count(SystemRole::cases()));

    $owner = Role::query()->where('code', SystemRole::OwnerAdmin->value)->firstOrFail();
    expect($owner->permissions()->count())->toBe(count(PermissionCatalog::permissions()));
});

test('role permissions and membership-specific additions are both enforced', function () {
    ['membership' => $membership] = createClinicUser(SystemRole::Doctor);

    expect($membership->grantsPermission('medical_record.finalize'))->toBeTrue()
        ->and($membership->grantsPermission('clinic.manage'))->toBeFalse();

    $clinicPermission = Permission::query()->where('key', 'clinic.manage')->firstOrFail();
    $membership->permissions()->attach($clinicPermission);
    $membership->unsetRelation('permissions');

    expect($membership->grantsPermission('clinic.manage'))->toBeTrue();
});

test('clinic policies require the current membership and permission', function () {
    $owner = createClinicUser(SystemRole::OwnerAdmin);
    $doctor = createClinicUser(SystemRole::Doctor);

    app(CurrentTenant::class)->set($owner['tenant']);
    app(CurrentClinic::class)->set(
        $owner['clinic'],
        $owner['membership']->load(['role.permissions', 'permissions']),
    );

    expect(Gate::forUser($owner['user'])->allows('update', $owner['clinic']))->toBeTrue()
        ->and(Gate::forUser($owner['user'])->allows('viewAny', ClinicMembership::class))->toBeTrue();

    app(CurrentTenant::class)->set($doctor['tenant']);
    app(CurrentClinic::class)->set(
        $doctor['clinic'],
        $doctor['membership']->load(['role.permissions', 'permissions']),
    );

    expect(Gate::forUser($doctor['user'])->allows('update', $doctor['clinic']))->toBeFalse()
        ->and(Gate::forUser($doctor['user'])->allows('viewAny', ClinicMembership::class))->toBeFalse();
});
