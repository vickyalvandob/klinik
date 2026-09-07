<?php

namespace App\Http\Controllers;

use App\EncounterStatus;
use App\Http\Requests\QueueIndexRequest;
use App\Models\Encounter;
use App\Models\QueueCall;
use App\Models\QueueEntry;
use App\Models\ServiceUnit;
use App\QueueStatus;
use App\Support\Tenancy\CurrentClinic;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\URL;
use Inertia\Inertia;
use Inertia\Response;

class QueueController extends Controller
{
    public function __construct(private readonly CurrentClinic $currentClinic) {}

    public function index(QueueIndexRequest $request): Response
    {
        $clinic = $this->currentClinic->get();
        $today = now($clinic->timezone)->startOfDay();
        $units = ServiceUnit::query()->where('clinic_id', $clinic->id)
            ->where('is_active', true)->where('type', 'outpatient')->orderBy('name')->orderBy('id')
            ->get(['id', 'uuid', 'name']);
        $selectedUnit = $request->filled('service_unit')
            ? $units->firstWhere('uuid', $request->validated('service_unit'))
            : $units->first();
        abort_if($request->filled('service_unit') && $selectedUnit === null, 404);
        $stage = $request->validated('stage') ?? 'triage';
        $encounterStatus = $stage === 'triage' ? EncounterStatus::WaitingTriage : EncounterStatus::WaitingDoctor;

        $query = QueueEntry::query()->where('clinic_id', $clinic->id)
            ->where('queue_date', '>=', $today->toDateString())
            ->where('queue_date', '<', $today->copy()->addDay()->toDateString())
            ->where('service_unit_id', $selectedUnit?->id)
            ->whereIn('status', [QueueStatus::Waiting, QueueStatus::Called])
            ->whereHas('encounter', fn (Builder $query) => $query->where('status', $encounterStatus));

        $counts = (clone $query)->selectRaw('status, COUNT(*) as aggregate')->groupBy('status')->pluck('aggregate', 'status');
        $queues = $query->with(['encounter:id,patient_id', 'encounter.patient:id,name,medical_record_number'])
            ->orderByRaw("CASE status WHEN 'called' THEN 0 ELSE 1 END")
            ->orderBy('queue_sequence')->orderBy('id')->paginate(15)->withQueryString()
            ->through(fn (QueueEntry $queue): array => [
                'uuid' => $queue->uuid,
                'number' => $queue->queue_number,
                'status' => $queue->status->value,
                'patient_name' => $queue->encounter->patient->name,
                'medical_record_number' => $queue->encounter->patient->medical_record_number,
                'called_at' => $queue->called_at?->toIso8601String(),
            ]);

        return Inertia::render('queues/index', [
            'queues' => $queues,
            'summary' => ['waiting' => (int) $counts->get('waiting', 0), 'called' => (int) $counts->get('called', 0)],
            'recentCalls' => QueueCall::query()->where('clinic_id', $clinic->id)
                ->where('queue_date', '>=', $today->toDateString())
                ->where('queue_date', '<', $today->copy()->addDay()->toDateString())
                ->latest('id')->limit(5)->get(['uuid', 'queue_number', 'destination', 'created_at']),
            'serviceUnits' => $units->map(fn (ServiceUnit $unit): array => $unit->only(['uuid', 'name'])),
            'filters' => ['service_unit' => $selectedUnit->uuid ?? '', 'stage' => $stage],
            'canCall' => $request->user()->hasClinicPermission('encounter.update'),
            'today' => $today->toDateString(),
            'timezone' => $clinic->timezone,
        ]);
    }

    public function show(): RedirectResponse
    {
        Gate::authorize('viewAny', Encounter::class);
        abort_unless($this->currentClinic->membership()->grantsPermission('queue.view'), 403);

        return redirect()->to(URL::temporarySignedRoute('queue-display.show', now()->addDay(), [
            'clinicUuid' => $this->currentClinic->get()->uuid,
        ]));
    }
}
