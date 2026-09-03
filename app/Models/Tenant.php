<?php

namespace App\Models;

use App\Models\Concerns\HasUuid;
use App\TenantStatus;
use Database\Factories\TenantFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property string $uuid
 * @property string $name
 * @property string $slug
 * @property TenantStatus $status
 * @property Carbon|null $trial_ends_at
 */
#[Fillable(['name', 'slug', 'status', 'trial_ends_at'])]
class Tenant extends Model
{
    /** @use HasFactory<TenantFactory> */
    use HasFactory, HasUuid;

    /** @return HasMany<Clinic, $this> */
    public function clinics(): HasMany
    {
        return $this->hasMany(Clinic::class);
    }

    /** @return HasMany<ClinicMembership, $this> */
    public function clinicMemberships(): HasMany
    {
        return $this->hasMany(ClinicMembership::class);
    }

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'status' => TenantStatus::class,
            'trial_ends_at' => 'datetime',
        ];
    }
}
