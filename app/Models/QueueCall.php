<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use App\Models\Concerns\HasUuid;
use App\Models\Concerns\IsAppendOnly;
use Database\Factories\QueueCallFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * @property int $id
 * @property string $uuid
 * @property int $clinic_id
 * @property int $queue_entry_id
 * @property string $queue_number
 * @property string $destination
 * @property string $stage
 */
#[Fillable(['queue_entry_id', 'service_unit_id', 'actor_id', 'queue_date', 'queue_number', 'destination', 'stage', 'request_key'])]
class QueueCall extends Model
{
    /** @use HasFactory<QueueCallFactory> */
    use BelongsToTenant, HasFactory, HasUuid, IsAppendOnly;
}
