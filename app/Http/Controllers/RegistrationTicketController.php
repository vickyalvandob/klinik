<?php

namespace App\Http\Controllers;

use App\Models\Encounter;
use App\Support\Tenancy\CurrentClinic;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class RegistrationTicketController extends Controller
{
    public function __construct(private readonly CurrentClinic $currentClinic) {}

    public function __invoke(Encounter $encounter): Response
    {
        Gate::authorize('view', $encounter);
        abort_unless($this->currentClinic->membership()->grantsPermission('registration.view'), 403);
        $encounter->load(['patient', 'serviceUnit', 'practitioner.staffProfile', 'queueEntry']);
        $clinic = $this->currentClinic->get();

        return Inertia::render('registrations/ticket', [
            'clinic' => $clinic->only(['name', 'address', 'phone', 'timezone']),
            'ticket' => [
                'registration_number' => $encounter->registration_number,
                'date' => $encounter->encounter_date->toDateString(),
                'registered_at' => $encounter->registered_at->toIso8601String(),
                'queue_number' => $encounter->queueEntry->queue_number,
                'patient_name' => $encounter->patient->name,
                'medical_record_number' => $encounter->patient->medical_record_number,
                'service_unit' => $encounter->serviceUnit->name,
                'practitioner' => $encounter->practitioner->staffProfile->name,
                'status' => $encounter->status->value,
                'status_label' => $encounter->status->label(),
            ],
        ]);
    }
}
