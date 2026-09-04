<?php

namespace App\Http\Controllers;

use App\Actions\RegisterEncounter;
use App\Http\Requests\StoreEncounterRequest;
use App\Models\Encounter;
use App\Models\Patient;
use App\Models\Practitioner;
use App\Models\ServiceUnit;
use App\Support\PatientData;
use App\Support\Tenancy\CurrentClinic;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class RegistrationController extends Controller
{
    public function __construct(private readonly CurrentClinic $currentClinic) {}

    public function create(Request $request): Response
    {
        Gate::authorize('create', Encounter::class);

        $initialPatient = Patient::query()
            ->when(
                $request->filled('patient'),
                fn (Builder $query) => $query->where('uuid', $request->string('patient')->toString()),
                fn (Builder $query) => $query->whereRaw('1 = 0'),
            )
            ->first();

        $serviceUnits = ServiceUnit::query()
            ->where('clinic_id', $this->currentClinic->id())
            ->where('type', 'outpatient')
            ->where('is_active', true)
            ->orderBy('name')
            ->orderBy('id')
            ->get(['id', 'uuid', 'name', 'queue_prefix'])
            ->map(fn (ServiceUnit $unit): array => [
                'uuid' => $unit->uuid,
                'name' => $unit->name,
                'queue_prefix' => $unit->queue_prefix,
            ]);
        $practitioners = Practitioner::query()
            ->where('clinic_id', $this->currentClinic->id())
            ->where('profession', 'doctor')
            ->where('is_active', true)
            ->whereHas('staffProfile', fn (Builder $query) => $query->where('is_active', true))
            ->with('staffProfile:id,name')
            ->orderBy('id')
            ->get(['id', 'uuid', 'staff_profile_id', 'specialization'])
            ->map(fn (Practitioner $practitioner): array => [
                'uuid' => $practitioner->uuid,
                'name' => $practitioner->staffProfile->name,
                'specialization' => $practitioner->specialization,
            ]);

        return Inertia::render('registrations/create', [
            'initialPatient' => $initialPatient === null ? null : PatientData::registrationOption($initialPatient),
            'serviceUnits' => $serviceUnits,
            'practitioners' => $practitioners,
        ]);
    }

    public function store(StoreEncounterRequest $request, RegisterEncounter $registerEncounter): RedirectResponse
    {
        $encounter = $registerEncounter->execute(
            $request->encounterAttributes(),
            (int) $request->user()->id,
        );

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => "Pendaftaran berhasil. Nomor antrean {$encounter->queueEntry->queue_number}.",
        ]);

        return to_route('dashboard');
    }
}
