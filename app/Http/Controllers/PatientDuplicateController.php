<?php

namespace App\Http\Controllers;

use App\Http\Requests\FindPatientDuplicatesRequest;
use App\Models\Patient;
use App\Services\PatientDuplicateDetector;
use App\Support\PatientData;
use Illuminate\Http\JsonResponse;

class PatientDuplicateController extends Controller
{
    /**
     * Handle the incoming request.
     */
    public function __invoke(
        FindPatientDuplicatesRequest $request,
        PatientDuplicateDetector $duplicateDetector,
    ): JsonResponse
    {
        $validated = $request->validated();
        $except = isset($validated['except'])
            ? Patient::query()->where('uuid', $validated['except'])->firstOrFail()
            : null;
        $identity = [
            'name' => $validated['name'] ?? null,
            'birth_date' => $validated['birth_date'] ?? null,
            'national_id_number' => $validated['national_id_number'] ?? null,
            'phone' => $validated['phone'] ?? null,
        ];

        $candidates = $duplicateDetector->find($identity, $except)
            ->map(fn (Patient $patient): array => PatientData::duplicateCandidate(
                $patient,
                $duplicateDetector->reasons($patient, $identity),
            ))
            ->values();

        return response()->json(['candidates' => $candidates]);
    }
}
