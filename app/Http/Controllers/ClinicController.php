<?php

namespace App\Http\Controllers;

use App\Http\Requests\UpdateClinicRequest;
use App\Models\Clinic;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;
use RuntimeException;
use Throwable;

class ClinicController extends Controller
{
    public function show(Clinic $clinic): Response
    {
        Gate::authorize('view', $clinic);

        return Inertia::render('clinics/show', [
            'clinic' => [
                'uuid' => $clinic->uuid,
                'name' => $clinic->name,
                'legal_name' => $clinic->legal_name,
                'facility_type' => $clinic->facility_type,
                'facility_identifier' => $clinic->facility_identifier,
                'address' => $clinic->address,
                'phone' => $clinic->phone,
                'email' => $clinic->email,
                'timezone' => $clinic->timezone,
                'logo_url' => $clinic->logo_path === null ? null : Storage::disk('public')->url($clinic->logo_path),
                'is_active' => $clinic->is_active,
                'onboarding_completed_at' => $clinic->onboarding_completed_at?->toIso8601String(),
            ],
            'can' => ['update' => Gate::allows('update', $clinic)],
        ]);
    }

    public function edit(Clinic $clinic): Response
    {
        Gate::authorize('update', $clinic);

        return Inertia::render('clinics/edit', [
            'clinic' => [
                'uuid' => $clinic->uuid,
                'name' => $clinic->name,
                'legal_name' => $clinic->legal_name,
                'facility_type' => $clinic->facility_type,
                'facility_identifier' => $clinic->facility_identifier,
                'address' => $clinic->address,
                'province_code' => $clinic->province_code,
                'city_code' => $clinic->city_code,
                'district_code' => $clinic->district_code,
                'village_code' => $clinic->village_code,
                'phone' => $clinic->phone,
                'email' => $clinic->email,
                'timezone' => $clinic->timezone,
                'satusehat_organization_id' => $clinic->satusehat_organization_id,
                'logo_url' => $clinic->logo_path === null ? null : Storage::disk('public')->url($clinic->logo_path),
            ],
        ]);
    }

    public function update(UpdateClinicRequest $request, Clinic $clinic): RedirectResponse
    {
        Gate::authorize('update', $clinic);
        $validated = $request->safe()->except(['logo', 'remove_logo']);
        $oldLogoPath = $clinic->logo_path;
        $storedLogoPath = $request->file('logo')?->store("clinics/{$clinic->uuid}", 'public');

        if ($request->hasFile('logo') && ! is_string($storedLogoPath)) {
            throw new RuntimeException('Logo klinik gagal disimpan.');
        }

        $newLogoPath = is_string($storedLogoPath) ? $storedLogoPath : null;

        if ($newLogoPath !== null) {
            $validated['logo_path'] = $newLogoPath;
        } elseif ($request->boolean('remove_logo')) {
            $validated['logo_path'] = null;
        }

        try {
            DB::transaction(function () use ($clinic, $validated): void {
                Clinic::query()->whereKey($clinic->id)->lockForUpdate()->firstOrFail()->update($validated);
            });
        } catch (Throwable $exception) {
            if ($newLogoPath !== null) {
                Storage::disk('public')->delete($newLogoPath);
            }

            throw $exception;
        }

        if ($oldLogoPath !== null && ($newLogoPath !== null || $request->boolean('remove_logo'))) {
            Storage::disk('public')->delete($oldLogoPath);
        }

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => 'Profil klinik berhasil diperbarui.',
        ]);

        return to_route('clinics.show', $clinic);
    }
}
