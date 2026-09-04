<?php

namespace App\Http\Controllers;

use App\Models\Invoice;
use App\Models\Payment;
use App\Models\User;
use App\Support\Tenancy\CurrentClinic;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class PaymentReceiptController extends Controller
{
    public function __construct(private readonly CurrentClinic $currentClinic) {}

    public function __invoke(Invoice $invoice, Payment $payment): Response
    {
        Gate::authorize('view', $invoice);
        Gate::authorize('view', $payment);
        abort_unless($payment->invoice_id === $invoice->id, 404);

        $invoice->load([
            'patient:id,medical_record_number,name',
            'encounter:id,registration_number',
            'items' => fn ($query) => $query->orderBy('id'),
        ]);
        $payment->load('receiver:id,name');
        $receiver = $payment->getRelation('receiver');
        $clinic = $this->currentClinic->get();

        return Inertia::render('billing/receipt', [
            'clinic' => [
                'name' => $clinic->name,
                'address' => $clinic->address,
                'phone' => $clinic->phone,
            ],
            'invoice' => [
                'uuid' => $invoice->uuid,
                'invoice_number' => $invoice->invoice_number,
                'total_amount' => $invoice->total_amount,
                'paid_amount' => $invoice->paid_amount,
                'balance_due' => $invoice->balance_due,
                'patient' => [
                    'name' => $invoice->patient->name,
                    'medical_record_number' => $invoice->patient->medical_record_number,
                ],
                'registration_number' => $invoice->encounter->registration_number,
                'items' => $invoice->items->map(fn ($item): array => [
                    'description' => $item->description_snapshot,
                    'quantity' => $item->quantity,
                    'unit' => $item->unit,
                    'unit_price' => $item->unit_price,
                    'line_total' => $item->line_total,
                ])->values(),
            ],
            'payment' => [
                'payment_number' => $payment->payment_number,
                'amount' => $payment->amount,
                'method_label' => $payment->method->label(),
                'reference_number' => $payment->reference_number,
                'status' => $payment->status->value,
                'status_label' => $payment->status->label(),
                'received_at' => $payment->received_at->toIso8601String(),
                'received_by' => $receiver instanceof User ? $receiver->name : 'Sistem',
                'void_reason' => $payment->void_reason,
            ],
        ]);
    }
}
