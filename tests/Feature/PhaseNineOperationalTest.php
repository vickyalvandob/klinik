<?php

use App\EncounterStatus;
use App\Models\ClinicRole;
use App\Models\ClinicService;
use App\Models\ClinicWorkflowSetting;
use App\Models\Encounter;
use App\Models\Patient;
use App\Models\Permission;
use App\Support\Tenancy\CurrentTenant;
use App\SystemRole;
use Illuminate\Support\Carbon;
use Inertia\Testing\AssertableInertia as Assert;

test('summary contains clinic totals without sending a patient worklist', function () {
    $this->travelTo(Carbon::parse('2026-09-04 18:30:00', 'UTC'));
    $context = createClinicWorkflow(SystemRole::FrontOffice);
    $context['clinic']->forceFill(['timezone' => 'Asia/Jakarta'])->save();
    registerPatient($this, $context)->assertRedirect();
    $foreign = createClinicWorkflow(SystemRole::FrontOffice);
    $this->withSession(['current_clinic_id' => $foreign['clinic']->id]);
    registerPatient($this, $foreign)->assertRedirect();

    $this->actingAs($context['user'])->withSession(['current_clinic_id' => $context['clinic']->id])
        ->get(route('dashboard'))->assertInertia(fn (Assert $page) => $page
        ->component('dashboard')->where('today', '2026-09-05')->where('summary.total', 1)
        ->where('summary.stages.0.count', 1)->missing('encounters')->missing('patients'));
});

test('shared navigation permissions use clinic overrides plus direct membership grants', function () {
    $context = createClinicWorkflow(SystemRole::FrontOffice);
    $role = ClinicRole::factory()->create([
        'tenant_id' => $context['tenant']->id, 'clinic_id' => $context['clinic']->id, 'role_id' => $context['role']->id,
    ]);
    $role->permissions()->sync(Permission::query()->where('key', 'patient.view')->pluck('id'));
    $context['membership']->permissions()->sync(Permission::query()->where('key', 'billing.view')->pluck('id'));

    $this->actingAs($context['user'])->get(route('dashboard'))->assertInertia(fn (Assert $page) => $page
        ->component('dashboard')->where('summary', null)
        ->where('currentMembership.permissions', ['patient.view', 'billing.view']));
    $this->get(route('registrations.index'))->assertForbidden();
    $this->get(route('billing.index'))->assertOk();
});

test('registrations retain completed visits and allow a scoped historical date filter', function () {
    $context = createClinicWorkflow(SystemRole::FrontOffice);
    registerPatient($this, $context)->assertRedirect();
    $encounter = Encounter::withoutGlobalScopes()->sole();
    $encounter->forceFill(['status' => EncounterStatus::Completed, 'encounter_date' => '2026-08-20'])->save();

    $this->actingAs($context['user'])->get(route('registrations.index', ['date' => '2026-08-20', 'status' => 'completed']))
        ->assertInertia(fn (Assert $page) => $page->component('registrations/index')
            ->has('encounters.data', 1)->where('encounters.data.0.uuid', $encounter->uuid)
            ->where('summary.completed', 1)->where('filters.date', '2026-08-20'));
    $this->get(route('registrations.index', ['date' => '2026-08-21']))
        ->assertInertia(fn (Assert $page) => $page->has('encounters.data', 0)->where('summary.total', 0));
});

test('registration filters reject invalid dates and foreign clinic units', function () {
    $context = createClinicWorkflow(SystemRole::FrontOffice);
    $foreign = createClinicWorkflow();

    $this->actingAs($context['user'])->get(route('registrations.index', ['date' => '2026-02-30']))
        ->assertSessionHasErrors(['date' => 'Gunakan tanggal kunjungan yang valid.']);
    $this->get(route('registrations.index', ['service_unit' => $foreign['serviceUnit']->uuid]))
        ->assertSessionHasErrors(['service_unit' => 'Unit layanan tidak tersedia di klinik ini.']);
});

test('a registration ticket contains only operational identification and shows cancellation', function () {
    $context = createClinicWorkflow(SystemRole::FrontOffice);
    registerPatient($this, $context)->assertRedirect();
    $encounter = Encounter::withoutGlobalScopes()->sole();
    $encounter->forceFill(['status' => EncounterStatus::Cancelled])->save();

    $this->actingAs($context['user'])->get(route('registrations.ticket', $encounter))
        ->assertInertia(fn (Assert $page) => $page->component('registrations/ticket')
            ->where('ticket.queue_number', 'A001')->where('ticket.patient_name', $context['patient']->name)
            ->where('ticket.status', 'cancelled')->missing('ticket.chief_complaint')
            ->missing('ticket.national_id_number')->missing('ticket.birth_date'));
});

test('registration tickets enforce guest permission and tenant boundaries', function () {
    $context = createClinicWorkflow(SystemRole::FrontOffice);
    registerPatient($this, $context)->assertRedirect();
    $encounter = Encounter::withoutGlobalScopes()->sole();
    $foreign = createClinicWorkflow(SystemRole::FrontOffice);

    $this->actingAs($foreign['user'])->withSession(['current_clinic_id' => $foreign['clinic']->id])
        ->get(route('registrations.ticket', $encounter))->assertNotFound();
    app(CurrentTenant::class)->set($context['tenant']);
    $role = ClinicRole::factory()->create([
        'tenant_id' => $context['tenant']->id, 'clinic_id' => $context['clinic']->id, 'role_id' => $context['role']->id,
    ]);
    $role->permissions()->sync([]);
    $this->actingAs($context['user'])->withSession(['current_clinic_id' => $context['clinic']->id])
        ->get(route('registrations.ticket', $encounter))->assertForbidden();
    auth()->logout();
    $this->get(route('registrations.ticket', $encounter))->assertRedirect(route('login'));
});

