<?php

namespace App\Models;

use App\DiagnosisType;
use App\Models\Concerns\BelongsToTenant;
use App\Models\Concerns\HasUuid;
use Database\Factories\DiagnosisFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property string $uuid
 * @property int $tenant_id
 * @property int $clinic_id
 * @property int $encounter_id
 * @property int $medical_record_id
 * @property int|null $diagnosis_catalog_id
 * @property string $code_system
 * @property string $code
 * @property string $display
 * @property DiagnosisType $diagnosis_type
 * @property string|null $notes
 */

#[Fillable([
    'encounter_id', 'medical_record_id', 'diagnosis_catalog_id', 'code_system',
    'code', 'display', 'diagnosis_type', 'clinical_status', 'notes', 'created_by',
])]
class Diagnosis extends Model
{
    /** @use HasFactory<DiagnosisFactory> */
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

    /** @return BelongsTo<DiagnosisCatalog, $this> */
    public function catalog(): BelongsTo
    {
        return $this->belongsTo(DiagnosisCatalog::class, 'diagnosis_catalog_id');
    }

    protected function casts(): array
    {
        return ['diagnosis_type' => DiagnosisType::class];
    }
}
