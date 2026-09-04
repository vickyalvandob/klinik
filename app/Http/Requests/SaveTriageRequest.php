<?php

namespace App\Http\Requests;

use App\Models\Encounter;
use App\Models\Triage;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class SaveTriageRequest extends FormRequest
{
    public function authorize(): bool
    {
        $encounter = $this->route('encounter');

        if (! $encounter instanceof Encounter) {
            return false;
        }

        $ability = $this->string('intent')->toString() === 'complete' ? 'complete' : 'save';

        return $this->user()?->can($ability, [Triage::class, $encounter]) === true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'intent' => ['required', Rule::in(['draft', 'complete'])],
            'chief_complaint' => ['nullable', 'string', 'max:2000'],
            'systolic_bp' => ['nullable', 'integer', 'between:40,300'],
            'diastolic_bp' => ['nullable', 'integer', 'between:20,200'],
            'heart_rate' => ['nullable', 'integer', 'between:20,250'],
            'respiratory_rate' => ['nullable', 'integer', 'between:5,80'],
            'temperature' => ['nullable', 'numeric', 'between:30,45'],
            'spo2' => ['nullable', 'integer', 'between:1,100'],
            'weight' => ['nullable', 'numeric', 'between:0.5,500'],
            'height' => ['nullable', 'numeric', 'between:20,250'],
            'pain_scale' => ['nullable', 'integer', 'between:0,10'],
            'notes' => ['nullable', 'string', 'max:5000'],
        ];
    }

    /** @return list<callable(Validator): void> */
    public function after(): array
    {
        return [function (Validator $validator): void {
            if ($validator->errors()->hasAny(['systolic_bp', 'diastolic_bp'])) {
                return;
            }

            $systolic = $this->integer('systolic_bp');
            $diastolic = $this->integer('diastolic_bp');

            if ($systolic > 0 && $diastolic > 0 && $systolic <= $diastolic) {
                $validator->errors()->add(
                    'systolic_bp',
                    'Tekanan sistolik harus lebih tinggi daripada tekanan diastolik.',
                );
            }
        }];
    }

    /** @return array<string, string> */
    public function attributes(): array
    {
        return [
            'intent' => 'aksi penyimpanan',
            'chief_complaint' => 'keluhan utama',
            'systolic_bp' => 'tekanan sistolik',
            'diastolic_bp' => 'tekanan diastolik',
            'heart_rate' => 'denyut nadi',
            'respiratory_rate' => 'laju napas',
            'temperature' => 'suhu',
            'spo2' => 'SpO2',
            'weight' => 'berat badan',
            'height' => 'tinggi badan',
            'pain_scale' => 'skala nyeri',
            'notes' => 'catatan',
        ];
    }

    /** @return array<string, mixed> */
    public function triageAttributes(): array
    {
        return $this->safe()->except('intent');
    }

    public function completesTriage(): bool
    {
        return $this->string('intent')->toString() === 'complete';
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'intent' => $this->string('intent')->lower()->toString(),
            'chief_complaint' => $this->nullableString($this->input('chief_complaint'), squish: true),
            'notes' => $this->nullableString($this->input('notes')),
        ]);
    }

    private function nullableString(mixed $value, bool $squish = false): ?string
    {
        if (! is_scalar($value)) {
            return null;
        }

        $string = $squish ? Str::squish((string) $value) : trim((string) $value);

        return $string === '' ? null : $string;
    }
}
