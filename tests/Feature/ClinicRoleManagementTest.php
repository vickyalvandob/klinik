<?php

use App\Actions\EnsureClinicRoles;
use App\Models\Clinic;
use App\Models\ClinicMembership;
use App\Models\ClinicRole;
use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use App\Support\Tenancy\CurrentTenant;
use App\SystemRole;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Testing\AssertableInertia as Assert;

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

    $this->get(route('clinic-users.index'))->assertInertia(fn ($page) => $page
        ->where('roles.3.code', SystemRole::Doctor->value)
        ->where('roles.3.permissions', ['patient.view']));

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

test('role member counts only include active memberships in the current clinic', function () {
    ['tenant' => $tenant, 'clinic' => $clinic, 'user' => $owner] = createClinicUser();
    $doctor = Role::query()->where('code', SystemRole::Doctor->value)->firstOrFail();
    ClinicMembership::factory()->forClinic($clinic)->for($doctor)->create();
    ClinicMembership::factory()->forClinic($clinic)->for($doctor)->create(['is_active' => false]);
    $otherClinic = Clinic::factory()->for($tenant)->create();
    ClinicMembership::factory()->forClinic($otherClinic)->for($doctor)->create();

    $this->actingAs($owner)->get(route('clinic-roles.index'))->assertInertia(fn (Assert $page) => $page
        ->where('roles.3.code', SystemRole::Doctor->value)->where('roles.3.member_count', 1));
});

test('all permissions can be cleared without losing membership grants or global presets', function () {
    ['clinic' => $clinic, 'user' => $owner] = createClinicUser();
    $this->actingAs($owner)->get(route('clinic-roles.index'))->assertOk();
    $doctor = Role::query()->where('code', SystemRole::Doctor->value)->firstOrFail();
    $role = ClinicRole::withoutGlobalScopes()->where('clinic_id', $clinic->id)->where('role_id', $doctor->id)->firstOrFail();
    $membership = ClinicMembership::factory()->forClinic($clinic)->for($doctor)->create();
    $membership->permissions()->attach(Permission::query()->where('key', 'report.export')->firstOrFail());

    $this->put(route('clinic-roles.update', $role), ['permissions' => []])->assertRedirect();

    expect($role->permissions()->count())->toBe(0);
    expect($doctor->permissions()->where('key', 'medical_record.finalize')->exists())->toBeTrue();
    expect($membership->permissions()->pluck('key')->all())->toBe(['report.export']);
    $this->get(route('clinic-roles.index', ['role' => $role->uuid]))->assertInertia(fn (Assert $page) => $page->where('selectedRole.permissions', []));
});

test('switching roles returns only requested role data', function () {
    ['user' => $owner] = createClinicUser();
    $this->actingAs($owner)->get(route('clinic-roles.index'))->assertOk();

    $this->actingAs($owner)->withHeaders([
        'X-Inertia' => 'true', 'X-Inertia-Version' => Inertia::getVersion(), 'X-Inertia-Partial-Component' => 'clinic-roles/index',
        'X-Inertia-Partial-Data' => 'selectedRole,roles',
    ])->get(route('clinic-roles.index'))->assertOk()->assertJsonPath('props.selectedRole.code', SystemRole::FrontOffice->value)
        ->assertJsonMissingPath('props.permissionGroups');
});

test('clinic role updates are scoped to the current clinic', function () {
    ['user' => $owner] = createClinicUser();
    ['clinic' => $foreignClinic] = createClinicUser();
    $role = ClinicRole::factory()->create(['tenant_id' => $foreignClinic->tenant_id, 'clinic_id' => $foreignClinic->id]);

    $this->actingAs($owner)->put(route('clinic-roles.update', $role), ['permissions' => []])->assertNotFound();
});

test('existing clinic roles are loaded in a bounded batch without rewriting permissions', function () {
    ['clinic' => $clinic, 'user' => $owner] = createClinicUser();
    $this->actingAs($owner)->get(route('clinic-roles.index'))->assertOk();

    DB::enableQueryLog();
    app(EnsureClinicRoles::class)->execute($clinic);
    $queries = collect(DB::getQueryLog())->pluck('query');
    DB::disableQueryLog();

    expect($queries->count())->toBeLessThanOrEqual(4);
    expect($queries->filter(fn (string $sql): bool => ! str_starts_with(strtolower($sql), 'select')))->toBeEmpty();
});
