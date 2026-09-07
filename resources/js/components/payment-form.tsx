import { useForm } from '@inertiajs/react';
import { Banknote, Plus, X } from 'lucide-react';
import { FormField } from '@/components/form-field';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { store } from '@/routes/billing/payments';
import type { BillingInvoice } from '@/types';

export function PaymentForm({
    invoice,
    paymentToken,
    paymentMethods,
}: {
    invoice: BillingInvoice;
    paymentToken: string;
    paymentMethods: Array<{ value: string; label: string }>;
}) {
    const form = useForm({
        payment_token: paymentToken,
        payments: [
            {
                amount: String(invoice.balance_due),
                method: paymentMethods[0]?.value ?? 'cash',
                reference_number: '',
                notes: '',
            },
        ],
    });
    const total = form.data.payments.reduce(
        (sum, row) => sum + Number(row.amount || 0),
        0,
    );
    const errors = form.errors as Record<string, string>;
    const money = (amount: number) =>
        new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            maximumFractionDigits: 0,
        }).format(amount);
    function updateRow(
        index: number,
        field: 'amount' | 'method' | 'reference_number',
        value: string,
    ) {
        form.setData(
            'payments',
            form.data.payments.map((row, rowIndex) =>
                rowIndex === index ? { ...row, [field]: value } : row,
            ),
        );
    }
    return (
        <section className="bg-card rounded-xl border p-4">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
                <Banknote className="text-primary size-4" /> Bayar tagihan
            </h2>
            <p className="text-muted-foreground mt-1 text-xs">
                Bayar penuh, cicil, atau gabungkan beberapa metode. Sisa tagihan
                tetap tercatat.
            </p>
            <form
                className="mt-4 grid gap-4"
                onSubmit={(event) => {
                    event.preventDefault();
                    form.post(store.url(invoice.uuid), {
                        preserveScroll: true,
                    });
                }}
            >
                {form.data.payments.map((row, index) => (
                    <fieldset
                        key={index}
                        className="grid gap-3 rounded-lg border p-3"
                        disabled={form.processing}
                    >
                        <legend className="px-1 text-xs font-medium">
                            Pembayaran {index + 1}
                        </legend>
                        {form.data.payments.length > 1 && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="justify-self-end"
                                aria-label={`Hapus metode ${index + 1}`}
                                onClick={() =>
                                    form.setData(
                                        'payments',
                                        form.data.payments.filter(
                                            (_, rowIndex) => rowIndex !== index,
                                        ),
                                    )
                                }
                            >
                                <X className="size-4" /> Hapus
                            </Button>
                        )}
                        <FormField
                            id={`amount-${index}`}
                            label="Nominal (Rp)"
                            error={errors[`payments.${index}.amount`]}
                            required
                        >
                            <Input
                                id={`amount-${index}`}
                                type="number"
                                min={1}
                                max={invoice.balance_due}
                                step={1}
                                value={row.amount}
                                onChange={(event) =>
                                    updateRow(
                                        index,
                                        'amount',
                                        event.target.value,
                                    )
                                }
                                required
                            />
                        </FormField>
                        <FormField
                            id={`method-${index}`}
                            label="Metode"
                            error={errors[`payments.${index}.method`]}
                            required
                        >
                            <select
                                id={`method-${index}`}
                                className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm focus-visible:ring-2"
                                value={row.method}
                                onChange={(event) =>
                                    updateRow(
                                        index,
                                        'method',
                                        event.target.value,
                                    )
                                }
                            >
                                {paymentMethods.map((method) => (
                                    <option
                                        key={method.value}
                                        value={method.value}
                                    >
                                        {method.label}
                                    </option>
                                ))}
                            </select>
                        </FormField>
                        <FormField
                            id={`reference-${index}`}
                            label="Nomor referensi (opsional)"
                            error={errors[`payments.${index}.reference_number`]}
                        >
                            <Input
                                id={`reference-${index}`}
                                maxLength={100}
                                value={row.reference_number}
                                onChange={(event) =>
                                    updateRow(
                                        index,
                                        'reference_number',
                                        event.target.value,
                                    )
                                }
                            />
                        </FormField>
                    </fieldset>
                ))}
                {form.data.payments.length < 5 && (
                    <Button
                        type="button"
                        variant="outline"
                        disabled={form.processing}
                        onClick={() =>
                            form.setData('payments', [
                                ...form.data.payments,
                                {
                                    amount: String(
                                        Math.max(
                                            0,
                                            invoice.balance_due - total,
                                        ),
                                    ),
                                    method: paymentMethods[1]?.value ?? 'cash',
                                    reference_number: '',
                                    notes: '',
                                },
                            ])
                        }
                    >
                        <Plus className="size-4" /> Tambah metode / split
                    </Button>
                )}
                <div
                    className="bg-muted/40 grid gap-2 rounded-lg p-3 text-sm"
                    aria-live="polite"
                >
                    <p className="flex justify-between gap-2">
                        <span>Dibayar sekarang</span>
                        <strong>{money(total)}</strong>
                    </p>
                    <p className="flex justify-between gap-2">
                        <span>Sisa setelah bayar</span>
                        <strong>
                            {money(Math.max(0, invoice.balance_due - total))}
                        </strong>
                    </p>
                </div>
                {(errors.payments || errors.payment_token || errors.amount) && (
                    <p role="alert" className="text-destructive text-sm">
                        {errors.payments ||
                            errors.payment_token ||
                            errors.amount}
                    </p>
                )}
                {total > invoice.balance_due && (
                    <p role="alert" className="text-destructive text-xs">
                        Total pembayaran melebihi sisa tagihan.
                    </p>
                )}
                <Button
                    type="submit"
                    disabled={
                        form.processing ||
                        total < 1 ||
                        total > invoice.balance_due
                    }
                >
                    {form.processing
                        ? 'Menyimpan…'
                        : total === invoice.balance_due
                          ? 'Bayar lunas'
                          : 'Simpan pembayaran sebagian'}
                </Button>
            </form>
        </section>
    );
}
