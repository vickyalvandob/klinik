<?php

namespace App\Http\Controllers;

use App\EncounterStatus;
use App\Models\Encounter;
use App\Models\MedicalRecord;
use App\Support\CurrentPractitioner;
use App\Support\Tenancy\CurrentClinic;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class DoctorQueueController extends Controller
{
    public function __construct(
        private readonly CurrentClinic $currentClinic,
        private readonly CurrentPractitioner $currentPractitioner,
    ) {}

    public function __invoke(Request $request): Response
    {
        Gate::authorize('viewAny', MedicalRecord::class);

        $clinic = $this->currentClinic->get();
        $practitioner = $this->currentPractitioner->find();
        $today = now($clinic->timezone)->toDateString();
        $mode = match ($request->string('mode')->toString()) {
            'active' => 'active',
            'history' => 'history',
            default => 'queue',
        };

        $encounters = Encounter::query()
            ->where('clinic_id', $clinic->id)
            ->whereDate('encounter_date', $today)
            ->when(
                $practitioner === null,
                fn (Builder $query) => $query->whereRaw('1 = 0'),
                fn (Builder $query) => $query->where('practitioner_id', $practitioner?->id),
            )
            ->when($mode === 'queue', fn (Builder $query) => $query->where('status', EncounterStatus::WaitingDoctor->value))
            ->when($mode === 'active', fn (Builder $query) => $query->where('status', EncounterStatus::InConsultation->value))
            ->when($mode === 'history', fn (Builder $query) => $query->whereIn('status', [
                EncounterStatus::WaitingPharmacy->value,
                EncounterStatus::WaitingPayment->value,
                EncounterStatus::Completed->value,
            ]))
            ->with([
                'patient:id,uuid,medical_record_number,name,birth_date,gender',
                'patient.allergies' => fn ($query) => $query
                    ->where('status', 'active')
                    ->orderBy('substance')
                    ->select(['id', 'patient_id', 'substance']),
                'serviceUnit:id,uuid,name',
                'queueEntry:id,encounter_id,queue_number',
                'medicalRecord:id,uuid,encounter_id,status,updated_at,finalized_at',
            ])
            ->orderBy('registered_at')
            ->orderBy('id')
            ->paginate(15)
            ->withQueryString()
            ->through(fn (Encounter $encounter): array => [
                'uuid' => $encounter->uuid,
                'registered_at' => $encounter->registered_at->toIso8601String(),
                'started_at' => $encounter->started_at?->toIso8601String(),
                'chief_complaint' => $encounter->chief_complaint,
                'status' => $encounter->status->value,
                'patient' => [
                    'medical_record_number' => $encounter->patient->medical_record_number,
                    'name' => $encounter->patient->name,
                    'birth_date' => $encounter->patient->birth_date->toDateString(),
                    'gender' => $encounter->patient->gender,
                    'allergies' => $encounter->patient->allergies->pluck('substance')->values(),
                ],
                'service_unit' => $encounter->serviceUnit->name,
                'queue_number' => $encounter->queueEntry->queue_number,
                'medical_record' => $encounter->medicalRecord === null ? null : [
                    'status' => $encounter->medicalRecord->status->value,
                    'updated_at' => $encounter->medicalRecord->updated_at->toIso8601String(),
                    'finalized_at' => $encounter->medicalRecord->finalized_at?->toIso8601String(),
                ],
                'can_start' => Gate::allows('start', [MedicalRecord::class, $encounter]),
            ]);

        $baseQuery = fn (): Builder => Encounter::query()
            ->where('clinic_id', $clinic->id)
            ->whereDate('encounter_date', $today)
            ->when(
                $practitioner === null,
                fn (Builder $query) => $query->whereRaw('1 = 0'),
                fn (Builder $query) => $query->where('practitioner_id', $practitioner?->id),
            );

        return Inertia::render('doctor-queue/index', [
            'encounters' => $encounters,
            'mode' => $mode,
            'practitioner' => $practitioner === null ? null : [
                'uuid' => $practitioner->uuid,
                'name' => $practitioner->staffProfile()->value('name'),
                'specialization' => $practitioner->specialization,
            ],
            'summary' => [
                'waiting' => $baseQuery()->where('status', EncounterStatus::WaitingDoctor->value)->count(),
                'active' => $baseQuery()->where('status', EncounterStatus::InConsultation->value)->count(),
                'finished' => $baseQuery()->whereIn('status', [
                    EncounterStatus::WaitingPharmacy->value,
                    EncounterStatus::WaitingPayment->value,
                    EncounterStatus::Completed->value,
                ])->count(),
            ],
        ]);
    }
}
