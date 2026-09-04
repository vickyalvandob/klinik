<?php

namespace App\Http\Controllers;

use App\Actions\SaveTriage;
use App\EncounterStatus;
use App\Http\Requests\SaveTriageRequest;
use App\Models\Encounter;
use App\Models\Triage;
use App\Support\Tenancy\CurrentClinic;
use App\TriageStatus;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class TriageController extends Controller
{
    public function __construct(private readonly CurrentClinic $currentClinic) {}

    public function index(Request $request): Response
    {
        Gate::authorize('viewAny', Triage::class);

        $clinic = $this->currentClinic->get();
        $today = now($clinic->timezone)->toDateString();
        $mode = $request->string('mode')->toString() === 'completed' ? 'completed' : 'queue';

        $encounters = Encounter::query()
            ->where('clinic_id', $clinic->id)
            ->whereDate('encounter_date', $today)
            ->when(
                $mode === 'queue',
                fn (Builder $query) => $query->where('status', EncounterStatus::WaitingTriage->value),
                fn (Builder $query) => $query->whereHas('triage', fn (Builder $query) => $query
                    ->where('status', TriageStatus::Completed->value)
                    ->whereDate('completed_at', $today)),
            )
            ->with([
                'patient:id,uuid,medical_record_number,name,birth_date,gender',
                'patient.allergies' => fn ($query) => $query
                    ->where('status', 'active')
                    ->orderBy('substance')
                    ->select(['id', 'patient_id', 'substance']),
                'serviceUnit:id,uuid,name',
                'practitioner:id,uuid,staff_profile_id',
                'practitioner.staffProfile:id,name',
                'queueEntry:id,encounter_id,queue_number',
                'triage:id,encounter_id,status,updated_at,completed_at',
            ])
            ->orderBy('registered_at')
            ->orderBy('id')
            ->paginate(15)
            ->withQueryString()
            ->through(fn (Encounter $encounter): array => [
                'uuid' => $encounter->uuid,
                'registered_at' => $encounter->registered_at->toIso8601String(),
                'chief_complaint' => $encounter->chief_complaint,
                'patient' => [
                    'medical_record_number' => $encounter->patient->medical_record_number,
                    'name' => $encounter->patient->name,
                    'birth_date' => $encounter->patient->birth_date->toDateString(),
                    'gender' => $encounter->patient->gender,
                    'allergies' => $encounter->patient->allergies->pluck('substance')->values(),
                ],
                'service_unit' => $encounter->serviceUnit->name,
                'practitioner' => $encounter->practitioner->staffProfile->name,
                'queue_number' => $encounter->queueEntry->queue_number,
                'triage_status' => $encounter->triage?->status->value,
                'triage_updated_at' => $encounter->triage?->updated_at?->toIso8601String(),
                'completed_at' => $encounter->triage?->completed_at?->toIso8601String(),
            ]);

        return Inertia::render('triages/index', [
            'encounters' => $encounters,
            'mode' => $mode,
            'summary' => [
                'waiting' => Encounter::query()
                    ->where('clinic_id', $clinic->id)
                    ->whereDate('encounter_date', $today)
                    ->where('status', EncounterStatus::WaitingTriage->value)
                    ->count(),
                'completed' => Triage::query()
                    ->where('clinic_id', $clinic->id)
                    ->where('status', TriageStatus::Completed->value)
                    ->whereDate('completed_at', $today)
                    ->count(),
            ],
        ]);
    }

    public function edit(Encounter $encounter): Response
    {
        Gate::authorize('viewEncounter', [Triage::class, $encounter]);

        $encounter->load([
            'patient:id,uuid,medical_record_number,name,birth_date,gender',
            'patient.allergies' => fn ($query) => $query
                ->where('status', 'active')
                ->orderBy('substance')
                ->select(['id', 'patient_id', 'substance', 'reaction', 'severity']),
            'serviceUnit:id,uuid,name',
            'practitioner:id,uuid,staff_profile_id',
            'practitioner.staffProfile:id,name',
            'queueEntry:id,encounter_id,queue_number',
            'triage',
        ]);

        return Inertia::render('triages/edit', [
            'encounter' => [
                'uuid' => $encounter->uuid,
                'registered_at' => $encounter->registered_at->toIso8601String(),
                'chief_complaint' => $encounter->chief_complaint,
                'status' => $encounter->status->value,
                'patient' => [
                    'uuid' => $encounter->patient->uuid,
                    'medical_record_number' => $encounter->patient->medical_record_number,
                    'name' => $encounter->patient->name,
                    'birth_date' => $encounter->patient->birth_date->toDateString(),
                    'gender' => $encounter->patient->gender,
                    'allergies' => $encounter->patient->allergies->map(fn ($allergy): array => [
                        'substance' => $allergy->substance,
                        'reaction' => $allergy->reaction,
                        'severity' => $allergy->severity,
                    ])->values(),
                ],
                'service_unit' => $encounter->serviceUnit->name,
                'practitioner' => $encounter->practitioner->staffProfile->name,
                'queue_number' => $encounter->queueEntry->queue_number,
                'triage' => $encounter->triage === null ? null : [
                    'chief_complaint' => $encounter->triage->chief_complaint,
                    'systolic_bp' => $encounter->triage->systolic_bp,
                    'diastolic_bp' => $encounter->triage->diastolic_bp,
                    'heart_rate' => $encounter->triage->heart_rate,
                    'respiratory_rate' => $encounter->triage->respiratory_rate,
                    'temperature' => $encounter->triage->temperature,
                    'spo2' => $encounter->triage->spo2,
                    'weight' => $encounter->triage->weight,
                    'height' => $encounter->triage->height,
                    'pain_scale' => $encounter->triage->pain_scale,
                    'notes' => $encounter->triage->notes,
                    'status' => $encounter->triage->status->value,
                    'completed_at' => $encounter->triage->completed_at?->toIso8601String(),
                ],
            ],
            'can' => [
                'save' => Gate::allows('save', [Triage::class, $encounter]),
                'complete' => Gate::allows('complete', [Triage::class, $encounter]),
            ],
        ]);
    }

    public function update(
        SaveTriageRequest $request,
        Encounter $encounter,
        SaveTriage $saveTriage,
    ): RedirectResponse {
        $saveTriage->execute(
            $encounter,
            $request->triageAttributes(),
            $request->completesTriage(),
            (int) $request->user()->id,
        );

        $message = $request->completesTriage()
            ? 'Pemeriksaan awal selesai. Pasien sudah masuk antrean dokter.'
            : 'Draft pemeriksaan awal berhasil disimpan.';
        Inertia::flash('toast', ['type' => 'success', 'message' => $message]);

        return $request->completesTriage()
            ? to_route('triages.index')
            : back();
    }
}
