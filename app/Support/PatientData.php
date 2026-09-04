<?php

namespace App\Support;

use App\Models\Patient;
use App\Models\PatientAllergy;
use Illuminate\Support\Str;

class PatientData
{
    /** @return array<string, mixed> */
    public static function summary(Patient $patient): array
    {
        return [
            'uuid' => $patient->uuid,
            'medical_record_number' => $patient->medical_record_number,
            'name' => $patient->name,
            'birth_date' => $patient->birth_date->toDateString(),
            'gender' => $patient->gender,
            'phone' => $patient->phone,
            'masked_national_id_number' => self::mask($patient->national_id_number, 4, 4),
            'active_allergies_count' => (int) ($patient->getAttribute('active_allergies_count') ?? 0),
            'created_at' => $patient->created_at?->toIso8601String(),
        ];
    }

    /** @return array<string, mixed> */
    public static function detail(Patient $patient): array
    {
        return [
            ...self::summary($patient),
            'national_id_number' => $patient->national_id_number,
            'satusehat_patient_id' => $patient->satusehat_patient_id,
            'email' => $patient->email,
            'address' => $patient->address,
            'province_code' => $patient->province_code,
            'city_code' => $patient->city_code,
            'district_code' => $patient->district_code,
            'village_code' => $patient->village_code,
            'blood_type' => $patient->blood_type,
            'occupation' => $patient->occupation,
            'emergency_contact_name' => $patient->emergency_contact_name,
            'emergency_contact_phone' => $patient->emergency_contact_phone,
            'allergies' => $patient->allergies
                ->map(fn (PatientAllergy $allergy): array => [
                    'uuid' => $allergy->uuid,
                    'substance' => $allergy->substance,
                    'code_system' => $allergy->code_system,
                    'code' => $allergy->code,
                    'reaction' => $allergy->reaction,
                    'severity' => $allergy->severity,
                    'status' => $allergy->status,
                    'noted_at' => $allergy->noted_at?->toIso8601String(),
                ])
                ->values()
                ->all(),
        ];
    }

    /**
     * @param  list<string>  $reasons
     * @return array<string, mixed>
     */
    public static function duplicateCandidate(Patient $patient, array $reasons): array
    {
        return [
            'uuid' => $patient->uuid,
            'medical_record_number' => $patient->medical_record_number,
            'name' => $patient->name,
            'birth_date' => $patient->birth_date->toDateString(),
            'gender' => $patient->gender,
            'masked_national_id_number' => self::mask($patient->national_id_number, 4, 4),
            'masked_phone' => self::mask($patient->phone, 3, 3),
            'reasons' => $reasons,
            'exact_national_id' => in_array('NIK sama', $reasons, true),
        ];
    }

    /** @return array<string, mixed> */
    public static function registrationOption(Patient $patient): array
    {
        return [
            'uuid' => $patient->uuid,
            'medical_record_number' => $patient->medical_record_number,
            'name' => $patient->name,
            'birth_date' => $patient->birth_date->toDateString(),
            'gender' => $patient->gender,
            'masked_national_id_number' => self::mask($patient->national_id_number, 4, 4),
            'masked_phone' => self::mask($patient->phone, 3, 3),
        ];
    }

    private static function mask(?string $value, int $visibleStart, int $visibleEnd): ?string
    {
        if (blank($value)) {
            return null;
        }

        $length = Str::length($value);

        if ($length <= $visibleStart + $visibleEnd) {
            return str_repeat('•', $length);
        }

        return Str::substr($value, 0, $visibleStart)
            .str_repeat('•', $length - $visibleStart - $visibleEnd)
            .Str::substr($value, -$visibleEnd);
    }
}
