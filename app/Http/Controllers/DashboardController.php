<?php

namespace App\Http\Controllers;

use App\EncounterStatus;
use App\Models\Encounter;
use App\Services\ClinicReport;
use App\Support\Tenancy\CurrentClinic;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __construct(private readonly CurrentClinic $currentClinic) {}

    public function __invoke(Request $request, ClinicReport $report): Response
    {
        $clinic = $this->currentClinic->get();
        $today = now($clinic->timezone)->toDateString();
        $summary = null;

        if (Gate::allows('viewAny', Encounter::class)) {
            $counts = Encounter::query()
                ->where('clinic_id', $clinic->id)
                ->whereDate('encounter_date', $today)
                ->selectRaw('status, COUNT(*) as aggregate')
                ->groupBy('status')
                ->pluck('aggregate', 'status');

            $summary = [
                'total' => (int) $counts->sum(),
                'stages' => collect(EncounterStatus::cases())
                    ->reject(fn (EncounterStatus $status): bool => $status === EncounterStatus::Registered)
                    ->map(fn (EncounterStatus $status): array => [
                        'status' => $status->value,
                        'label' => $status->label(),
                        'count' => (int) $counts->get($status->value, 0),
                    ])->values(),
            ];
        }

        return Inertia::render('dashboard', [
            'today' => $today, 'summary' => $summary,
            'growth' => $request->user()->hasClinicPermission('report.view')
                ? $report->summary($request->user(), $today, $today) : null,
        ]);
    }
}
