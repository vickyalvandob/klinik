<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use App\Models\Concerns\HasUuid;
use Database\Factories\TriageAuditFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property string $uuid
 * @property int $tenant_id
 * @property int $clinic_id
 * @property int $triage_id
 * @property int $encounter_id
 * @property string $action
 * @property array<string, mixed>|null $before_values
 * @property array<string, mixed> $after_values
 * @property int|null $actor_id
 */
#[Fillable(['triage_id', 'encounter_id', 'action', 'before_values', 'after_values', 'actor_id'])]
class TriageAudit extends Model
{
    /** @use HasFactory<TriageAuditFactory> */
    use BelongsToTenant, HasFactory, HasUuid;

    /** @return BelongsTo<Triage, $this> */
    public function triage(): BelongsTo
    {
        return $this->belongsTo(Triage::class);
    }

    /** @return BelongsTo<Encounter, $this> */
    public function encounter(): BelongsTo
    {
        return $this->belongsTo(Encounter::class);
    }

    /** @return BelongsTo<User, $this> */
    public function actor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'actor_id');
    }

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'before_values' => 'array',
            'after_values' => 'array',
        ];
    }
}
