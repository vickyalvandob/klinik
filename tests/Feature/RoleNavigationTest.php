<?php

use App\Models\ClinicRole;
use App\Models\Permission;
use App\SystemRole;
use Inertia\Testing\AssertableInertia as Assert;

test('role presets open only their assigned work areas', function (SystemRole $role, array $allowed) {
    $context = createClinicUser($role);
    $this->actingAs($context['user'])->get(route('dashboard'))->assertOk();

    foreach (['registrations.index', 'queues.index', 'triages.index', 'doctor-queue.index', 'pharmacy.index', 'billing.index', 'patients.index', 'reports.index', 'clinic-users.index', 'clinic-roles.index'] as $route) {
        $this->get(route($route))->assertStatus(in_array($route, $allowed, true) ? 200 : 403);
    }
})->with([
    'owner' => [SystemRole::OwnerAdmin, ['registrations.index', 'queues.index', 'triages.index', 'doctor-queue.index', 'pharmacy.index', 'billing.index', 'patients.index', 'reports.index', 'clinic-users.index', 'clinic-roles.index']],
    'front office' => [SystemRole::FrontOffice, ['registrations.index', 'queues.index', 'patients.index']],
    'nurse' => [SystemRole::Nurse, ['queues.index', 'triages.index', 'patients.index']],
    'doctor' => [SystemRole::Doctor, ['queues.index', 'triages.index', 'doctor-queue.index', 'pharmacy.index', 'patients.index']],
    'pharmacy' => [SystemRole::Pharmacy, ['pharmacy.index']],
    'cashier' => [SystemRole::Cashier, ['billing.index', 'reports.index']],
]);

test('encounter visibility alone does not expose registration or queue modules', function () {
    $context = createClinicUser(SystemRole::Cashier);
    $permissionIds = Permission::query()->where('key', 'encounter.view')->pluck('id');
    $context['membership']->permissions()->sync($permissionIds);

    $this->actingAs($context['user'])->get(route('registrations.index'))->assertForbidden();
    $this->get(route('queues.index'))->assertForbidden();
    $this->get(route('queues.display'))->assertForbidden();
    $this->post(route('queues.calls.store'))->assertForbidden();

    $context['membership']->permissions()->sync(Permission::query()->whereIn('key', ['encounter.view', 'registration.view', 'queue.view'])->pluck('id'));
    $this->get(route('registrations.index'))->assertOk();
    $this->get(route('queues.index'))->assertInertia(fn (Assert $page) => $page->where('canCall', false));
    $this->get(route('queues.display'))->assertRedirect();
    $this->get(route('registrations.create'))->assertForbidden();
    $this->post(route('queues.calls.store'))->assertForbidden();
});

test('cashier summary and shared permissions stay within financial work', function () {
    $context = createClinicUser(SystemRole::Cashier);
    $this->actingAs($context['user'])->get(route('dashboard'))
        ->assertInertia(fn (Assert $page) => $page->where('summary', null)
            ->where('currentMembership.permissions', fn ($permissions) => collect($permissions)->contains('billing.view')
                && collect($permissions)->intersect(['registration.view', 'queue.view', 'patient.view', 'encounter.view', 'medical_record.view'])->isEmpty())
            ->missing('growth.visits')->missing('growth.new_patients'));
});

test('registration creation without list access returns to an accessible form', function () {
    $context = createClinicWorkflow(SystemRole::FrontOffice);
    $role = ClinicRole::factory()->create([
        'tenant_id' => $context['tenant']->id, 'clinic_id' => $context['clinic']->id, 'role_id' => $context['role']->id,
    ]);
    $role->permissions()->sync(Permission::query()->whereIn('key', ['encounter.view', 'encounter.create'])->pluck('id'));

    $this->actingAs($context['user'])->get(route('registrations.create'))
        ->assertInertia(fn (Assert $page) => $page->where('can.view_list', false));
    registerPatient($this, $context)->assertRedirect(route('registrations.create'));
    $this->get(route('registrations.index'))->assertForbidden();
});
