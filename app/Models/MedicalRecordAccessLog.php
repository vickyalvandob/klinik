<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use App\Models\Concerns\HasUuid;
use App\Models\Concerns\IsAppendOnly;
use Database\Factories\MedicalRecordAccessLogFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['medical_record_id', 'encounter_id', 'actor_id', 'action', 'request_id'])]
class MedicalRecordAccessLog extends Model
{
    /** @use HasFactory<MedicalRecordAccessLogFactory> */
    use BelongsToTenant, HasFactory, HasUuid, IsAppendOnly;

    /** @return BelongsTo<User, $this> */
    public function actor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'actor_id');
    }
}
