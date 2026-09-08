<?php

use App\EncounterStatus;
use App\InvoiceStatus;
use App\MedicalRecordStatus;
use App\Models\Encounter;
use App\Models\Invoice;
use App\Models\MedicalRecord;
use App\Models\Medicine;
use App\Models\MedicineStock;
use App\Models\Permission;
use App\Models\Prescription;
use App\Models\PrescriptionAudit;
use App\Models\PrescriptionItem;
use App\Models\Role;
use App\Models\StockMovement;
use App\PrescriptionStatus;
use App\StockMovementType;
use App\Support\Tenancy\CurrentClinic;
use App\Support\Tenancy\CurrentTenant;
use App\SystemRole;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
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

test('pharmacy prioritizes older prescriptions and retains search across paginated results', function () {
    $context = pharmacyPrescription($this, stock: 20);
    $context['prescription']->update(['prescribed_at' => now()->subDay()]);
    for ($index = 0; $index < 20; $index++) {
        pharmacyPrescription($this, stock: 20, clinicContext: $context);
    }

    $this->actingAs($context['user'])->get(route('pharmacy.index', [
        'search' => $context['patient']->medical_record_number,
    ]))->assertOk()->assertInertia(fn (Assert $page) => $page
        ->where('prescriptions.total', 21)
        ->has('prescriptions.data', 20)
        ->where('prescriptions.data.0.uuid', $context['prescription']->uuid)
        ->where('prescriptions.next_page_url', fn (string $url): bool => str_contains($url, 'search='.$context['patient']->medical_record_number))
        ->missing('prescriptions.data.0.notes'));
});

test('pharmacy history filters completion dates in clinic timezone and includes cancellations', function () {
    config()->set('app.timezone', 'UTC');
    $context = pharmacyPrescription($this, stock: 20, status: PrescriptionStatus::Dispensed);
    $context['clinic']->update(['timezone' => 'Asia/Jakarta']);
    $context['prescription']->update(['prescribed_at' => '2026-09-01 10:00:00', 'dispensed_at' => '2026-09-07 17:00:00']);
    $cancelled = pharmacyPrescription($this, stock: 20, status: PrescriptionStatus::Cancelled, clinicContext: $context)['prescription'];
    $cancelled->update([
        'prescribed_at' => '2026-09-01 09:00:00',
        'cancelled_at' => '2026-09-08 16:59:59',
    ]);
    pharmacyPrescription($this, stock: 20, status: PrescriptionStatus::Dispensed, clinicContext: $context)['prescription']->update([
        'dispensed_at' => '2026-09-08 17:00:00',
    ]);

    $this->actingAs($context['user'])->get(route('pharmacy.index', ['mode' => 'history', 'date' => '2026-09-08']))
        ->assertOk()->assertInertia(fn (Assert $page) => $page
        ->where('date', '2026-09-08')
        ->where('timezone', 'Asia/Jakarta')
        ->has('prescriptions.data', 2)
        ->where('prescriptions.data.0.uuid', $cancelled->uuid)
        ->where('prescriptions.data.0.cancelled_at', $cancelled->cancelled_at->toIso8601String())
        ->where('prescriptions.data.1.uuid', $context['prescription']->uuid));
});

test('stock filters include missing stock and distinguish inactive medicines', function (string $filter, int $expectedCount) {
    $context = pharmacyPrescription($this, stock: 5);
    Medicine::factory()->create(['clinic_id' => $context['clinic']->id, 'minimum_stock' => 0, 'is_active' => true]);
    Medicine::factory()->create(['clinic_id' => $context['clinic']->id, 'is_active' => false]);

    $this->actingAs($context['user'])->get(route('pharmacy.index', ['mode' => 'stock', 'stock_status' => $filter]))
        ->assertOk()->assertInertia(fn (Assert $page) => $page
        ->where('summary.low_stock', 2)
        ->where('stockStatus', $filter)
        ->has('stocks.data', $expectedCount)
        ->where('can.adjust_stock', true)
        ->where('prescriptions', null));
})->with(['all' => ['all', 3], 'low' => ['low', 2], 'empty' => ['empty', 1], 'inactive' => ['inactive', 1]]);

test('pharmacy partial search skips stock and summary queries and stays clinic scoped', function () {
    $context = pharmacyPrescription($this, stock: 5);
    $foreign = pharmacyPrescription($this, stock: 5);
    $foreign['patient']->update(['name' => 'Pasien Rahasia Klinik Lain']);
    $this->actingAs($context['user'])->withSession(['current_clinic_id' => $context['clinic']->id])
        ->get(route('pharmacy.index'))->assertOk();
    DB::enableQueryLog();
    DB::flushQueryLog();

    $response = $this->actingAs($context['user'])
        ->withSession(['current_clinic_id' => $context['clinic']->id])
        ->withHeaders(['X-Inertia' => 'true', 'X-Inertia-Version' => Inertia::getVersion(), 'X-Inertia-Partial-Component' => 'pharmacy/index', 'X-Inertia-Partial-Data' => 'prescriptions,mode,search'])
        ->get(route('pharmacy.index'));
    $queries = collect(DB::getQueryLog())->pluck('query');
    DB::disableQueryLog();

    $response->assertOk()->assertJsonCount(1, 'props.prescriptions.data')
        ->assertJsonPath('props.prescriptions.data.0.uuid', $context['prescription']->uuid)
        ->assertJsonMissingPath('props.summary')->assertJsonMissingPath('props.stocks');
    expect($queries->filter(fn (string $sql): bool => str_contains($sql, 'medicine_stocks') || str_contains($sql, 'group by')))->toBeEmpty();

    $this->withHeaders(['X-Inertia-Partial-Data' => 'prescriptions,search'])
        ->get(route('pharmacy.index', ['search' => 'Pasien Rahasia Klinik Lain']))
        ->assertOk()->assertJsonCount(0, 'props.prescriptions.data');
});