test('registration uses the fixed flow without requiring a legacy settings row', function () {
    $context = createClinicWorkflow(SystemRole::FrontOffice, requireTriage: false);
    ClinicWorkflowSetting::withoutGlobalScopes()->where('clinic_id', $context['clinic']->id)->delete();

    registerPatient($this, $context)->assertRedirect(route('registrations.index'));

    expect(Encounter::withoutGlobalScopes()->sole()->status)->toBe(EncounterStatus::WaitingTriage);
});

test('legacy walk in restrictions cannot disable registration', function () {
    $context = createClinicWorkflow(SystemRole::FrontOffice);
    ClinicWorkflowSetting::withoutGlobalScopes()->where('clinic_id', $context['clinic']->id)->update(['allow_walk_in' => false]);

    registerPatient($this, $context)->assertRedirect(route('registrations.index'));

    expect(Encounter::withoutGlobalScopes()->sole()->status)->toBe(EncounterStatus::WaitingTriage);
});

test('creating a patient from registration returns with that patient selected', function () {
    $context = createClinicWorkflow(SystemRole::FrontOffice);

    $this->actingAs($context['user'])->get(route('patients.create', ['register' => 1]))
        ->assertInertia(fn (Assert $page) => $page->where('continueRegistration', true));
    $this->post(route('patients.store', ['register' => 1]), [
        'name' => 'Pasien Dari Pendaftaran', 'birth_date' => '1988-01-02', 'gender' => 'female',
    ])->assertRedirect(route('registrations.create', ['patient' => Patient::withoutGlobalScopes()->latest('id')->firstOrFail()->uuid]));
    $patient = Patient::withoutGlobalScopes()->latest('id')->firstOrFail();
    $this->get(route('registrations.create', ['patient' => $patient->uuid]))
        ->assertInertia(fn (Assert $page) => $page->where('initialPatient.uuid', $patient->uuid));
    expect(Encounter::withoutGlobalScopes()->count())->toBe(0);
});

test('the registration continuation requires encounter creation permission', function () {
    $context = createClinicUser(SystemRole::FrontOffice);
    $role = ClinicRole::factory()->create([
        'tenant_id' => $context['tenant']->id, 'clinic_id' => $context['clinic']->id, 'role_id' => $context['role']->id,
    ]);
    $role->permissions()->sync(Permission::query()->whereIn('key', ['patient.create', 'patient.view'])->pluck('id'));

    $this->actingAs($context['user'])->get(route('patients.create', ['register' => 1]))
        ->assertInertia(fn (Assert $page) => $page->where('continueRegistration', false));
    $response = $this->post(route('patients.store', ['register' => 1]), [
        'name' => 'Pasien Master', 'birth_date' => '1988-01-02', 'gender' => 'female',
    ]);
    $response->assertRedirect(route('patients.show', Patient::withoutGlobalScopes()->sole()));
});

test('incomplete clinics at the old final step can finish the simplified onboarding', function (int $step) {
    $context = createClinicWorkflow();
    ClinicService::factory()->create([
        'tenant_id' => $context['tenant']->id, 'clinic_id' => $context['clinic']->id, 'service_unit_id' => $context['serviceUnit']->id,
    ]);
    $context['clinic']->forceFill(['onboarding_step' => $step, 'onboarding_completed_at' => null])->save();

    $this->actingAs($context['user'])->get(route('onboarding.show'))
        ->assertInertia(fn (Assert $page) => $page->where('step', 5)->missing('readiness.workflow'));
    $this->post(route('onboarding.complete'))->assertRedirect(route('dashboard'));

    expect($context['clinic']->refresh()->onboarding_completed_at)->not->toBeNull();
})->with([5, 6]);

test('unfinished triage and doctor visits stay visible after the day changes', function (EncounterStatus $status, string $route, string $mode, string $counter) {
    $context = createClinicWorkflow();
    registerPatient($this, $context)->assertRedirect();
    $encounter = Encounter::withoutGlobalScopes()->sole();
    $encounter->forceFill(['status' => $status, 'encounter_date' => now()->subDay()->toDateString(), 'registered_at' => now()->subDay()])->save();

    $this->actingAs($context['user'])->get(route($route, ['mode' => $mode]))
        ->assertInertia(fn (Assert $page) => $page->has('encounters.data', 1)
            ->where('encounters.data.0.uuid', $encounter->uuid)->where('summary.'.$counter, 1));
})->with([
    'triage' => [EncounterStatus::WaitingTriage, 'triages.index', 'queue', 'waiting'],
    'doctor waiting' => [EncounterStatus::WaitingDoctor, 'doctor-queue.index', 'queue', 'waiting'],
    'consultation active' => [EncounterStatus::InConsultation, 'doctor-queue.index', 'active', 'active'],
]);
