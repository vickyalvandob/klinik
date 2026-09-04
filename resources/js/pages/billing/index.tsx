import { Head, Link, router } from '@inertiajs/react';
import {
    Banknote,
    CircleDollarSign,
    History,
    ReceiptText,
    Search,
} from 'lucide-react';
import type { FormEvent, ReactNode } from 'react';
import { PageHeader } from '@/components/page-header';
import { PaginationLinks } from '@/components/pagination-links';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { dashboard } from '@/routes';
import { index, show } from '@/routes/billing';
import type {
    BillingInvoicePage,
    BillingMode,
    BillingReconciliation,
} from '@/types';

export default function BillingIndex({
    mode,
    search,
    date,
    invoices,
    summary,
    reconciliation,
}: {
    mode: BillingMode;
    search: string;
    date: string;
    invoices: BillingInvoicePage;
    summary: {
        outstanding_count: number;
        outstanding_amount: number;
        partial_count: number;
        paid_count: number;
    };
    reconciliation: BillingReconciliation;
}) {
    function submitFilters(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        const searchValue = form.get('search');
        const dateValue = form.get('date');
        router.get(
            index.url(),
            {
                mode,
                search: typeof searchValue === 'string' ? searchValue : '',
                date: typeof dateValue === 'string' ? dateValue : date,
            },
            { preserveState: true, replace: true },
        );
    }

    return (
        <>
            <Head title="Kasir & Billing" />
            <div className="flex flex-1 flex-col gap-5 p-4 md:p-6">
                <PageHeader
                    eyebrow="Pembayaran pasien"
                    title="Kasir & Billing"
                    description="Pantau saldo tagihan, terima pembayaran, cetak struk, dan cocokkan transaksi harian."
                />

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <Summary
                        label="Tagihan aktif"
                        value={String(summary.outstanding_count)}
                        detail={formatCurrency(summary.outstanding_amount)}
                        icon={<ReceiptText className="size-4" />}
                    />
                    <Summary
                        label="Bayar sebagian"
                        value={String(summary.partial_count)}
                        detail="Perlu ditindaklanjuti"
                        icon={<CircleDollarSign className="size-4" />}
                    />
                    <Summary
                        label="Invoice lunas"
                        value={String(summary.paid_count)}
                        detail="Seluruh riwayat"
                        icon={<Banknote className="size-4" />}
                    />
                    <Summary
                        label="Penerimaan tanggal ini"
                        value={formatCurrency(reconciliation.received_amount)}
                        detail={`${reconciliation.received_count} transaksi aktif`}
                        icon={<History className="size-4" />}
                    />
                </div>

                <nav
                    className="flex gap-2 overflow-x-auto pb-1"
                    aria-label="Status tagihan"
                >
                    {(
                        [
                            ['outstanding', 'Belum Dibayar'],
                            ['partial', 'Sebagian'],
                            ['paid', 'Lunas'],
                            ['voided', 'Dibatalkan'],
                        ] as Array<[BillingMode, string]>
                    ).map(([value, label]) => (
                        <Button
                            key={value}
                            asChild
                            size="sm"
                            variant={mode === value ? 'default' : 'outline'}
                        >
                            <Link
                                href={index({
                                    query: { mode: value, date },
                                })}
                            >
                                {label}
                            </Link>
                        </Button>
                    ))}
                </nav>

                <form
                    onSubmit={submitFilters}
                    className="grid gap-2 sm:max-w-3xl sm:grid-cols-[minmax(0,1fr)_11rem_auto]"
                >
                    <div className="relative">
                        <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                        <Input
                            name="search"
                            defaultValue={search}
                            className="pl-9"
                            placeholder="Cari pasien, nomor RM, registrasi, atau invoice"
                        />
                    </div>
                    <Input
                        name="date"
                        type="date"
                        defaultValue={date}
                        aria-label="Tanggal rekonsiliasi"
                    />
                    <Button type="submit" variant="outline">
                        Terapkan
                    </Button>
                </form>

                <InvoiceList invoices={invoices} mode={mode} />
                <Reconciliation data={reconciliation} date={date} />
            </div>
        </>
    );
}

