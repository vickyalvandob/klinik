import { Form, Head, Link } from '@inertiajs/react';
import {
    Ban,
    Banknote,
    Clock3,
    Printer,
    ReceiptText,
    UserRound,
} from 'lucide-react';
import { FormField } from '@/components/form-field';
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { dashboard } from '@/routes';
import { index, voidMethod as voidInvoice } from '@/routes/billing';
import {
    store as receivePayment,
    voidMethod as voidPayment,
} from '@/routes/billing/payments';
import { show as showReceipt } from '@/routes/billing/receipts';
import type { BillingInvoice } from '@/types';

export default function BillingShow({
    invoice,
    allowPartialPayment,
    paymentMethods,
    can,
}: {
    invoice: BillingInvoice;
    allowPartialPayment: boolean;
    paymentMethods: Array<{ value: string; label: string }>;
    can: { receivePayment: boolean; voidInvoice: boolean };
}) {
    const hasActivePayment = invoice.payments.some(
        (payment) => payment.status === 'received',
    );

    return (
        <>
            <Head title={`Tagihan ${invoice.invoice_number}`} />
            <div className="flex flex-1 flex-col gap-5 p-4 md:p-6">
                <PageHeader
                    eyebrow={invoice.invoice_number}
                    title={invoice.patient.name}
                    description={`${invoice.patient.medical_record_number} · ${invoice.encounter.registration_number}`}
                    actions={
                        <Badge variant="outline">{invoice.status_label}</Badge>
                    }
                />

                <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
                    <main className="grid content-start gap-4">
                        <section className="bg-card rounded-xl border p-4 md:p-5">
                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                                <Info
                                    label="Tanggal kunjungan"
                                    value={formatDate(invoice.encounter.date)}
                                />
                                <Info
                                    label="Tanggal invoice"
                                    value={formatDateTime(invoice.issued_at)}
                                />
                                <Info
                                    label="Jenis kelamin"
                                    value={
                                        invoice.patient.gender === 'male'
                                            ? 'Laki-laki'
                                            : 'Perempuan'
                                    }
                                />
                                <Info
                                    label="Tanggal lahir"
                                    value={formatDate(
                                        invoice.patient.birth_date,
                                    )}
                                />
                            </div>
                        </section>

                        <section className="bg-card overflow-hidden rounded-xl border">
                            <div className="border-b px-4 py-3">
                                <h2 className="font-semibold">
                                    Rincian tagihan
                                </h2>
                                <p className="text-muted-foreground text-xs">
                                    Nama item dan harga merupakan snapshot saat
                                    invoice dibuat.
                                </p>
                            </div>
                            <div className="divide-y">
                                {invoice.items.map((item) => (
                                    <article
                                        key={item.uuid}
                                        className="grid gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_8rem_10rem] sm:items-center"
                                    >
                                        <div>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <p className="font-medium">
                                                    {item.description}
                                                </p>
                                                <Badge variant="outline">
                                                    {item.type_label}
                                                </Badge>
                                            </div>
                                            <p className="text-muted-foreground mt-1 text-xs">
                                                {item.code ?? 'Tanpa kode'} ·{' '}
                                                {formatQuantity(item.quantity)}{' '}
                                                {item.unit ?? ''} ×{' '}
                                                {formatCurrency(
                                                    item.unit_price,
                                                )}
                                            </p>
                                        </div>
                                        <Info
                                            label="Jumlah"
                                            value={`${formatQuantity(item.quantity)} ${item.unit ?? ''}`}
                                        />
                                        <div className="sm:text-right">
                                            <p className="text-muted-foreground text-xs">
                                                Subtotal
                                            </p>
                                            <p className="mt-1 font-semibold">
                                                {formatCurrency(
                                                    item.line_total,
                                                )}
                                            </p>
                                        </div>
                                    </article>
                                ))}
                            </div>
                            <div className="bg-muted/30 grid gap-2 border-t px-4 py-4 sm:ml-auto sm:w-80">
                                <AmountRow
                                    label="Total tagihan"
                                    value={invoice.total_amount}
                                />
                                <AmountRow
                                    label="Sudah dibayar"
                                    value={invoice.paid_amount}
                                />
                                <AmountRow
                                    label="Sisa"
                                    value={invoice.balance_due}
                                    emphasized
                                />
                            </div>
                        </section>

                        <PaymentHistory invoice={invoice} />

                        {invoice.void_reason && (
                            <section className="border-destructive/30 bg-destructive/5 rounded-xl border p-4">
                                <h2 className="text-sm font-semibold">
                                    Alasan pembatalan invoice
                                </h2>
                                <p className="mt-2 text-sm whitespace-pre-wrap">
                                    {invoice.void_reason}
                                </p>
                            </section>
                        )}
                    </main>

                    <aside className="grid content-start gap-4">
                        {can.receivePayment && (
                            <section className="bg-card rounded-xl border p-4">
                                <div className="flex items-center gap-2">
                                    <Banknote className="text-primary size-4" />
                                    <h2 className="text-sm font-semibold">
                                        Terima Pembayaran
                                    </h2>
                                </div>
                                <p className="text-muted-foreground mt-1 text-xs">
                                    {allowPartialPayment
                                        ? 'Pembayaran sebagian diizinkan. Pastikan nominal tidak melebihi sisa.'
                                        : 'Klinik mewajibkan pembayaran penuh.'}
                                </p>
                                <Form
                                    {...receivePayment.form(invoice.uuid)}
                                    className="mt-4 grid gap-3"
                                    disableWhileProcessing
                                >
                                    {({ errors, processing }) => (
                                        <>
                                            <FormField
                                                id="amount"
                                                label="Nominal pembayaran"
                                                error={errors.amount}
                                                required
                                            >
                                                <Input
                                                    id="amount"
                                                    name="amount"
                                                    type="number"
                                                    min={1}
                                                    max={invoice.balance_due}
                                                    step={1}
                                                    defaultValue={
                                                        invoice.balance_due
                                                    }
                                                />
                                            </FormField>
                                            <FormField
                                                id="method"
                                                label="Metode"
                                                error={errors.method}
                                                required
                                            >
                                                <Select
                                                    name="method"
                                                    defaultValue={
                                                        paymentMethods[0]?.value
                                                    }
                                                >
                                                    <SelectTrigger
                                                        id="method"
                                                        className="w-full"
                                                    >
                                                        <SelectValue placeholder="Pilih metode" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {paymentMethods.map(
                                                            (method) => (
                                                                <SelectItem
                                                                    key={
                                                                        method.value
                                                                    }
                                                                    value={
                                                                        method.value
                                                                    }
                                                                >
                                                                    {
                                                                        method.label
                                                                    }
                                                                </SelectItem>
                                                            ),
                                                        )}
                                                    </SelectContent>
                                                </Select>
                                            </FormField>
                                            <FormField
                                                id="reference_number"
                                                label="Nomor referensi"
                                                description="Opsional untuk transfer atau kartu."
                                                error={errors.reference_number}
                                            >
                                                <Input
                                                    id="reference_number"
                                                    name="reference_number"
                                                />
                                            </FormField>
                                            <FormField
                                                id="notes"
                                                label="Catatan"
                                                error={errors.notes}
                                            >
                                                <textarea
                                                    id="notes"
                                                    name="notes"
                                                    rows={3}
                                                    className="border-input focus-visible:border-ring focus-visible:ring-ring/50 min-h-20 w-full rounded-md border bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-[3px]"
                                                />
                                            </FormField>
                                            <Button
                                                type="submit"
                                                disabled={processing}
                                            >
                                                <ReceiptText /> Simpan & Buka
                                                Struk
                                            </Button>
                                        </>
                                    )}
                                </Form>
                            </section>
                        )}

                        <section className="bg-card rounded-xl border p-4">
                            <div className="flex items-center gap-2">
                                <UserRound className="text-muted-foreground size-4" />
                                <h2 className="text-sm font-semibold">
                                    Ringkasan Pasien
                                </h2>
                            </div>
                            <div className="mt-3 grid gap-3">
                                <Info
                                    label="Nama"
                                    value={invoice.patient.name}
                                />
                                <Info
                                    label="Nomor RM"
                                    value={
                                        invoice.patient.medical_record_number
                                    }
                                />
                                <Info
                                    label="Registrasi"
                                    value={
                                        invoice.encounter.registration_number
                                    }
                                />
                            </div>
                        </section>

                        {can.voidInvoice && !hasActivePayment && (
                            <section className="bg-card rounded-xl border p-4">
                                <h2 className="text-sm font-semibold">
                                    Batalkan Invoice
                                </h2>
                                <p className="text-muted-foreground mt-1 text-xs">
                                    Invoice tetap tersimpan dalam riwayat dan
                                    wajib disertai alasan.
                                </p>
                                <Form
                                    {...voidInvoice.form(invoice.uuid)}
                                    className="mt-3 grid gap-3"
                                    disableWhileProcessing
                                >
                                    {({ errors, processing }) => (
                                        <>
                                            <Input
                                                name="reason"
                                                placeholder="Alasan pembatalan"
                                            />
                                            {errors.reason && (
                                                <p className="text-destructive text-xs">
                                                    {errors.reason}
                                                </p>
                                            )}
                                            <Button
                                                type="submit"
                                                variant="destructive"
                                                disabled={processing}
                                            >
                                                <Ban /> Batalkan Invoice
                                            </Button>
                                        </>
                                    )}
                                </Form>
                            </section>
                        )}

                        <section className="bg-card rounded-xl border p-4">
                            <h2 className="text-sm font-semibold">
                                Jejak Billing
                            </h2>
                            <div className="mt-3 grid gap-3">
                                {invoice.audits.map((audit, indexValue) => (
                                    <div
                                        key={`${audit.action}-${audit.created_at}-${indexValue}`}
                                        className="flex gap-3"
                                    >
                                        <span className="bg-muted grid size-7 shrink-0 place-items-center rounded-full">
                                            <Clock3 className="size-3.5" />
                                        </span>
                                        <div>
                                            <p className="text-xs font-medium">
                                                {auditLabel(audit.action)}
                                            </p>
                                            <p className="text-muted-foreground mt-0.5 text-xs">
                                                {audit.actor} ·{' '}
                                                {formatDateTime(
                                                    audit.created_at,
                                                )}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    </aside>
                </div>
            </div>
        </>
    );
}

function PaymentHistory({ invoice }: { invoice: BillingInvoice }) {
    return (
        <section className="bg-card overflow-hidden rounded-xl border">
            <div className="border-b px-4 py-3">
                <h2 className="font-semibold">Riwayat pembayaran</h2>
            </div>
            {invoice.payments.length === 0 ? (
                <p className="text-muted-foreground p-4 text-sm">
                    Belum ada pembayaran untuk invoice ini.
                </p>
            ) : (
                <div className="divide-y">
                    {invoice.payments.map((payment) => (
                        <article
                            key={payment.uuid}
                            className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_10rem_10rem_auto] lg:items-center"
                        >
                            <div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <p className="font-medium">
                                        {payment.payment_number}
                                    </p>
                                    <Badge variant="outline">
                                        {payment.status_label}
                                    </Badge>
                                </div>
                                <p className="text-muted-foreground mt-1 text-xs">
                                    {payment.method_label} · Diterima oleh{' '}
                                    {payment.received_by}
                                </p>
                                {payment.void_reason && (
                                    <p className="text-destructive mt-2 text-xs">
                                        Dibatalkan: {payment.void_reason}
                                    </p>
                                )}
                            </div>
                            <Info
                                label="Waktu"
                                value={formatDateTime(payment.received_at)}
                            />
                            <Info
                                label="Nominal"
                                value={formatCurrency(payment.amount)}
                            />
                            <div className="flex flex-wrap gap-2 lg:justify-end">
                                <Button asChild size="sm" variant="outline">
                                    <Link
                                        href={showReceipt({
                                            invoice: invoice.uuid,
                                            payment: payment.uuid,
                                        })}
                                    >
                                        <Printer /> Struk
                                    </Link>
                                </Button>
                                {payment.can_void && (
                                    <Form
                                        {...voidPayment.form(payment.uuid)}
                                        className="flex gap-2"
                                        disableWhileProcessing
                                    >
                                        {({ errors, processing }) => (
                                            <div className="grid gap-1">
                                                <div className="flex gap-2">
                                                    <Input
                                                        name="reason"
                                                        className="min-w-44"
                                                        placeholder="Alasan pembatalan"
                                                    />
                                                    <Button
                                                        type="submit"
                                                        size="sm"
                                                        variant="destructive"
                                                        disabled={processing}
                                                    >
                                                        Void
                                                    </Button>
                                                </div>
                                                {errors.reason && (
                                                    <p className="text-destructive text-xs">
                                                        {errors.reason}
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                    </Form>
                                )}
                            </div>
                        </article>
                    ))}
                </div>
            )}
        </section>
    );
}

function AmountRow({
    label,
    value,
    emphasized = false,
}: {
    label: string;
    value: number;
    emphasized?: boolean;
}) {
    return (
        <div className="flex items-center justify-between gap-4">
            <span
                className={
                    emphasized
                        ? 'font-semibold'
                        : 'text-muted-foreground text-sm'
                }
            >
                {label}
            </span>
            <span className={emphasized ? 'text-lg font-semibold' : 'text-sm'}>
                {formatCurrency(value)}
            </span>
        </div>
    );
}

function Info({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <p className="text-muted-foreground text-xs">{label}</p>
            <p className="mt-1 text-sm font-medium">{value}</p>
        </div>
    );
}

function formatCurrency(value: number) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0,
    }).format(value);
}

function formatQuantity(value: string) {
    return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 }).format(
        Number(value),
    );
}

function formatDate(value: string) {
    return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(
        new Date(`${value}T00:00:00`),
    );
}

function formatDateTime(value: string) {
    return new Intl.DateTimeFormat('id-ID', {
        dateStyle: 'medium',
        timeStyle: 'short',
    }).format(new Date(value));
}

function auditLabel(action: string) {
    return (
        (
            {
                invoice_created: 'Invoice dibuat',
                payment_received: 'Pembayaran diterima',
                payment_voided: 'Pembayaran dibatalkan',
                invoice_voided: 'Invoice dibatalkan',
            } as Record<string, string>
        )[action] ?? action
    );
}

BillingShow.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Kasir & Billing', href: index() },
        { title: 'Detail Tagihan', href: index() },
    ],
};
