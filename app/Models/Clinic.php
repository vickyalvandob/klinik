<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use App\Models\Concerns\HasUuid;
use Database\Factories\ClinicFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property string $uuid
 * @property int $tenant_id
 * @property string $name
 * @property string|null $legal_name
 * @property string $facility_type
 * @property string|null $facility_identifier
 * @property string $address
 * @property string|null $province_code
 * @property string|null $city_code
 * @property string|null $district_code
 * @property string|null $village_code
 * @property string $phone
 * @property string $email
 * @property string $timezone
 * @property string|null $logo_path
 * @property string|null $satusehat_organization_id
 * @property bool $is_active
 * @property int $onboarding_step
 * @property Carbon|null $onboarding_completed_at
 */
#[Fillable([
    'name', 'legal_name', 'facility_type', 'facility_identifier', 'address',
    'province_code', 'city_code', 'district_code', 'village_code', 'phone',
    'email', 'timezone', 'logo_path', 'satusehat_organization_id', 'is_active',
])]
class Clinic extends Model
{
    /** @use HasFactory<ClinicFactory> */
    use BelongsToTenant, HasFactory, HasUuid;

    /** @return HasMany<ClinicMembership, $this> */
    public function memberships(): HasMany
    {
        return $this->hasMany(ClinicMembership::class);
    }

    /** @return HasMany<StaffProfile, $this> */
    public function staffProfiles(): HasMany
    {
        return $this->hasMany(StaffProfile::class);
    }

    /** @return HasMany<Practitioner, $this> */
    public function practitioners(): HasMany
    {
        return $this->hasMany(Practitioner::class);
    }

    /** @return HasMany<ServiceUnit, $this> */
    public function serviceUnits(): HasMany
    {
        return $this->hasMany(ServiceUnit::class);
    }

    /** @return HasMany<ClinicService, $this> */
    public function services(): HasMany
    {
        return $this->hasMany(ClinicService::class);
    }

    /** @return HasMany<Medicine, $this> */
    public function medicines(): HasMany
    {
        return $this->hasMany(Medicine::class);
    }

    /** @return HasMany<ClinicRole, $this> */
    public function clinicRoles(): HasMany
    {
        return $this->hasMany(ClinicRole::class);
    }

    /** @return HasOne<ClinicWorkflowSetting, $this> */
    public function workflowSetting(): HasOne
    {
        return $this->hasOne(ClinicWorkflowSetting::class);
    }

    public function hasCompletedOnboarding(): bool
    {
        return $this->onboarding_completed_at !== null;
    }

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'onboarding_step' => 'integer',
            'onboarding_completed_at' => 'datetime',
        ];
    }
}
