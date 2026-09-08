import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, CheckCircle2, Clock3, Printer, ReceiptText } from 'lucide-react';
import { PaymentForm } from '@/components/payment-form';
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatDate, formatDateTime, formatQuantity, invoiceTone } from '@/lib/billing';
import { dashboard } from '@/routes';
import { index } from '@/routes/billing';
import { show as showReceipt } from '@/routes/billing/receipts';
import type { BillingInvoice } from '@/types';
import { BillingVoidDialog } from './void-dialog';

export default function BillingShow({ invoice, paymentToken, paymentMethods, can }: {
    invoice: BillingInvoice; paymentToken: string; paymentMethods: Array<{ value: string; label: string }>;
    can: { receivePayment: boolean; voidInvoice: boolean };
}) {
    const latestPayment = invoice.payments.findLast((payment) => payment.status === 'received');
    return <>
        <Head title={'Tagihan ' + invoice.invoice_number} />
        <div className="flex min-w-0 flex-1 flex-col gap-5 p-4 md:p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <Button asChild size="sm" variant="ghost" className="-ml-2"><Link href={index()}><ArrowLeft className="size-4" />Daftar tagihan</Link></Button>
                {latestPayment && <Button asChild size="sm" variant="outline"><Link href={showReceipt({ invoice: invoice.uuid, payment: latestPayment.uuid })}><Printer className="size-4" />Struk terakhir</Link></Button>}
            </div>
            <PageHeader eyebrow={invoice.invoice_number} title={invoice.patient.name}
                description={invoice.patient.medical_record_number + ' · ' + invoice.encounter.registration_number}
                actions={<Badge variant="outline" className={invoiceTone(invoice.status)}>{invoice.status_label}</Badge>} />
            <div className="grid grid-cols-2 gap-4 rounded-xl border p-4 sm:grid-cols-4">
                <Info label="Kunjungan" value={formatDate(invoice.encounter.date)} />
                <Info label="Tagihan dibuat" value={formatDateTime(invoice.issued_at)} />
                <Info label="Total tagihan" value={formatCurrency(invoice.total_amount)} />
                <Info label="Sudah dibayar" value={formatCurrency(invoice.paid_amount)} />
            </div>
            <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_23rem]">
                <aside className="order-1 grid min-w-0 gap-4 xl:order-2 xl:sticky xl:top-5">
                    {can.receivePayment ? <PaymentForm key={invoice.uuid} invoice={invoice} paymentToken={paymentToken} paymentMethods={paymentMethods} /> : <section className="bg-card grid gap-3 rounded-xl border p-5">
                        {invoice.status === 'paid' ? <><CheckCircle2 className="size-7 text-emerald-600" /><h2 className="font-semibold">Tagihan sudah lunas</h2><p className="text-muted-foreground text-sm">{invoice.total_amount === 0 ? 'Tidak ada biaya yang perlu dibayar.' : 'Pembayaran selesai. Struk tersedia pada riwayat pembayaran.'}</p></> : invoice.status === 'voided' ? <><ReceiptText className="text-muted-foreground size-7" /><h2 className="font-semibold">Tagihan dibatalkan</h2><p className="text-muted-foreground text-sm break-words">{invoice.void_reason}</p></> : <><h2 className="font-semibold">Sisa tagihan</h2><p className="text-2xl font-semibold tabular-nums">{formatCurrency(invoice.balance_due)}</p><p className="text-muted-foreground text-sm">Penerimaan pembayaran memerlukan akses kasir.</p></>}
                        <Button asChild variant="outline"><Link href={index()}>Kembali ke daftar tagihan</Link></Button>
                    </section>}
                </aside>
                <main className="order-2 grid min-w-0 gap-4 xl:order-1">
                    <section className="bg-card min-w-0 overflow-hidden rounded-xl border">
                        <div className="flex items-center justify-between gap-2 border-b px-4 py-3"><h2 className="text-sm font-semibold">Rincian tagihan</h2><span className="text-muted-foreground text-xs">{invoice.items.length} item</span></div>
                        <div className="divide-y">
                            {invoice.items.length === 0 && <p className="text-muted-foreground p-4 text-sm">Tidak ada item berbayar.</p>}
                            {invoice.items.map((item) => <article key={item.uuid} className="grid grid-cols-[minmax(0,1fr)_auto] gap-4 p-4">
                                <div className="min-w-0"><p className="text-sm font-medium break-words">{item.description}</p><p className="text-muted-foreground mt-1 text-xs">{item.type_label} · {formatQuantity(item.quantity)} {item.unit ?? ''} × {formatCurrency(item.unit_price)}</p>{item.code && <p className="text-muted-foreground mt-1 text-xs">{item.code}</p>}</div>
                                <p className="text-sm font-semibold tabular-nums">{formatCurrency(item.line_total)}</p>
                            </article>)}
                        </div>
                        <div className="bg-muted/30 grid gap-2 border-t p-4">
                            <AmountRow label="Total tagihan" value={invoice.total_amount} />
                            <AmountRow label="Sudah dibayar" value={invoice.paid_amount} />
                            <AmountRow label={invoice.status === 'voided' ? 'Sisa tagihan (dibatalkan)' : 'Sisa tagihan'} value={invoice.balance_due} emphasized />
                        </div>
                    </section>
                    <section className="bg-card min-w-0 overflow-hidden rounded-xl border">
                        <div className="flex items-center justify-between gap-2 border-b px-4 py-3"><h2 className="text-sm font-semibold">Riwayat pembayaran</h2><span className="text-muted-foreground text-xs">{invoice.payments.length} transaksi</span></div>
                        {invoice.payments.length === 0 ? <p className="text-muted-foreground p-4 text-sm">Pembayaran yang berhasil akan tampil di sini.</p> : <div className="divide-y">{invoice.payments.toReversed().map((payment) => <article key={payment.uuid} className="grid gap-3 p-4">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                                <div className="min-w-0"><p className="text-sm font-medium">{payment.method_label}<Badge variant="outline" className={'ml-2 ' + (payment.status === 'voided' ? 'text-muted-foreground' : invoiceTone('paid'))}>{payment.status_label}</Badge></p><p className="text-muted-foreground mt-1 text-xs break-words">{payment.payment_number}</p></div>
                                <p className={'text-base font-semibold tabular-nums ' + (payment.status === 'voided' ? 'text-muted-foreground line-through' : '')}>{formatCurrency(payment.amount)}</p>
                            </div>
                            <p className="text-muted-foreground text-xs">{formatDateTime(payment.received_at)} · {payment.received_by}</p>
                            {payment.reference_number && <p className="text-muted-foreground text-xs break-words">Referensi: {payment.reference_number}</p>}
                            {payment.notes && <p className="text-muted-foreground text-xs break-words">{payment.notes}</p>}
                            {payment.void_reason && <div className="bg-muted/40 rounded-lg p-3"><p className="text-sm break-words">Dibatalkan: {payment.void_reason}</p><p className="text-muted-foreground mt-1 text-xs">{payment.voided_by}{payment.voided_at && ' · ' + formatDateTime(payment.voided_at)}</p></div>}
                            <div className="flex flex-wrap items-center gap-2">
                                <Button asChild size="sm" variant="outline"><Link href={showReceipt({ invoice: invoice.uuid, payment: payment.uuid })}><Printer className="size-3.5" />Lihat struk</Link></Button>
                                {payment.can_void && <BillingVoidDialog uuid={payment.uuid} type="payment" description={payment.payment_number + ' · ' + payment.method_label + ' · ' + formatCurrency(payment.amount) + '.'} />}
                            </div>
                        </article>)}</div>}
                    </section>
                    <details className="bg-card rounded-xl border p-4">
                        <summary className="cursor-pointer text-sm font-medium">Aktivitas tagihan <span className="text-muted-foreground ml-1 font-normal">({invoice.audits.length})</span></summary>
                        <div className="mt-4 grid gap-4">{invoice.audits.toReversed().map((audit, auditIndex) => <div key={auditIndex} className="flex gap-3"><Clock3 className="text-muted-foreground mt-0.5 size-4 shrink-0" /><div><p className="text-sm">{auditLabel(audit.action)}</p><p className="text-muted-foreground mt-1 text-xs">{audit.actor} · {formatDateTime(audit.created_at)}</p></div></div>)}</div>
                    </details>
                    {can.voidInvoice && !latestPayment && <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border p-4"><p className="text-muted-foreground text-xs">Ada koreksi pada tagihan ini?</p><BillingVoidDialog type="invoice" uuid={invoice.uuid} description={invoice.invoice_number + ' · ' + invoice.patient.name + '.'} /></div>}
                </main>
            </div>
        </div>
    </>;
}

function AmountRow({ label, value, emphasized = false }: { label: string; value: number; emphasized?: boolean }) {
    return <div className="flex items-center justify-between gap-4 text-sm"><span className={emphasized ? 'font-semibold' : 'text-muted-foreground'}>{label}</span><span className={'tabular-nums ' + (emphasized ? 'text-lg font-semibold' : 'font-medium')}>{formatCurrency(value)}</span></div>;
}
function Info({ label, value }: { label: string; value: string }) {
    return <div className="min-w-0"><p className="text-muted-foreground text-xs">{label}</p><p className="mt-1 text-sm font-medium break-words tabular-nums">{value}</p></div>;
}
function auditLabel(action: string) {
    return ({ invoice_created: 'Tagihan dibuat', payment_received: 'Pembayaran diterima', payment_voided: 'Pembayaran dibatalkan', invoice_voided: 'Tagihan dibatalkan' } as Record<string, string>)[action] ?? action;
}
BillingShow.layout = { breadcrumbs: [{ title: 'Ringkasan', href: dashboard() }, { title: 'Kasir', href: index() }, { title: 'Detail tagihan', href: index() }] };
