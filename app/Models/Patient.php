<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use App\Models\Concerns\HasUuid;
use Database\Factories\PatientFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property string $uuid
 * @property int $tenant_id
 * @property int $medical_record_sequence
 * @property string $medical_record_number
 * @property string|null $national_id_number
 * @property string|null $satusehat_patient_id
 * @property string $name
 * @property Carbon $birth_date
 * @property string $gender
 * @property string|null $phone
 * @property string|null $email
 * @property string|null $address
 * @property string|null $province_code
 * @property string|null $city_code
 * @property string|null $district_code
 * @property string|null $village_code
 * @property string|null $blood_type
 * @property string|null $occupation
 * @property string|null $emergency_contact_name
 * @property string|null $emergency_contact_phone
 * @property int|null $created_by
 */
#[Fillable([
    'medical_record_sequence', 'medical_record_number', 'national_id_number',
    'satusehat_patient_id', 'name', 'birth_date', 'gender', 'phone', 'email',
    'address', 'province_code', 'city_code', 'district_code', 'village_code',
    'blood_type', 'occupation', 'emergency_contact_name', 'emergency_contact_phone',
    'created_by',
])]
class Patient extends Model
{
    /** @use HasFactory<PatientFactory> */
    use BelongsToTenant, HasFactory, HasUuid;

    /** @return HasMany<PatientAllergy, $this> */
    public function allergies(): HasMany
    {
        return $this->hasMany(PatientAllergy::class);
    }

    /** @return BelongsTo<User, $this> */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /** @return HasMany<Encounter, $this> */
    public function encounters(): HasMany
    {
        return $this->hasMany(Encounter::class);
    }

    /** @return HasMany<MedicalRecord, $this> */
    public function medicalRecords(): HasMany
    {
        return $this->hasMany(MedicalRecord::class);
    }

    /** @return HasMany<Prescription, $this> */
    public function prescriptions(): HasMany
    {
        return $this->hasMany(Prescription::class);
    }

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'birth_date' => 'date',
            'medical_record_sequence' => 'integer',
        ];
    }
}
