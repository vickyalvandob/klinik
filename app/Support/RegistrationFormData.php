<?php

namespace App\Support;

use App\Models\Patient;
use App\Models\Practitioner;
use App\Models\ServiceUnit;
use App\Support\Tenancy\CurrentClinic;
use Illuminate\Database\Eloquent\Builder;

class RegistrationFormData
{
    public function __construct(private readonly CurrentClinic $currentClinic) {}

    /** @return array<string, mixed>|null */
    public function initialPatient(string $uuid): ?array
    {
        if ($uuid === '') {
            return null;
        }

        $patient = Patient::query()->where('uuid', $uuid)->first([
            'uuid', 'medical_record_number', 'name', 'birth_date', 'gender', 'national_id_number', 'phone',
        ]);

        return $patient === null ? null : PatientData::registrationOption($patient);
    }

    /** @return list<array{uuid: string, name: string, queue_prefix: string}> */
    public function serviceUnits(): array
    {
        return array_values(ServiceUnit::query()
            ->where('clinic_id', $this->currentClinic->id())
            ->where('type', 'outpatient')
            ->where('is_active', true)
            ->orderBy('name')->orderBy('id')
            ->get(['uuid', 'name', 'queue_prefix'])
            ->map(fn (ServiceUnit $unit): array => [
                'uuid' => $unit->uuid, 'name' => $unit->name, 'queue_prefix' => $unit->queue_prefix,
            ])->all());
    }

    /** @return list<array{uuid: string, name: string, specialization: string|null}> */
    public function practitioners(): array
    {
        return array_values(Practitioner::query()
            ->where('clinic_id', $this->currentClinic->id())
            ->where('profession', 'doctor')->where('is_active', true)
            ->whereHas('staffProfile', fn (Builder $query) => $query->where('is_active', true))
            ->with('staffProfile:id,name')->orderBy('id')
            ->get(['uuid', 'staff_profile_id', 'specialization'])
            ->map(fn (Practitioner $practitioner): array => [
                'uuid' => $practitioner->uuid,
                'name' => $practitioner->staffProfile->name,
                'specialization' => $practitioner->specialization,
            ])->all());
    }
}
