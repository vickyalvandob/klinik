<?php

namespace App\Actions;

use App\EncounterStatus;
use App\InvoiceStatus;
use App\Models\BillingAudit;
use App\Models\Encounter;
use App\Models\Invoice;
use App\PaymentStatus;
use App\Support\Tenancy\CurrentClinic;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class VoidInvoice
{
    public function __construct(
        private readonly CurrentClinic $currentClinic,
        private readonly TransitionEncounter $transitionEncounter,
    ) {}

    public function execute(Invoice $invoice, string $reason, int $userId): Invoice
    {
        return DB::transaction(function () use ($invoice, $reason, $userId): Invoice {
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
                throw ValidationException::withMessages(['reason' => 'Invoice ini sudah dibatalkan.']);
            }

            $hasActivePayments = $lockedInvoice->payments()
                ->where('status', PaymentStatus::Received->value)
                ->lockForUpdate()
                ->exists();

            if ($hasActivePayments) {
                throw ValidationException::withMessages([
                    'reason' => 'Batalkan seluruh pembayaran aktif sebelum membatalkan invoice.',
                ]);
            }

            $before = $this->snapshot($lockedInvoice);
            $lockedInvoice->update([
                'status' => InvoiceStatus::Voided,
                'paid_amount' => 0,
                'balance_due' => 0,
                'voided_at' => now(),
                'voided_by' => $userId,
                'void_reason' => $reason,
            ]);
            $audit = new BillingAudit([
                'invoice_id' => $lockedInvoice->id,
                'action' => 'invoice_voided',
                'before_values' => $before,
                'after_values' => $this->snapshot($lockedInvoice),
                'actor_id' => $userId,
            ]);
            $audit->forceFill(['clinic_id' => $lockedInvoice->clinic_id]);
            $audit->save();

            if ($lockedEncounter->status === EncounterStatus::WaitingPayment) {
                $this->transitionEncounter->execute(
                    $lockedEncounter,
                    EncounterStatus::Completed,
                    $userId,
                    'Invoice dibatalkan: '.$reason,
                );
            }

            return $lockedInvoice;
        }, attempts: 3);
    }

    /** @return array<string, mixed> */
    private function snapshot(Invoice $invoice): array
    {
        return $invoice->only([
            'status', 'total_amount', 'paid_amount', 'balance_due',
            'voided_at', 'void_reason',
        ]);
    }
}
