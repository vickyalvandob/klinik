<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use App\Models\Concerns\HasUuid;
use App\TriageStatus;
use Database\Factories\TriageFactory;
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
 * @property int|null $practitioner_id
 * @property string|null $chief_complaint
 * @property int|null $systolic_bp
 * @property int|null $diastolic_bp
 * @property int|null $heart_rate
 * @property int|null $respiratory_rate
 * @property string|null $temperature
 * @property int|null $spo2
 * @property string|null $weight
 * @property string|null $height
 * @property int|null $pain_scale
 * @property string|null $notes
 * @property TriageStatus $status
 * @property Carbon|null $completed_at
 * @property int|null $created_by
 * @property int|null $updated_by
 */
#[Fillable([
    'encounter_id', 'practitioner_id', 'chief_complaint', 'systolic_bp', 'diastolic_bp',
    'heart_rate', 'respiratory_rate', 'temperature', 'spo2', 'weight', 'height',
    'pain_scale', 'notes', 'status', 'completed_at', 'created_by', 'updated_by',
])]
class Triage extends Model
{
    /** @use HasFactory<TriageFactory> */
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

    /** @return BelongsTo<Practitioner, $this> */
    public function practitioner(): BelongsTo
    {
        return $this->belongsTo(Practitioner::class);
    }

    /** @return BelongsTo<User, $this> */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /** @return BelongsTo<User, $this> */
    public function updater(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    /** @return HasMany<TriageAudit, $this> */
    public function audits(): HasMany
    {
        return $this->hasMany(TriageAudit::class);
    }

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'systolic_bp' => 'integer',
            'diastolic_bp' => 'integer',
            'heart_rate' => 'integer',
            'respiratory_rate' => 'integer',
            'spo2' => 'integer',
            'pain_scale' => 'integer',
            'status' => TriageStatus::class,
            'completed_at' => 'datetime',
        ];
    }
}
