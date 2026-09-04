<?php

namespace App\Http\Requests;

use App\Models\Patient;
use App\Services\PatientDuplicateDetector;
use App\Support\Tenancy\CurrentTenant;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Database\Query\Builder;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

abstract class PatientRequest extends FormRequest
{
    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $patient = $this->patient();
        $allergyUuid = Rule::exists('patient_allergies', 'uuid')
            ->where(function (Builder $query) use ($patient): void {
                $query->where('tenant_id', app(CurrentTenant::class)->id());

                if ($patient !== null) {
                    $query->where('patient_id', $patient->id);
                }
            });

        return [
            'name' => ['required', 'string', 'max:255'],
            'birth_date' => ['required', 'date', 'before_or_equal:today'],
            'gender' => ['required', Rule::in(['male', 'female'])],
            'national_id_number' => ['nullable', 'digits:16'],
            'phone' => ['nullable', 'regex:/^[0-9]{8,20}$/'],
            'email' => ['nullable', 'email', 'max:255'],
            'address' => ['nullable', 'string', 'max:2000'],
            'province_code' => ['nullable', 'string', 'max:20'],
            'city_code' => ['nullable', 'string', 'max:20'],
            'district_code' => ['nullable', 'string', 'max:20'],
            'village_code' => ['nullable', 'string', 'max:20'],
            'blood_type' => ['nullable', Rule::in(['A', 'B', 'AB', 'O'])],
            'occupation' => ['nullable', 'string', 'max:255'],
            'emergency_contact_name' => ['nullable', 'string', 'max:255'],
            'emergency_contact_phone' => ['nullable', 'regex:/^[0-9]{8,20}$/'],
            'duplicate_reviewed' => ['sometimes', 'boolean'],
            'allergies' => ['sometimes', 'array', 'max:20'],
            'allergies.*.uuid' => ['nullable', 'uuid', $allergyUuid],
            'allergies.*.substance' => ['required', 'string', 'max:255'],
            'allergies.*.reaction' => ['nullable', 'string', 'max:255'],
            'allergies.*.severity' => ['nullable', Rule::in(['mild', 'moderate', 'severe'])],
            'allergies.*.status' => ['required', Rule::in(['active', 'inactive'])],
        ];
    }

    /** @return list<callable(Validator): void> */
    public function after(): array
    {
        return [function (Validator $validator): void {
            if ($validator->errors()->hasAny(['name', 'birth_date', 'national_id_number', 'phone'])) {
                return;
            }

            $identity = $this->identity();
            $duplicates = app(PatientDuplicateDetector::class)->find($identity, $this->patient());

            if (app(PatientDuplicateDetector::class)->hasExactNationalIdMatch($duplicates, $identity)) {
                $validator->errors()->add(
                    'national_id_number',
                    'NIK sudah digunakan oleh pasien lain. Buka data pasien tersebut sebelum melanjutkan.',
                );

                return;
            }

            if ($duplicates->isNotEmpty() && ! $this->boolean('duplicate_reviewed')) {
                $validator->errors()->add(
                    'duplicate_reviewed',
                    'Kemungkinan pasien sudah terdaftar. Periksa kandidat duplikat atau konfirmasi bahwa pasien memang berbeda.',
                );
            }
        }];
    }

    /** @return array<string, string> */
    public function attributes(): array
    {
        return [
            'birth_date' => 'tanggal lahir',
            'national_id_number' => 'NIK',
            'blood_type' => 'golongan darah',
            'emergency_contact_name' => 'nama kontak darurat',
            'emergency_contact_phone' => 'telepon kontak darurat',
            'allergies.*.substance' => 'zat pemicu alergi',
            'allergies.*.reaction' => 'reaksi alergi',
            'allergies.*.severity' => 'tingkat alergi',
            'allergies.*.status' => 'status alergi',
        ];
    }

    /** @return array<string, mixed> */
    public function patientAttributes(): array
    {
        return $this->safe()->only([
            'name', 'birth_date', 'gender', 'national_id_number', 'phone', 'email',
            'address', 'province_code', 'city_code', 'district_code', 'village_code',
            'blood_type', 'occupation', 'emergency_contact_name', 'emergency_contact_phone',
        ]);
    }

    /** @return list<array<string, mixed>> */
    public function allergyAttributes(): array
    {
        $allergies = $this->validated('allergies', []);

        return is_array($allergies) ? array_values($allergies) : [];
    }

    /** @return array{name: string|null, birth_date: string|null, national_id_number: string|null, phone: string|null} */
    protected function identity(): array
    {
        return [
            'name' => $this->string('name')->toString() ?: null,
            'birth_date' => $this->string('birth_date')->toString() ?: null,
            'national_id_number' => $this->string('national_id_number')->toString() ?: null,
            'phone' => $this->string('phone')->toString() ?: null,
        ];
    }

    protected function prepareForValidation(): void
    {
        $allergyInput = $this->input('allergies', []);
        $allergyInput = is_array($allergyInput) ? $allergyInput : [];
        $allergies = collect($allergyInput)
            ->filter(fn (mixed $allergy): bool => is_array($allergy))
            ->map(fn (array $allergy): array => [
                'uuid' => $this->nullableString($allergy['uuid'] ?? null),
                'substance' => Str::squish((string) ($allergy['substance'] ?? '')),
                'reaction' => $this->nullableString($allergy['reaction'] ?? null),
                'severity' => $this->nullableString($allergy['severity'] ?? null),
                'status' => $this->nullableString($allergy['status'] ?? null) ?? 'active',
            ])
            ->filter(fn (array $allergy): bool => filled($allergy['uuid']) || filled($allergy['substance']))
            ->values()
            ->all();

        $this->merge([
            'name' => Str::squish($this->string('name')->toString()),
            'national_id_number' => $this->digitsOrNull($this->input('national_id_number')),
            'phone' => $this->phoneOrNull($this->input('phone')),
            'email' => $this->nullableString($this->input('email')),
            'address' => $this->nullableString($this->input('address')),
            'province_code' => $this->nullableString($this->input('province_code')),
            'city_code' => $this->nullableString($this->input('city_code')),
            'district_code' => $this->nullableString($this->input('district_code')),
            'village_code' => $this->nullableString($this->input('village_code')),
            'blood_type' => $this->nullableString($this->input('blood_type')),
            'occupation' => $this->nullableString($this->input('occupation')),
            'emergency_contact_name' => $this->nullableString($this->input('emergency_contact_name')),
            'emergency_contact_phone' => $this->phoneOrNull($this->input('emergency_contact_phone')),
            'duplicate_reviewed' => $this->boolean('duplicate_reviewed'),
            'allergies' => $allergies,
        ]);
    }

    protected function patient(): ?Patient
    {
        $patient = $this->route('patient');

        return $patient instanceof Patient ? $patient : null;
    }

    private function digitsOrNull(mixed $value): ?string
    {
        if (! is_scalar($value)) {
            return null;
        }

        $digits = preg_replace('/\D+/', '', (string) $value);

        return filled($digits) ? $digits : null;
    }

    private function phoneOrNull(mixed $value): ?string
    {
        $digits = $this->digitsOrNull($value);

        if ($digits === null) {
            return null;
        }

        if (str_starts_with($digits, '62')) {
            return '0'.substr($digits, 2);
        }

        if (str_starts_with($digits, '8')) {
            return '0'.$digits;
        }

        return $digits;
    }

    private function nullableString(mixed $value): ?string
    {
        if (! is_scalar($value)) {
            return null;
        }

        $string = trim((string) $value);

        return $string === '' ? null : $string;
    }
}
