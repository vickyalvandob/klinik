<?php

namespace App\Http\Controllers;

use App\Models\Encounter;
use App\Models\Patient;
use App\Support\PatientData;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Str;

class RegistrationPatientSearchController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        Gate::authorize('create', Encounter::class);

        $validated = $request->validate([
            'search' => ['required', 'string', 'min:2', 'max:100'],
        ]);
        $search = Str::squish($validated['search']);
        $digits = preg_replace('/\D+/', '', $search);
        $like = '%'.addcslashes($search, '\\%_').'%';
        $digitLike = '%'.addcslashes((string) $digits, '\\%_').'%';

        $patients = Patient::query()
            ->where(function (Builder $query) use ($like, $digitLike, $digits): void {
                $query->where('name', 'like', $like)
                    ->orWhere('medical_record_number', 'like', $like);

                if (filled($digits)) {
                    $query->orWhere('national_id_number', 'like', $digitLike)
                        ->orWhere('phone', 'like', $digitLike);
                }
            })
            ->orderBy('name')
            ->orderBy('id')
            ->limit(8)
            ->get()
            ->map(fn (Patient $patient): array => PatientData::registrationOption($patient));

        return response()->json(['patients' => $patients]);
    }
}
