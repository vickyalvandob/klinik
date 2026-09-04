<?php

namespace App\Http\Controllers;

use App\Actions\ProcessPrescription;
use App\Models\Prescription;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;

class PrescriptionProcessingController extends Controller
{
    public function __invoke(Request $request, Prescription $prescription, ProcessPrescription $process): RedirectResponse
    {
        Gate::authorize('process', $prescription);
        $process->execute($prescription, (int) $request->user()->id);
        Inertia::flash('toast', ['type' => 'success', 'message' => 'Resep mulai disiapkan. Periksa kembali obat sebelum penyerahan.']);

        return to_route('pharmacy.show', $prescription);
    }
}
