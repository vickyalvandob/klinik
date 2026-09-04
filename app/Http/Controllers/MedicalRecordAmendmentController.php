<?php

namespace App\Http\Controllers;

use App\Actions\AmendMedicalRecord;
use App\Http\Requests\StoreMedicalRecordAmendmentRequest;
use App\Models\MedicalRecord;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;

class MedicalRecordAmendmentController extends Controller
{
    public function store(
        StoreMedicalRecordAmendmentRequest $request,
        MedicalRecord $medicalRecord,
        AmendMedicalRecord $amendMedicalRecord,
    ): RedirectResponse {
        $amendMedicalRecord->execute(
            $medicalRecord,
            $request->amendmentData(),
            (int) $request->user()->id,
        );

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => 'Koreksi ditambahkan tanpa mengubah rekam medis original.',
        ]);

        return back();
    }
}
