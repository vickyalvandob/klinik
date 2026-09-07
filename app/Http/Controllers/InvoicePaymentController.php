<?php

namespace App\Http\Controllers;

use App\Actions\ReceiveInvoicePayments;
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
        ReceiveInvoicePayments $receiveInvoicePayments,
    ): RedirectResponse {
        if ($request->has('payments')) {
            Gate::authorize('view', $invoice);
            abort_unless($request->user()->hasClinicPermission('payment.receive'), 403);
            $receiveInvoicePayments->execute(
                $invoice, $request->validated('payments'), $request->string('payment_token')->toString(),
                (int) $request->user()->id,
            );
            Inertia::flash('toast', ['type' => 'success', 'message' => 'Pembayaran dicatat. Sisa tagihan sudah diperbarui.']);

            return to_route('billing.show', $invoice);
        }

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
