<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use App\Models\Concerns\HasUuid;
use Database\Factories\EncounterProcedureFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'encounter_id', 'medical_record_id', 'clinic_service_id', 'practitioner_id',
    'code_system', 'code', 'name_snapshot', 'price_snapshot', 'notes',
    'performed_at', 'created_by',
])]
class EncounterProcedure extends Model
{
    /** @use HasFactory<EncounterProcedureFactory> */
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

    /** @return BelongsTo<ClinicService, $this> */
    public function service(): BelongsTo
    {
        return $this->belongsTo(ClinicService::class, 'clinic_service_id');
    }

    /** @return BelongsTo<Practitioner, $this> */
    public function practitioner(): BelongsTo
    {
        return $this->belongsTo(Practitioner::class);
    }

    protected function casts(): array
    {
        return [
            'price_snapshot' => 'integer',
            'performed_at' => 'datetime',
        ];
    }
}
