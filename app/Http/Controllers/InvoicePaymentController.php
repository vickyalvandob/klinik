<?php

namespace App\Http\Controllers;

use App\Actions\ReceivePayment;
use App\Http\Requests\ReceivePaymentRequest;
use App\Models\Invoice;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;

class InvoicePaymentController extends Controller
{
    public function __invoke(
        ReceivePaymentRequest $request,
        Invoice $invoice,
        ReceivePayment $receivePayment,
    ): RedirectResponse {
        Gate::authorize('receivePayment', $invoice);
        $payment = $receivePayment->execute($invoice, [
            'amount' => $request->integer('amount'),
            'method' => $request->string('method')->toString(),
            'reference_number' => $request->filled('reference_number')
                ? $request->string('reference_number')->toString()
                : null,
            'notes' => $request->filled('notes') ? $request->string('notes')->toString() : null,
        ], (int) $request->user()->id);
        Inertia::flash('toast', ['type' => 'success', 'message' => 'Pembayaran berhasil dicatat.']);

        return to_route('billing.receipts.show', [$invoice, $payment]);
    }
}
