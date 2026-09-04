<?php

namespace App\Actions;

use App\EncounterStatus;
use App\InvoiceStatus;
use App\Models\BillingAudit;
use App\Models\Encounter;
use App\Models\Invoice;
use App\Models\Payment;
use App\PaymentStatus;
use App\Support\Tenancy\CurrentClinic;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class VoidPayment
{
    public function __construct(
        private readonly CurrentClinic $currentClinic,
        private readonly TransitionEncounter $transitionEncounter,
    ) {}

    public function execute(Payment $payment, string $reason, int $userId): Payment
    {
        return DB::transaction(function () use ($payment, $reason, $userId): Payment {
            $lockedEncounter = Encounter::query()
                ->whereKey($payment->invoice->encounter_id)
                ->where('clinic_id', $this->currentClinic->id())
                ->lockForUpdate()
                ->firstOrFail();
            $lockedInvoice = Invoice::query()
                ->whereKey($payment->invoice_id)
                ->where('clinic_id', $this->currentClinic->id())
                ->lockForUpdate()
                ->firstOrFail();
            $lockedPayment = Payment::query()
                ->whereKey($payment->id)
                ->where('invoice_id', $lockedInvoice->id)
                ->where('clinic_id', $this->currentClinic->id())
                ->lockForUpdate()
                ->firstOrFail();

            if ($lockedPayment->status !== PaymentStatus::Received) {
                throw ValidationException::withMessages(['reason' => 'Pembayaran ini sudah dibatalkan.']);
            }

            if ($lockedInvoice->status === InvoiceStatus::Voided) {
                throw ValidationException::withMessages(['reason' => 'Invoice sudah dibatalkan.']);
            }

            $beforeInvoice = $this->invoiceSnapshot($lockedInvoice);
            $beforePayment = $this->paymentSnapshot($lockedPayment);
            $lockedPayment->update([
                'status' => PaymentStatus::Voided,
                'voided_at' => now(),
                'voided_by' => $userId,
                'void_reason' => $reason,
            ]);
            $paidAmount = (int) $lockedInvoice->payments()
                ->where('status', PaymentStatus::Received->value)
                ->sum('amount');
            $balanceDue = max(0, $lockedInvoice->total_amount - $paidAmount);
            $lockedInvoice->update([
                'paid_amount' => $paidAmount,
                'balance_due' => $balanceDue,
                'status' => $paidAmount === 0 ? InvoiceStatus::Issued : InvoiceStatus::PartiallyPaid,
            ]);

            $audit = new BillingAudit([
                'invoice_id' => $lockedInvoice->id,
                'payment_id' => $lockedPayment->id,
                'action' => 'payment_voided',
                'before_values' => [
                    'invoice' => $beforeInvoice,
                    'payment' => $beforePayment,
                ],
                'after_values' => [
                    'invoice' => $this->invoiceSnapshot($lockedInvoice),
                    'payment' => $this->paymentSnapshot($lockedPayment),
                ],
                'actor_id' => $userId,
            ]);
            $audit->forceFill(['clinic_id' => $lockedInvoice->clinic_id]);
            $audit->save();

            if ($lockedEncounter->status === EncounterStatus::Completed) {
                $this->transitionEncounter->execute(
                    $lockedEncounter,
                    EncounterStatus::WaitingPayment,
                    $userId,
                    'Pembayaran dibatalkan: '.$reason,
                );
            }

            return $lockedPayment;
        }, attempts: 3);
    }

    /** @return array<string, mixed> */
    private function invoiceSnapshot(Invoice $invoice): array
    {
        return $invoice->only(['status', 'total_amount', 'paid_amount', 'balance_due']);
    }

    /** @return array<string, mixed> */
    private function paymentSnapshot(Payment $payment): array
    {
        return $payment->only(['payment_number', 'amount', 'method', 'status', 'voided_at', 'void_reason']);
    }
}
