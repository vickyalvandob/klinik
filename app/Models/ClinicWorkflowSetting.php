<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use App\Models\Concerns\HasUuid;
use Database\Factories\ClinicWorkflowSettingFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property string $uuid
 * @property int $tenant_id
 * @property int $clinic_id
 * @property string $opening_time
 * @property string $closing_time
 * @property int $default_visit_duration_minutes
 * @property bool $require_triage
 * @property bool $allow_walk_in
 * @property bool $pharmacy_enabled
 * @property bool $auto_send_prescription_to_pharmacy
 */
#[Fillable([
    'opening_time', 'closing_time', 'default_visit_duration_minutes', 'require_triage',
    'allow_walk_in', 'pharmacy_enabled', 'auto_send_prescription_to_pharmacy',
])]
class ClinicWorkflowSetting extends Model
{
    /** @use HasFactory<ClinicWorkflowSettingFactory> */
    use BelongsToTenant, HasFactory, HasUuid;

    /** @return BelongsTo<Clinic, $this> */
    public function clinic(): BelongsTo
    {
        return $this->belongsTo(Clinic::class);
    }

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'default_visit_duration_minutes' => 'integer',
            'require_triage' => 'boolean',
            'allow_walk_in' => 'boolean',
            'pharmacy_enabled' => 'boolean',
            'auto_send_prescription_to_pharmacy' => 'boolean',
        ];
    }
}
