<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class OnboardingServicesRequest extends FormRequest
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
            'unit_code' => ['required', 'string', 'max:32', 'alpha_num:ascii'],
            'unit_name' => ['required', 'string', 'max:255'],
            'queue_prefix' => ['required', 'string', 'max:10', 'alpha_num:ascii'],
            'service_code' => ['required', 'string', 'max:32'],
            'service_name' => ['required', 'string', 'max:255'],
            'price' => ['required', 'numeric', 'min:0', 'max:999999999999.99'],
            'duration_minutes' => ['required', 'integer', 'min:5', 'max:480'],
        ];
    }
}
