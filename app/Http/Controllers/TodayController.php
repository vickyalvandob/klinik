<?php

namespace App\Http\Controllers;

use App\EncounterStatus;
use App\Models\Encounter;
use App\Models\ServiceUnit;
use App\Models\Triage;
use App\Support\Tenancy\CurrentClinic;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class TodayController extends Controller
{
    public function __construct(private readonly CurrentClinic $currentClinic) {}

    public function __invoke(Request $request): Response
    {
        Gate::authorize('viewAny', Encounter::class);

        $clinic = $this->currentClinic->get();
        $today = now($clinic->timezone)->toDateString();
        $search = Str::squish($request->string('search')->toString());
        $status = EncounterStatus::tryFrom($request->string('status')->toString());
        $selectedUnit = ServiceUnit::query()
            ->where('clinic_id', $clinic->id)
            ->where('uuid', $request->string('service_unit')->toString())
            ->first(['id', 'uuid']);

        $encounters = Encounter::query()
            ->where('clinic_id', $clinic->id)
            ->whereDate('encounter_date', $today)
            ->when($status !== null, fn (Builder $query) => $query->where('status', $status->value))
            ->when($selectedUnit !== null, fn (Builder $query) => $query->where('service_unit_id', $selectedUnit->id))
            ->when($search !== '', function (Builder $query) use ($search): void {
                $like = '%'.addcslashes($search, '\\%_').'%';

                $query->where(function (Builder $query) use ($like): void {
                    $query->where('registration_number', 'like', $like)
                        ->orWhereHas('patient', fn (Builder $query) => $query
                            ->where('name', 'like', $like)
                            ->orWhere('medical_record_number', 'like', $like))
                        ->orWhereHas('queueEntry', fn (Builder $query) => $query
                            ->where('queue_number', 'like', $like));
                });
            })
            ->with([
                'patient:id,uuid,medical_record_number,name,birth_date,gender',
                'serviceUnit:id,uuid,name',
                'practitioner:id,uuid,staff_profile_id,specialization',
                'practitioner.staffProfile:id,name',
                'queueEntry:id,uuid,encounter_id,queue_number,status',
            ])
            ->orderByRaw("CASE status WHEN 'waiting_triage' THEN 0 WHEN 'waiting_doctor' THEN 1 WHEN 'in_consultation' THEN 2 WHEN 'waiting_pharmacy' THEN 3 WHEN 'waiting_payment' THEN 4 WHEN 'completed' THEN 5 ELSE 6 END")
            ->orderBy('registered_at')
            ->orderBy('id')
            ->paginate(15)
            ->withQueryString()
            ->through(fn (Encounter $encounter): array => $this->encounterData($encounter));

        $statusCounts = Encounter::query()
            ->where('clinic_id', $clinic->id)
            ->whereDate('encounter_date', $today)
            ->selectRaw('status, COUNT(*) as aggregate')
            ->groupBy('status')
            ->pluck('aggregate', 'status');

        return Inertia::render('today/index', [
            'encounters' => $encounters,
            'summary' => [
                'total' => $statusCounts->sum(),
                'waiting' => (int) $statusCounts->get(EncounterStatus::WaitingTriage->value, 0)
                    + (int) $statusCounts->get(EncounterStatus::WaitingDoctor->value, 0),
                'in_service' => (int) $statusCounts->get(EncounterStatus::InConsultation->value, 0),
                'completed' => (int) $statusCounts->get(EncounterStatus::Completed->value, 0),
            ],
            'filters' => [
                'search' => $search,
                'status' => $status === null ? '' : $status->value,
                'service_unit' => $selectedUnit === null ? '' : $selectedUnit->uuid,
            ],
            'statusOptions' => collect(EncounterStatus::cases())
                ->reject(fn (EncounterStatus $option): bool => $option === EncounterStatus::Registered)
                ->map(fn (EncounterStatus $option): array => [
                    'value' => $option->value,
                    'label' => $option->label(),
                ])
                ->values(),
            'serviceUnits' => ServiceUnit::query()
                ->where('clinic_id', $clinic->id)
                ->where('type', 'outpatient')
                ->where('is_active', true)
                ->orderBy('name')
                ->orderBy('id')
                ->get(['uuid', 'name']),
            'can' => ['create' => Gate::allows('create', Encounter::class)],
            'today' => $today,
        ]);
    }

    /** @return array<string, mixed> */
    private function encounterData(Encounter $encounter): array
    {
        return [
            'uuid' => $encounter->uuid,
            'registration_number' => $encounter->registration_number,
            'registered_at' => $encounter->registered_at->toIso8601String(),
            'chief_complaint' => $encounter->chief_complaint,
            'status' => [
                'value' => $encounter->status->value,
                'label' => $encounter->status->label(),
                'tone' => $encounter->status->tone(),
            ],
            'patient' => [
                'uuid' => $encounter->patient->uuid,
                'medical_record_number' => $encounter->patient->medical_record_number,
                'name' => $encounter->patient->name,
                'birth_date' => $encounter->patient->birth_date->toDateString(),
                'gender' => $encounter->patient->gender,
            ],
            'service_unit' => [
                'uuid' => $encounter->serviceUnit->uuid,
                'name' => $encounter->serviceUnit->name,
            ],
            'practitioner' => [
                'uuid' => $encounter->practitioner->uuid,
                'name' => $encounter->practitioner->staffProfile->name,
                'specialization' => $encounter->practitioner->specialization,
            ],
            'queue' => [
                'uuid' => $encounter->queueEntry->uuid,
                'number' => $encounter->queueEntry->queue_number,
                'status' => $encounter->queueEntry->status->value,
            ],
            'can_cancel' => Gate::allows('cancel', $encounter),
            'can_triage' => Gate::allows('save', [Triage::class, $encounter]),
        ];
    }
}
