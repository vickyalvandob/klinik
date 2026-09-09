<?php

namespace App\Http\Controllers;

use App\Http\Requests\ReportRequest;
use App\Services\ClinicReport;
use App\Support\Tenancy\CurrentClinic;
use Carbon\CarbonImmutable;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ReportController extends Controller
{
    public function index(ReportRequest $request, ClinicReport $report, CurrentClinic $currentClinic): Response
    {
        $from = $request->string('from')->toString();
        $to = $request->string('to')->toString();
        $sections = $report->sections($request->user());
        $section = $request->filled('section') ? $request->string('section')->toString()
            : (in_array('revenue', $sections, true) ? 'revenue' : ($sections[0] ?? null));
        abort_if($section !== null && ! in_array($section, $sections, true), 403);
        $today = CarbonImmutable::now($currentClinic->get()->timezone);

        return Inertia::render('reports/index', [
            'filters' => ['from' => $from, 'to' => $to],
            'summary' => fn (): array => $report->summary($request->user(), $from, $to),
            'sections' => $sections,
            'section' => $section,
            'rows' => fn (): array => $section === null ? [] : $report->rows($section, $from, $to),
            'periods' => [
                ['label' => 'Hari ini', 'from' => $today->toDateString(), 'to' => $today->toDateString()],
                ['label' => '7 hari terakhir', 'from' => $today->subDays(6)->toDateString(), 'to' => $today->toDateString()],
                ['label' => 'Bulan ini', 'from' => $today->startOfMonth()->toDateString(), 'to' => $today->toDateString()],
                ['label' => 'Bulan lalu', 'from' => $today->subMonthNoOverflow()->startOfMonth()->toDateString(), 'to' => $today->subMonthNoOverflow()->endOfMonth()->toDateString()],
            ],
            'timezone' => $currentClinic->get()->timezone,
            'canExport' => $request->user()->hasClinicPermission('report.export'),
        ]);
    }

    public function export(ReportRequest $request, ClinicReport $report): StreamedResponse
    {
        $sections = $report->sections($request->user());
        $section = $request->string('section', $sections[0] ?? 'visits')->toString();
        abort_unless(in_array($section, $report->sections($request->user()), true), 403);
        $rows = $report->rows($section, $request->string('from')->toString(), $request->string('to')->toString());

        return response()->streamDownload(function () use ($rows, $section): void {
            $stream = fopen('php://output', 'wb');
            if ($stream === false) {
                return;
            }
            fwrite($stream, "\xEF\xBB\xBF");
            fputcsv($stream, ['Ringkasan', 'Jumlah', 'Nominal (Rp)', ...($section === 'billing' ? ['Sisa tagihan (Rp)'] : [])], escape: '');
            foreach ($rows as $row) {
                $label = preg_match('/^[\s\x00-\x1F]*[=+@-]/u', $row['label']) === 1 ? "'".$row['label'] : $row['label'];
                fputcsv($stream, [$label, $row['count'], $row['amount'], ...($section === 'billing' ? [$row['balance'] ?? 0] : [])], escape: '');
            }
            fclose($stream);
        }, 'laporan-'.$section.'-'.$request->string('from').'-'.$request->string('to').'.csv', [
            'Content-Type' => 'text/csv; charset=UTF-8', 'Cache-Control' => 'private, no-store',
        ]);
    }
}
