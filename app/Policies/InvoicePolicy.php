<?php

namespace App\Policies;

use App\InvoiceStatus;
use App\Models\Invoice;
use App\Models\User;
use App\Support\Tenancy\CurrentClinic;
use App\Support\Tenancy\CurrentTenant;

class InvoicePolicy
{
    public function __construct(
        private readonly CurrentTenant $currentTenant,
        private readonly CurrentClinic $currentClinic,
    ) {}

    public function viewAny(User $user): bool
    {
        return $this->matchesCurrentContext($user)
            && $user->hasClinicPermission('billing.view');
    }

    public function view(User $user, Invoice $invoice): bool
    {
        return $this->viewAny($user)
            && $invoice->tenant_id === $this->currentTenant->id()
            && $invoice->clinic_id === $this->currentClinic->id();
    }

    public function receivePayment(User $user, Invoice $invoice): bool
    {
        return $this->view($user, $invoice)
            && $user->hasClinicPermission('payment.receive')
            && in_array($invoice->status, [
                InvoiceStatus::Issued,
                InvoiceStatus::PartiallyPaid,
            ], true)
            && $invoice->balance_due > 0;
    }

    public function void(User $user, Invoice $invoice): bool
    {
        return $this->view($user, $invoice)
            && $user->hasClinicPermission('billing.manage')
            && $invoice->status !== InvoiceStatus::Voided;
    }

    private function matchesCurrentContext(User $user): bool
    {
        return $this->currentTenant->isResolved()
            && $this->currentClinic->isResolved()
            && $this->currentClinic->membership()->user_id === $user->id
            && $this->currentClinic->membership()->is_active;
    }
}
