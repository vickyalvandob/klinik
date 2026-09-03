<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use App\Models\Concerns\HasUuid;
use Database\Factories\StaffProfileFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property string $uuid
 * @property int $tenant_id
 * @property int $clinic_id
 * @property string|null $employee_number
 * @property string $name
 * @property string|null $email
 * @property string|null $phone
 * @property string|null $position
 * @property string $employment_type
 * @property Carbon|null $joined_on
 * @property bool $is_active
 */
#[Fillable([
    'employee_number', 'name', 'email', 'phone', 'position', 'employment_type',
    'joined_on', 'is_active',
])]
class StaffProfile extends Model
{
    /** @use HasFactory<StaffProfileFactory> */
    use BelongsToTenant, HasFactory, HasUuid;

    /** @return BelongsTo<Clinic, $this> */
    public function clinic(): BelongsTo
    {
        return $this->belongsTo(Clinic::class);
    }

    /** @return HasOne<Practitioner, $this> */
    public function practitioner(): HasOne
    {
        return $this->hasOne(Practitioner::class);
    }

    /** @return HasMany<ClinicMembership, $this> */
    public function memberships(): HasMany
    {
        return $this->hasMany(ClinicMembership::class);
    }

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'joined_on' => 'date',
            'is_active' => 'boolean',
        ];
    }
}
