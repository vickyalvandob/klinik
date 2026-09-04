<?php

namespace App\Models;

use App\MedicalRecordStatus;
use App\Models\Concerns\BelongsToTenant;
use App\Models\Concerns\HasUuid;
use Database\Factories\MedicalRecordFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property string $uuid
 * @property int $tenant_id
 * @property int $clinic_id
 * @property int $encounter_id
 * @property int $patient_id
 * @property int $practitioner_id
 * @property string|null $subjective
 * @property string|null $objective
 * @property string|null $assessment
 * @property string|null $plan
 * @property string|null $additional_notes
 * @property MedicalRecordStatus $status
 * @property Carbon|null $finalized_at
 * @property int|null $finalized_by
 * @property int|null $created_by
 * @property int|null $updated_by
 */
#[Fillable([
    'encounter_id', 'patient_id', 'practitioner_id', 'subjective', 'objective',
    'assessment', 'plan', 'additional_notes', 'status', 'finalized_at',
    'finalized_by', 'created_by', 'updated_by',
])]
class MedicalRecord extends Model
{
    /** @use HasFactory<MedicalRecordFactory> */
    use BelongsToTenant, HasFactory, HasUuid;

    /** @return BelongsTo<Clinic, $this> */
    public function clinic(): BelongsTo
    {
        return $this->belongsTo(Clinic::class);
    }

    /** @return BelongsTo<Encounter, $this> */
    public function encounter(): BelongsTo
    {
        return $this->belongsTo(Encounter::class);
    }

    /** @return BelongsTo<Patient, $this> */
    public function patient(): BelongsTo
    {
        return $this->belongsTo(Patient::class);
    }

    /** @return BelongsTo<Practitioner, $this> */
    public function practitioner(): BelongsTo
    {
        return $this->belongsTo(Practitioner::class);
    }

    /** @return BelongsTo<User, $this> */
    public function finalizer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'finalized_by');
    }

    /** @return HasMany<Diagnosis, $this> */
    public function diagnoses(): HasMany
    {
        return $this->hasMany(Diagnosis::class);
    }

    /** @return HasMany<EncounterProcedure, $this> */
    public function procedures(): HasMany
    {
        return $this->hasMany(EncounterProcedure::class);
    }

    /** @return HasOne<Prescription, $this> */
    public function prescription(): HasOne
    {
        return $this->hasOne(Prescription::class);
    }

    /** @return HasMany<MedicalRecordAmendment, $this> */
    public function amendments(): HasMany
    {
        return $this->hasMany(MedicalRecordAmendment::class);
    }

    /** @return HasMany<MedicalRecordAudit, $this> */
    public function audits(): HasMany
    {
        return $this->hasMany(MedicalRecordAudit::class);
    }

    protected function casts(): array
    {
        return [
            'status' => MedicalRecordStatus::class,
            'finalized_at' => 'datetime',
        ];
    }
}
