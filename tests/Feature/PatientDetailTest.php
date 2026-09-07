<?php

use App\EncounterStatus;
use App\Models\Clinic;
use App\Models\Encounter;
use App\Models\MedicalRecordAccessLog;
use App\Models\Patient;
use App\Models\Permission;
use App\Models\Practitioner;
use App\Models\ServiceUnit;
use App\Models\StaffProfile;
use App\SystemRole;
use Inertia\Testing\AssertableInertia as Assert;

test('patient detail summarizes only this patient visits in the active clinic', function () {
    $this->freezeTime();
    $context = createClinicWorkflow();
    registerPatient($this, $context)->assertSessionHasNoErrors();
    $first = Encounter::withoutGlobalScopes()->sole();
    $first->forceFill(['status' => EncounterStatus::Completed, 'registered_at' => now()->subDays(2)])->save();
    registerPatient($this, $context)->assertSessionHasNoErrors();
    $cancelled = Encounter::withoutGlobalScopes()->latest('id')->firstOrFail();
    $cancelled->forceFill(['status' => EncounterStatus::Cancelled, 'registered_at' => now()->subDay()])->save();
    registerPatient($this, $context)->assertSessionHasNoErrors();
    $active = Encounter::withoutGlobalScopes()->latest('id')->firstOrFail();

    $otherClinic = Clinic::factory()->for($context['tenant'])->create();
    $otherServiceUnit = ServiceUnit::factory()->create(['tenant_id' => $context['tenant']->id, 'clinic_id' => $otherClinic->id]);
    $otherStaff = StaffProfile::factory()->create(['tenant_id' => $context['tenant']->id, 'clinic_id' => $otherClinic->id]);
    $otherPractitioner = Practitioner::factory()->create(['tenant_id' => $context['tenant']->id, 'clinic_id' => $otherClinic->id, 'staff_profile_id' => $otherStaff->id]);
    Encounter::factory()->create([
        'tenant_id' => $context['tenant']->id, 'clinic_id' => $otherClinic->id,
        'patient_id' => $context['patient']->id, 'status' => EncounterStatus::Completed,
        'service_unit_id' => $otherServiceUnit->id, 'practitioner_id' => $otherPractitioner->id,
        'registered_at' => now()->addDay(),
    ]);
    $otherPatient = Patient::factory()->create(['tenant_id' => $context['tenant']->id]);
    Encounter::factory()->create([
        'tenant_id' => $context['tenant']->id, 'clinic_id' => $context['clinic']->id,
        'patient_id' => $otherPatient->id, 'status' => EncounterStatus::Completed,
        'service_unit_id' => $context['serviceUnit']->id, 'practitioner_id' => $context['practitioner']->id,
    ]);

    $this->get(route('patients.show', $context['patient']))
        ->assertInertia(fn (Assert $page) => $page
            ->component('patients/show')
            ->where('patient.uuid', $context['patient']->uuid)
            ->where('clinic.name', $context['clinic']->name)
            ->where('visitSummary', ['total' => 3, 'active' => 1, 'completed' => 1, 'cancelled' => 1, 'last_visit_at' => $active->registered_at->toIso8601String()])
            ->has('encounters.data', 3)
            ->where('encounters.data.0.uuid', $active->uuid)
            ->where('encounters.data.2.uuid', $first->uuid)
            ->where('can.register', true)
            ->where('can.update', true));
});

test('patient history filters retain the complete summary', function (string $filter, string $expectedFilter, string $expectedStatus, int $count) {
    $context = createClinicWorkflow(SystemRole::FrontOffice);
    foreach ([EncounterStatus::Completed, EncounterStatus::Cancelled, EncounterStatus::WaitingTriage] as $status) {
        registerPatient($this, $context)->assertSessionHasNoErrors();
        Encounter::withoutGlobalScopes()->latest('id')->firstOrFail()->forceFill(['status' => $status])->save();
    }

    $this->get(route('patients.show', ['patient' => $context['patient'], 'history' => $filter]))
        ->assertInertia(fn (Assert $page) => $page
            ->where('filters.history', $expectedFilter)
            ->where('visitSummary.total', 3)
            ->where('visitSummary.active', 1)
            ->where('visitSummary.completed', 1)
            ->where('visitSummary.cancelled', 1)
            ->has('encounters.data', $count)
            ->where('encounters.data.0.status.value', $expectedStatus));
})->with([
    'active' => ['active', 'active', 'waiting_triage', 1],
    'completed' => ['completed', 'completed', 'completed', 1],
    'cancelled' => ['cancelled', 'cancelled', 'cancelled', 1],
    'unknown filter' => ['unknown', 'all', 'waiting_triage', 3],
]);

test('patient history pagination stays bounded and retains its filter', function () {
    $context = createClinicWorkflow(SystemRole::FrontOffice);
    for ($index = 0; $index < 11; $index++) {
        registerPatient($this, $context)->assertSessionHasNoErrors();
        Encounter::withoutGlobalScopes()->latest('id')->firstOrFail()->forceFill(['status' => EncounterStatus::Completed])->save();
    }

    $this->get(route('patients.show', ['patient' => $context['patient'], 'history' => 'completed']))
        ->assertInertia(fn (Assert $page) => $page
            ->has('encounters.data', 10)
            ->where('encounters.total', 11)
            ->where('encounters.next_page_url', fn (string $url): bool => str_contains($url, 'history=completed') && str_contains($url, 'encounters_page=2')));

    $this->get(route('patients.show', ['patient' => $context['patient'], 'history' => 'completed', 'encounters_page' => 2]))
        ->assertInertia(fn (Assert $page) => $page
            ->has('encounters.data', 1)
            ->where('encounters.from', 11)
            ->where('visitSummary.total', 11));
});

