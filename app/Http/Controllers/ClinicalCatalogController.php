<?php

namespace App\Http\Controllers;

use App\Models\ClinicService;
use App\Models\DiagnosisCatalog;
use App\Models\MedicalRecord;
use App\Models\Medicine;
use App\Support\Tenancy\CurrentClinic;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

class ClinicalCatalogController extends Controller
{
    public function __construct(private readonly CurrentClinic $currentClinic) {}

    public function __invoke(Request $request, string $resource): JsonResponse
    {
        Gate::authorize('viewAny', MedicalRecord::class);
        validator(['resource' => $resource], [
            'resource' => ['required', Rule::in(['diagnoses', 'services', 'medicines'])],
        ])->validate();

        $search = trim($request->string('search')->toString());

        return response()->json(['items' => match ($resource) {
            'diagnoses' => DiagnosisCatalog::query()
                ->where('is_active', true)
                ->when($search !== '', fn ($query) => $query->where(function ($query) use ($search): void {
                    $query->where('code', 'like', "%{$search}%")
                        ->orWhere('display', 'like', "%{$search}%")
                        ->orWhere('search_terms', 'like', "%{$search}%");
                }))
                ->orderBy('code')
                ->limit(20)
                ->get(['uuid', 'code_system', 'code', 'display']),
            'services' => ClinicService::query()
                ->where('clinic_id', $this->currentClinic->id())
                ->where('is_active', true)
                ->when($search !== '', fn ($query) => $query->where(function ($query) use ($search): void {
                    $query->where('code', 'like', "%{$search}%")
                        ->orWhere('name', 'like', "%{$search}%");
                }))
                ->orderBy('name')
                ->limit(20)
                ->get(['uuid', 'code', 'name', 'price']),
            'medicines' => Medicine::query()
                ->where('clinic_id', $this->currentClinic->id())
                ->where('is_active', true)
                ->when($search !== '', fn ($query) => $query->where(function ($query) use ($search): void {
                    $query->where('code', 'like', "%{$search}%")
                        ->orWhere('name', 'like', "%{$search}%")
                        ->orWhere('generic_name', 'like', "%{$search}%");
                }))
                ->orderBy('name')
                ->limit(20)
                ->get(['uuid', 'code', 'name', 'generic_name', 'strength', 'dosage_form', 'unit']),
            default => [],
        }]);
    }
}
