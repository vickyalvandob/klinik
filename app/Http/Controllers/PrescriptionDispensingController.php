<?php

namespace App\Http\Controllers;

use App\Actions\DispensePrescription;
use App\Models\Prescription;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;

class PrescriptionDispensingController extends Controller
{
    public function __invoke(Request $request, Prescription $prescription, DispensePrescription $dispense): RedirectResponse
    {
        Gate::authorize('dispense', $prescription);
        $dispense->execute($prescription, (int) $request->user()->id);
        Inertia::flash('toast', ['type' => 'success', 'message' => 'Obat berhasil diserahkan dan stok telah dicatat.']);

        return to_route('pharmacy.index', ['mode' => 'processing']);
    }
}
