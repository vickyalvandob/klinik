<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use App\Models\Concerns\HasUuid;
use Database\Factories\PrescriptionAuditFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property string $uuid
 * @property int $tenant_id
 * @property int $clinic_id
 * @property int $prescription_id
 * @property string $action
 * @property array<string, mixed>|null $before_values
 * @property array<string, mixed>|null $after_values
 * @property int|null $actor_id
 * @property Carbon $created_at
 */
#[Fillable(['prescription_id', 'action', 'before_values', 'after_values', 'actor_id'])]
class PrescriptionAudit extends Model
{
    /** @use HasFactory<PrescriptionAuditFactory> */
    use BelongsToTenant, HasFactory, HasUuid;

    /** @return BelongsTo<Prescription, $this> */
    public function prescription(): BelongsTo
    {
        return $this->belongsTo(Prescription::class);
    }

    /** @return BelongsTo<User, $this> */
    public function actor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'actor_id');
    }

    protected function casts(): array
    {
        return [
            'before_values' => 'array',
            'after_values' => 'array',
        ];
    }
}
