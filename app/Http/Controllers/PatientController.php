<?php

namespace App\Http\Controllers;

use App\Actions\CreatePatient;
use App\Actions\UpdatePatient;
use App\Http\Requests\StorePatientRequest;
use App\Http\Requests\UpdatePatientRequest;
use App\Models\Patient;
use App\Support\PatientData;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class PatientController extends Controller
{
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

    public function create(): Response
    {
        Gate::authorize('create', Patient::class);

        return Inertia::render('patients/create');
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

        return to_route('patients.show', $patient);
    }

    public function show(Patient $patient): Response
    {
        Gate::authorize('view', $patient);
        $this->loadPatient($patient);

        return Inertia::render('patients/show', [
            'patient' => PatientData::detail($patient),
            'can' => ['update' => Gate::allows('update', $patient)],
        ]);
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
            'allergies' => fn (Builder $query) => $query->orderBy('status')->orderBy('substance')->orderBy('id'),
        ])->loadCount([
            'allergies as active_allergies_count' => fn (Builder $query) => $query->where('status', 'active'),
        ]);
    }
}
