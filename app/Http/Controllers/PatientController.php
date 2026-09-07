<?php

namespace App\Http\Controllers;

use App\Actions\CreatePatient;
use App\Actions\UpdatePatient;
use App\EncounterStatus;
use App\Http\Requests\StorePatientRequest;
use App\Http\Requests\UpdatePatientRequest;
use App\Models\Encounter;
use App\Models\Invoice;
use App\Models\MedicalRecord;
use App\Models\Patient;
use App\Support\PatientData;
use App\Support\Tenancy\CurrentClinic;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\Relation;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class PatientController extends Controller
{
    public function __construct(private readonly CurrentClinic $currentClinic) {}

    public function index(Request $request): Response
    {
        Gate::authorize('viewAny', Patient::class);

        $search = Str::squish($request->string('search')->toString());
        $gender = in_array($request->string('gender')->toString(), ['male', 'female'], true)
            ? $request->string('gender')->toString()
            : '';
        $searchDigits = preg_replace('/\D+/', '', $search);

        $patients = Patient::query()
            ->select([
                'id', 'uuid', 'tenant_id', 'medical_record_number', 'national_id_number',
                'name', 'birth_date', 'gender', 'phone', 'created_at',
            ])
            ->withCount([
                'allergies as active_allergies_count' => fn (Builder $query) => $query->where('status', 'active'),
            ])
            ->when($search !== '', function (Builder $query) use ($search, $searchDigits): void {
                $like = '%'.addcslashes($search, '\\%_').'%';
                $digitLike = '%'.addcslashes((string) $searchDigits, '\\%_').'%';

                $query->where(function (Builder $query) use ($like, $digitLike, $searchDigits): void {
                    $query->where('name', 'like', $like)
                        ->orWhere('medical_record_number', 'like', $like);

                    if (filled($searchDigits)) {
                        $query->orWhere('national_id_number', 'like', $digitLike)
                            ->orWhere('phone', 'like', $digitLike);
                    }
                });
            })
            ->when($gender !== '', fn (Builder $query) => $query->where('gender', $gender))
            ->orderBy('name')
            ->orderBy('id')
            ->paginate(15)
            ->withQueryString()
            ->through(fn (Patient $patient): array => PatientData::summary($patient));

        return Inertia::render('patients/index', [
            'patients' => $patients,
            'filters' => ['search' => $search, 'gender' => $gender],
            'can' => ['create' => Gate::allows('create', Patient::class)],
        ]);
    }

    public function create(Request $request): Response
    {
        Gate::authorize('create', Patient::class);

        return Inertia::render('patients/create', [
            'continueRegistration' => $request->boolean('register') && Gate::allows('create', Encounter::class),
        ]);
    }

    public function store(StorePatientRequest $request, CreatePatient $createPatient): RedirectResponse
    {
        $patient = $createPatient->execute(
            $request->patientAttributes(),
            $request->allergyAttributes(),
            (int) $request->user()->id,
        );

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => "Pasien {$patient->name} berhasil dibuat dengan nomor RM {$patient->medical_record_number}.",
        ]);

        if ($request->boolean('register') && Gate::allows('create', Encounter::class)) {
            return to_route('registrations.create', ['patient' => $patient->uuid]);
        }

        return to_route('patients.show', $patient);
    }

    public function show(Request $request, Patient $patient): Response
    {
        Gate::authorize('view', $patient);
        $this->loadPatient($patient);

        $canViewEncounters = Gate::allows('viewAny', Encounter::class);
        $history = in_array($request->string('history')->toString(), ['active', 'completed', 'cancelled'], true)
            ? $request->string('history')->toString()
            : 'all';
        $clinic = $this->currentClinic->get();
        $age = $patient->birth_date->diff(now($clinic->timezone));

        return Inertia::render('patients/show', [
            'patient' => [
                ...PatientData::detail($patient),
                'age_label' => $age->y > 0 ? $age->y.' tahun' : ($age->m > 0 ? $age->m.' bulan' : $age->d.' hari'),
                'updated_at' => $patient->updated_at?->toIso8601String(),
            ],
            'clinic' => $clinic->only(['name', 'timezone']),
            'visitSummary' => fn (): ?array => $canViewEncounters ? $this->visitSummary($patient) : null,
            'encounters' => fn () => $canViewEncounters ? $this->encounterHistory($patient, $history) : null,
            'filters' => ['history' => $history],
            'can' => [
                'update' => Gate::allows('update', $patient),
                'register' => Gate::allows('create', Encounter::class),
                'view_encounters' => $canViewEncounters,
                'view_ticket' => $canViewEncounters && $request->user()->hasClinicPermission('registration.view'),
            ],
        ]);
    }

    /** @return array{total: int, active: int, completed: int, cancelled: int, last_visit_at: ?string} */
    private function visitSummary(Patient $patient): array
    {
        $query = Encounter::query()
            ->where('clinic_id', $this->currentClinic->id())
            ->where('patient_id', $patient->id);
        $counts = (clone $query)->selectRaw('status, COUNT(*) as total')->groupBy('status')->pluck('total', 'status');
        $total = (int) $counts->sum();
        $completed = (int) $counts->get(EncounterStatus::Completed->value, 0);
        $cancelled = (int) $counts->get(EncounterStatus::Cancelled->value, 0);

        return [
            'total' => $total,
            'active' => $total - $completed - $cancelled,
            'completed' => $completed,
            'cancelled' => $cancelled,
            'last_visit_at' => (clone $query)->latest('registered_at')->latest('id')->first(['registered_at'])?->registered_at->toIso8601String(),
        ];
    }

    /** @return array<string, mixed> */
    private function encounterHistory(Patient $patient, string $history): array
    {
        $canViewRecords = Gate::allows('viewAny', MedicalRecord::class);
        $canViewBilling = Gate::allows('viewAny', Invoice::class);

        return Encounter::query()
            ->where('clinic_id', $this->currentClinic->id())
            ->where('patient_id', $patient->id)
            ->when($history === 'active', fn (Builder $query) => $query->whereNotIn('status', [EncounterStatus::Completed, EncounterStatus::Cancelled]))
            ->when($history === 'completed', fn (Builder $query) => $query->where('status', EncounterStatus::Completed))
            ->when($history === 'cancelled', fn (Builder $query) => $query->where('status', EncounterStatus::Cancelled))
            ->with([
                'serviceUnit:id,uuid,name',
                'practitioner:id,uuid,staff_profile_id',
                'practitioner.staffProfile:id,name',
                'queueEntry:id,encounter_id,queue_number',
            ])
            ->when($canViewRecords, fn (Builder $query) => $query->withExists([
                'medicalRecord' => fn (Builder $record) => $record->where('clinic_id', $this->currentClinic->id()),
            ]))
            ->when($canViewBilling, fn (Builder $query) => $query->with([
                'invoice' => fn (Relation $invoice) => $invoice->where('clinic_id', $this->currentClinic->id())
                    ->select(['id', 'uuid', 'encounter_id', 'tenant_id', 'clinic_id', 'status', 'balance_due']),
            ]))
            ->latest('registered_at')
            ->latest('id')
            ->paginate(10, pageName: 'encounters_page')
            ->withQueryString()
            ->through(fn (Encounter $encounter): array => [
                'uuid' => $encounter->uuid,
                'registration_number' => $encounter->registration_number,
                'registered_at' => $encounter->registered_at->toIso8601String(),
                'chief_complaint' => $encounter->chief_complaint,
                'status' => [
                    'value' => $encounter->status->value,
                    'label' => $encounter->status->label(),
                    'tone' => $encounter->status->tone(),
                ],
                'service_unit' => $encounter->serviceUnit->name,
                'practitioner' => $encounter->practitioner->staffProfile->name,
                'queue_number' => $encounter->queueEntry?->queue_number,
                'can_view_medical_record' => $canViewRecords && (bool) $encounter->getAttribute('medical_record_exists')
                    && Gate::allows('viewEncounter', [MedicalRecord::class, $encounter]),
                'invoice' => $canViewBilling && $encounter->invoice !== null && Gate::allows('view', $encounter->invoice) ? [
                    'uuid' => $encounter->invoice->uuid,
                    'status_label' => $encounter->invoice->status->label(),
                    'balance_due' => $encounter->invoice->balance_due,
                ] : null,
            ])->toArray();
    }

    public function edit(Patient $patient): Response
    {
        Gate::authorize('update', $patient);
        $this->loadPatient($patient);

        return Inertia::render('patients/edit', [
            'patient' => PatientData::detail($patient),
        ]);
    }

    public function update(
        UpdatePatientRequest $request,
        Patient $patient,
        UpdatePatient $updatePatient,
    ): RedirectResponse {
        $patient = $updatePatient->execute(
            $patient,
            $request->patientAttributes(),
            $request->allergyAttributes(),
            (int) $request->user()->id,
        );

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => "Data pasien {$patient->name} berhasil diperbarui.",
        ]);

        return to_route('patients.show', $patient);
    }

    private function loadPatient(Patient $patient): void
    {
        $patient->load([
            'allergies' => fn (HasMany $query) => $query->orderBy('status')->orderBy('substance')->orderBy('id'),
        ])->loadCount([
            'allergies as active_allergies_count' => fn (Builder $query) => $query->where('status', 'active'),
        ]);
    }
}
