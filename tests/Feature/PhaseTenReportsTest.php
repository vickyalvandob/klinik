<?php

use App\Models\Invoice;
use App\Models\Payment;
use App\Models\Role;
use App\SystemRole;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Testing\AssertableInertia as Assert;

test('owner reports aggregate only current clinic visits and final clinical snapshots', function () {
    $this->travelTo(CarbonImmutable::parse('2026-09-06 10:00:00 UTC'));
    $context = createFinalizedVisit($this);
    createFinalizedVisit($this);

    $this->actingAs($context['user'])->withSession(['current_clinic_id' => $context['clinic']->id])
        ->get(route('reports.index', ['from' => '2026-09-06', 'to' => '2026-09-06', 'section' => 'services']))
        ->assertInertia(fn (Assert $page) => $page->component('reports/index')
            ->where('summary.visits', 1)->where('summary.outstanding', 100000)
            ->where('canExport', true)->has('sections', 7)->missing('patients')
            ->where('section', 'services')->has('rows', 1)->where('rows.0.amount', 100000)->missing('details'));

    foreach (['visits', 'diagnoses', 'doctors'] as $section) {
        $this->get(route('reports.index', ['from' => '2026-09-06', 'to' => '2026-09-06', 'section' => $section]))
            ->assertInertia(fn (Assert $page) => $page->where('section', $section)->has('rows', 1)->where('rows.0.count', 1));
    }
});

test('revenue uses local day boundaries and excludes voided and outside payments', function (string $storageTimezone, array $timestamps) {
    config(['app.timezone' => $storageTimezone]);
    $this->travelTo(CarbonImmutable::parse('2026-09-06 10:00:00 UTC'));
    $context = createFinalizedVisit($this);
    foreach ([[$timestamps[0], 1000, 'received'], [$timestamps[1], 2000, 'received'],
        [$timestamps[2], 3000, 'received'], [$timestamps[3], 4000, 'received'],
        ['2026-09-06 10:00:00', 5000, 'voided']] as [$time, $amount, $status]) {
        Payment::factory()->create(['invoice_id' => $context['invoice']->id, 'amount' => $amount, 'status' => $status, 'received_at' => $time]);
    }

    $this->get(route('reports.index', ['from' => '2026-09-06', 'to' => '2026-09-06']))
        ->assertInertia(fn (Assert $page) => $page->where('summary.revenue', 5000)->where('summary.voided_payments', 5000)
            ->where('summary.payment_count', 2)->where('summary.voided_count', 1)->where('rows.0.amount', 5000));
})->with([
    'UTC storage' => ['UTC', ['2026-09-05 16:59:59', '2026-09-05 17:00:00', '2026-09-06 16:59:59', '2026-09-06 17:00:00']],
    'Jakarta storage' => ['Asia/Jakarta', ['2026-09-05 23:59:59', '2026-09-06 00:00:00', '2026-09-06 23:59:59', '2026-09-07 00:00:00']],
]);

test('cashier reports exclude diagnoses pharmacy and export without additional grants', function () {
    $context = createFinalizedVisit($this);
    $context['membership']->update(['role_id' => Role::where('code', SystemRole::Cashier->value)->sole()->id]);

    $this->get(route('reports.index'))->assertInertia(fn (Assert $page) => $page
        ->where('canExport', false)->where('sections', ['revenue', 'billing', 'services'])
        ->where('section', 'revenue')->missing('details')->missing('summary.visits'));
    $this->get(route('reports.index', ['section' => 'diagnoses']))->assertForbidden();
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

test('report defaults use the current local day without mutating it to the first of the month', function () {
    $this->travelTo(CarbonImmutable::parse('2026-09-09 18:30:00 UTC'));
    createFinalizedVisit($this);

    $this->get(route('reports.index'))->assertInertia(fn (Assert $page) => $page
        ->where('filters.from', '2026-09-01')->where('filters.to', '2026-09-10')
        ->where('periods.0.from', '2026-09-10')->where('periods.0.to', '2026-09-10')
        ->where('periods.1.from', '2026-09-04')->where('periods.2.to', '2026-09-10')
        ->where('periods.3.from', '2026-08-01')->where('periods.3.to', '2026-08-31'));
});

test('switching report category loads only the selected rows and retains permission checks', function () {
    $context = createFinalizedVisit($this);
    $this->get(route('reports.index'))->assertOk();
    DB::enableQueryLog();
    DB::flushQueryLog();

    $response = $this->withHeaders(['X-Inertia' => 'true', 'X-Inertia-Version' => Inertia::getVersion(),
        'X-Inertia-Partial-Component' => 'reports/index', 'X-Inertia-Partial-Data' => 'rows,section'])
        ->get(route('reports.index', ['section' => 'visits']));
    $queries = collect(DB::getQueryLog())->pluck('query');
    DB::disableQueryLog();

    $response->assertJsonPath('props.section', 'visits')->assertJsonCount(1, 'props.rows')
        ->assertJsonMissingPath('props.summary')->assertJsonMissingPath('props.details');
    expect($queries->filter(fn (string $query): bool => str_contains($query, '"payments"') || str_contains($query, '"invoices"') || str_contains($query, '"diagnoses"')))->toBeEmpty();

    $context['membership']->update(['role_id' => Role::where('code', SystemRole::Cashier->value)->sole()->id]);
    $this->get(route('reports.index', ['section' => 'diagnoses']))->assertForbidden();
});

test('billing report uses invoice issue dates and shows current balances without counting voided invoices in totals', function () {
    config(['app.timezone' => 'UTC']);
    $this->travelTo(CarbonImmutable::parse('2026-09-09 10:00:00 UTC'));
    $context = createFinalizedVisit($this);
    $context['encounter']->update(['encounter_date' => '2026-09-01']);
    $context['invoice']->update(['issued_at' => '2026-09-08 17:00:00', 'status' => 'partially_paid', 'paid_amount' => 40000, 'balance_due' => 60000]);
    $foreign = createFinalizedVisit($this);
    Invoice::withoutGlobalScopes()->whereKey($foreign['invoice']->id)->update(['total_amount' => 900000]);

    $this->actingAs($context['user'])->withSession(['current_clinic_id' => $context['clinic']->id])
        ->get(route('reports.index', ['from' => '2026-09-09', 'to' => '2026-09-09', 'section' => 'billing']))
        ->assertInertia(fn (Assert $page) => $page->where('summary.invoiced', 100000)->where('summary.outstanding', 60000)
            ->where('summary.invoice_count', 1)->has('rows', 1)->where('rows.0.amount', 100000)->where('rows.0.balance', 60000));

    $context['invoice']->update(['status' => 'voided', 'balance_due' => 0]);
    $this->get(route('reports.index', ['from' => '2026-09-09', 'to' => '2026-09-09', 'section' => 'billing']))
        ->assertInertia(fn (Assert $page) => $page->where('summary.invoiced', 0)->where('summary.outstanding', 0)
            ->where('rows.0.label', 'Dibatalkan')->where('rows.0.amount', 100000)->where('rows.0.balance', 0));
});

test('billing report export includes outstanding balances and never patient identities', function () {
    $context = createFinalizedVisit($this);

    $response = $this->get(route('reports.export', ['section' => 'billing']));
    $response->assertDownload();
    expect($response->streamedContent())->toContain('Sisa tagihan (Rp)', '100000')
        ->not->toContain($context['patient']->name);
});
