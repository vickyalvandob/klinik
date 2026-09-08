import { useForm } from '@inertiajs/react';
import { Banknote, Check, LoaderCircle, Plus, X } from 'lucide-react';
import { useState } from 'react';
import { FormField } from '@/components/form-field';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatCurrency } from '@/lib/billing';
import { store } from '@/routes/billing/payments';
import type { BillingInvoice } from '@/types';

type PaymentRow = { amount: string; method: string; reference_number: string; notes: string };
type PaymentData = { payment_token: string; payments: PaymentRow[] };

export function PaymentForm({ invoice, paymentToken, paymentMethods }: {
    invoice: BillingInvoice; paymentToken: string; paymentMethods: Array<{ value: string; label: string }>;
}) {
    const defaultMethod = paymentMethods[0]?.value ?? 'cash';
    const form = useForm<PaymentData>({
        payment_token: paymentToken,
        payments: [{ amount: String(invoice.balance_due), method: defaultMethod, reference_number: '', notes: '' }],
    });
    const [cashReceived, setCashReceived] = useState('');
    const rows = form.data.payments;
    const total = rows.reduce((sum, row) => sum + Number(row.amount || 0), 0);
    const cashTotal = rows.filter((row) => row.method === 'cash').reduce((sum, row) => sum + Number(row.amount || 0), 0);
    const remaining = invoice.balance_due - total;
    const invalidRows = rows.some((row) => !Number.isSafeInteger(Number(row.amount)) || Number(row.amount) <= 0);
    const insufficientCash = cashTotal > 0 && cashReceived !== '' && (!Number.isSafeInteger(Number(cashReceived)) || Number(cashReceived) < cashTotal);
    const valid = !invalidRows && total > 0 && remaining >= 0 && !insufficientCash;
    const errors = form.errors as Record<string, string>;

    function updateRow(index: number, field: keyof PaymentRow, value: string) {
        form.clearErrors();
        form.setData('payments', rows.map((row, rowIndex) => rowIndex === index ? {
            ...row, [field]: value, ...(field === 'method' ? { reference_number: '' } : {}),
        } : row));
    }

    return <section id="payment-form" className="bg-card overflow-hidden rounded-xl border">
        <div className="bg-muted/30 border-b p-4 md:p-5">
            <h2 className="flex items-center gap-2 text-sm font-semibold"><Banknote className="text-primary size-4" />Terima pembayaran</h2>
            <p className="text-muted-foreground mt-4 text-xs">Sisa tagihan</p>
            <p className="mt-1 text-3xl font-semibold tracking-tight tabular-nums">{formatCurrency(invoice.balance_due)}</p>
            <p className="text-muted-foreground mt-2 text-xs">Bayar penuh, sebagian, atau dengan beberapa metode.</p>
        </div>
        <form className="grid gap-4 p-4 md:p-5" onSubmit={(event) => {
            event.preventDefault();
            if (!valid || form.processing) return;
            form.post(store.url(invoice.uuid), {
                preserveScroll: true,
                onSuccess: (page) => {
                    const updated = page.props as unknown as { invoice: BillingInvoice; paymentToken: string };
                    const next: PaymentData = {
                        payment_token: updated.paymentToken,
                        payments: [{ amount: String(updated.invoice.balance_due), method: defaultMethod, reference_number: '', notes: '' }],
                    };
                    form.setDefaults(next);
                    form.setData(next);
                    form.clearErrors();
                    setCashReceived('');
                },
            });
        }}>
            {rows.map((row, index) => <fieldset key={index} disabled={form.processing} className={rows.length > 1 ? 'grid min-w-0 gap-3 rounded-lg border p-3' : 'grid min-w-0 gap-3'}>
                {rows.length > 1 && <legend className="px-1 text-xs font-medium">Metode {index + 1}</legend>}
                <div className="flex items-end gap-2">
                    <div className="min-w-0 flex-1">
                        <FormField id={'method-' + index} label="Metode pembayaran" error={errors['payments.' + index + '.method']} required>
                            <select id={'method-' + index} value={row.method} onChange={(event) => updateRow(index, 'method', event.target.value)}
                                className="border-input bg-background focus-visible:ring-ring h-10 w-full min-w-0 rounded-md border px-3 text-sm focus-visible:ring-2 focus-visible:outline-none">
                                {paymentMethods.map((method) => <option key={method.value} value={method.value}>{method.label}</option>)}
                            </select>
                        </FormField>
                    </div>
                    {rows.length > 1 && <Button type="button" variant="ghost" size="icon" aria-label={'Hapus metode ' + (index + 1)} onClick={() => {
                        form.clearErrors(); form.setData('payments', rows.filter((_, rowIndex) => rowIndex !== index));
                    }}><X className="size-4" /></Button>}
                </div>
                <FormField id={'amount-' + index} label="Nominal pembayaran (Rp)" error={errors['payments.' + index + '.amount']} required>
                    <div className="flex gap-2">
                        <Input id={'amount-' + index} type="number" inputMode="numeric" min={1} max={invoice.balance_due} step={1}
                            className="h-11 min-w-0 text-base tabular-nums" value={row.amount} required
                            onChange={(event) => updateRow(index, 'amount', event.target.value)} />
                        <Button type="button" variant="outline" className="h-11 shrink-0" onClick={() => updateRow(index, 'amount', String(Math.max(0, invoice.balance_due - total + Number(row.amount || 0))))}>Isi sisa</Button>
                    </div>
                    <p className="text-muted-foreground mt-1 text-xs">{formatCurrency(Number(row.amount || 0))}</p>
                </FormField>
                {row.method !== 'cash' && <FormField id={'reference-' + index} label="Nomor referensi (opsional)" error={errors['payments.' + index + '.reference_number']}>
                    <Input id={'reference-' + index} maxLength={100} value={row.reference_number} placeholder="Nomor transaksi / bukti transfer"
                        onChange={(event) => updateRow(index, 'reference_number', event.target.value)} />
                </FormField>}
                <details className="text-sm">
                    <summary className="text-muted-foreground cursor-pointer text-xs">Tambahkan catatan (opsional)</summary>
                    <div className="mt-2"><FormField id={'notes-' + index} label="Catatan pembayaran" error={errors['payments.' + index + '.notes']}>
                        <Input id={'notes-' + index} maxLength={1000} value={row.notes} onChange={(event) => updateRow(index, 'notes', event.target.value)} />
                    </FormField></div>
                </details>
            </fieldset>)}
            {rows.length < 5 && <Button type="button" variant="outline" disabled={form.processing} onClick={() => {
                form.clearErrors();
                form.setData('payments', [...rows, { amount: remaining > 0 ? String(remaining) : '', method: paymentMethods.find((method) => !rows.some((row) => row.method === method.value))?.value ?? defaultMethod, reference_number: '', notes: '' }]);
            }}><Plus className="size-4" />Gabungkan metode pembayaran</Button>}
            {rows.length > 1 && remaining === 0 && invalidRows && <p className="text-muted-foreground text-xs">Bagi nominal pada setiap metode sesuai pembayaran pasien.</p>}
            {cashTotal > 0 && <div className="bg-muted/30 grid gap-2 rounded-lg border p-3">
                <FormField id="cash-received" label="Uang tunai diterima (Rp, opsional)">
                    <Input id="cash-received" type="number" inputMode="numeric" min={cashTotal} step={1} value={cashReceived}
                        disabled={form.processing} placeholder={String(cashTotal)} onChange={(event) => setCashReceived(event.target.value)} />
                </FormField>
                <div className="flex justify-between gap-2 text-sm" aria-live="polite"><span className="text-muted-foreground">Kembalian tunai</span><strong className="tabular-nums">{formatCurrency(Math.max(0, Number(cashReceived || cashTotal) - cashTotal))}</strong></div>
                {insufficientCash && <p role="alert" className="text-destructive text-xs">Uang tunai kurang dari nominal pembayaran tunai.</p>}
                <p className="text-muted-foreground text-xs">Alat bantu hitung kembalian; tagihan dicatat sesuai nominal pembayaran.</p>
            </div>}
            <div className="grid gap-2 border-t pt-4 text-sm" aria-live="polite">
                <p className="flex justify-between gap-2"><span className="text-muted-foreground">Dibayar sekarang</span><strong className="tabular-nums">{formatCurrency(total)}</strong></p>
                <p className="flex justify-between gap-2"><span className="text-muted-foreground">Sisa setelah bayar</span><strong className="tabular-nums">{formatCurrency(Math.max(0, remaining))}</strong></p>
            </div>
            {(errors.payments || errors.payment_token || errors.amount) && <p role="alert" className="text-destructive text-sm">{errors.payments || errors.payment_token || errors.amount}</p>}
            {remaining < 0 && <p role="alert" className="text-destructive text-xs">Nominal melebihi sisa tagihan sebesar {formatCurrency(-remaining)}.</p>}
            <Button type="submit" className="h-auto min-h-11 whitespace-normal" disabled={form.processing || !valid}>
                {form.processing ? <LoaderCircle className="size-4 animate-spin" /> : <Check className="size-4" />}
                {form.processing ? 'Menyimpan pembayaran…' : remaining === 0 ? 'Bayar lunas · ' + formatCurrency(total) : 'Bayar sebagian · ' + formatCurrency(total)}
            </Button>
        </form>
    </section>;
}
