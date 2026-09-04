<?php

use App\Actions\GenerateInvoice;
use App\Actions\TransitionEncounter;
use App\EncounterStatus;
use App\InvoiceStatus;
use App\MedicalRecordStatus;
use App\Models\BillingAudit;
use App\Models\ClinicService;
use App\Models\Encounter;
use App\Models\EncounterProcedure;
use App\Models\Invoice;
use App\Models\MedicalRecord;
use App\Models\Payment;
use App\PaymentStatus;
use App\Support\Tenancy\CurrentClinic;
use App\Support\Tenancy\CurrentTenant;
use App\SystemRole;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

test('invoice is generated once with immutable rupiah price snapshots', function () {
    $context = billableEncounter($this, price: 125000);
    $invoice = $context['invoice'];
    $service = $context['service'];

    $service->update(['name' => 'Nama tindakan baru', 'price' => 250000]);
    $sameInvoice = app(GenerateInvoice::class)->execute($context['encounter'], $context['user']->id);
    $item = $invoice->items()->sole();

    expect($invoice->invoice_number)->toMatch('/^INV-\d{8}-\d{4}$/')
        ->and($invoice->status)->toBe(InvoiceStatus::Issued)
        ->and($invoice->total_amount)->toBe(125000)
        ->and($invoice->balance_due)->toBe(125000)
        ->and($item->description_snapshot)->not->toBe('Nama tindakan baru')
        ->and($item->unit_price)->toBe(125000)
        ->and($sameInvoice->is($invoice))->toBeTrue()
        ->and(Invoice::withoutGlobalScopes()->count())->toBe(1)
        ->and(BillingAudit::withoutGlobalScopes()->sole()->action)->toBe('invoice_created');
});

test('cashier sees billing worklist and detail while pharmacy is forbidden', function () {
    $context = billableEncounter($this);

    $this->actingAs($context['user'])
        ->withSession(['current_clinic_id' => $context['clinic']->id])
        ->get(route('billing.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('billing/index')
            ->where('summary.outstanding_count', 1)
            ->where('summary.outstanding_amount', 100000)
            ->has('invoices.data', 1)
            ->where('invoices.data.0.uuid', $context['invoice']->uuid));

    $this->actingAs($context['user'])
        ->get(route('billing.show', $context['invoice']))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('billing/show')
            ->where('invoice.total_amount', 100000)
            ->where('can.receivePayment', true));

    $pharmacy = createClinicWorkflow(SystemRole::Pharmacy, requireTriage: false);

    $this->actingAs($pharmacy['user'])
        ->withSession(['current_clinic_id' => $pharmacy['clinic']->id])
        ->get(route('billing.index'))
        ->assertForbidden();
});

