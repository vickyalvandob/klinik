<?php

namespace App\Policies;

use App\Models\Prescription;
use App\Models\User;
use App\PrescriptionStatus;
use App\Support\Tenancy\CurrentClinic;
use App\Support\Tenancy\CurrentTenant;

class PrescriptionPolicy
{
    public function __construct(
        private readonly CurrentTenant $currentTenant,
        private readonly CurrentClinic $currentClinic,
    ) {}

    public function viewAny(User $user): bool
    {
        return $this->matchesCurrentContext($user)
            && ($user->hasClinicPermission('prescription.view')
                || $user->hasClinicPermission('pharmacy.view'));
    }

    public function view(User $user, Prescription $prescription): bool
    {
        return $this->viewAny($user)
            && $prescription->tenant_id === $this->currentTenant->id()
            && $prescription->clinic_id === $this->currentClinic->id();
    }

    public function process(User $user, Prescription $prescription): bool
    {
        return $this->view($user, $prescription)
            && $user->hasClinicPermission('pharmacy.process')
            && $prescription->status === PrescriptionStatus::Prescribed;
    }

    public function dispense(User $user, Prescription $prescription): bool
    {
        return $this->view($user, $prescription)
            && $user->hasClinicPermission('pharmacy.dispense')
            && $prescription->status === PrescriptionStatus::Processing;
    }

    public function cancel(User $user, Prescription $prescription): bool
    {
        return $this->view($user, $prescription)
            && ($user->hasClinicPermission('prescription.cancel')
                || $user->hasClinicPermission('pharmacy.process'))
            && in_array($prescription->status, [
                PrescriptionStatus::Prescribed,
                PrescriptionStatus::Processing,
            ], true);
    }

    public function adjustStock(User $user): bool
    {
        return $this->matchesCurrentContext($user)
            && $user->hasClinicPermission('pharmacy.process');
    }

    private function matchesCurrentContext(User $user): bool
    {
        return $this->currentTenant->isResolved()
            && $this->currentClinic->isResolved()
            && $this->currentClinic->membership()->user_id === $user->id
            && $this->currentClinic->membership()->is_active;
    }
}
