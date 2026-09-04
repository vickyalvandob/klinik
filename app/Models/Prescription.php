<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use App\Models\Concerns\HasUuid;
use App\PrescriptionStatus;
use Database\Factories\PrescriptionFactory;
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
 * @property int $clinic_id
 * @property int $encounter_id
 * @property int $medical_record_id
 * @property int $patient_id
 * @property int $practitioner_id
 * @property PrescriptionStatus $status
 * @property Carbon|null $prescribed_at
 * @property Carbon|null $processing_started_at
 * @property int|null $processing_started_by
 * @property Carbon|null $dispensed_at
 * @property int|null $dispensed_by
 * @property Carbon|null $cancelled_at
 * @property int|null $cancelled_by
 * @property string|null $cancellation_reason
 * @property string|null $notes
 * @property int|null $created_by
 * @property int $items_count
 */
#[Fillable([
    'encounter_id', 'medical_record_id', 'patient_id', 'practitioner_id',
    'status', 'prescribed_at', 'processing_started_at', 'processing_started_by',
    'dispensed_at', 'dispensed_by', 'cancelled_at', 'cancelled_by',
    'cancellation_reason', 'notes', 'created_by',
])]
class Prescription extends Model
{
    /** @use HasFactory<PrescriptionFactory> */
    use BelongsToTenant, HasFactory, HasUuid;

    /** @return BelongsTo<MedicalRecord, $this> */
    public function medicalRecord(): BelongsTo
    {
        return $this->belongsTo(MedicalRecord::class);
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

    /** @return HasMany<PrescriptionItem, $this> */
    public function items(): HasMany
    {
        return $this->hasMany(PrescriptionItem::class);
    }

    /** @return HasMany<PrescriptionAudit, $this> */
    public function audits(): HasMany
    {
        return $this->hasMany(PrescriptionAudit::class);
    }

    protected function casts(): array
    {
        return [
            'status' => PrescriptionStatus::class,
            'prescribed_at' => 'datetime',
            'processing_started_at' => 'datetime',
            'dispensed_at' => 'datetime',
            'cancelled_at' => 'datetime',
        ];
    }
}
