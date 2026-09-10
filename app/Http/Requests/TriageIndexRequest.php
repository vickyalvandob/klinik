<?php

namespace App\Http\Requests;

use App\Models\Triage;
use App\Support\Tenancy\CurrentClinic;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

class TriageIndexRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return Gate::allows('viewAny', Triage::class);
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'mode' => ['nullable', Rule::in(['queue', 'completed'])],
            'date' => ['nullable', 'date_format:Y-m-d'],
            'search' => ['nullable', 'string', 'max:100'],
            'service_unit' => ['nullable', 'uuid', Rule::exists('service_units', 'uuid')->where('clinic_id', app(CurrentClinic::class)->id())],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'mode.in' => 'Daftar pemeriksaan tidak valid.',
            'date.date_format' => 'Pilih tanggal pemeriksaan yang valid.',
            'search.string' => 'Masukkan nama, nomor RM, atau nomor antrean.',
            'search.max' => 'Pencarian maksimal 100 karakter.',
            'service_unit.uuid' => 'Unit layanan tidak valid.',
            'service_unit.exists' => 'Unit layanan tidak tersedia di klinik ini.',
        ];
    }
}
