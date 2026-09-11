<?php

namespace App\Http\Requests;

use App\Support\Tenancy\CurrentClinic;
use Carbon\CarbonImmutable;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class AuditLogRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()?->hasClinicPermission('audit.view') === true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'source' => ['sometimes', Rule::in(['activity', 'access', 'clinical', 'triage', 'billing', 'pharmacy'])],
            'from' => ['nullable', 'date_format:Y-m-d'],
            'to' => ['nullable', 'date_format:Y-m-d', Rule::when($this->filled('from'), 'after_or_equal:from')],
            'search' => ['nullable', 'string', 'max:100'],
            'action' => ['nullable', 'string', 'max:100'],
            'page' => ['sometimes', 'integer', 'min:1', 'max:100000'],
        ];
    }

    protected function prepareForValidation(): void
    {
        if (! $this->has('from') && ! $this->has('to')) {
            $today = CarbonImmutable::now(app(CurrentClinic::class)->get()->timezone);
            $this->merge([
                'from' => $today->subDays(6)->toDateString(),
                'to' => $today->toDateString(),
            ]);
        }
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'source.in' => 'Jenis catatan tidak valid.',
            'from.date_format' => 'Tanggal awal tidak valid.',
            'to.date_format' => 'Tanggal akhir tidak valid.',
            'to.after_or_equal' => 'Tanggal akhir harus sama atau setelah tanggal awal.',
            'search.string' => 'Pencarian harus berupa teks.',
            'search.max' => 'Pencarian maksimal 100 karakter.',
            'action.string' => 'Aktivitas tidak valid.',
            'action.max' => 'Aktivitas maksimal 100 karakter.',
            'page.integer' => 'Halaman tidak valid.',
            'page.min' => 'Halaman tidak valid.',
            'page.max' => 'Halaman tidak valid.',
        ];
    }
}
