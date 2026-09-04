<?php

use App\EncounterStatus;
use App\MedicalRecordStatus;
use App\Models\ClinicService;
use App\Models\DiagnosisCatalog;
use App\Models\Encounter;
use App\Models\MedicalRecord;
use App\Models\MedicalRecordAmendment;
use App\Models\MedicalRecordAudit;
use App\Models\Medicine;
use App\Models\Prescription;
use App\Models\Role;
use App\PrescriptionStatus;
use App\SystemRole;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

test('assigned doctor sees their queue and starts a consultation', function () {
    $context = clinicalEncounter($this);
    $encounter = $context['encounter'];

    $this->actingAs($context['user'])->get(route('doctor-queue.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('doctor-queue/index')
            ->where('summary.waiting', 1)
            ->has('encounters.data', 1)
            ->where('encounters.data.0.uuid', $encounter->uuid)
            ->where('encounters.data.0.can_start', true));

    $this->actingAs($context['user'])
        ->post(route('consultations.store', $encounter))
        ->assertRedirect(route('medical-records.edit', $encounter));

    expect($encounter->refresh()->status)->toBe(EncounterStatus::InConsultation)
        ->and($encounter->started_at)->not->toBeNull()
        ->and($encounter->statusHistories()->withoutGlobalScopes()->count())->toBe(2);
});

test('owner sees the clinic medical record worklist without being able to edit as the assigned doctor', function () {
    $context = createClinicWorkflow(SystemRole::OwnerAdmin, requireTriage: false);
    $this->withSession(['current_clinic_id' => $context['clinic']->id]);
    registerPatient($this, $context)->assertRedirect();
    $encounter = Encounter::withoutGlobalScopes()->where('clinic_id', $context['clinic']->id)->sole();

    $this->actingAs($context['user'])->get(route('doctor-queue.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('doctor-queue/index')
            ->where('scope', 'clinic')
            ->has('encounters.data', 1)
            ->where('encounters.data.0.uuid', $encounter->uuid)
            ->where('encounters.data.0.can_start', false));

    $this->actingAs($context['user'])->get(route('medical-records.edit', $encounter))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('medical-records/edit')
            ->where('can.save', false)
            ->where('can.finalize', false));
});

test('doctor saves an audited draft with server-authoritative clinical snapshots', function () {
    $context = startedClinicalEncounter($this);
    $diagnosis = DiagnosisCatalog::factory()->create(['code' => 'J00', 'display' => 'Common cold']);
    $service = ClinicService::factory()->create([
        'tenant_id' => $context['tenant']->id,
        'clinic_id' => $context['clinic']->id,
        'service_unit_id' => $context['serviceUnit']->id,
        'code' => 'TIN-001',
        'name' => 'Perawatan luka',
        'price' => 75000,
    ]);
    $medicine = Medicine::factory()->create([
        'tenant_id' => $context['tenant']->id,
        'clinic_id' => $context['clinic']->id,
        'code' => 'OBT-001',
        'name' => 'Paracetamol',
        'strength' => '500 mg',
        'unit' => 'tablet',
    ]);

    $this->actingAs($context['user'])->put(route('medical-records.update', $context['encounter']), clinicalPayload(
        $diagnosis->uuid,
        $service->uuid,
        $medicine->uuid,
        'draft',
    ))->assertRedirect(route('medical-records.edit', $context['encounter']));

    $record = MedicalRecord::withoutGlobalScopes()->sole();
    $prescription = Prescription::withoutGlobalScopes()->sole();

    expect($record->status)->toBe(MedicalRecordStatus::Draft)
        ->and($record->diagnoses()->sole()->display)->toBe('Common cold')
        ->and($record->procedures()->sole()->name_snapshot)->toBe('Perawatan luka')
        ->and($record->procedures()->sole()->price_snapshot)->toBe(75000)
        ->and($prescription->status)->toBe(PrescriptionStatus::Draft)
        ->and($prescription->items()->sole()->medicine_name_snapshot)->toBe('Paracetamol')
        ->and(MedicalRecordAudit::withoutGlobalScopes()->sole()->action)->toBe('draft_saved')
        ->and($context['encounter']->refresh()->status)->toBe(EncounterStatus::InConsultation);
});

test('finalization requires complete soap and exactly one primary diagnosis', function () {
    $context = startedClinicalEncounter($this);

    $this->actingAs($context['user'])->put(route('medical-records.update', $context['encounter']), [
        'intent' => 'finalize',
        'subjective' => 'Demam sejak kemarin',
        'assessment' => 'Infeksi saluran napas atas',
        'plan' => 'Terapi simptomatik',
        'diagnoses' => [],
        'procedures' => [],
        'prescription_items' => [],
    ])->assertSessionHasErrors([
        'diagnoses' => 'Pilih satu diagnosis utama sebelum finalisasi.',
    ]);

    expect(MedicalRecord::withoutGlobalScopes()->count())->toBe(0)
        ->and($context['encounter']->refresh()->status)->toBe(EncounterStatus::InConsultation);
});

test('finalization locks the record and routes a prescription to pharmacy', function () {
    $context = startedClinicalEncounter($this);
    $diagnosis = DiagnosisCatalog::factory()->create(['code' => 'R50.9', 'display' => 'Fever, unspecified']);
    $service = ClinicService::factory()->create([
        'tenant_id' => $context['tenant']->id,
        'clinic_id' => $context['clinic']->id,
        'service_unit_id' => $context['serviceUnit']->id,
    ]);
    $medicine = Medicine::factory()->create([
        'tenant_id' => $context['tenant']->id,
        'clinic_id' => $context['clinic']->id,
    ]);
    $payload = clinicalPayload($diagnosis->uuid, $service->uuid, $medicine->uuid, 'finalize');

    $this->actingAs($context['user'])
        ->put(route('medical-records.update', $context['encounter']), $payload)
        ->assertRedirect(route('doctor-queue.index', ['mode' => 'history']));

    $record = MedicalRecord::withoutGlobalScopes()->sole();
    $encounter = $context['encounter']->refresh();

    expect($record->status)->toBe(MedicalRecordStatus::Final)
        ->and($record->finalized_at)->not->toBeNull()
        ->and($encounter->status)->toBe(EncounterStatus::WaitingPharmacy)
        ->and($encounter->clinical_finished_at)->not->toBeNull()
        ->and(Prescription::withoutGlobalScopes()->sole()->status)->toBe(PrescriptionStatus::Prescribed)
        ->and(MedicalRecordAudit::withoutGlobalScopes()->sole()->action)->toBe('finalized');

    $this->actingAs($context['user'])
        ->put(route('medical-records.update', $encounter), $payload)
        ->assertForbidden();

    expect($record->refresh()->subjective)->toBe('Demam sejak kemarin')
        ->and(MedicalRecordAudit::withoutGlobalScopes()->count())->toBe(1);
});

test('doctor adds an amendment without changing the original final record', function () {
    $context = startedClinicalEncounter($this);
    $diagnosis = DiagnosisCatalog::factory()->create();

    $this->actingAs($context['user'])->put(route('medical-records.update', $context['encounter']), [
        'intent' => 'finalize',
        'subjective' => 'Nyeri kepala sejak pagi',
        'objective' => 'Keadaan umum baik',
        'assessment' => 'Sakit kepala',
        'plan' => 'Istirahat dan observasi',
        'diagnoses' => [['catalog_id' => $diagnosis->uuid, 'type' => 'primary', 'notes' => null]],
        'procedures' => [],
        'prescription_items' => [],
    ])->assertRedirect();
    $record = MedicalRecord::withoutGlobalScopes()->sole();

    $this->actingAs($context['user'])->post(route('medical-record-amendments.store', $record), [
        'reason' => 'Klarifikasi hasil pemeriksaan',
        'content' => 'Tekanan darah dikonfirmasi 120/80 mmHg.',
    ])->assertRedirect();

    $amendment = MedicalRecordAmendment::withoutGlobalScopes()->sole();

    expect($record->refresh()->status)->toBe(MedicalRecordStatus::Amended)
        ->and($record->subjective)->toBe('Nyeri kepala sejak pagi')
        ->and($amendment->reason)->toBe('Klarifikasi hasil pemeriksaan')
        ->and(MedicalRecordAudit::withoutGlobalScopes()->latest('id')->value('action'))->toBe('amended');
});

test('clinical routes hide foreign encounters and foreign catalog records', function () {
    $context = clinicalEncounter($this);
    $foreign = clinicalEncounter($this);
    $foreignService = ClinicService::factory()->create([
        'tenant_id' => $foreign['tenant']->id,
        'clinic_id' => $foreign['clinic']->id,
        'service_unit_id' => $foreign['serviceUnit']->id,
        'name' => 'Tindakan Rahasia',
    ]);

    $this->actingAs($context['user'])
        ->withSession(['current_clinic_id' => $context['clinic']->id])
        ->get(route('medical-records.edit', $foreign['encounter']))
        ->assertNotFound();

    $this->actingAs($context['user'])
        ->withSession(['current_clinic_id' => $context['clinic']->id])
        ->getJson(route('clinical-catalog.show', ['resource' => 'services', 'search' => 'Rahasia']))
        ->assertOk()
        ->assertJsonMissing(['uuid' => $foreignService->uuid]);
});

/** @return array<string, mixed> */
function clinicalEncounter(TestCase $testCase): array
{
    $context = createClinicWorkflow(SystemRole::OwnerAdmin, requireTriage: false);
    $testCase->withSession(['current_clinic_id' => $context['clinic']->id]);
    registerPatient($testCase, $context)->assertRedirect();
    $doctorRoleId = (int) Role::query()->where('code', SystemRole::Doctor->value)->value('id');
    $context['membership']->forceFill([
        'role_id' => $doctorRoleId,
        'staff_profile_id' => $context['practitioner']->staff_profile_id,
    ])->save();
    $context['encounter'] = Encounter::withoutGlobalScopes()
        ->where('clinic_id', $context['clinic']->id)
        ->sole();

    return $context;
}

/** @return array<string, mixed> */
function startedClinicalEncounter(TestCase $testCase): array
{
    $context = clinicalEncounter($testCase);
    $testCase->actingAs($context['user'])
        ->post(route('consultations.store', $context['encounter']))
        ->assertRedirect();
    $context['encounter']->refresh();

    return $context;
}

/** @return array<string, mixed> */
function clinicalPayload(string $diagnosisUuid, string $serviceUuid, string $medicineUuid, string $intent): array
{
    return [
        'intent' => $intent,
        'subjective' => 'Demam sejak kemarin',
        'objective' => 'Suhu 38 derajat, keadaan umum baik',
        'assessment' => 'Demam tanpa tanda bahaya',
        'plan' => 'Terapi simptomatik dan kontrol bila memburuk',
        'additional_notes' => null,
        'diagnoses' => [[
            'catalog_id' => $diagnosisUuid,
            'type' => 'primary',
            'notes' => null,
        ]],
        'procedures' => [[
            'service_id' => $serviceUuid,
            'notes' => 'Dilakukan sesuai prosedur',
        ]],
        'prescription_notes' => 'Tidak ada substitusi tanpa konfirmasi.',
        'prescription_items' => [[
            'medicine_id' => $medicineUuid,
            'quantity' => 10,
            'dose_text' => '1 tablet',
            'frequency_text' => '3 kali sehari',
            'timing_text' => 'Sesudah makan',
            'duration_text' => '3 hari',
            'instruction' => 'Minum 1 tablet 3 kali sehari sesudah makan.',
            'notes' => null,
        ]],
    ];
}
