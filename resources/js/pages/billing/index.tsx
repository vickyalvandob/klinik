import { Head, Link, router } from '@inertiajs/react';
import { ArrowRight, Banknote, CheckCheck, Clock3, LoaderCircle, ReceiptText, Search, X } from 'lucide-react';
import { useState } from 'react';
import { PageHeader } from '@/components/page-header';
import { PaginationLinks } from '@/components/pagination-links';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatCurrency, formatDate, formatDateTime, invoiceTone } from '@/lib/billing';
import { cn } from '@/lib/utils';
import { dashboard } from '@/routes';
import { index, show } from '@/routes/billing';
import type { BillingInvoicePage, BillingMode, BillingReconciliation } from '@/types';

type Summary = { outstanding_count: number; outstanding_amount: number; issued_count: number; partial_count: number; paid_count: number; voided_count: number };

export default function BillingIndex({ mode, search, date, today, invoices, summary, reconciliation }: {
    mode: BillingMode; search: string; date: string; today: string; invoices: BillingInvoicePage; summary: Summary; reconciliation: BillingReconciliation;
}) {
    const [loading, setLoading] = useState(false);
    const [loadingReconciliation, setLoadingReconciliation] = useState(false);
    const active = mode === 'outstanding' || mode === 'partial';
    const tabs: Array<[BillingMode, string, number]> = [
        ['outstanding', 'Belum dibayar', summary.issued_count], ['partial', 'Sebagian', summary.partial_count],
        ['paid', 'Lunas', summary.paid_count], ['voided', 'Dibatalkan', summary.voided_count],
    ];

    function filter(nextMode: BillingMode, nextSearch: string) {
        router.get(index.url(), { mode: nextMode, search: nextSearch.trim(), date }, {
            only: ['invoices', 'mode', 'search', 'summary'], preserveState: true, preserveScroll: true, replace: true,
            onStart: () => setLoading(true), onFinish: () => setLoading(false),
        });
    }

    function changeDate(nextDate: string) {
        if (!nextDate) return;
        const page = new URLSearchParams(window.location.search).get('page');
        router.get(index.url(), { mode, search, date: nextDate, ...(page ? { page } : {}) }, {
            only: ['reconciliation', 'date', 'today'], preserveState: true, preserveScroll: true, replace: true,
            onStart: () => setLoadingReconciliation(true), onFinish: () => setLoadingReconciliation(false),
        });
    }

    return <>
        <Head title="Kasir" />
        <div className="flex min-w-0 flex-1 flex-col gap-5 p-4 md:p-6">
            <PageHeader eyebrow="Pembayaran pasien" title="Kasir" description="Kelola tagihan dan pembayaran dalam satu tempat." />
            <div className="grid gap-3 sm:grid-cols-3">
                <div className="bg-card rounded-xl border p-4">
                    <p className="text-muted-foreground flex items-center gap-2 text-xs"><ReceiptText className="size-4" /> Sisa tagihan aktif</p>
                    <p className="mt-3 text-2xl font-semibold tracking-tight tabular-nums">{formatCurrency(summary.outstanding_amount)}</p>
                    <p className="text-muted-foreground mt-1 text-xs">{summary.outstanding_count} tagihan belum selesai</p>
                </div>
                <div className="bg-card rounded-xl border p-4">
                    <p className="text-muted-foreground flex items-center gap-2 text-xs"><Clock3 className="size-4" /> Perlu pelunasan</p>
                    <p className="mt-3 text-2xl font-semibold tabular-nums">{summary.partial_count}<span className="text-muted-foreground ml-2 text-sm font-normal">tagihan</span></p>
                    <p className="text-muted-foreground mt-1 text-xs">Sudah dibayar sebagian</p>
                </div>
                <div className="bg-card rounded-xl border p-4">
                    <p className="text-muted-foreground flex items-center gap-2 text-xs"><CheckCheck className="size-4" /> Tagihan lunas</p>
                    <p className="mt-3 text-2xl font-semibold tabular-nums">{summary.paid_count}<span className="text-muted-foreground ml-2 text-sm font-normal">tagihan</span></p>
                    <p className="text-muted-foreground mt-1 text-xs">Seluruh riwayat klinik</p>
                </div>
            </div>

            <section className="bg-card min-w-0 overflow-hidden rounded-xl border" aria-busy={loading}>
                <div className="border-b">
                    <nav className="flex overflow-x-auto px-2" aria-label="Status tagihan">
                        {tabs.map(([value, label, count]) => <button key={value} type="button" disabled={loading} aria-current={mode === value ? 'page' : undefined}
                            onClick={() => filter(value, search)}
                            className={cn('flex shrink-0 items-center gap-2 border-b-2 px-3 py-3.5 text-sm whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-60', mode === value ? 'border-primary text-primary font-semibold' : 'text-muted-foreground hover:text-foreground border-transparent')}>
                            {label}<span className="bg-muted text-muted-foreground rounded-md px-1.5 py-0.5 text-xs tabular-nums">{count}</span>
                        </button>)}
                    </nav>
                </div>
                <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
                    <form className="flex min-w-0 flex-1 gap-2 sm:max-w-lg" onSubmit={(event) => {
                        event.preventDefault(); filter(mode, String(new FormData(event.currentTarget).get('search') ?? ''));
                    }}>
                        <div className="relative min-w-0 flex-1">
                            <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                            <Input key={search} name="search" defaultValue={search} maxLength={100} aria-label="Cari tagihan" placeholder="Nama pasien, no. RM, atau tagihan" className="pl-9" />
                        </div>
                        <Button type="submit" variant="outline" disabled={loading}>{loading ? <LoaderCircle className="size-4 animate-spin" /> : 'Cari'}</Button>
                        {search && <Button type="button" size="icon" variant="ghost" aria-label="Hapus pencarian" disabled={loading} onClick={() => filter(mode, '')}><X /></Button>}
                    </form>
                    <p className="text-muted-foreground text-xs">{active ? 'Paling lama menunggu ditampilkan dahulu' : 'Tagihan terbaru ditampilkan dahulu'}</p>
                </div>
                {invoices.data.length === 0 ? <div className="grid justify-items-center gap-2 px-5 py-14 text-center">
                    <span className="bg-muted mb-1 rounded-full p-3"><ReceiptText className="text-muted-foreground size-6" /></span>
                    <h2 className="text-sm font-semibold">{search ? 'Tagihan tidak ditemukan' : 'Belum ada tagihan pada daftar ini'}</h2>
                    <p className="text-muted-foreground max-w-sm text-sm">{search ? 'Coba nama pasien, nomor rekam medis, registrasi, atau nomor tagihan lainnya.' : 'Tagihan akan tersedia setelah pelayanan pasien selesai.'}</p>
                    {search && <Button type="button" variant="outline" size="sm" onClick={() => filter(mode, '')}>Tampilkan semua tagihan</Button>}
                </div> : <div className={cn('divide-y transition-opacity', loading && 'opacity-60')}>
                    {invoices.data.map((invoice) => <article key={invoice.uuid} className="grid gap-4 p-4 md:grid-cols-[minmax(0,1fr)_12rem_auto] md:items-center md:px-5">
                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2"><h2 className="font-semibold break-words">{invoice.patient.name}</h2><Badge variant="outline" className={invoiceTone(invoice.status)}>{invoice.status_label}</Badge></div>
                            <p className="text-muted-foreground mt-1 text-xs break-words">{invoice.patient.medical_record_number} · {invoice.invoice_number}</p>
                            <p className="text-muted-foreground mt-1 text-xs">{formatDateTime(invoice.issued_at)} · {invoice.registration_number}</p>
                        </div>
                        <div className="flex items-center justify-between gap-3 md:block md:text-right">
                            <p className="text-muted-foreground text-xs">{active ? 'Sisa tagihan' : 'Total tagihan'}</p>
                            <p className="text-base font-semibold tabular-nums md:mt-1">{formatCurrency(active ? invoice.balance_due : invoice.total_amount)}</p>
                            {invoice.paid_amount > 0 && active && <p className="text-muted-foreground hidden text-xs md:block">Dibayar {formatCurrency(invoice.paid_amount)}</p>}
                        </div>
                        <Button asChild variant={active ? 'default' : 'outline'} size="sm"><Link href={show(invoice.uuid)} aria-label={(active ? 'Buka tagihan ' : 'Lihat riwayat ') + invoice.patient.name}>{active ? 'Buka tagihan' : 'Lihat riwayat'}<ArrowRight className="size-4" /></Link></Button>
                    </article>)}
                </div>}
                {invoices.total > 0 && <div className="flex flex-col gap-3 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-muted-foreground text-xs" role="status">{invoices.from ?? 0}–{invoices.to ?? 0} dari {invoices.total} tagihan</p>
                    <PaginationLinks links={invoices.links} only={['invoices']} preserveState />
                </div>}
            </section>

            <section className="bg-card min-w-0 rounded-xl border p-4 md:p-5" aria-busy={loadingReconciliation}>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div><h2 className="flex items-center gap-2 text-sm font-semibold"><Banknote className="text-muted-foreground size-4" />Rekap penerimaan</h2><p className="text-muted-foreground mt-1 text-xs">Pembayaran yang diterima pada {formatDate(date)}, sesuai waktu klinik.</p></div>
                    <div className="flex flex-wrap items-center gap-2">
                        {loadingReconciliation && <LoaderCircle className="text-muted-foreground size-4 animate-spin" />}
                        <Input type="date" aria-label="Tanggal penerimaan" value={date} disabled={loadingReconciliation} onChange={(event) => changeDate(event.target.value)} className="w-auto min-w-0" />
                        {date !== today && <Button type="button" variant="outline" size="sm" disabled={loadingReconciliation} onClick={() => changeDate(today)}>Hari ini</Button>}
                    </div>
                </div>
                <div className="mt-5 grid gap-4 lg:grid-cols-[14rem_minmax(0,1fr)]">
                    <div><p className="text-muted-foreground text-xs">Total penerimaan aktif</p><p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">{formatCurrency(reconciliation.received_amount)}</p><p className="text-muted-foreground mt-1 text-xs">{reconciliation.received_count} pembayaran</p></div>
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">{reconciliation.by_method.map((method) => <div key={method.label} className="min-w-0 border-l pl-3"><p className="text-muted-foreground text-xs">{method.label}</p><p className="mt-1 text-sm font-semibold break-words tabular-nums">{formatCurrency(method.amount)}</p><p className="text-muted-foreground mt-1 text-xs">{method.count} transaksi</p></div>)}</div>
                </div>
                {reconciliation.voided_count > 0 && <p className="text-muted-foreground mt-4 border-t pt-3 text-xs">{reconciliation.voided_count} pembayaran dibatalkan senilai {formatCurrency(reconciliation.voided_amount)}, tidak dihitung dalam penerimaan aktif.</p>}
            </section>
        </div>
    </>;
}

BillingIndex.layout = { breadcrumbs: [{ title: 'Ringkasan', href: dashboard() }, { title: 'Kasir', href: index() }] };
