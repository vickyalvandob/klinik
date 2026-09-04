<?php

use App\EncounterStatus;
use App\Models\Encounter;
use App\Models\EncounterStatusHistory;
use App\Models\QueueEntry;
use App\QueueStatus;
use App\SystemRole;
use Inertia\Testing\AssertableInertia as Assert;

test('front office registration creates a triage encounter, queue, and status audit atomically', function () {
    $context = createClinicWorkflow(SystemRole::FrontOffice);

    $this->actingAs($context['user'])->post(route('registrations.store'), [
        'patient_id' => $context['patient']->uuid,
        'service_unit_id' => $context['serviceUnit']->uuid,
        'practitioner_id' => $context['practitioner']->uuid,
        'chief_complaint' => 'Demam sejak dua hari',
    ])->assertRedirect(route('dashboard'));

    $encounter = Encounter::withoutGlobalScopes()->sole();
    $queue = QueueEntry::withoutGlobalScopes()->sole();
    $history = EncounterStatusHistory::withoutGlobalScopes()->sole();

    expect($encounter->tenant_id)->toBe($context['tenant']->id)
        ->and($encounter->clinic_id)->toBe($context['clinic']->id)
        ->and($encounter->status)->toBe(EncounterStatus::WaitingTriage)
        ->and($encounter->registration_number)->toMatch('/^REG-\d{8}-0001$/')
        ->and($queue->queue_number)->toBe('A001')
        ->and($queue->status)->toBe(QueueStatus::Waiting)
        ->and($history->from_status)->toBeNull()
        ->and($history->to_status)->toBe(EncounterStatus::WaitingTriage);
});

test('registration skips triage when the clinic workflow disables it', function () {
    $context = createClinicWorkflow(SystemRole::FrontOffice, requireTriage: false);

    registerPatient($this, $context)->assertRedirect(route('dashboard'));

    expect(Encounter::withoutGlobalScopes()->sole()->status)
        ->toBe(EncounterStatus::WaitingDoctor);
});

test('registration rejects foreign patient, unit, and practitioner identifiers', function () {
    $context = createClinicWorkflow(SystemRole::FrontOffice);
    $foreign = createClinicWorkflow(SystemRole::FrontOffice);

    $this->actingAs($context['user'])->post(route('registrations.store'), [
        'patient_id' => $foreign['patient']->uuid,
        'service_unit_id' => $foreign['serviceUnit']->uuid,
        'practitioner_id' => $foreign['practitioner']->uuid,
        'chief_complaint' => 'Keluhan pasien',
    ])->assertSessionHasErrors(['patient_id', 'service_unit_id', 'practitioner_id']);

    expect(Encounter::withoutGlobalScopes()->count())->toBe(0);
});

test('a patient cannot have two active encounters on the same day', function () {
    $context = createClinicWorkflow(SystemRole::FrontOffice);
    registerPatient($this, $context)->assertRedirect();

    registerPatient($this, $context)
        ->assertSessionHasErrors([
            'patient_id' => 'Pasien sudah memiliki kunjungan aktif hari ini.',
        ]);

    expect(Encounter::withoutGlobalScopes()->count())->toBe(1)
        ->and(QueueEntry::withoutGlobalScopes()->count())->toBe(1);
});

test('a completed visit does not block a legitimate second encounter on the same day', function () {
    $context = createClinicWorkflow(SystemRole::FrontOffice);
    registerPatient($this, $context)->assertRedirect();
    Encounter::withoutGlobalScopes()->sole()->forceFill([
        'status' => EncounterStatus::Completed,
    ])->save();

    registerPatient($this, $context)->assertRedirect();

    expect(Encounter::withoutGlobalScopes()
        ->orderBy('registration_sequence')
        ->pluck('registration_sequence')
        ->all())->toBe([1, 2])
        ->and(QueueEntry::withoutGlobalScopes()
            ->orderBy('queue_sequence')
            ->pluck('queue_number')
            ->all())->toBe(['A001', 'A002']);
});

test('the today worklist supports scoped search and operational summaries', function () {
    $context = createClinicWorkflow(SystemRole::FrontOffice);
    $context['patient']->forceFill(['name' => 'Budi Antrean'])->save();
    registerPatient($this, $context)->assertRedirect();

    $this->actingAs($context['user'])->get(route('dashboard', ['search' => 'Budi']))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('today/index')
            ->where('summary.total', 1)
            ->where('summary.waiting', 1)
            ->has('encounters.data', 1)
            ->where('encounters.data.0.patient.name', 'Budi Antrean')
            ->where('encounters.data.0.queue.number', 'A001'));
});

test('front office can cancel an eligible encounter with a reason and queue audit', function () {
    $context = createClinicWorkflow(SystemRole::FrontOffice);
    registerPatient($this, $context)->assertRedirect();
    $encounter = Encounter::withoutGlobalScopes()->sole();

    $this->actingAs($context['user'])
        ->post(route('encounters.cancellations.store', $encounter), [
            'reason' => 'Pasien memilih pulang',
        ])->assertRedirect();

    expect($encounter->refresh()->status)->toBe(EncounterStatus::Cancelled)
        ->and($encounter->cancellation_reason)->toBe('Pasien memilih pulang')
        ->and(QueueEntry::withoutGlobalScopes()->sole()->status)->toBe(QueueStatus::Cancelled)
        ->and(EncounterStatusHistory::withoutGlobalScopes()->count())->toBe(2)
        ->and(EncounterStatusHistory::withoutGlobalScopes()->latest('id')->value('to_status'))
        ->toBe(EncounterStatus::Cancelled);
});

test('users without encounter create permission cannot open or submit registration', function () {
    $context = createClinicWorkflow(SystemRole::Nurse);

    $this->actingAs($context['user'])->get(route('registrations.create'))->assertForbidden();
    registerPatient($this, $context)->assertForbidden();

    expect(Encounter::withoutGlobalScopes()->count())->toBe(0);
});

test('an encounter from another tenant is not discoverable by direct cancellation URL', function () {
    $context = createClinicWorkflow(SystemRole::FrontOffice);
    $foreign = createClinicWorkflow(SystemRole::FrontOffice);
    registerPatient($this, $foreign)->assertRedirect();
    $foreignEncounter = Encounter::withoutGlobalScopes()->sole();

    $this->actingAs($context['user'])
        ->post(route('encounters.cancellations.store', $foreignEncounter), [
            'reason' => 'Tidak boleh terlihat',
        ])->assertNotFound();
});
