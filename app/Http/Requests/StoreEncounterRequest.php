<?php

namespace App\Http\Requests;

use App\Models\Encounter;
use App\Models\Patient;
use App\Models\Practitioner;
use App\Models\ServiceUnit;
use App\Support\Tenancy\CurrentClinic;
use App\Support\Tenancy\CurrentTenant;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreEncounterRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('create', Encounter::class) === true;
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $clinicId = app(CurrentClinic::class)->id();
        $tenantId = app(CurrentTenant::class)->id();

        return [
            'patient_id' => [
                'required',
                'uuid',
                Rule::exists(Patient::class, 'uuid')->where('tenant_id', $tenantId),
            ],
            'service_unit_id' => [
                'required',
                'uuid',
                Rule::exists(ServiceUnit::class, 'uuid')
                    ->where('clinic_id', $clinicId)
                    ->where('type', 'outpatient')
                    ->where('is_active', true),
            ],
            'practitioner_id' => [
                'required',
                'uuid',
                Rule::exists(Practitioner::class, 'uuid')
                    ->where('clinic_id', $clinicId)
                    ->where('profession', 'doctor')
                    ->where('is_active', true),
            ],
            'chief_complaint' => ['required', 'string', 'min:3', 'max:2000'],
        ];
    }

    /** @return array<string, string> */
    public function attributes(): array
    {
        return [
            'patient_id' => 'pasien',
            'service_unit_id' => 'unit layanan',
            'practitioner_id' => 'dokter',
            'chief_complaint' => 'keluhan utama',
        ];
    }

    /** @return array{patient_id: string, service_unit_id: string, practitioner_id: string, chief_complaint: string} */
    public function encounterAttributes(): array
    {
        return [
            'patient_id' => $this->string('patient_id')->toString(),
            'service_unit_id' => $this->string('service_unit_id')->toString(),
            'practitioner_id' => $this->string('practitioner_id')->toString(),
            'chief_complaint' => $this->string('chief_complaint')->trim()->toString(),
        ];
    }
}
