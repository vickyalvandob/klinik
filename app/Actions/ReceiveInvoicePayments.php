<?php

namespace App\Actions;

use App\Models\Encounter;
use App\Models\Invoice;
use App\Models\Payment;
use App\Support\Tenancy\CurrentClinic;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ReceiveInvoicePayments
{
    public function __construct(
        private readonly CurrentClinic $currentClinic,
        private readonly ReceivePayment $receivePayment,
    ) {}

    /**
     * @param  list<array{amount: int, method: string, reference_number?: string|null, notes?: string|null}>  $rows
     * @return Collection<int, Payment>
     */
    public function execute(Invoice $invoice, array $rows, string $token, int $userId): Collection
    {
        return DB::transaction(function () use ($invoice, $rows, $token, $userId): Collection {
            Encounter::query()->where('clinic_id', $this->currentClinic->id())
                ->whereKey($invoice->encounter_id)->lockForUpdate()->firstOrFail();
            $locked = Invoice::query()->where('clinic_id', $this->currentClinic->id())
                ->whereKey($invoice->id)->lockForUpdate()->firstOrFail();
            $keys = array_map(fn (int $index): string => $token.':'.$index, array_keys($rows));
            $existing = Payment::query()->where('clinic_id', $this->currentClinic->id())
                ->where('request_key', 'like', $token.':%')->orderBy('request_key')->get();

            if ($existing->isNotEmpty()) {
                $matches = $existing->count() === count($rows) && $existing->every(
                    fn (Payment $payment, int $index): bool => $payment->invoice_id === $locked->id
                        && $payment->amount === (int) $rows[$index]['amount']
                        && $payment->method->value === $rows[$index]['method']
                        && $payment->reference_number === (filled($rows[$index]['reference_number'] ?? null)
                            ? trim($rows[$index]['reference_number']) : null),
                );

                if (! $matches) {
                    throw ValidationException::withMessages(['payments' => 'Permintaan pembayaran sudah digunakan. Muat ulang tagihan.']);
                }

                return $existing;
            }

            if (array_sum(array_column($rows, 'amount')) > $locked->balance_due) {
                throw ValidationException::withMessages(['payments' => 'Total pembayaran melebihi sisa tagihan.']);
            }

            return collect($rows)->map(fn (array $row, int $index): Payment => $this->receivePayment->execute(
                $locked, [...$row, 'amount' => (int) $row['amount'], 'request_key' => $keys[$index]], $userId,
            ));
        }, attempts: 3);
    }
}
