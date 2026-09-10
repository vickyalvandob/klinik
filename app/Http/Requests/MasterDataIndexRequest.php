<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class MasterDataIndexRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()?->hasClinicPermission('master_data.manage') === true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'search' => ['nullable', 'string', 'max:100'],
            'status' => ['nullable', Rule::in(['active', 'inactive'])],
            'per_page' => ['nullable', 'integer', Rule::in([15, 30, 50])],
            'page' => ['nullable', 'integer', 'min:1'],
            'create' => ['nullable', 'boolean'],
            'edit' => ['nullable', 'uuid'],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'search.string' => 'Masukkan kata pencarian yang valid.',
            'search.max' => 'Pencarian maksimal 100 karakter.',
            'status.in' => 'Status data tidak valid.',
            'per_page.in' => 'Pilih 15, 30, atau 50 data per halaman.',
            'per_page.integer' => 'Jumlah data per halaman tidak valid.',
            'page.integer' => 'Halaman tidak valid.',
            'page.min' => 'Halaman minimal 1.',
            'edit.uuid' => 'Data yang dipilih tidak valid.',
            'create.boolean' => 'Pilihan tambah data tidak valid.',
        ];
    }
}
