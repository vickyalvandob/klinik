<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Str;

class FindPatientDuplicatesRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()?->hasClinicPermission('patient.create') === true
            || $this->user()?->hasClinicPermission('patient.update') === true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'name' => ['nullable', 'string', 'max:255'],
            'birth_date' => ['nullable', 'date', 'before_or_equal:today'],
            'national_id_number' => ['nullable', 'digits:16'],
            'phone' => ['nullable', 'regex:/^[0-9]{8,20}$/'],
            'except' => ['nullable', 'uuid'],
        ];
    }

    protected function prepareForValidation(): void
    {
        $nationalIdNumber = preg_replace('/\D+/', '', $this->string('national_id_number')->toString());
        $phone = preg_replace('/\D+/', '', $this->string('phone')->toString());

        if (str_starts_with((string) $phone, '62')) {
            $phone = '0'.substr((string) $phone, 2);
        } elseif (str_starts_with((string) $phone, '8')) {
            $phone = '0'.$phone;
        }

        $this->merge([
            'name' => Str::squish($this->string('name')->toString()) ?: null,
            'national_id_number' => filled($nationalIdNumber) ? $nationalIdNumber : null,
            'phone' => filled($phone) ? $phone : null,
        ]);
    }
}
