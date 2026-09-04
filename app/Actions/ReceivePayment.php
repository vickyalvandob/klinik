<?php

namespace App\Actions;

use App\EncounterStatus;
use App\InvoiceStatus;
use App\Models\BillingAudit;
use App\Models\ClinicWorkflowSetting;
use App\Models\Encounter;
use App\Models\Invoice;
use App\Models\Payment;
use App\PaymentMethod;
use App\PaymentStatus;
use App\Services\DailySequenceNumberGenerator;
use App\Support\Tenancy\CurrentClinic;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ReceivePayment
{
    public function __construct(
        private readonly CurrentClinic $currentClinic,
        private readonly DailySequenceNumberGenerator $numberGenerator,
        private readonly TransitionEncounter $transitionEncounter,
    ) {}

    /**
     * @param  array{amount: int, method: string, reference_number?: string|null, notes?: string|null}  $attributes
     */
    public function execute(Invoice $invoice, array $attributes, int $userId): Payment
    {
        return DB::transaction(function () use ($invoice, $attributes, $userId): Payment {
            $lockedEncounter = Encounter::query()
                ->whereKey($invoice->encounter_id)
                ->where('clinic_id', $this->currentClinic->id())
                ->lockForUpdate()
                ->firstOrFail();
            $lockedInvoice = Invoice::query()
                ->whereKey($invoice->id)
                ->where('clinic_id', $this->currentClinic->id())
                ->lockForUpdate()
                ->firstOrFail();

            if ($lockedInvoice->status === InvoiceStatus::Voided) {
                throw ValidationException::withMessages(['amount' => 'Invoice yang dibatalkan tidak dapat dibayar.']);
            }

            if ($lockedInvoice->status === InvoiceStatus::Paid || $lockedInvoice->balance_due === 0) {
                throw ValidationException::withMessages(['amount' => 'Invoice ini sudah lunas.']);
            }

            $amount = $attributes['amount'];

            if ($amount > $lockedInvoice->balance_due) {
                throw ValidationException::withMessages(['amount' => 'Nominal melebihi sisa tagihan.']);
            }

            $workflow = ClinicWorkflowSetting::query()
                ->where('clinic_id', $this->currentClinic->id())
                ->lockForUpdate()
                ->firstOrNew();
            $allowsPartialPayment = $workflow->exists ? $workflow->allow_partial_payment : false;

            if ($amount < $lockedInvoice->balance_due && ! $allowsPartialPayment) {
                throw ValidationException::withMessages([
                    'amount' => 'Klinik ini tidak mengizinkan pembayaran sebagian.',
                ]);
            }

            $localDate = now($this->currentClinic->get()->timezone);
            $sequence = $this->numberGenerator->next('billing-payment', $localDate);
            $beforeInvoice = $this->invoiceSnapshot($lockedInvoice);
            $payment = new Payment([
                'invoice_id' => $lockedInvoice->id,
                'payment_number' => sprintf('PAY-%s-%04d', $localDate->format('Ymd'), $sequence),
                'amount' => $amount,
                'method' => PaymentMethod::from($attributes['method']),
                'reference_number' => filled($attributes['reference_number'] ?? null)
                    ? trim((string) $attributes['reference_number'])
                    : null,
                'notes' => filled($attributes['notes'] ?? null) ? trim((string) $attributes['notes']) : null,
                'status' => PaymentStatus::Received,
                'received_at' => now(),
                'received_by' => $userId,
            ]);
            $payment->forceFill(['clinic_id' => $lockedInvoice->clinic_id]);
            $payment->save();

            $paidAmount = $lockedInvoice->payments()
                ->where('status', PaymentStatus::Received->value)
                ->sum('amount');
            $balanceDue = max(0, $lockedInvoice->total_amount - (int) $paidAmount);
            $lockedInvoice->update([
                'paid_amount' => $paidAmount,
                'balance_due' => $balanceDue,
                'status' => $balanceDue === 0 ? InvoiceStatus::Paid : InvoiceStatus::PartiallyPaid,
            ]);
            $this->audit(
                $lockedInvoice,
                $payment,
                'payment_received',
                $beforeInvoice,
                $this->invoiceSnapshot($lockedInvoice),
                $userId,
            );

            if ($balanceDue === 0 && $lockedEncounter->status === EncounterStatus::WaitingPayment) {
                $this->transitionEncounter->execute(
                    $lockedEncounter,
                    EncounterStatus::Completed,
                    $userId,
                    'Pembayaran telah lunas',
                );
            }

            return $payment;
        }, attempts: 3);
    }

    /** @return array<string, mixed> */
    private function invoiceSnapshot(Invoice $invoice): array
    {
        return $invoice->only(['status', 'total_amount', 'paid_amount', 'balance_due']);
    }

    /**
     * @param  array<string, mixed>|null  $before
     * @param  array<string, mixed>|null  $after
     */
    private function audit(
        Invoice $invoice,
        Payment $payment,
        string $action,
        ?array $before,
        ?array $after,
        int $userId,
    ): void {
        $audit = new BillingAudit([
            'invoice_id' => $invoice->id,
            'payment_id' => $payment->id,
            'action' => $action,
            'before_values' => $before,
            'after_values' => $after,
            'actor_id' => $userId,
        ]);
        $audit->forceFill(['clinic_id' => $invoice->clinic_id]);
        $audit->save();
    }
}
