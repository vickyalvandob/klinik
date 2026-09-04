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
 * @property bool $billing_enabled
 * @property bool $require_primary_diagnosis
 * @property bool $require_final_medical_record
 * @property bool $allow_partial_payment
 * @property bool $auto_send_prescription_to_pharmacy
 */
#[Fillable([
    'opening_time', 'closing_time', 'default_visit_duration_minutes', 'require_triage',
    'allow_walk_in', 'pharmacy_enabled', 'billing_enabled',
    'require_primary_diagnosis', 'require_final_medical_record',
    'allow_partial_payment', 'auto_send_prescription_to_pharmacy',
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
            'billing_enabled' => 'boolean',
            'require_primary_diagnosis' => 'boolean',
            'require_final_medical_record' => 'boolean',
            'allow_partial_payment' => 'boolean',
            'auto_send_prescription_to_pharmacy' => 'boolean',
        ];
    }
}
