<?php

namespace App\Policies;

use App\EncounterStatus;
use App\Models\Encounter;
use App\Models\Triage;
use App\Models\User;
use App\Support\Tenancy\CurrentClinic;
use App\Support\Tenancy\CurrentTenant;

class TriagePolicy
{
    public function __construct(
        private readonly CurrentTenant $currentTenant,
        private readonly CurrentClinic $currentClinic,
    ) {}

    public function viewAny(User $user): bool
    {
        return $this->matchesCurrentContext($user)
            && $user->hasClinicPermission('triage.view');
    }

    public function view(User $user, Triage $triage): bool
    {
        return $this->viewAny($user)
            && $triage->tenant_id === $this->currentTenant->id()
            && $triage->clinic_id === $this->currentClinic->id();
    }

    public function viewEncounter(User $user, Encounter $encounter): bool
    {
        return $this->viewAny($user)
            && $encounter->tenant_id === $this->currentTenant->id()
            && $encounter->clinic_id === $this->currentClinic->id();
    }

    public function save(User $user, Encounter $encounter): bool
    {
        return $this->viewEncounter($user, $encounter)
            && $encounter->status === EncounterStatus::WaitingTriage
            && ($user->hasClinicPermission('triage.create')
                || $user->hasClinicPermission('triage.update'));
    }

    public function complete(User $user, Encounter $encounter): bool
    {
        return $this->save($user, $encounter)
            && $user->hasClinicPermission('triage.complete');
    }

    private function matchesCurrentContext(User $user): bool
    {
        return $this->currentTenant->isResolved()
            && $this->currentClinic->isResolved()
            && $this->currentClinic->membership()->user_id === $user->id
            && $this->currentClinic->membership()->is_active;
    }
}
