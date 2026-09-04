<?php

namespace App\Actions;

use App\Models\Patient;
use App\Models\Tenant;
use App\Support\Tenancy\CurrentTenant;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class UpdatePatient
{
    public function __construct(private readonly CurrentTenant $currentTenant) {}

    /**
     * @param  array<string, mixed>  $attributes
     * @param  list<array<string, mixed>>  $allergies
     */
    public function execute(Patient $patient, array $attributes, array $allergies, int $userId): Patient
    {
        return DB::transaction(function () use ($patient, $attributes, $allergies, $userId): Patient {
            Tenant::query()
                ->whereKey($this->currentTenant->id())
                ->lockForUpdate()
                ->firstOrFail();
            $lockedPatient = Patient::query()->whereKey($patient->id)->lockForUpdate()->firstOrFail();

            if (filled($attributes['national_id_number'] ?? null)
                && Patient::query()
                    ->whereKeyNot($lockedPatient->id)
                    ->where('national_id_number', $attributes['national_id_number'])
                    ->exists()) {
                throw ValidationException::withMessages([
                    'national_id_number' => 'NIK sudah digunakan oleh pasien lain. Buka data pasien tersebut sebelum melanjutkan.',
                ]);
            }

            $lockedPatient->update($attributes);

            foreach ($allergies as $allergy) {
                $uuid = $allergy['uuid'] ?? null;
                unset($allergy['uuid']);

                if (is_string($uuid) && $uuid !== '') {
                    $existingAllergy = $lockedPatient->allergies()
                        ->where('uuid', $uuid)
                        ->lockForUpdate()
                        ->firstOrFail();
                    $existingAllergy->update($allergy);

                    continue;
                }

                $lockedPatient->allergies()->create([
                    ...$allergy,
                    'noted_by' => $userId,
                    'noted_at' => now(),
                ]);
            }

            return $lockedPatient;
        });
    }
}
