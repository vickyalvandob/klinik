<?php

namespace App\Http\Controllers;

use App\Actions\StartConsultation;
use App\Models\Encounter;
use App\Models\MedicalRecord;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;

class ConsultationController extends Controller
{
    public function __invoke(Request $request, Encounter $encounter, StartConsultation $startConsultation): RedirectResponse
    {
        Gate::authorize('start', [MedicalRecord::class, $encounter]);
        $startConsultation->execute($encounter, (int) $request->user()->id);

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => 'Pemeriksaan dimulai. Lengkapi rekam medis pasien.',
        ]);

        return to_route('medical-records.edit', $encounter);
    }
}
