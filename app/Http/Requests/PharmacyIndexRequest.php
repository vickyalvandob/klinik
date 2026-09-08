<?php

namespace App\Http\Requests;

use App\Models\Prescription;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

class PharmacyIndexRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return Gate::allows('viewAny', Prescription::class);
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'mode' => ['nullable', Rule::in(['new', 'processing', 'history', 'stock'])],
            'search' => ['nullable', 'string', 'max:100'],
            'date' => ['nullable', 'date_format:Y-m-d'],
            'stock_status' => ['nullable', Rule::in(['all', 'low', 'empty', 'inactive'])],
            'page' => ['nullable', 'integer', 'min:1'],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'mode.in' => 'Daftar apotek tidak valid.',
            'search.string' => 'Masukkan kata pencarian yang valid.',
            'search.max' => 'Pencarian maksimal 100 karakter.',
            'date.date_format' => 'Tanggal selesai tidak valid.',
            'stock_status.in' => 'Filter stok tidak valid.',
            'page.integer' => 'Halaman tidak valid.',
            'page.min' => 'Halaman minimal 1.',
        ];
    }
}
