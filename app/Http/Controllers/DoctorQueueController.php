<?php

namespace App\Http\Controllers;

use App\EncounterStatus;
use App\Http\Requests\IndexDoctorQueueRequest;
use App\Models\Encounter;
use App\Models\MedicalRecord;
use App\Support\CurrentPractitioner;
use App\Support\Tenancy\CurrentClinic;
use App\SystemRole;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class DoctorQueueController extends Controller
{
    public function __construct(
        private readonly CurrentClinic $currentClinic,
        private readonly CurrentPractitioner $currentPractitioner,
    ) {}

    public function __invoke(IndexDoctorQueueRequest $request): Response
    {
        Gate::authorize('viewAny', MedicalRecord::class);

        $clinic = $this->currentClinic->get();
        $practitioner = $this->currentPractitioner->find();
        $seesAllPractitioners = $this->currentClinic->membership()->role->code === SystemRole::OwnerAdmin->value;
        $tomorrow = now($clinic->timezone)->addDay()->toDateString();
        $mode = match ($request->string('mode')->toString()) {
            'active' => 'active',
            'history' => 'history',
            default => 'queue',
        };

        $search = trim($request->string('search')->toString());
        $from = $request->string('from')->toString();
        $to = $request->string('to')->toString();
        $baseQuery = fn (): Builder => Encounter::query()
            ->where('clinic_id', $clinic->id)
            ->when(! $seesAllPractitioners, fn (Builder $query) => $practitioner === null
                ? $query->whereRaw('1 = 0')
                : $query->where('practitioner_id', $practitioner->id));

        $encounters = fn (): array => $baseQuery()
            ->when($mode !== 'history', fn (Builder $query) => $query->where('encounter_date', '<', $tomorrow))
            ->when($from !== '', fn (Builder $query) => $query->where('encounter_date', '>=', $from))
            ->when($to !== '', fn (Builder $query) => $query->where('encounter_date', '<', Carbon::parse($to)->addDay()->toDateString()))
            ->when($search !== '', fn (Builder $query) => $query->where(function (Builder $query) use ($search): void {
                $query->where('registration_number', 'like', "%{$search}%")
                    ->orWhereHas('patient', fn (Builder $patient) => $patient
                        ->where(fn (Builder $patient) => $patient
                            ->where('name', 'like', "%{$search}%")
                            ->orWhere('medical_record_number', 'like', "%{$search}%")));
            }))
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
                'practitioner:id,staff_profile_id',
                'practitioner.staffProfile:id,name',
                'medicalRecord:id,uuid,encounter_id,status,updated_at,finalized_at',
            ])
            ->orderBy('registered_at', $mode === 'history' ? 'desc' : 'asc')
            ->orderBy('id', $mode === 'history' ? 'desc' : 'asc')
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
                'practitioner' => $encounter->practitioner->staffProfile->name,
                'queue_number' => $encounter->queueEntry->queue_number,
                'medical_record' => $encounter->medicalRecord === null ? null : [
                    'status' => $encounter->medicalRecord->status->value,
                    'updated_at' => $encounter->medicalRecord->updated_at->toIso8601String(),
                    'finalized_at' => $encounter->medicalRecord->finalized_at?->toIso8601String(),
                ],
                'can_start' => Gate::allows('start', [MedicalRecord::class, $encounter]),
            ])->toArray();

        return Inertia::render('doctor-queue/index', [
            'encounters' => $encounters,
            'mode' => $mode,
            'filters' => ['search' => $search, 'from' => $from, 'to' => $to],
            'scope' => $seesAllPractitioners ? 'clinic' : 'practitioner',
            'practitioner' => $practitioner === null ? null : [
                'uuid' => $practitioner->uuid,
                'name' => $practitioner->staffProfile()->value('name'),
                'specialization' => $practitioner->specialization,
            ],
            'summary' => function () use ($baseQuery, $tomorrow): array {
                $counts = $baseQuery()->where('encounter_date', '<', $tomorrow)
                    ->selectRaw('status, COUNT(*) as total')->groupBy('status')->pluck('total', 'status');

                return [
                    'waiting' => (int) $counts->get(EncounterStatus::WaitingDoctor->value, 0),
                    'active' => (int) $counts->get(EncounterStatus::InConsultation->value, 0),
                    'finished' => (int) $counts->get(EncounterStatus::WaitingPharmacy->value, 0)
                        + (int) $counts->get(EncounterStatus::WaitingPayment->value, 0)
                        + (int) $counts->get(EncounterStatus::Completed->value, 0),
                ];
            },
        ]);
    }
}
