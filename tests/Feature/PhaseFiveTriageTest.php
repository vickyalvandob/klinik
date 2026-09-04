<?php

use App\EncounterStatus;
use App\Models\Encounter;
use App\Models\Role;
use App\Models\Triage;
use App\Models\TriageAudit;
use App\QueueStatus;
use App\SystemRole;
use App\TriageStatus;
use Inertia\Testing\AssertableInertia as Assert;

test('nurse can open the waiting queue and save an audited triage draft', function () {
    $context = createClinicWorkflow(SystemRole::OwnerAdmin);
    registerPatient($this, $context)->assertRedirect();
    changeWorkflowRole($context, SystemRole::Nurse);
    $encounter = Encounter::withoutGlobalScopes()->sole();

    $this->actingAs($context['user'])->get(route('triages.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('triages/index')
            ->where('summary.waiting', 1)
            ->has('encounters.data', 1)
            ->where('encounters.data.0.uuid', $encounter->uuid));

    $this->actingAs($context['user'])->put(route('triages.update', $encounter), [
        'intent' => 'draft',
        'chief_complaint' => 'Demam dan batuk',
        'systolic_bp' => 120,
        'diastolic_bp' => 80,
        'heart_rate' => 84,
        'temperature' => 37.4,
        'spo2' => 98,
        'weight' => 62.5,
        'height' => 168,
        'pain_scale' => 2,
        'notes' => 'Kondisi umum baik',
    ])->assertRedirect();

    $triage = Triage::withoutGlobalScopes()->sole();
    $audit = TriageAudit::withoutGlobalScopes()->sole();

    expect($triage->status)->toBe(TriageStatus::Draft)
        ->and($triage->systolic_bp)->toBe(120)
        ->and($triage->completed_at)->toBeNull()
        ->and($encounter->refresh()->status)->toBe(EncounterStatus::WaitingTriage)
        ->and($audit->action)->toBe('draft_saved')
        ->and($audit->actor_id)->toBe($context['user']->id)
        ->and($audit->before_values)->toBeNull()
        ->and($audit->after_values['chief_complaint'])->toBe('Demam dan batuk');
});

test('completing triage moves the patient to the doctor queue and records immutable audit history', function () {
    $context = createClinicWorkflow(SystemRole::OwnerAdmin);
    registerPatient($this, $context)->assertRedirect();
    changeWorkflowRole($context, SystemRole::Nurse);
    $encounter = Encounter::withoutGlobalScopes()->sole();

    $this->actingAs($context['user'])->put(route('triages.update', $encounter), [
        'intent' => 'complete',
        'chief_complaint' => 'Pusing sejak pagi',
        'systolic_bp' => 110,
        'diastolic_bp' => 70,
        'heart_rate' => 76,
        'respiratory_rate' => 18,
        'temperature' => 36.8,
        'spo2' => 99,
        'pain_scale' => 3,
    ])->assertRedirect(route('triages.index'));

    $triage = Triage::withoutGlobalScopes()->sole();
    $encounter->refresh();

    expect($triage->status)->toBe(TriageStatus::Completed)
        ->and($triage->completed_at)->not->toBeNull()
        ->and($encounter->status)->toBe(EncounterStatus::WaitingDoctor)
        ->and($encounter->queueEntry->status)->toBe(QueueStatus::Waiting)
        ->and(TriageAudit::withoutGlobalScopes()->sole()->action)->toBe('completed')
        ->and($encounter->statusHistories()->withoutGlobalScopes()->count())->toBe(2);

    $this->actingAs($context['user'])->put(route('triages.update', $encounter), [
        'intent' => 'draft',
        'systolic_bp' => 130,
    ])->assertForbidden();

    expect($triage->refresh()->systolic_bp)->toBe(110)
        ->and(TriageAudit::withoutGlobalScopes()->count())->toBe(1);
});

test('triage rejects unsafe vital sign values and invalid blood pressure relation', function () {
    $context = createClinicWorkflow(SystemRole::OwnerAdmin);
    registerPatient($this, $context)->assertRedirect();
    changeWorkflowRole($context, SystemRole::Nurse);
    $encounter = Encounter::withoutGlobalScopes()->sole();

    $this->actingAs($context['user'])->put(route('triages.update', $encounter), [
        'intent' => 'complete',
        'systolic_bp' => 70,
        'diastolic_bp' => 90,
        'temperature' => 99,
        'spo2' => 101,
        'pain_scale' => 11,
    ])->assertSessionHasErrors([
        'systolic_bp' => 'Tekanan sistolik harus lebih tinggi daripada tekanan diastolik.',
        'temperature',
        'spo2',
        'pain_scale',
    ]);

    expect(Triage::withoutGlobalScopes()->count())->toBe(0)
        ->and(TriageAudit::withoutGlobalScopes()->count())->toBe(0)
        ->and($encounter->refresh()->status)->toBe(EncounterStatus::WaitingTriage);
});

test('front office cannot view or modify the nurse triage workspace', function () {
    $context = createClinicWorkflow(SystemRole::FrontOffice);
    registerPatient($this, $context)->assertRedirect();
    $encounter = Encounter::withoutGlobalScopes()->sole();

    $this->actingAs($context['user'])->get(route('triages.index'))->assertForbidden();
    $this->actingAs($context['user'])->get(route('triages.edit', $encounter))->assertForbidden();
    $this->actingAs($context['user'])->put(route('triages.update', $encounter), [
        'intent' => 'complete',
        'heart_rate' => 80,
    ])->assertForbidden();

    expect(Triage::withoutGlobalScopes()->count())->toBe(0);
});

test('a nurse cannot discover an encounter belonging to another tenant', function () {
    $context = createClinicWorkflow(SystemRole::Nurse);
    $foreign = createClinicWorkflow(SystemRole::FrontOffice);
    registerPatient($this, $foreign)->assertRedirect();
    $foreignEncounter = Encounter::withoutGlobalScopes()->sole();

    $this->actingAs($context['user'])
        ->get(route('triages.edit', $foreignEncounter))
        ->assertNotFound();
});

/** @param array<string, mixed> $context */
function changeWorkflowRole(array $context, SystemRole $role): void
{
    $roleId = (int) Role::query()->where('code', $role->value)->value('id');
    $context['membership']->forceFill(['role_id' => $roleId])->save();
}
