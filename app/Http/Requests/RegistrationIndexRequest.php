<?php

namespace App\Http\Requests;

use App\EncounterStatus;
use App\Models\Encounter;
use App\Support\Tenancy\CurrentClinic;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

class RegistrationIndexRequest extends FormRequest
{
    public function authorize(): bool
    {
        return Gate::allows('viewAny', Encounter::class)
            && $this->user()->hasClinicPermission('registration.view');
    }

    /** @return array<string, ValidationRule|array<mixed>|string> */
    public function rules(): array
    {
        return [
            'date' => ['nullable', 'date_format:Y-m-d'],
            'search' => ['nullable', 'string', 'max:100'],
            'status' => ['nullable', Rule::enum(EncounterStatus::class)],
            'service_unit' => ['nullable', 'uuid', Rule::exists('service_units', 'uuid')->where('clinic_id', app(CurrentClinic::class)->id())],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'date.date_format' => 'Gunakan tanggal kunjungan yang valid.',
            'search.max' => 'Pencarian maksimal 100 karakter.',
            'status' => 'Status kunjungan tidak valid.',
            'service_unit.uuid' => 'Unit layanan tidak valid.',
            'service_unit.exists' => 'Unit layanan tidak tersedia di klinik ini.',
        ];
    }
}
