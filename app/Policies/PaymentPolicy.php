<?php

namespace App\Policies;

use App\Models\Payment;
use App\Models\User;
use App\PaymentStatus;
use App\Support\Tenancy\CurrentClinic;
use App\Support\Tenancy\CurrentTenant;

class PaymentPolicy
{
    public function __construct(
        private readonly CurrentTenant $currentTenant,
        private readonly CurrentClinic $currentClinic,
    ) {}

    public function view(User $user, Payment $payment): bool
    {
        return $this->matchesCurrentContext($user)
            && $user->hasClinicPermission('billing.view')
            && $payment->tenant_id === $this->currentTenant->id()
            && $payment->clinic_id === $this->currentClinic->id();
    }

    public function void(User $user, Payment $payment): bool
    {
        return $this->view($user, $payment)
            && $user->hasClinicPermission('payment.void')
            && $payment->status === PaymentStatus::Received;
    }

    private function matchesCurrentContext(User $user): bool
    {
        return $this->currentTenant->isResolved()
            && $this->currentClinic->isResolved()
            && $this->currentClinic->membership()->user_id === $user->id
            && $this->currentClinic->membership()->is_active;
    }
}
