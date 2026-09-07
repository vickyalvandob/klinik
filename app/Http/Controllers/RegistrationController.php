<?php

namespace App\Http\Controllers;

use App\Actions\RegisterEncounter;
use App\Http\Requests\StoreEncounterRequest;
use App\Models\Encounter;
use App\Models\Patient;
use App\Support\RegistrationFormData;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class RegistrationController extends Controller
{
    public function create(Request $request, RegistrationFormData $formData): Response
    {
        Gate::authorize('create', Encounter::class);

        return Inertia::render('registrations/create', [
            'initialPatient' => fn () => $formData->initialPatient($request->string('patient')->toString()),
            'serviceUnits' => fn () => $formData->serviceUnits(),
            'practitioners' => fn () => $formData->practitioners(),
            'can' => ['create_patient' => Gate::allows('create', Patient::class), 'view_list' => Gate::allows('viewAny', Encounter::class) && $request->user()->hasClinicPermission('registration.view')],
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

        return Gate::allows('viewAny', Encounter::class) && $request->user()->hasClinicPermission('registration.view')
            ? to_route('registrations.index')
            : to_route('registrations.create');
    }
}
