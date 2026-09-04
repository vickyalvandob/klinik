<?php

use App\EncounterStatus;
use App\InvoiceStatus;
use App\MedicalRecordStatus;
use App\Models\Encounter;
use App\Models\Invoice;
use App\Models\MedicalRecord;
use App\Models\Medicine;
use App\Models\MedicineStock;
use App\Models\Prescription;
use App\Models\PrescriptionAudit;
use App\Models\PrescriptionItem;
use App\Models\StockMovement;
use App\PrescriptionStatus;
use App\StockMovementType;
use App\Support\Tenancy\CurrentClinic;
use App\Support\Tenancy\CurrentTenant;
use App\SystemRole;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

test('owner opens one master data menu and chooses a data group', function () {
    $context = createClinicUser(SystemRole::OwnerAdmin);

    $this->actingAs($context['user'])
        ->withSession(['current_clinic_id' => $context['clinic']->id])
        ->get(route('master-data.overview'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('master-data/overview')
            ->has('resources', 5)
            ->where('resources.0.key', 'staff'));
});

test('pharmacy sees prescribed worklist and starts preparation', function () {
    $context = pharmacyPrescription($this, stock: 20);

    $this->actingAs($context['user'])
        ->withSession(['current_clinic_id' => $context['clinic']->id])
        ->get(route('pharmacy.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('pharmacy/index')
            ->where('summary.new', 1)
            ->has('prescriptions.data', 1)
            ->where('prescriptions.data.0.uuid', $context['prescription']->uuid));

    $this->actingAs($context['user'])
        ->post(route('pharmacy.processing.store', $context['prescription']))
        ->assertRedirect(route('pharmacy.show', $context['prescription']));

    expect($context['prescription']->refresh()->status)->toBe(PrescriptionStatus::Processing)
        ->and($context['prescription']->processing_started_at)->not->toBeNull()
        ->and(PrescriptionAudit::withoutGlobalScopes()->sole()->action)->toBe('processing_started');
});

test('dispensing decrements locked stock and advances encounter to billing', function () {
    $context = pharmacyPrescription($this, stock: 20, status: PrescriptionStatus::Processing);

    $this->actingAs($context['user'])
        ->withSession(['current_clinic_id' => $context['clinic']->id])
        ->post(route('pharmacy.dispensing.store', $context['prescription']))
        ->assertRedirect(route('pharmacy.index', ['mode' => 'processing']));

    $movement = StockMovement::withoutGlobalScopes()->sole();

    expect($context['prescription']->refresh()->status)->toBe(PrescriptionStatus::Dispensed)
        ->and($context['stock']->refresh()->quantity)->toBe('10.00')
        ->and($movement->type)->toBe(StockMovementType::Dispense)
        ->and($movement->quantity_before)->toBe('20.00')
        ->and($movement->quantity_after)->toBe('10.00')
        ->and($context['encounter']->refresh()->status)->toBe(EncounterStatus::WaitingPayment)
        ->and(Invoice::withoutGlobalScopes()->sole()->total_amount)->toBe(10000)
        ->and(PrescriptionAudit::withoutGlobalScopes()->sole()->action)->toBe('dispensed');

    $this->actingAs($context['user'])
        ->post(route('pharmacy.dispensing.store', $context['prescription']))
        ->assertForbidden();

    expect(StockMovement::withoutGlobalScopes()->count())->toBe(1);
});

test('dispensing rejects insufficient stock without partial changes', function () {
    $context = pharmacyPrescription($this, stock: 5, status: PrescriptionStatus::Processing);

    $this->actingAs($context['user'])
        ->withSession(['current_clinic_id' => $context['clinic']->id])
        ->from(route('pharmacy.show', $context['prescription']))
        ->post(route('pharmacy.dispensing.store', $context['prescription']))
        ->assertSessionHasErrors('stock');

    expect($context['prescription']->refresh()->status)->toBe(PrescriptionStatus::Processing)
        ->and($context['stock']->refresh()->quantity)->toBe('5.00')
        ->and($context['encounter']->refresh()->status)->toBe(EncounterStatus::WaitingPharmacy)
        ->and(StockMovement::withoutGlobalScopes()->count())->toBe(0)
        ->and(PrescriptionAudit::withoutGlobalScopes()->count())->toBe(0);
});

test('cancellation keeps the prescription history and requires a reason', function () {
    $context = pharmacyPrescription($this, stock: 20);

    $this->actingAs($context['user'])
        ->withSession(['current_clinic_id' => $context['clinic']->id])
        ->post(route('pharmacy.cancellations.store', $context['prescription']), ['reason' => 'singkat'])
        ->assertSessionHasErrors('reason');

    $this->actingAs($context['user'])
        ->post(route('pharmacy.cancellations.store', $context['prescription']), [
            'reason' => 'Dokter mengonfirmasi obat tidak perlu diberikan.',
        ])->assertRedirect(route('pharmacy.index'));

    expect($context['prescription']->refresh()->status)->toBe(PrescriptionStatus::Cancelled)
        ->and($context['prescription']->cancellation_reason)->toBe('Dokter mengonfirmasi obat tidak perlu diberikan.')
        ->and($context['encounter']->refresh()->status)->toBe(EncounterStatus::Completed)
        ->and(Invoice::withoutGlobalScopes()->sole()->status)->toBe(InvoiceStatus::Paid)
        ->and(Invoice::withoutGlobalScopes()->sole()->total_amount)->toBe(0)
        ->and($context['stock']->refresh()->quantity)->toBe('20.00')
        ->and(StockMovement::withoutGlobalScopes()->count())->toBe(0)
        ->and(PrescriptionAudit::withoutGlobalScopes()->sole()->action)->toBe('cancelled');
});

test('stock adjustment is audited and cannot create negative stock', function () {
    $context = pharmacyPrescription($this, stock: 5);

    $this->actingAs($context['user'])
        ->withSession(['current_clinic_id' => $context['clinic']->id])
        ->post(route('pharmacy.stock.adjustments.store', $context['medicine']), [
            'quantity_change' => 15,
            'reason' => 'Penerimaan stok awal farmasi',
        ])->assertRedirect(route('pharmacy.index', ['mode' => 'stock']));

    expect($context['stock']->refresh()->quantity)->toBe('20.00')
        ->and(StockMovement::withoutGlobalScopes()->sole()->type)->toBe(StockMovementType::Adjustment);

    $this->actingAs($context['user'])
        ->post(route('pharmacy.stock.adjustments.store', $context['medicine']), [
            'quantity_change' => -25,
            'reason' => 'Koreksi hasil hitung fisik',
        ])->assertSessionHasErrors('quantity_change');

    expect($context['stock']->refresh()->quantity)->toBe('20.00')
        ->and(StockMovement::withoutGlobalScopes()->count())->toBe(1);
});

test('pharmacy routes hide prescriptions from another clinic', function () {
    $context = pharmacyPrescription($this, stock: 20);
    $foreign = pharmacyPrescription($this, stock: 20);

    $this->actingAs($context['user'])
        ->withSession(['current_clinic_id' => $context['clinic']->id])
        ->get(route('pharmacy.show', $foreign['prescription']))
        ->assertNotFound();
});

/** @return array<string, mixed> */
function pharmacyPrescription(
    TestCase $testCase,
    float $stock,
    PrescriptionStatus $status = PrescriptionStatus::Prescribed,
): array {
    $context = createClinicWorkflow(SystemRole::Pharmacy, requireTriage: false);
    app(CurrentTenant::class)->set($context['tenant']);
    app(CurrentClinic::class)->set($context['clinic'], $context['membership']);
    $context['clinic']->workflowSetting()->update(['billing_enabled' => true, 'pharmacy_enabled' => true]);
    $encounter = new Encounter([
        'patient_id' => $context['patient']->id,
        'service_unit_id' => $context['serviceUnit']->id,
        'practitioner_id' => $context['practitioner']->id,
        'encounter_date' => now()->toDateString(),
        'registration_sequence' => 1,
        'registration_number' => 'REG-'.now()->format('Ymd').'-0001',
        'registration_type' => 'walk_in',
        'chief_complaint' => 'Demam sejak kemarin',
        'status' => EncounterStatus::WaitingPharmacy,
        'registered_at' => now(),
        'registered_by' => $context['user']->id,
    ]);
    $encounter->forceFill(['clinic_id' => $context['clinic']->id]);
    $encounter->save();
    $record = new MedicalRecord([
        'encounter_id' => $encounter->id,
        'patient_id' => $context['patient']->id,
        'practitioner_id' => $context['practitioner']->id,
        'subjective' => 'Demam sejak kemarin',
        'assessment' => 'Demam',
        'plan' => 'Terapi obat',
        'status' => MedicalRecordStatus::Final,
        'finalized_at' => now(),
        'finalized_by' => $context['user']->id,
        'created_by' => $context['user']->id,
        'updated_by' => $context['user']->id,
    ]);
    $record->forceFill(['clinic_id' => $context['clinic']->id]);
    $record->save();
    $medicine = Medicine::factory()->create([
        'tenant_id' => $context['tenant']->id,
        'clinic_id' => $context['clinic']->id,
        'minimum_stock' => 5,
    ]);
    $prescription = new Prescription([
        'encounter_id' => $encounter->id,
        'medical_record_id' => $record->id,
        'patient_id' => $context['patient']->id,
        'practitioner_id' => $context['practitioner']->id,
        'status' => $status,
        'prescribed_at' => now(),
        'processing_started_at' => $status === PrescriptionStatus::Processing ? now() : null,
        'processing_started_by' => $status === PrescriptionStatus::Processing ? $context['user']->id : null,
        'created_by' => $context['user']->id,
    ]);
    $prescription->forceFill(['clinic_id' => $context['clinic']->id]);
    $prescription->save();
    $item = new PrescriptionItem([
        'medicine_id' => $medicine->id,
        'medicine_name_snapshot' => $medicine->name,
        'strength_snapshot' => $medicine->strength,
        'dosage_form_snapshot' => $medicine->dosage_form,
        'quantity' => 10,
        'unit' => $medicine->unit,
        'instruction' => 'Minum sesuai petunjuk dokter.',
    ]);
    $item->forceFill([
        'clinic_id' => $context['clinic']->id,
        'prescription_id' => $prescription->id,
    ]);
    $item->save();
    $medicineStock = new MedicineStock(['medicine_id' => $medicine->id, 'quantity' => $stock]);
    $medicineStock->forceFill(['clinic_id' => $context['clinic']->id]);
    $medicineStock->save();
    $testCase->withSession(['current_clinic_id' => $context['clinic']->id]);

    return [
        ...$context,
        'encounter' => $encounter,
        'record' => $record,
        'medicine' => $medicine,
        'prescription' => $prescription,
        'stock' => $medicineStock,
    ];
}
