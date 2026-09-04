<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class UpdateWorkflowSettingRequest extends FormRequest
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
            'opening_time' => ['required', 'date_format:H:i'],
            'closing_time' => ['required', 'date_format:H:i', 'after:opening_time'],
            'default_visit_duration_minutes' => ['required', 'integer', 'min:5', 'max:480'],
            'require_triage' => ['required', 'boolean'],
            'allow_walk_in' => ['required', 'boolean'],
            'pharmacy_enabled' => ['required', 'boolean'],
            'billing_enabled' => ['required', 'boolean'],
            'require_primary_diagnosis' => ['required', 'boolean'],
            'require_final_medical_record' => ['required', 'boolean'],
            'allow_partial_payment' => ['required', 'boolean'],
            'auto_send_prescription_to_pharmacy' => ['required', 'boolean'],
        ];
    }

    /** @return array<string, string> */
    public function attributes(): array
    {
        return [
            'opening_time' => 'jam buka',
            'closing_time' => 'jam tutup',
            'default_visit_duration_minutes' => 'durasi kunjungan',
            'require_triage' => 'kewajiban triase',
            'allow_walk_in' => 'pendaftaran walk-in',
            'pharmacy_enabled' => 'alur farmasi',
            'billing_enabled' => 'alur pembayaran',
            'require_primary_diagnosis' => 'diagnosis utama',
            'require_final_medical_record' => 'finalisasi rekam medis',
            'allow_partial_payment' => 'pembayaran sebagian',
            'auto_send_prescription_to_pharmacy' => 'pengiriman resep otomatis',
        ];
    }
}
