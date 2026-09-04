<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use App\Models\Concerns\HasUuid;
use App\QueueStatus;
use Database\Factories\QueueEntryFactory;
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
 * @property int $encounter_id
 * @property int $service_unit_id
 * @property int $practitioner_id
 * @property Carbon $queue_date
 * @property int $queue_sequence
 * @property string $queue_number
 * @property QueueStatus $status
 * @property Carbon|null $called_at
 * @property Carbon|null $service_started_at
 * @property Carbon|null $completed_at
 * @property Carbon|null $cancelled_at
 */
#[Fillable([
    'encounter_id', 'service_unit_id', 'practitioner_id', 'queue_date',
    'queue_sequence', 'queue_number', 'status', 'called_at',
    'service_started_at', 'completed_at', 'cancelled_at',
])]
class QueueEntry extends Model
{
    /** @use HasFactory<QueueEntryFactory> */
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

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'queue_date' => 'date',
            'queue_sequence' => 'integer',
            'status' => QueueStatus::class,
            'called_at' => 'datetime',
            'service_started_at' => 'datetime',
            'completed_at' => 'datetime',
            'cancelled_at' => 'datetime',
        ];
    }
}
