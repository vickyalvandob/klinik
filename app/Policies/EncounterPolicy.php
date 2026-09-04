<?php

namespace App\Policies;

use App\Models\Encounter;
use App\Models\User;
use App\Support\Tenancy\CurrentClinic;
use App\Support\Tenancy\CurrentTenant;

class EncounterPolicy
{
    public function __construct(
        private readonly CurrentTenant $currentTenant,
        private readonly CurrentClinic $currentClinic,
    ) {}

    public function viewAny(User $user): bool
    {
        return $this->matchesCurrentContext($user)
            && $user->hasClinicPermission('encounter.view');
    }

    public function view(User $user, Encounter $encounter): bool
    {
        return $this->viewAny($user)
            && $encounter->tenant_id === $this->currentTenant->id()
            && $encounter->clinic_id === $this->currentClinic->id();
    }

    public function create(User $user): bool
    {
        return $this->matchesCurrentContext($user)
            && $user->hasClinicPermission('encounter.create');
    }

    public function update(User $user, Encounter $encounter): bool
    {
        return $this->view($user, $encounter)
            && $user->hasClinicPermission('encounter.update');
    }

    public function cancel(User $user, Encounter $encounter): bool
    {
        return $this->view($user, $encounter)
            && $user->hasClinicPermission('encounter.cancel')
            && $encounter->status->canBeCancelled();
    }

    public function delete(User $user, Encounter $encounter): bool
    {
        return false;
    }

    public function restore(User $user, Encounter $encounter): bool
    {
        return false;
    }

    public function forceDelete(User $user, Encounter $encounter): bool
    {
        return false;
    }

    private function matchesCurrentContext(User $user): bool
    {
        return $this->currentTenant->isResolved()
            && $this->currentClinic->isResolved()
            && $this->currentClinic->membership()->user_id === $user->id
            && $this->currentClinic->membership()->is_active;
    }
}
