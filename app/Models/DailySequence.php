<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Database\Factories\DailySequenceFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $tenant_id
 * @property int $clinic_id
 * @property Carbon $sequence_date
 * @property string $scope
 * @property int $last_number
 */
#[Fillable(['sequence_date', 'scope', 'last_number'])]
class DailySequence extends Model
{
    /** @use HasFactory<DailySequenceFactory> */
    use BelongsToTenant, HasFactory;

    /** @return BelongsTo<Clinic, $this> */
    public function clinic(): BelongsTo
    {
        return $this->belongsTo(Clinic::class);
    }

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'sequence_date' => 'date',
            'last_number' => 'integer',
        ];
    }
}
