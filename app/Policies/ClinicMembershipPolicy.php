<?php

namespace App\Policies;

use App\Models\ClinicMembership;
use App\Models\User;
use App\Support\Tenancy\CurrentClinic;

class ClinicMembershipPolicy
{
    public function __construct(private readonly CurrentClinic $currentClinic) {}

    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(User $user): bool
    {
        return $this->currentClinic->isResolved()
            && $user->hasClinicPermission('users.manage');
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(User $user, ClinicMembership $clinicMembership): bool
    {
        return $this->viewAny($user)
            && $clinicMembership->clinic_id === $this->currentClinic->id();
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $user): bool
    {
        return $this->viewAny($user);
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, ClinicMembership $clinicMembership): bool
    {
        return $this->view($user, $clinicMembership);
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, ClinicMembership $clinicMembership): bool
    {
        return false;
    }

    /**
     * Determine whether the user can restore the model.
     */
    public function restore(User $user, ClinicMembership $clinicMembership): bool
    {
        return false;
    }

    /**
     * Determine whether the user can permanently delete the model.
     */
    public function forceDelete(User $user, ClinicMembership $clinicMembership): bool
    {
        return false;
    }
}
