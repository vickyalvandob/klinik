<?php

use App\EncounterStatus;
use App\MedicalRecordStatus;
use App\Models\ClinicService;
use App\Models\DiagnosisCatalog;
use App\Models\Encounter;
use App\Models\MedicalRecord;
use App\Models\MedicalRecordAccessLog;
use App\Models\MedicalRecordAmendment;
use App\Models\MedicalRecordAudit;
use App\Models\Medicine;
use App\Models\Prescription;
use App\Models\QueueEntry;
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
        ->and($encounter->statusHistories()->withoutGlobalScopes()->count())->toBe(3);
});

test('owner manages clinical records without a practitioner link and preserves the responsible doctor', function () {
    $context = createClinicWorkflow(SystemRole::OwnerAdmin, requireTriage: false);
    $this->withSession(['current_clinic_id' => $context['clinic']->id]);
    registerPatient($this, $context)->assertRedirect();
    $encounter = Encounter::withoutGlobalScopes()->where('clinic_id', $context['clinic']->id)->sole();
    $this->actingAs($context['user'])->put(route('triages.update', $encounter), ['intent' => 'complete', 'chief_complaint' => 'Keluhan untuk konsultasi'])->assertRedirect();

    $this->actingAs($context['user'])->get(route('doctor-queue.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('doctor-queue/index')
            ->where('scope', 'clinic')
            ->has('encounters.data', 1)
            ->where('encounters.data.0.uuid', $encounter->uuid)
            ->where('encounters.data.0.can_start', true));

    $this->actingAs($context['user'])->post(route('consultations.store', $encounter))->assertRedirect();

    $this->actingAs($context['user'])->get(route('medical-records.edit', $encounter))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('medical-records/edit')
            ->where('can.view_patient', true)
            ->where('can.save', true)
            ->where('can.finalize', true));

    $diagnosis = DiagnosisCatalog::factory()->create();
    $this->put(route('medical-records.update', $encounter), [
        'intent' => 'finalize', 'subjective' => 'Kontrol', 'assessment' => 'Stabil', 'plan' => 'Observasi',
        'diagnoses' => [['catalog_id' => $diagnosis->uuid, 'type' => 'primary']],
    ])->assertSessionHasNoErrors()->assertRedirect();

    $record = MedicalRecord::withoutGlobalScopes()->where('encounter_id', $encounter->id)->sole();
    expect($record->practitioner_id)->toBe($context['practitioner']->id)
        ->and($record->finalized_by)->toBe($context['user']->id)
        ->and($record->status)->toBe(MedicalRecordStatus::Final);
    $this->post(route('medical-record-amendments.store', $record), [
        'reason' => 'Tambahan hasil pemeriksaan', 'content' => 'Kondisi pasien stabil.',
    ])->assertSessionHasNoErrors()->assertRedirect();
    expect($record->refresh()->status)->toBe(MedicalRecordStatus::Amended);
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

test('finalization requires complete soap and exactly one primary diagnosis even with legacy options disabled', function () {
    $context = startedClinicalEncounter($this);
    $context['clinic']->workflowSetting()->update(['require_primary_diagnosis' => false, 'require_final_medical_record' => false]);

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
    $context['clinic']->workflowSetting()->update(['pharmacy_enabled' => false, 'billing_enabled' => false]);
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
    $triageEncounter = Encounter::withoutGlobalScopes()->where('clinic_id', $context['clinic']->id)->sole();
    $testCase->actingAs($context['user'])->put(route('triages.update', $triageEncounter), ['intent' => 'complete', 'chief_complaint' => 'Keluhan untuk konsultasi'])->assertRedirect();
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

test('medical record search matches names and identifiers inside the assigned clinic scope', function () {
    $context = clinicalEncounter($this);
    $foreign = clinicalEncounter($this);
    $context['patient']->forceFill(['name' => 'Pasien Pencarian'])->save();
    $foreign['patient']->forceFill(['name' => 'Pasien Pencarian'])->save();
    $this->actingAs($context['user'])->withSession(['current_clinic_id' => $context['clinic']->id]);

    foreach (['Pasien Pencarian', $context['patient']->medical_record_number, $context['encounter']->registration_number] as $search) {
        $this->get(route('doctor-queue.index', ['search' => $search]))->assertOk()
            ->assertInertia(fn (Assert $page) => $page->has('encounters.data', 1)
                ->where('encounters.data.0.uuid', $context['encounter']->uuid)
                ->where('filters.search', $search));
    }
    $this->get(route('doctor-queue.index', ['search' => "' OR 1=1 --"]))->assertOk()
        ->assertInertia(fn (Assert $page) => $page->has('encounters.data', 0)->where('summary.waiting', 1));
});

test('medical record date filters include the entire selected day and validate reversed dates', function () {
    $context = clinicalEncounter($this);
    $context['encounter']->forceFill(['encounter_date' => '2026-01-10'])->save();
    $this->actingAs($context['user'])->get(route('doctor-queue.index', ['from' => '2026-01-10', 'to' => '2026-01-10']))
        ->assertOk()->assertInertia(fn (Assert $page) => $page->has('encounters.data', 1));
    $this->get(route('doctor-queue.index', ['to' => '2026-01-09']))
        ->assertOk()->assertInertia(fn (Assert $page) => $page->has('encounters.data', 0));
    $this->get(route('doctor-queue.index', ['from' => '2026-01-11', 'to' => '2026-01-10']))
        ->assertSessionHasErrors(['to' => 'Tanggal akhir harus sama atau setelah tanggal awal.']);
});

test('medical record filters reject malformed input', function (array $filters, string $field, string $message) {
    $context = clinicalEncounter($this);
    $this->actingAs($context['user'])->get(route('doctor-queue.index', $filters))
        ->assertSessionHasErrors([$field => $message]);
})->with([
    'invalid date' => [['from' => 'invalid'], 'from', 'Tanggal awal tidak valid.'],
    'long search' => [['search' => str_repeat('a', 101)], 'search', 'Pencarian maksimal 100 karakter.'],
]);

test('medical history lists newest visits first and paginates filtered results', function () {
    $context = clinicalEncounter($this);
    $context['encounter']->forceFill(['status' => EncounterStatus::Completed, 'registered_at' => '2026-01-01 08:00:00'])->save();
    $newest = null;
    for ($index = 1; $index <= 15; $index++) {
        $visit = Encounter::factory()->create([
            'tenant_id' => $context['tenant']->id, 'clinic_id' => $context['clinic']->id,
            'patient_id' => $context['patient']->id, 'service_unit_id' => $context['serviceUnit']->id,
            'practitioner_id' => $context['practitioner']->id, 'status' => EncounterStatus::Completed,
            'registration_sequence' => 100 + $index, 'registration_number' => 'HISTORY-'.$index,
            'encounter_date' => '2026-01-02', 'registered_at' => '2026-01-02 08:00:00',
        ]);
        QueueEntry::factory()->create([
            'encounter_id' => $visit->id,
            'tenant_id' => $visit->tenant_id, 'clinic_id' => $visit->clinic_id,
            'service_unit_id' => $visit->service_unit_id, 'practitioner_id' => $visit->practitioner_id,
            'queue_date' => '2026-01-02', 'queue_sequence' => 100 + $index, 'queue_number' => 'A'.(100 + $index),
            'status' => 'completed',
        ]);
        $newest = $visit;
    }
    $this->actingAs($context['user'])->get(route('doctor-queue.index', ['mode' => 'history']))
        ->assertOk()->assertInertia(fn (Assert $page) => $page->has('encounters.data', 15)
        ->where('encounters.total', 16)->where('encounters.data.0.uuid', $newest->uuid)
        ->reloadOnly(['encounters', 'mode', 'filters'], fn (Assert $reload) => $reload->missing('summary')->has('encounters.data', 15)));
    $this->get(route('doctor-queue.index', ['mode' => 'history', 'page' => 2]))
        ->assertOk()->assertInertia(fn (Assert $page) => $page->has('encounters.data', 1)
        ->where('encounters.data.0.uuid', $context['encounter']->uuid));
});

test('previous clinical history is loaded and audited only when requested', function () {
    $context = startedClinicalEncounter($this);
    $previous = Encounter::factory()->create([
        'tenant_id' => $context['tenant']->id, 'clinic_id' => $context['clinic']->id,
        'patient_id' => $context['patient']->id, 'service_unit_id' => $context['serviceUnit']->id,
        'practitioner_id' => $context['practitioner']->id, 'status' => EncounterStatus::Completed,
        'registration_sequence' => 100, 'registration_number' => 'PREVIOUS-100',
        'encounter_date' => '2026-01-01',
    ]);
    MedicalRecord::factory()->create([
        'tenant_id' => $context['tenant']->id, 'clinic_id' => $context['clinic']->id,
        'encounter_id' => $previous->id, 'patient_id' => $previous->patient_id,
        'practitioner_id' => $previous->practitioner_id, 'status' => MedicalRecordStatus::Final,
        'assessment' => 'Riwayat penilaian klinis', 'plan' => 'Kontrol',
    ]);
    $this->actingAs($context['user'])->get(route('medical-records.edit', $context['encounter']))
        ->assertOk()->assertInertia(fn (Assert $page) => $page->missing('previousEncounters'));
    expect(MedicalRecordAccessLog::withoutGlobalScopes()->where('action', 'history_view')->count())->toBe(0);
    $this->get(route('medical-records.edit', $context['encounter']))->assertInertia(fn (Assert $page) => $page
        ->reloadOnly('previousEncounters', fn (Assert $reload) => $reload->missing('encounter')
            ->has('previousEncounters', 1)->where('previousEncounters.0.uuid', $previous->uuid)
            ->where('previousEncounters.0.assessment', 'Riwayat penilaian klinis')));
    expect(MedicalRecordAccessLog::withoutGlobalScopes()->where('action', 'history_view')->count())->toBe(1);
});
