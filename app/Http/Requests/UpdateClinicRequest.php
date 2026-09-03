<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\File;

class UpdateClinicRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()?->hasClinicPermission('clinic.manage') === true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'legal_name' => ['nullable', 'string', 'max:255'],
            'facility_type' => ['required', Rule::in(['clinic', 'primary_clinic', 'dental_clinic', 'laboratory'])],
            'facility_identifier' => ['nullable', 'string', 'max:255'],
            'address' => ['required', 'string', 'max:2000'],
            'province_code' => ['nullable', 'string', 'max:20'],
            'city_code' => ['nullable', 'string', 'max:20'],
            'district_code' => ['nullable', 'string', 'max:20'],
            'village_code' => ['nullable', 'string', 'max:20'],
            'phone' => ['required', 'string', 'max:32'],
            'email' => ['required', 'email', 'max:255'],
            'timezone' => ['required', 'timezone:all'],
            'satusehat_organization_id' => ['nullable', 'string', 'max:255'],
            'logo' => ['nullable', File::image()->max(2048)],
            'remove_logo' => ['sometimes', 'boolean'],
        ];
    }

    /** @return array<string, string> */
    public function attributes(): array
    {
        return [
            'legal_name' => 'nama legal',
            'facility_type' => 'jenis fasilitas',
            'facility_identifier' => 'nomor fasilitas',
            'province_code' => 'kode provinsi',
            'city_code' => 'kode kota/kabupaten',
            'district_code' => 'kode kecamatan',
            'village_code' => 'kode kelurahan/desa',
            'satusehat_organization_id' => 'ID organisasi SATUSEHAT',
        ];
    }
}