function InvoiceList({
    invoices,
    mode,
}: {
    invoices: BillingInvoicePage;
    mode: BillingMode;
}) {
    return (
        <section className="bg-card overflow-hidden rounded-xl border">
            {invoices.data.length === 0 ? (
                <div className="grid place-items-center gap-2 px-4 py-14 text-center">
                    <ReceiptText className="text-muted-foreground size-8" />
                    <p className="text-sm font-semibold">
                        Tidak ada tagihan pada daftar ini
                    </p>
                    <p className="text-muted-foreground max-w-md text-xs">
                        Invoice muncul otomatis setelah pelayanan klinis dan
                        farmasi selesai.
                    </p>
                </div>
            ) : (
                <div className="divide-y">
                    {invoices.data.map((invoice) => (
                        <article
                            key={invoice.uuid}
                            className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_10rem_10rem_auto] lg:items-center"
                        >
                            <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                    <h2 className="truncate font-semibold">
                                        {invoice.patient.name}
                                    </h2>
                                    <Badge variant="outline">
                                        {invoice.status_label}
                                    </Badge>
                                </div>
                                <p className="text-muted-foreground mt-1 text-xs">
                                    {invoice.invoice_number} ·{' '}
                                    {invoice.patient.medical_record_number} ·{' '}
                                    {invoice.registration_number}
                                </p>
                                <p className="mt-2 text-sm">
                                    Total {formatCurrency(invoice.total_amount)}
                                </p>
                            </div>
                            <Info
                                label="Sudah dibayar"
                                value={formatCurrency(invoice.paid_amount)}
                            />
                            <Info
                                label="Sisa"
                                value={formatCurrency(invoice.balance_due)}
                            />
                            <Button asChild variant="outline">
                                <Link href={show(invoice.uuid)}>
                                    {mode === 'outstanding' ||
                                    mode === 'partial'
                                        ? 'Buka Tagihan'
                                        : 'Lihat Riwayat'}
                                </Link>
                            </Button>
                        </article>
                    ))}
                </div>
            )}
            <div className="border-t px-4 py-3">
                <PaginationLinks links={invoices.links} />
            </div>
        </section>
    );
}

function Reconciliation({
    data,
    date,
}: {
    data: BillingReconciliation;
    date: string;
}) {
    return (
        <section className="bg-card rounded-xl border p-4 md:p-5">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h2 className="font-semibold">Rekonsiliasi sederhana</h2>
                    <p className="text-muted-foreground text-xs">
                        Transaksi berdasarkan tanggal penerimaan{' '}
                        {formatDate(date)}.
                    </p>
                </div>
                <div className="text-left sm:text-right">
                    <p className="text-muted-foreground text-xs">
                        Penerimaan aktif
                    </p>
                    <p className="text-lg font-semibold">
                        {formatCurrency(data.net_amount)}
                    </p>
                </div>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {data.by_method.map((method) => (
                    <div
                        key={method.label}
                        className="bg-muted/40 rounded-lg border p-3"
                    >
                        <p className="text-muted-foreground text-xs">
                            {method.label}
                        </p>
                        <p className="mt-1 font-semibold">
                            {formatCurrency(method.amount)}
                        </p>
                        <p className="text-muted-foreground text-xs">
                            {method.count} transaksi
                        </p>
                    </div>
                ))}
            </div>
            {data.voided_count > 0 && (
                <p className="text-muted-foreground mt-3 text-xs">
                    {data.voided_count} pembayaran dibatalkan senilai{' '}
                    {formatCurrency(data.voided_amount)}. Nilai tersebut tidak
                    masuk penerimaan aktif.
                </p>
            )}
        </section>
    );
}

function Summary({
    label,
    value,
    detail,
    icon,
}: {
    label: string;
    value: string;
    detail: string;
    icon: ReactNode;
}) {
    return (
        <div className="bg-card rounded-xl border p-4">
            <div className="text-muted-foreground flex items-center gap-2 text-xs">
                {icon} {label}
            </div>
            <p className="mt-2 text-xl font-semibold">{value}</p>
            <p className="text-muted-foreground mt-1 text-xs">{detail}</p>
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

function formatDate(value: string) {
    return new Intl.DateTimeFormat('id-ID', { dateStyle: 'long' }).format(
        new Date(`${value}T00:00:00`),
    );
}

BillingIndex.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Kasir & Billing', href: index() },
    ],
};
