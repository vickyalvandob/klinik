<?php

namespace App\Http\Requests;

use App\Support\Tenancy\CurrentClinic;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class ReportRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()?->hasClinicPermission('report.view') === true
            && (! $this->routeIs('reports.export') || $this->user()->hasClinicPermission('report.export'));
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'from' => ['required', 'date_format:Y-m-d'],
            'to' => ['required', 'date_format:Y-m-d', 'after_or_equal:from'],
            'section' => ['sometimes', Rule::in(['visits', 'revenue', 'billing', 'services', 'diagnoses', 'doctors', 'pharmacy'])],
        ];
    }

    protected function prepareForValidation(): void
    {
        $today = CarbonImmutable::now(app(CurrentClinic::class)->get()->timezone);
        $this->merge([
            'from' => $this->input('from', $today->startOfMonth()->toDateString()),
            'to' => $this->input('to', $today->toDateString()),
        ]);
    }

    /** @return list<\Closure> */
    public function after(): array
    {
        return [function (Validator $validator): void {
            if ($validator->errors()->isEmpty()
                && CarbonImmutable::parse($this->string('from')->toString())
                    ->diffInDays(CarbonImmutable::parse($this->string('to')->toString())) > 365) {
                $validator->errors()->add('to', 'Rentang laporan maksimal 366 hari.');
            }
        }];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return ['from.date_format' => 'Tanggal awal tidak valid.', 'to.date_format' => 'Tanggal akhir tidak valid.',
            'to.after_or_equal' => 'Tanggal akhir harus sama atau setelah tanggal awal.',
            'from.required' => 'Tanggal awal wajib diisi.', 'to.required' => 'Tanggal akhir wajib diisi.',
            'section.in' => 'Jenis laporan tidak valid.'];
    }
}
