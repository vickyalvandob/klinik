<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use App\Models\Concerns\HasUuid;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property string $uuid
 * @property int $tenant_id
 * @property int $patient_id
 * @property string $substance
 * @property string|null $code_system
 * @property string|null $code
 * @property string|null $reaction
 * @property string|null $severity
 * @property string $status
 * @property int|null $noted_by
 * @property Carbon|null $noted_at
 */
#[Fillable([
    'substance', 'code_system', 'code', 'reaction', 'severity', 'status',
    'noted_by', 'noted_at',
])]
class PatientAllergy extends Model
{
    /** @use HasFactory<\Database\Factories\PatientAllergyFactory> */
    use BelongsToTenant, HasFactory, HasUuid;

    /** @return BelongsTo<Patient, $this> */
    public function patient(): BelongsTo
    {
        return $this->belongsTo(Patient::class);
    }

    /** @return BelongsTo<User, $this> */
    public function notedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'noted_by');
    }

    /** @return array<string, string> */
    protected function casts(): array
    {
        return ['noted_at' => 'datetime'];
    }
}