test('full payment completes encounter and opens an authorized receipt', function () {
    $context = billableEncounter($this);

    $response = $this->actingAs($context['user'])
        ->withSession(['current_clinic_id' => $context['clinic']->id])
        ->post(route('billing.payments.store', $context['invoice']), [
            'amount' => 100000,
            'method' => 'cash',
            'notes' => 'Pembayaran tunai di kasir.',
        ]);
    $payment = Payment::withoutGlobalScopes()->sole();

    $response->assertRedirect(route('billing.receipts.show', [$context['invoice'], $payment]));
    expect($context['invoice']->refresh()->status)->toBe(InvoiceStatus::Paid)
        ->and($context['invoice']->paid_amount)->toBe(100000)
        ->and($context['invoice']->balance_due)->toBe(0)
        ->and($context['encounter']->refresh()->status)->toBe(EncounterStatus::Completed)
        ->and($payment->payment_number)->toMatch('/^PAY-\d{8}-\d{4}$/')
        ->and(BillingAudit::withoutGlobalScopes()->latest('id')->value('action'))->toBe('payment_received');

    $this->actingAs($context['user'])
        ->get(route('billing.receipts.show', [$context['invoice'], $payment]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('billing/receipt')
            ->where('payment.amount', 100000)
            ->where('invoice.balance_due', 0));
});

test('partial payment follows clinic policy and never exceeds the balance', function () {
    $context = billableEncounter($this);

    $this->actingAs($context['user'])
        ->withSession(['current_clinic_id' => $context['clinic']->id])
        ->post(route('billing.payments.store', $context['invoice']), [
            'amount' => 40000,
            'method' => 'cash',
        ])->assertSessionHasErrors([
            'amount' => 'Klinik ini tidak mengizinkan pembayaran sebagian.',
        ]);

    expect(Payment::withoutGlobalScopes()->count())->toBe(0)
        ->and($context['invoice']->refresh()->status)->toBe(InvoiceStatus::Issued);

    $context['clinic']->workflowSetting()->update(['allow_partial_payment' => true]);

    $this->actingAs($context['user'])
        ->post(route('billing.payments.store', $context['invoice']), [
            'amount' => 40000,
            'method' => 'bank_transfer',
            'reference_number' => 'TRX-001',
        ])->assertRedirect();

    expect($context['invoice']->refresh()->status)->toBe(InvoiceStatus::PartiallyPaid)
        ->and($context['invoice']->paid_amount)->toBe(40000)
        ->and($context['invoice']->balance_due)->toBe(60000)
        ->and($context['encounter']->refresh()->status)->toBe(EncounterStatus::WaitingPayment);

    $this->actingAs($context['user'])
        ->post(route('billing.payments.store', $context['invoice']), [
            'amount' => 60001,
            'method' => 'cash',
        ])->assertSessionHasErrors(['amount' => 'Nominal melebihi sisa tagihan.']);

    expect(Payment::withoutGlobalScopes()->count())->toBe(1);
});

test('void payment preserves the transaction and reopens a completed encounter', function () {
    $context = billableEncounter($this);

    $this->actingAs($context['user'])
        ->withSession(['current_clinic_id' => $context['clinic']->id])
        ->post(route('billing.payments.store', $context['invoice']), [
            'amount' => 100000,
            'method' => 'cash',
        ])->assertRedirect();
    $payment = Payment::withoutGlobalScopes()->sole();

    $this->actingAs($context['user'])
        ->post(route('billing.payments.void', $payment), [
            'reason' => 'Pembayaran dicatat pada pasien yang salah.',
        ])->assertRedirect(route('billing.show', $context['invoice']));

    expect($payment->refresh()->status)->toBe(PaymentStatus::Voided)
        ->and($payment->void_reason)->toBe('Pembayaran dicatat pada pasien yang salah.')
        ->and($context['invoice']->refresh()->status)->toBe(InvoiceStatus::Issued)
        ->and($context['invoice']->paid_amount)->toBe(0)
        ->and($context['invoice']->balance_due)->toBe(100000)
        ->and($context['encounter']->refresh()->status)->toBe(EncounterStatus::WaitingPayment)
        ->and(Payment::withoutGlobalScopes()->count())->toBe(1)
        ->and(BillingAudit::withoutGlobalScopes()->latest('id')->value('action'))->toBe('payment_voided');
});

test('void invoice requires no active payment and retains its audit history', function () {
    $context = billableEncounter($this);

    $this->actingAs($context['user'])
        ->withSession(['current_clinic_id' => $context['clinic']->id])
        ->post(route('billing.void', $context['invoice']), [
            'reason' => 'Pelayanan dibatalkan berdasarkan koreksi administrasi.',
        ])->assertRedirect(route('billing.show', $context['invoice']));

    expect($context['invoice']->refresh()->status)->toBe(InvoiceStatus::Voided)
        ->and($context['invoice']->total_amount)->toBe(100000)
        ->and($context['invoice']->balance_due)->toBe(0)
        ->and($context['encounter']->refresh()->status)->toBe(EncounterStatus::Completed)
        ->and(Invoice::withoutGlobalScopes()->count())->toBe(1)
        ->and(BillingAudit::withoutGlobalScopes()->latest('id')->value('action'))->toBe('invoice_voided');
});

test('billing routes hide invoices from another tenant', function () {
    $context = billableEncounter($this);
    $foreign = billableEncounter($this);

    $this->actingAs($context['user'])
        ->withSession(['current_clinic_id' => $context['clinic']->id])
        ->get(route('billing.show', $foreign['invoice']))
        ->assertNotFound();
});

/** @return array<string, mixed> */
function billableEncounter(TestCase $testCase, int $price = 100000): array
{
    $context = createClinicWorkflow(SystemRole::Cashier, requireTriage: false);
    app(CurrentTenant::class)->set($context['tenant']);
    app(CurrentClinic::class)->set($context['clinic'], $context['membership']);
    $encounter = new Encounter([
        'patient_id' => $context['patient']->id,
        'service_unit_id' => $context['serviceUnit']->id,
        'practitioner_id' => $context['practitioner']->id,
        'encounter_date' => now()->toDateString(),
        'registration_sequence' => 1,
        'registration_number' => 'REG-'.now()->format('Ymd').'-0001',
        'registration_type' => 'walk_in',
        'chief_complaint' => 'Kontrol pasien',
        'status' => EncounterStatus::InConsultation,
        'registered_at' => now(),
        'started_at' => now(),
        'registered_by' => $context['user']->id,
    ]);
    $encounter->forceFill(['clinic_id' => $context['clinic']->id]);
    $encounter->save();
    $record = new MedicalRecord([
        'encounter_id' => $encounter->id,
        'patient_id' => $context['patient']->id,
        'practitioner_id' => $context['practitioner']->id,
        'subjective' => 'Kontrol pasien',
        'objective' => 'Keadaan umum baik',
        'assessment' => 'Pemulihan baik',
        'plan' => 'Tindakan rawat jalan',
        'status' => MedicalRecordStatus::Final,
        'finalized_at' => now(),
        'finalized_by' => $context['user']->id,
        'created_by' => $context['user']->id,
        'updated_by' => $context['user']->id,
    ]);
    $record->forceFill(['clinic_id' => $context['clinic']->id]);
    $record->save();
    $service = ClinicService::factory()->create([
        'tenant_id' => $context['tenant']->id,
        'clinic_id' => $context['clinic']->id,
        'service_unit_id' => $context['serviceUnit']->id,
        'code' => 'TIN-BILL',
        'name' => 'Tindakan klinik',
        'price' => $price,
    ]);
    $procedure = new EncounterProcedure([
        'encounter_id' => $encounter->id,
        'medical_record_id' => $record->id,
        'clinic_service_id' => $service->id,
        'practitioner_id' => $context['practitioner']->id,
        'code_system' => 'LOCAL',
        'code' => $service->code,
        'name_snapshot' => $service->name,
        'price_snapshot' => $price,
        'performed_at' => now(),
        'created_by' => $context['user']->id,
    ]);
    $procedure->forceFill(['clinic_id' => $context['clinic']->id]);
    $procedure->save();

    app(TransitionEncounter::class)->execute(
        $encounter,
        EncounterStatus::WaitingPayment,
        $context['user']->id,
        'Pelayanan selesai',
    );
    $invoice = Invoice::withoutGlobalScopes()->where('encounter_id', $encounter->id)->sole();
    $testCase->withSession(['current_clinic_id' => $context['clinic']->id]);

    return [
        ...$context,
        'encounter' => $encounter,
        'record' => $record,
        'service' => $service,
        'procedure' => $procedure,
        'invoice' => $invoice,
    ];
}
