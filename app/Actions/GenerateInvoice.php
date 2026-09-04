<?php

namespace App\Actions;

use App\EncounterStatus;
use App\InvoiceItemType;
use App\InvoiceStatus;
use App\Models\BillingAudit;
use App\Models\Encounter;
use App\Models\Invoice;
use App\Models\Medicine;
use App\Models\Prescription;
use App\PrescriptionStatus;
use App\Services\DailySequenceNumberGenerator;
use App\Support\Tenancy\CurrentClinic;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class GenerateInvoice
{
    public function __construct(
        private readonly CurrentClinic $currentClinic,
        private readonly DailySequenceNumberGenerator $numberGenerator,
    ) {}

    public function execute(Encounter $encounter, int $userId): Invoice
    {
        return DB::transaction(function () use ($encounter, $userId): Invoice {
            $lockedEncounter = Encounter::query()
                ->whereKey($encounter->id)
                ->where('clinic_id', $this->currentClinic->id())
                ->lockForUpdate()
                ->firstOrFail();

            $existingInvoice = Invoice::query()
                ->where('encounter_id', $lockedEncounter->id)
                ->where('clinic_id', $this->currentClinic->id())
                ->lockForUpdate()
                ->first();

            if ($existingInvoice instanceof Invoice) {
                return $existingInvoice;
            }

            if ($lockedEncounter->status !== EncounterStatus::WaitingPayment) {
                throw ValidationException::withMessages([
                    'status' => 'Invoice hanya dapat dibuat saat kunjungan menunggu pembayaran.',
                ]);
            }

            $lockedEncounter->load([
                'procedures' => fn ($query) => $query->orderBy('id'),
                'prescription.items.medicine',
            ]);
            $itemRows = [];

            foreach ($lockedEncounter->procedures as $procedure) {
                $itemRows[] = [
                    'item_type' => InvoiceItemType::Procedure,
                    'source_uuid' => $procedure->uuid,
                    'code_snapshot' => $procedure->code,
                    'description_snapshot' => $procedure->name_snapshot,
                    'quantity' => 1,
                    'unit' => 'tindakan',
                    'unit_price' => $procedure->price_snapshot,
                    'line_total' => $procedure->price_snapshot,
                ];
            }

            $prescription = $lockedEncounter->getRelation('prescription');

            if ($prescription instanceof Prescription && $prescription->status === PrescriptionStatus::Dispensed) {
                foreach ($prescription->items as $item) {
                    $medicine = $item->getRelation('medicine');

                    if (! $medicine instanceof Medicine) {
                        throw ValidationException::withMessages([
                            'items' => "Harga {$item->medicine_name_snapshot} tidak dapat ditemukan.",
                        ]);
                    }

                    $unitPrice = (int) round((float) $medicine->selling_price);
                    $lineTotal = (int) round(((float) $item->quantity) * $unitPrice);

                    $itemRows[] = [
                        'item_type' => InvoiceItemType::Medicine,
                        'source_uuid' => $item->uuid,
                        'code_snapshot' => $medicine->code,
                        'description_snapshot' => trim($item->medicine_name_snapshot.' '.($item->strength_snapshot ?? '')),
                        'quantity' => $item->quantity,
                        'unit' => $item->unit,
                        'unit_price' => $unitPrice,
                        'line_total' => $lineTotal,
                    ];
                }
            }

            $totalAmount = (int) collect($itemRows)->sum('line_total');
            $issuedAt = now();
            $localDate = now($this->currentClinic->get()->timezone);
            $sequence = $this->numberGenerator->next('billing-invoice', $localDate);
            $invoice = new Invoice([
                'encounter_id' => $lockedEncounter->id,
                'patient_id' => $lockedEncounter->patient_id,
                'invoice_number' => sprintf('INV-%s-%04d', $localDate->format('Ymd'), $sequence),
                'status' => $totalAmount === 0 ? InvoiceStatus::Paid : InvoiceStatus::Issued,
                'subtotal' => $totalAmount,
                'total_amount' => $totalAmount,
                'paid_amount' => 0,
                'balance_due' => $totalAmount,
                'issued_at' => $issuedAt,
                'created_by' => $userId,
            ]);
            $invoice->forceFill(['clinic_id' => $lockedEncounter->clinic_id]);
            $invoice->save();

            foreach ($itemRows as $row) {
                $item = $invoice->items()->make($row);
                $item->forceFill(['clinic_id' => $lockedEncounter->clinic_id]);
                $item->save();
            }

            $audit = new BillingAudit([
                'invoice_id' => $invoice->id,
                'action' => 'invoice_created',
                'after_values' => $this->snapshot($invoice),
                'actor_id' => $userId,
            ]);
            $audit->forceFill(['clinic_id' => $lockedEncounter->clinic_id]);
            $audit->save();

            return $invoice->load('items');
        }, attempts: 3);
    }

    /** @return array<string, mixed> */
    private function snapshot(Invoice $invoice): array
    {
        return $invoice->only([
            'invoice_number', 'status', 'subtotal', 'total_amount',
            'paid_amount', 'balance_due', 'issued_at',
        ]);
    }
}
