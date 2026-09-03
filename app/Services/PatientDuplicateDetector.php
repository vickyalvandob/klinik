<?php

namespace App\Services;

use App\Models\Patient;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Builder;

class PatientDuplicateDetector
{
    /**
     * @param  array{name?: string|null, birth_date?: string|null, national_id_number?: string|null, phone?: string|null}  $identity
     * @return Collection<int, Patient>
     */
    public function find(array $identity, ?Patient $except = null, int $limit = 5): Collection
    {
        $name = $identity['name'] ?? null;
        $birthDate = $identity['birth_date'] ?? null;
        $nationalIdNumber = $identity['national_id_number'] ?? null;
        $phone = $identity['phone'] ?? null;

        if (blank($nationalIdNumber) && blank($phone) && (blank($name) || blank($birthDate))) {
            return new Collection;
        }

        return Patient::query()
            ->when($except !== null, fn (Builder $query) => $query->where('id', '!=', $except->id))
            ->where(function (Builder $query) use ($name, $birthDate, $nationalIdNumber, $phone): void {
                if (filled($nationalIdNumber)) {
                    $query->orWhere('national_id_number', $nationalIdNumber);
                }

                if (filled($phone)) {
                    $query->orWhere('phone', $phone);
                }

                if (filled($name) && filled($birthDate)) {
                    $query->orWhere(function (Builder $query) use ($name, $birthDate): void {
                        $query->whereRaw('LOWER(name) = ?', [mb_strtolower((string) $name)])
                            ->whereDate('birth_date', $birthDate);
                    });
                }
            })
            ->orderBy('name')
            ->orderBy('id')
            ->limit($limit)
            ->get();
    }

    /**
     * @param  array{name?: string|null, birth_date?: string|null, national_id_number?: string|null, phone?: string|null}  $identity
     * @return list<string>
     */
    public function reasons(Patient $patient, array $identity): array
    {
        $reasons = [];

        if (filled($identity['national_id_number'] ?? null)
            && $patient->national_id_number === $identity['national_id_number']) {
            $reasons[] = 'NIK sama';
        }

        if (filled($identity['phone'] ?? null) && $patient->phone === $identity['phone']) {
            $reasons[] = 'nomor telepon sama';
        }

        if (filled($identity['name'] ?? null)
            && filled($identity['birth_date'] ?? null)
            && mb_strtolower($patient->name) === mb_strtolower((string) $identity['name'])
            && $patient->birth_date->toDateString() === $identity['birth_date']) {
            $reasons[] = 'nama dan tanggal lahir sama';
        }

        return $reasons;
    }

    /**
     * @param  array{national_id_number?: string|null}  $identity
     */
    public function hasExactNationalIdMatch(Collection $patients, array $identity): bool
    {
        $nationalIdNumber = $identity['national_id_number'] ?? null;

        return filled($nationalIdNumber)
            && $patients->contains(fn (Patient $patient): bool => $patient->national_id_number === $nationalIdNumber);
    }
}
