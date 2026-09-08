<?php

namespace App\Http\Requests;

use App\Models\Invoice;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

class BillingIndexRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return Gate::allows('viewAny', Invoice::class);
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'mode' => ['nullable', Rule::in(['outstanding', 'partial', 'paid', 'voided'])],
            'search' => ['nullable', 'string', 'max:100'],
            'date' => ['nullable', 'date_format:Y-m-d'],
            'page' => ['nullable', 'integer', 'min:1'],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'mode.in' => 'Status tagihan tidak valid.',
            'search.string' => 'Masukkan kata pencarian yang valid.',
            'search.max' => 'Pencarian maksimal 100 karakter.',
            'date.date_format' => 'Tanggal penerimaan tidak valid.',
            'page.integer' => 'Halaman tidak valid.',
            'page.min' => 'Halaman minimal 1.',
        ];
    }
}
