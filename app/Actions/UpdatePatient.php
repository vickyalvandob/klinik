<?php

namespace App\Actions;

use App\Models\Patient;
use Illuminate\Support\Facades\DB;

class UpdatePatient
{
    /**
     * @param  array<string, mixed>  $attributes
     * @param  list<array<string, mixed>>  $allergies
     */
    public function execute(Patient $patient, array $attributes, array $allergies, int $userId): Patient
    {
        return DB::transaction(function () use ($patient, $attributes, $allergies, $userId): Patient {
            $lockedPatient = Patient::query()->whereKey($patient->id)->lockForUpdate()->firstOrFail();
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
