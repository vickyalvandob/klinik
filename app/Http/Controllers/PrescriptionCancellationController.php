<?php

namespace App\Http\Controllers;

use App\Actions\CancelPrescription;
use App\Http\Requests\CancelPrescriptionRequest;
use App\Models\Prescription;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;

class PrescriptionCancellationController extends Controller
{
    public function __invoke(CancelPrescriptionRequest $request, Prescription $prescription, CancelPrescription $cancel): RedirectResponse
    {
        $cancel->execute($prescription, $request->reason(), (int) $request->user()->id);
        Inertia::flash('toast', ['type' => 'success', 'message' => 'Resep dibatalkan tanpa menghapus riwayat.']);

        return to_route('pharmacy.index');
    }
}
