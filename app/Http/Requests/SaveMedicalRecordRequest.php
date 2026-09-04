<?php

namespace App\Http\Requests;

use App\Models\ClinicWorkflowSetting;
use App\Models\Encounter;
use App\Models\MedicalRecord;
use App\Support\Tenancy\CurrentClinic;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class SaveMedicalRecordRequest extends FormRequest
{
    public function authorize(): bool
    {
        $encounter = $this->route('encounter');

        if (! $encounter instanceof Encounter) {
            return false;
        }

        $ability = $this->string('intent')->toString() === 'finalize' ? 'finalize' : 'save';

        return Gate::allows($ability, [MedicalRecord::class, $encounter]);
    }

    /** @return array<string, ValidationRule|array<mixed>|string> */
    public function rules(): array
    {
        $clinicId = app(CurrentClinic::class)->id();
        $finalizing = $this->string('intent')->toString() === 'finalize';

        return [
            'intent' => ['required', Rule::in(['draft', 'finalize'])],
            'subjective' => [Rule::requiredIf($finalizing), 'nullable', 'string', 'max:20000'],
            'objective' => ['nullable', 'string', 'max:20000'],
            'assessment' => [Rule::requiredIf($finalizing), 'nullable', 'string', 'max:20000'],
            'plan' => [Rule::requiredIf($finalizing), 'nullable', 'string', 'max:20000'],
            'additional_notes' => ['nullable', 'string', 'max:20000'],
            'diagnoses' => ['array', 'max:20'],
            'diagnoses.*.catalog_id' => [
                'required', 'uuid', 'distinct',
                Rule::exists('diagnosis_catalogs', 'uuid')->where('is_active', true),
            ],
            'diagnoses.*.type' => ['required', Rule::in(['primary', 'secondary'])],
            'diagnoses.*.notes' => ['nullable', 'string', 'max:2000'],
            'procedures' => ['array', 'max:30'],
            'procedures.*.service_id' => [
                'required', 'uuid', 'distinct',
                Rule::exists('clinic_services', 'uuid')
                    ->where('clinic_id', $clinicId)
                    ->where('is_active', true),
            ],
            'procedures.*.notes' => ['nullable', 'string', 'max:2000'],
            'prescription_notes' => ['nullable', 'string', 'max:5000'],
            'prescription_items' => ['array', 'max:30'],
            'prescription_items.*.medicine_id' => [
                'required', 'uuid',
                Rule::exists('medicines', 'uuid')
                    ->where('clinic_id', $clinicId)
                    ->where('is_active', true),
            ],
            'prescription_items.*.quantity' => ['required', 'numeric', 'gt:0', 'max:999999'],
            'prescription_items.*.dose_text' => ['nullable', 'string', 'max:100'],
            'prescription_items.*.frequency_text' => ['nullable', 'string', 'max:100'],
            'prescription_items.*.timing_text' => ['nullable', 'string', 'max:100'],
            'prescription_items.*.duration_text' => ['nullable', 'string', 'max:100'],
            'prescription_items.*.instruction' => ['required', 'string', 'max:2000'],
            'prescription_items.*.notes' => ['nullable', 'string', 'max:2000'],
        ];
    }

    /** @return array<int, callable(Validator): void> */
    public function after(): array
    {
        return [function (Validator $validator): void {
            $diagnoses = $this->array('diagnoses');
            $primaryCount = collect($diagnoses)->where('type', 'primary')->count();

            if ($primaryCount > 1) {
                $validator->errors()->add('diagnoses', 'Hanya satu diagnosis utama yang diperbolehkan.');
            }

            if ($this->string('intent')->toString() !== 'finalize') {
                return;
            }

            $settings = ClinicWorkflowSetting::query()
                ->where('clinic_id', app(CurrentClinic::class)->id())
                ->firstOrNew();
            $requiresPrimaryDiagnosis = $settings->exists
                ? $settings->require_primary_diagnosis
                : true;

            if ($requiresPrimaryDiagnosis && $primaryCount !== 1) {
                $validator->errors()->add('diagnoses', 'Pilih satu diagnosis utama sebelum finalisasi.');
            }
        }];
    }

    /** @return array<string, mixed> */
    public function clinicalData(): array
    {
        return $this->safe()->except('intent');
    }

    public function finalizesRecord(): bool
    {
        return $this->string('intent')->toString() === 'finalize';
    }

    /** @return array<string, string> */
    public function attributes(): array
    {
        return [
            'subjective' => 'subjective',
            'assessment' => 'assessment',
            'plan' => 'rencana',
            'diagnoses' => 'diagnosis',
            'procedures' => 'tindakan',
            'prescription_items' => 'obat',
            'prescription_items.*.quantity' => 'jumlah obat',
            'prescription_items.*.instruction' => 'aturan pakai',
        ];
    }
}
