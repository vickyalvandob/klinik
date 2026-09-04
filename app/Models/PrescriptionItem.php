<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use App\Models\Concerns\HasUuid;
use Database\Factories\PrescriptionItemFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'prescription_id', 'medicine_id', 'medicine_name_snapshot', 'strength_snapshot',
    'dosage_form_snapshot', 'quantity', 'unit', 'dose_text', 'frequency_text',
    'route_text', 'timing_text', 'duration_text', 'instruction', 'notes',
])]
class PrescriptionItem extends Model
{
    /** @use HasFactory<PrescriptionItemFactory> */
    use BelongsToTenant, HasFactory, HasUuid;

    /** @return BelongsTo<Prescription, $this> */
    public function prescription(): BelongsTo
    {
        return $this->belongsTo(Prescription::class);
    }

    /** @return BelongsTo<Medicine, $this> */
    public function medicine(): BelongsTo
    {
        return $this->belongsTo(Medicine::class);
    }

    protected function casts(): array
    {
        return ['quantity' => 'decimal:2'];
    }
}
