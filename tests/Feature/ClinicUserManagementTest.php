<?php

use App\Models\Clinic;
use App\Models\ClinicMembership;
use App\Models\Permission;
use App\Models\Role;
use App\Models\StaffProfile;
use App\Models\User;
use App\SystemRole;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Testing\AssertableInertia as Assert;

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

test('user filters and summary only include the current clinic', function () {
    ['tenant' => $tenant, 'clinic' => $clinic, 'user' => $owner] = createClinicUser();
    $role = Role::query()->where('code', SystemRole::Doctor->value)->firstOrFail();
    $doctor = User::factory()->create(['name' => 'Nadia Dokter']);
    $membership = ClinicMembership::factory()->forClinic($clinic)->for($doctor)->for($role)->create(['is_active' => false]);
    $otherClinic = Clinic::factory()->for($tenant)->create();
    ClinicMembership::factory()->forClinic($otherClinic)->for($doctor)->for($role)->create(['is_active' => false]);

    $this->actingAs($owner)->get(route('clinic-users.index', [
        'search' => ' Nadia ', 'role' => SystemRole::Doctor->value, 'status' => 'inactive',
    ]))->assertInertia(fn (Assert $page) => $page
        ->has('memberships.data', 1)->where('memberships.data.0.uuid', $membership->uuid)
        ->missing('memberships.data.0.permissions')->where('memberships.data.0.permission_count', 0)
        ->where('summary', ['total' => 2, 'active' => 1, 'inactive' => 1])
        ->where('filters.search', 'Nadia')->where('formOpen', false)->has('staff', 0)->has('permissions', 0));
});

test('opening the user editor skips loading the paginated worklist', function () {
    ['user' => $owner, 'membership' => $membership] = createClinicUser();

    $this->actingAs($owner)->get(route('clinic-users.index'))->assertOk();
    DB::enableQueryLog();
    $response = $this->actingAs($owner)->withHeaders([
        'X-Inertia' => 'true', 'X-Inertia-Version' => Inertia::getVersion(), 'X-Inertia-Partial-Component' => 'clinic-users/index',
        'X-Inertia-Partial-Data' => 'editing,staff,permissions,formOpen',
    ])->get(route('clinic-users.index', ['edit' => $membership->uuid]));
    $queries = collect(DB::getQueryLog())->pluck('query');
    DB::disableQueryLog();

    $response->assertOk()->assertJsonPath('props.editing.uuid', $membership->uuid)
        ->assertJsonPath('props.formOpen', true)->assertJsonMissingPath('props.memberships')
        ->assertJsonMissingPath('props.roles')->assertJsonMissingPath('props.summary');
    expect($queries->filter(fn (string $query): bool => str_contains($query, 'aggregate') && str_contains($query, 'clinic_memberships')))->toBeEmpty();
});

test('invalid user filters are rejected', function (array $filters, string $field) {
    ['user' => $owner] = createClinicUser();

    $this->actingAs($owner)->get(route('clinic-users.index', $filters))->assertSessionHasErrors($field);
})->with([
    'long search' => [['search' => str_repeat('a', 101)], 'search'],
    'array search' => [['search' => ['invalid']], 'search'],
    'unknown role' => [['role' => 'unknown'], 'role'],
    'unknown status' => [['status' => 'unknown'], 'status'],
    'invalid page' => [['page' => 0], 'page'],
]);

test('editing a user in another clinic is not found even in the same tenant', function () {
    ['tenant' => $tenant, 'user' => $owner] = createClinicUser();
    $clinic = Clinic::factory()->for($tenant)->create();
    $membership = ClinicMembership::factory()->forClinic($clinic)->create();

    $this->actingAs($owner)->get(route('clinic-users.index', ['edit' => $membership->uuid]))->assertNotFound();
});

test('a user manager cannot clear additional permissions without role management access', function (array $payload) {
    ['clinic' => $clinic, 'user' => $manager, 'membership' => $managerMembership] = createClinicUser(SystemRole::FrontOffice);
    $managerMembership->permissions()->attach(Permission::query()->where('key', 'users.manage')->firstOrFail());
    $target = ClinicMembership::factory()->forClinic($clinic)->for($managerMembership->role)->create();
    $target->permissions()->attach(Permission::query()->where('key', 'report.export')->firstOrFail());

    $this->actingAs($manager)->put(route('clinic-users.update', $target), [
        'role_id' => $target->role_id, 'staff_profile_id' => null, 'is_active' => false, ...$payload,
    ])->assertRedirect(route('clinic-users.index'));

    expect($target->refresh()->is_active)->toBeFalse();
    expect($target->permissions()->pluck('key')->all())->toBe(['report.export']);
})->with(['omitted' => [[]], 'empty array' => [['permissions' => []]]]);

test('duplicate email and password confirmation errors explain how to correct the account', function () {
    ['user' => $owner, 'role' => $role] = createClinicUser();

    $this->actingAs($owner)->post(route('clinic-users.store'), [
        'name' => 'Akun Duplikat', 'email' => $owner->email,
        'password' => 'password', 'password_confirmation' => 'different-password', 'role_id' => $role->id,
    ])->assertSessionHasErrors([
        'email' => 'Email ini sudah digunakan. Gunakan email lain.',
        'password' => 'Konfirmasi kata sandi belum sama.',
    ]);

    $this->assertDatabaseMissing('users', ['name' => 'Akun Duplikat']);
});
