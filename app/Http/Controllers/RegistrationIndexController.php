<?php

namespace App\Http\Controllers;

use App\EncounterStatus;
use App\Http\Requests\RegistrationIndexRequest;
use App\Models\Encounter;
use App\Models\Patient;
use App\Models\ServiceUnit;
use App\Models\Triage;
use App\Support\RegistrationFormData;
use App\Support\Tenancy\CurrentClinic;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class RegistrationIndexController extends Controller
{
    public function __construct(private readonly CurrentClinic $currentClinic) {}

    public function __invoke(RegistrationIndexRequest $request, RegistrationFormData $formData): Response
    {
        Gate::authorize('viewAny', Encounter::class);

        $clinic = $this->currentClinic->get();
        $today = now($clinic->timezone)->toDateString();
        $date = $request->validated('date') ?? $today;
        $nextDate = Carbon::parse($date)->addDay()->toDateString();
        $search = Str::squish($request->string('search')->toString());
        $status = EncounterStatus::tryFrom($request->string('status')->toString());
        $selectedUnit = $request->filled('service_unit') ? ServiceUnit::query()
            ->where('clinic_id', $clinic->id)
            ->where('uuid', $request->string('service_unit')->toString())
            ->first(['id', 'uuid']) : null;

        $encounters = fn () => Encounter::query()
            ->where('clinic_id', $clinic->id)
            ->where('encounter_date', '>=', $date)
            ->where('encounter_date', '<', $nextDate)
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
            ->select(['id', 'uuid', 'tenant_id', 'clinic_id', 'patient_id', 'service_unit_id', 'practitioner_id', 'registration_number', 'registered_at', 'chief_complaint', 'status'])
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

        return Inertia::render('registrations/index', [
            'encounters' => $encounters,
            'summary' => function () use ($clinic, $date, $nextDate): array {
                $statusCounts = Encounter::query()
                    ->where('clinic_id', $clinic->id)
                    ->where('encounter_date', '>=', $date)
                    ->where('encounter_date', '<', $nextDate)
                    ->selectRaw('status, COUNT(*) as aggregate')
                    ->groupBy('status')->pluck('aggregate', 'status');

                return [
                    'total' => $statusCounts->sum(),
                    'waiting' => (int) $statusCounts->get(EncounterStatus::WaitingTriage->value, 0)
                        + (int) $statusCounts->get(EncounterStatus::WaitingDoctor->value, 0),
                    'in_service' => (int) $statusCounts->get(EncounterStatus::InConsultation->value, 0),
                    'completed' => (int) $statusCounts->get(EncounterStatus::Completed->value, 0),
                ];
            },
            'registration' => fn () => Gate::allows('create', Encounter::class) ? [
                'initialPatient' => $formData->initialPatient($request->string('patient')->toString()),
                'serviceUnits' => $formData->serviceUnits(),
                'practitioners' => $formData->practitioners(),
                'canCreatePatient' => Gate::allows('create', Patient::class),
            ] : null,
            'filters' => [
                'date' => $date,
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
            'serviceUnits' => fn () => ServiceUnit::query()
                ->where('clinic_id', $clinic->id)
                ->where('type', 'outpatient')
                ->orderBy('name')
                ->orderBy('id')
                ->get(['uuid', 'name']),
            'can' => ['create' => Gate::allows('create', Encounter::class), 'view_patient' => Gate::allows('viewAny', Patient::class)],
            'today' => $today,
            'timezone' => $clinic->timezone,
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
