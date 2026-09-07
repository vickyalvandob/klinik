<?php

namespace App\Http\Controllers;

use App\Http\Requests\ReportRequest;
use App\Services\ClinicReport;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ReportController extends Controller
{
    public function index(ReportRequest $request, ClinicReport $report): Response
    {
        $from = $request->string('from')->toString();
        $to = $request->string('to')->toString();
        $sections = $report->sections($request->user());

        return Inertia::render('reports/index', [
            'filters' => ['from' => $from, 'to' => $to],
            'summary' => $report->summary($request->user(), $from, $to),
            'sections' => $sections,
            'details' => Inertia::defer(fn (): array => collect($sections)
                ->mapWithKeys(fn (string $section): array => [$section => $report->rows($section, $from, $to)])->all()),
            'canExport' => $request->user()->hasClinicPermission('report.export'),
        ]);
    }

    public function export(ReportRequest $request, ClinicReport $report): StreamedResponse
    {
        $section = $request->string('section', 'visits')->toString();
        abort_unless(in_array($section, $report->sections($request->user()), true), 403);
        $rows = $report->rows($section, $request->string('from')->toString(), $request->string('to')->toString());

        return response()->streamDownload(function () use ($rows): void {
            $stream = fopen('php://output', 'wb');
            if ($stream === false) {
                return;
            }
            fwrite($stream, "\xEF\xBB\xBF");
            fputcsv($stream, ['Ringkasan', 'Jumlah', 'Nominal (Rp)'], escape: '');
            foreach ($rows as $row) {
                $label = preg_match('/^[\s\x00-\x1F]*[=+@-]/u', $row['label']) === 1 ? "'".$row['label'] : $row['label'];
                fputcsv($stream, [$label, $row['count'], $row['amount']], escape: '');
            }
            fclose($stream);
        }, 'laporan-'.$section.'-'.$request->string('from').'-'.$request->string('to').'.csv', [
            'Content-Type' => 'text/csv; charset=UTF-8', 'Cache-Control' => 'private, no-store',
        ]);
    }
}
