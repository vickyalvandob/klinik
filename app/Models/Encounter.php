<?php

namespace App\Models;

use App\EncounterStatus;
use App\Models\Concerns\BelongsToTenant;
use App\Models\Concerns\HasUuid;
use Database\Factories\EncounterFactory;
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
 * @property int $patient_id
 * @property int $service_unit_id
 * @property int $practitioner_id
 * @property Carbon $encounter_date
 * @property int $registration_sequence
 * @property string $registration_number
 * @property string $registration_type
 * @property string $chief_complaint
 * @property EncounterStatus $status
 * @property Carbon $registered_at
 * @property Carbon|null $started_at
 * @property Carbon|null $clinical_finished_at
 * @property Carbon|null $completed_at
 * @property int|null $registered_by
 * @property Carbon|null $cancelled_at
 * @property int|null $cancelled_by
 * @property string|null $cancellation_reason
 */
#[Fillable([
    'patient_id', 'service_unit_id', 'practitioner_id', 'encounter_date',
    'registration_sequence', 'registration_number', 'registration_type',
    'chief_complaint', 'status', 'registered_at', 'started_at',
    'clinical_finished_at', 'completed_at', 'registered_by',
    'cancelled_at', 'cancelled_by', 'cancellation_reason',
])]
class Encounter extends Model
{
    /** @use HasFactory<EncounterFactory> */
    use BelongsToTenant, HasFactory, HasUuid;

    /** @return BelongsTo<Clinic, $this> */
    public function clinic(): BelongsTo
    {
        return $this->belongsTo(Clinic::class);
    }

    /** @return BelongsTo<Patient, $this> */
    public function patient(): BelongsTo
    {
        return $this->belongsTo(Patient::class);
    }

    /** @return BelongsTo<ServiceUnit, $this> */
    public function serviceUnit(): BelongsTo
    {
        return $this->belongsTo(ServiceUnit::class);
    }

    /** @return BelongsTo<Practitioner, $this> */
    public function practitioner(): BelongsTo
    {
        return $this->belongsTo(Practitioner::class);
    }

    /** @return BelongsTo<User, $this> */
    public function registrar(): BelongsTo
    {
        return $this->belongsTo(User::class, 'registered_by');
    }

    /** @return BelongsTo<User, $this> */
    public function canceller(): BelongsTo
    {
        return $this->belongsTo(User::class, 'cancelled_by');
    }

    /** @return HasOne<QueueEntry, $this> */
    public function queueEntry(): HasOne
    {
        return $this->hasOne(QueueEntry::class);
    }

    /** @return HasMany<EncounterStatusHistory, $this> */
    public function statusHistories(): HasMany
    {
        return $this->hasMany(EncounterStatusHistory::class);
    }

    /** @return HasOne<Triage, $this> */
    public function triage(): HasOne
    {
        return $this->hasOne(Triage::class);
    }

    /** @return HasOne<MedicalRecord, $this> */
    public function medicalRecord(): HasOne
    {
        return $this->hasOne(MedicalRecord::class);
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

    public function canTransitionTo(EncounterStatus $status): bool
    {
        return $this->status->canTransitionTo($status);
    }

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'encounter_date' => 'date',
            'registration_sequence' => 'integer',
            'status' => EncounterStatus::class,
            'registered_at' => 'datetime',
            'started_at' => 'datetime',
            'clinical_finished_at' => 'datetime',
            'completed_at' => 'datetime',
            'cancelled_at' => 'datetime',
        ];
    }
}
