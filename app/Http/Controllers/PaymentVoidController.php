<?php

namespace App\Http\Controllers;

use App\Actions\VoidPayment;
use App\Http\Requests\VoidPaymentRequest;
use App\Models\Payment;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;

class PaymentVoidController extends Controller
{
    public function __invoke(
        VoidPaymentRequest $request,
        Payment $payment,
        VoidPayment $voidPayment,
    ): RedirectResponse {
        Gate::authorize('void', $payment);
        $voidPayment->execute($payment, $request->string('reason')->trim()->toString(), (int) $request->user()->id);
        Inertia::flash('toast', ['type' => 'success', 'message' => 'Pembayaran dibatalkan dan saldo tagihan diperbarui.']);

        return to_route('billing.show', $payment->invoice);
    }
}
