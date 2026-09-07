<?php

use App\Models\Payment;
use App\Models\Role;
use App\SystemRole;
use Carbon\CarbonImmutable;
use Inertia\Testing\AssertableInertia as Assert;

test('owner reports aggregate only current clinic visits and final clinical snapshots', function () {
    $this->travelTo(CarbonImmutable::parse('2026-09-06 10:00:00 UTC'));
    $context = createFinalizedVisit($this);
    createFinalizedVisit($this);

    $this->actingAs($context['user'])->withSession(['current_clinic_id' => $context['clinic']->id])
        ->get(route('reports.index', ['from' => '2026-09-06', 'to' => '2026-09-06']))
        ->assertInertia(fn (Assert $page) => $page->component('reports/index')
            ->where('summary.visits', 1)->where('summary.outstanding', 100000)
            ->where('canExport', true)->has('sections', 6)->missing('patients')
            ->loadDeferredProps(fn (Assert $deferred) => $deferred
                ->has('details.visits', 1)->where('details.services.0.amount', 100000)
                ->where('details.diagnoses.0.count', 1)->where('details.doctors.0.count', 1)));
});

test('revenue uses local day boundaries and excludes voided and outside payments', function () {
    $this->travelTo(CarbonImmutable::parse('2026-09-06 10:00:00 UTC'));
    $context = createFinalizedVisit($this);
    foreach ([['2026-09-05 16:59:59', 1000, 'received'], ['2026-09-05 17:00:00', 2000, 'received'],
        ['2026-09-06 16:59:59', 3000, 'received'], ['2026-09-06 17:00:00', 4000, 'received'],
        ['2026-09-06 10:00:00', 5000, 'voided']] as [$time, $amount, $status]) {
        Payment::factory()->create(['invoice_id' => $context['invoice']->id, 'amount' => $amount, 'status' => $status, 'received_at' => $time]);
    }

    $this->get(route('reports.index', ['from' => '2026-09-06', 'to' => '2026-09-06']))
        ->assertInertia(fn (Assert $page) => $page->where('summary.revenue', 5000)->where('summary.voided_payments', 5000));
});

test('cashier reports exclude diagnoses pharmacy and export without additional grants', function () {
    $context = createFinalizedVisit($this);
    $context['membership']->update(['role_id' => Role::where('code', SystemRole::Cashier->value)->sole()->id]);

    $this->get(route('reports.index'))->assertInertia(fn (Assert $page) => $page
        ->where('canExport', false)->where('sections', ['revenue', 'services'])
        ->loadDeferredProps(fn (Assert $deferred) => $deferred->missing('details.diagnoses')->missing('details.pharmacy')
            ->missing('details.visits')->missing('details.doctors')));
    $this->get(route('reports.export', ['section' => 'diagnoses']))->assertForbidden();
});

test('report export is aggregate only escapes spreadsheet formulas and validates date ranges', function () {
    $context = createFinalizedVisit($this);
    $context['practitioner']->staffProfile()->update(['name' => '=HYPERLINK("https://example.invalid")']);

    $response = $this->get(route('reports.export', ['section' => 'doctors']));
    $response->assertDownload();
    expect($response->streamedContent())->toContain("'=HYPERLINK")
        ->not->toContain($context['patient']->name)->not->toContain('Kontrol privat');
    $this->get(route('reports.index', ['from' => '2025-01-01', 'to' => '2026-09-06']))
        ->assertSessionHasErrors(['to' => 'Rentang laporan maksimal 366 hari.']);
    $this->get(route('reports.index', ['from' => '2026-09-07', 'to' => '2026-09-06']))
        ->assertSessionHasErrors('to');
});

test('reports require authentication and an explicit report permission', function () {
    $this->get(route('reports.index'))->assertRedirect(route('login'));
    $context = createClinicUser(SystemRole::FrontOffice);
    $this->actingAs($context['user'])->get(route('reports.index'))->assertForbidden();
});

test('report exports enforce rate limits and record export events', function () {
    config(['clinic-security.export_per_minute' => 1]);
    $context = createFinalizedVisit($this);
    $this->get(route('reports.export'))->assertDownload();
    $this->get(route('reports.export'))->assertTooManyRequests();
    $this->assertDatabaseHas('audit_events', ['clinic_id' => $context['clinic']->id, 'actor_id' => $context['user']->id, 'action' => 'reports.export', 'status_code' => 200]);
});
