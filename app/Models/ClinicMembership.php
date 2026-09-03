<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use App\Models\Concerns\HasUuid;
use Database\Factories\ClinicMembershipFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

/**
 * @property int $id
 * @property string $uuid
 * @property int $tenant_id
 * @property int $clinic_id
 * @property int $user_id
 * @property int|null $staff_profile_id
 * @property int $role_id
 * @property bool $is_active
 */
#[Fillable(['user_id', 'staff_profile_id', 'role_id', 'is_active'])]
class ClinicMembership extends Model
{
    /** @use HasFactory<ClinicMembershipFactory> */
    use BelongsToTenant, HasFactory, HasUuid;

    /** @return BelongsTo<Clinic, $this> */
    public function clinic(): BelongsTo
    {
        return $this->belongsTo(Clinic::class);
    }

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** @return BelongsTo<Role, $this> */
    public function role(): BelongsTo
    {
        return $this->belongsTo(Role::class);
    }

    /** @return BelongsTo<StaffProfile, $this> */
    public function staffProfile(): BelongsTo
    {
        return $this->belongsTo(StaffProfile::class);
    }

    /** @return BelongsToMany<Permission, $this> */
    public function permissions(): BelongsToMany
    {
        return $this->belongsToMany(Permission::class);
    }

    public function grantsPermission(string $permission): bool
    {
        $clinicRole = $this->relationLoaded('clinicRole')
            ? $this->getRelation('clinicRole')
            : ClinicRole::query()
                ->where('clinic_id', $this->clinic_id)
                ->where('role_id', $this->role_id)
                ->with('permissions')
                ->first();

        $roleGrantsPermission = $clinicRole instanceof ClinicRole
            ? $clinicRole->permissions->contains('key', $permission)
            : ($this->relationLoaded('role') && $this->role->relationLoaded('permissions')
                ? $this->role->permissions->contains('key', $permission)
                : $this->role()->whereHas('permissions', fn ($query) => $query->where('key', $permission))->exists());

        if ($roleGrantsPermission) {
            return true;
        }

        return $this->relationLoaded('permissions')
            ? $this->permissions->contains('key', $permission)
            : $this->permissions()->where('key', $permission)->exists();
    }

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
        ];
    }
}
