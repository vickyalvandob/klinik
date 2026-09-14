<?php

use App\Models\ClinicRole;
use App\Models\Permission;
use App\Models\User;
use App\SystemRole;
use App\TenantStatus;
use Inertia\Testing\AssertableInertia as Assert;

test('account pages retain the active clinic and effective menu permissions', function (string $route, string $component) {
    $context = createClinicUser(SystemRole::Cashier);
    $role = ClinicRole::factory()->create([
        'tenant_id' => $context['tenant']->id,
        'clinic_id' => $context['clinic']->id,
        'role_id' => $context['role']->id,
    ]);
    $role->permissions()->sync(Permission::where('key', 'billing.view')->pluck('id'));
    $context['membership']->permissions()->sync(Permission::where('key', 'report.view')->pluck('id'));

    $this->actingAs($context['user'])
        ->withSession(['current_clinic_id' => $context['clinic']->id, 'auth.password_confirmed_at' => time()])
        ->get(route($route))
        ->assertInertia(fn (Assert $page) => $page->component($component)
            ->where('currentClinic.uuid', $context['clinic']->uuid)
            ->where('currentTenant.uuid', $context['tenant']->uuid)
            ->where('currentMembership.role.code', SystemRole::Cashier->value)
            ->where('currentMembership.permissions', ['billing.view', 'report.view']));
})->with([
    'profile' => ['profile.edit', 'settings/profile'],
    'security' => ['security.edit', 'settings/security'],
    'appearance' => ['appearance.edit', 'settings/appearance'],
]);

test('account pages remain accessible without clinic membership', function (bool $platformAdmin) {
    $user = User::factory()->create(['is_platform_admin' => $platformAdmin]);

    $this->actingAs($user)->get(route('profile.edit'))
        ->assertInertia(fn (Assert $page) => $page->component('settings/profile')
            ->where('auth.user.uuid', $user->uuid)
            ->where('currentClinic', null)
            ->where('currentTenant', null)
            ->where('currentMembership', null));
})->with(['regular user' => false, 'platform admin' => true]);

test('account navigation never reveals a clinic from another tenants session selection', function () {
    $context = createClinicUser();
    $other = createClinicUser();

    $this->actingAs($context['user'])->withSession(['current_clinic_id' => $other['clinic']->id])
        ->get(route('profile.edit'))
        ->assertInertia(fn (Assert $page) => $page
            ->where('currentClinic', null)
            ->where('currentTenant', null)
            ->where('currentMembership', null));
});

test('account pages clear menu access when clinic access becomes inactive', function (string $inactive) {
    $context = createClinicUser();
    $this->actingAs($context['user'])->get(route('dashboard'))->assertOk();
    $context[$inactive]->update($inactive === 'tenant' ? ['status' => TenantStatus::Suspended] : ['is_active' => false]);

    $this->get(route('profile.edit'))
        ->assertInertia(fn (Assert $page) => $page->component('settings/profile')
            ->where('currentClinic', null)
            ->where('currentTenant', null)
            ->where('currentMembership', null));

    $this->get(route('dashboard'))->assertForbidden();
})->with(['membership', 'clinic', 'tenant']);

test('account pages still require an active authenticated user', function () {
    $this->get(route('profile.edit'))->assertRedirect(route('login'));

    $user = User::factory()->create(['is_active' => false]);
    $this->actingAs($user)->get(route('profile.edit'))->assertRedirect(route('login'));
});