test('prescription stock readiness adds duplicate medicine quantities and preserves return filters', function () {
    $context = pharmacyPrescription($this, stock: 15, status: PrescriptionStatus::Processing);
    PrescriptionItem::factory()->create([
        'clinic_id' => $context['clinic']->id,
        'prescription_id' => $context['prescription']->id,
        'medicine_id' => $context['medicine']->id,
        'quantity' => 10,
    ]);

    $this->actingAs($context['user'])->get(route('pharmacy.show', [
        $context['prescription'], 'mode' => 'processing', 'search' => 'pasien', 'page' => 2,
    ]))->assertOk()->assertInertia(fn (Assert $page) => $page
        ->where('prescription.items.0.required_quantity', 20)
        ->where('prescription.items.0.stock_sufficient', false)
        ->where('prescription.items.1.stock_sufficient', false)
        ->where('returnFilters.mode', 'processing')
        ->where('returnFilters.search', 'pasien')
        ->where('returnFilters.page', '2'));

    $this->post(route('pharmacy.dispensing.store', $context['prescription']))->assertSessionHasErrors('stock');
    expect($context['stock']->refresh()->quantity)->toBe('15.00');
    expect(StockMovement::withoutGlobalScopes()->count())->toBe(0);
});

test('stock viewers cannot adjust stock and the worklist matches that permission', function () {
    $context = pharmacyPrescription($this, stock: 20);
    $context['membership']->update(['role_id' => Role::query()->where('code', SystemRole::Cashier->value)->sole()->id]);
    $context['membership']->permissions()->attach(Permission::query()->where('key', 'pharmacy.view')->sole());

    $this->actingAs($context['user'])->get(route('pharmacy.index', ['mode' => 'stock']))
        ->assertOk()->assertInertia(fn (Assert $page) => $page->where('can.adjust_stock', false));
    $this->post(route('pharmacy.stock.adjustments.store', $context['medicine']), [
        'quantity_change' => 5, 'reason' => 'Penerimaan obat baru',
    ])->assertForbidden();
    expect($context['stock']->refresh()->quantity)->toBe('20.00');
});

test('stock adjustment returns to the filtered list after saving', function () {
    $context = pharmacyPrescription($this, stock: 20);
    $url = route('pharmacy.index', ['mode' => 'stock', 'search' => $context['medicine']->code]);
    $this->actingAs($context['user'])->from($url)
        ->post(route('pharmacy.stock.adjustments.store', $context['medicine']), ['quantity_change' => 5, 'reason' => 'Penerimaan obat baru'])
        ->assertRedirect($url);
    expect($context['stock']->refresh()->quantity)->toBe('25.00');
});

test('pharmacy rejects malformed worklist filters', function (array $query, string $field, string $message) {
    $context = createClinicUser(SystemRole::Pharmacy);
    $this->actingAs($context['user'])->withSession(['current_clinic_id' => $context['clinic']->id])
        ->get(route('pharmacy.index', $query))->assertSessionHasErrors([$field => $message]);
})->with([
    'mode' => [['mode' => 'unknown'], 'mode', 'Daftar apotek tidak valid.'],
    'long search' => [['search' => str_repeat('a', 101)], 'search', 'Pencarian maksimal 100 karakter.'],
    'array search' => [['search' => ['invalid']], 'search', 'Masukkan kata pencarian yang valid.'],
    'date' => [['date' => '2026-02-31'], 'date', 'Tanggal selesai tidak valid.'],
    'stock' => [['stock_status' => 'unknown'], 'stock_status', 'Filter stok tidak valid.'],
    'page' => [['page' => 0], 'page', 'Halaman minimal 1.'],
]);

/**
 * @param  array<string, mixed>|null  $clinicContext
 * @return array<string, mixed>
 */
function pharmacyPrescription(
    TestCase $testCase,
    float $stock,
    PrescriptionStatus $status = PrescriptionStatus::Prescribed,
    ?array $clinicContext = null,
): array {
    $context = $clinicContext ?? createClinicWorkflow(SystemRole::Pharmacy, requireTriage: false);
    app(CurrentTenant::class)->set($context['tenant']);
    app(CurrentClinic::class)->set($context['clinic'], $context['membership']);
    $context['clinic']->workflowSetting()->update(['billing_enabled' => false, 'pharmacy_enabled' => false]);
    $sequence = (int) Encounter::query()->where('clinic_id', $context['clinic']->id)->max('registration_sequence') + 1;
    $encounter = new Encounter([
        'patient_id' => $context['patient']->id,
        'service_unit_id' => $context['serviceUnit']->id,
        'practitioner_id' => $context['practitioner']->id,
        'encounter_date' => now()->toDateString(),
        'registration_sequence' => $sequence,
        'registration_number' => 'REG-'.now()->format('Ymd').'-'.str_pad((string) $sequence, 4, '0', STR_PAD_LEFT),
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
