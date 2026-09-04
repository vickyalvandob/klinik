<?php

namespace App\Models;

use App\EncounterStatus;
use App\Models\Concerns\BelongsToTenant;
use App\Models\Concerns\HasUuid;
use Database\Factories\EncounterStatusHistoryFactory;
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
 * @property EncounterStatus|null $from_status
 * @property EncounterStatus $to_status
 * @property string|null $reason
 * @property int|null $changed_by
 */
#[Fillable(['from_status', 'to_status', 'reason', 'changed_by'])]
class EncounterStatusHistory extends Model
{
    /** @use HasFactory<EncounterStatusHistoryFactory> */
    use BelongsToTenant, HasFactory, HasUuid;

    /** @return BelongsTo<Encounter, $this> */
    public function encounter(): BelongsTo
    {
        return $this->belongsTo(Encounter::class);
    }

    /** @return BelongsTo<User, $this> */
    public function changedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'changed_by');
    }

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'from_status' => EncounterStatus::class,
            'to_status' => EncounterStatus::class,
        ];
    }
}