test('patient only permission never sends visit history even on partial requests', function () {
    $context = createClinicWorkflow(SystemRole::Cashier);
    $context['membership']->permissions()->sync(Permission::query()->where('key', 'patient.view')->pluck('id'));
    Encounter::factory()->create([
        'tenant_id' => $context['tenant']->id, 'clinic_id' => $context['clinic']->id,
        'patient_id' => $context['patient']->id, 'chief_complaint' => 'Keluhan rahasia',
        'service_unit_id' => $context['serviceUnit']->id, 'practitioner_id' => $context['practitioner']->id,
    ]);

    $this->actingAs($context['user'])->get(route('patients.show', $context['patient']))
        ->assertInertia(fn (Assert $page) => $page
            ->where('patient.uuid', $context['patient']->uuid)
            ->where('visitSummary', null)
            ->where('encounters', null)
            ->where('can.view_encounters', false)
            ->where('can.view_ticket', false)
            ->where('can.register', false)
            ->where('can.update', false)
            ->reloadOnly(['encounters', 'visitSummary'], fn (Assert $reload) => $reload
                ->where('encounters', null)->where('visitSummary', null)));
});

test('authorized patient detail links to records and invoices without exposing clinical content', function () {
    $context = createFinalizedVisit($this);

    $this->get(route('patients.show', $context['patient']))
        ->assertInertia(fn (Assert $page) => $page
            ->where('encounters.data.0.can_view_medical_record', true)
            ->where('encounters.data.0.invoice.uuid', $context['invoice']->uuid)
            ->where('encounters.data.0.invoice.balance_due', 100000)
            ->where('encounters.data.0.invoice.status_label', 'Belum dibayar')
            ->where('can.view_ticket', true)
            ->missing('encounters.data.0.medical_record')
            ->missing('encounters.data.0.diagnoses')
            ->missing('encounters.data.0.assessment'));

    $this->get(route('medical-records.edit', $context['encounter']))->assertOk();
    $this->assertDatabaseHas(MedicalRecordAccessLog::class, [
        'encounter_id' => $context['encounter']->id, 'actor_id' => $context['user']->id, 'action' => 'view',
    ]);
});

test('front office cannot receive medical record links or invoice data through patient detail', function () {
    $context = createFinalizedVisit($this);
    $frontOffice = createClinicUser(SystemRole::FrontOffice);
    $frontOffice['membership']->forceFill(['tenant_id' => $context['tenant']->id, 'clinic_id' => $context['clinic']->id])->save();

    $this->actingAs($frontOffice['user'])->withSession(['current_clinic_id' => $context['clinic']->id])
        ->get(route('patients.show', $context['patient']))
        ->assertInertia(fn (Assert $page) => $page
            ->where('encounters.data.0.can_view_medical_record', false)
            ->where('encounters.data.0.invoice', null)
            ->where('can.view_encounters', true));
});

test('new patient detail returns an empty history and an age appropriate for infants', function (string $birthDate, string $age) {
    $this->travelTo(now()->setDate(2026, 9, 7)->setTime(10, 0));
    $context = createClinicWorkflow();
    $context['patient']->forceFill(['birth_date' => $birthDate])->save();

    $this->actingAs($context['user'])->get(route('patients.show', $context['patient']))
        ->assertInertia(fn (Assert $page) => $page
            ->where('patient.age_label', $age)
            ->where('visitSummary.total', 0)
            ->where('visitSummary.last_visit_at', null)
            ->has('encounters.data', 0));
})->with([
    'adult before birthday' => ['1990-09-08', '35 tahun'],
    'birthday today' => ['1990-09-07', '36 tahun'],
    'infant' => ['2026-06-07', '3 bulan'],
    'newborn' => ['2026-09-05', '2 hari'],
]);

test('patient history handles a visit without a queue entry', function () {
    $context = createClinicWorkflow();
    Encounter::factory()->create([
        'tenant_id' => $context['tenant']->id, 'clinic_id' => $context['clinic']->id,
        'patient_id' => $context['patient']->id, 'service_unit_id' => $context['serviceUnit']->id,
        'practitioner_id' => $context['practitioner']->id,
    ]);

    $this->actingAs($context['user'])->get(route('patients.show', $context['patient']))
        ->assertInertia(fn (Assert $page) => $page
            ->where('encounters.data.0.queue_number', null)
            ->where('encounters.data.0.can_view_medical_record', false)
            ->where('encounters.data.0.invoice', null));
});

test('patient detail requires authentication and patient permission', function () {
    $context = createClinicWorkflow(SystemRole::Cashier);

    $this->get(route('patients.show', $context['patient']))->assertRedirect(route('login'));
    $this->actingAs($context['user'])->get(route('patients.show', $context['patient']))->assertForbidden();
});
