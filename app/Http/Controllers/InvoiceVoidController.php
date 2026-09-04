<?php

namespace App\Http\Controllers;

use App\Actions\VoidInvoice;
use App\Http\Requests\VoidInvoiceRequest;
use App\Models\Invoice;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;

class InvoiceVoidController extends Controller
{
    public function __invoke(
        VoidInvoiceRequest $request,
        Invoice $invoice,
        VoidInvoice $voidInvoice,
    ): RedirectResponse {
        Gate::authorize('void', $invoice);
        $voidInvoice->execute($invoice, $request->string('reason')->trim()->toString(), (int) $request->user()->id);
        Inertia::flash('toast', ['type' => 'success', 'message' => 'Invoice dibatalkan tanpa menghapus riwayat transaksi.']);

        return to_route('billing.show', $invoice);
    }
}
