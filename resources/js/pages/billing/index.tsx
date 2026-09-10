import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowRight, ReceiptText, Search, X } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { PageHeader } from '@/components/page-header';
import { PaginationLinks } from '@/components/pagination-links';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Input } from '@/components/ui/input';
import { formatCurrency, invoiceTone } from '@/lib/billing';
import { cn } from '@/lib/utils';
import { dashboard } from '@/routes';
import { index, show } from '@/routes/billing';
import type { BillingInvoicePage, BillingMode } from '@/types';

type Summary = {
    outstanding_count: number;
    outstanding_amount: number;
    issued_count: number;
    partial_count: number;
    paid_count: number;
    voided_count: number;
};

export default function BillingIndex({
    mode,
    search,
    invoices,
    summary,
    timezone,
}: {
    mode: BillingMode;
    search: string;
    invoices: BillingInvoicePage;
    summary: Summary;
    timezone: string;
}) {
    const searchForm = useForm({ search });
    const { setData } = searchForm;
    useEffect(() => setData('search', search), [mode, search, setData]);
    const loading = searchForm.processing;
    const dateFormat = useMemo(
        () =>
            new Intl.DateTimeFormat('id-ID', {
                dateStyle: 'medium',
                timeStyle: 'short',
                timeZone: timezone,
            }),
        [timezone],
    );
    const active = mode === 'outstanding' || mode === 'partial';
    const tabs: Array<[BillingMode, string, number]> = [
        ['outstanding', 'Belum bayar', summary.issued_count],
        ['partial', 'Sebagian', summary.partial_count],
        ['paid', 'Lunas', summary.paid_count],
        ['voided', 'Dibatalkan', summary.voided_count],
    ];

    function filter(nextMode: BillingMode, nextSearch: string) {
        searchForm.transform(() => ({
            mode: nextMode,
            search: nextSearch.trim(),
        }));
        searchForm.get(index.url(), {
            only:
                nextMode === mode
                    ? ['invoices', 'mode', 'search']
                    : ['invoices', 'mode', 'search', 'summary'],
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    }

    return (
        <>
            <Head title="Kasir" />
            <div className="mx-auto flex w-full max-w-7xl min-w-0 flex-1 flex-col gap-5 p-4 md:p-6">
                <PageHeader
                    eyebrow="Pembayaran pasien"
                    title="Kasir"
                    description="Kelola tagihan dan pembayaran dalam satu tempat."
                />
                <section
                    className="bg-card min-w-0 overflow-hidden rounded-xl border"
                    aria-busy={loading}
                >
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
                        <div>
                            <p className="text-muted-foreground text-xs">
                                Sisa tagihan aktif
                            </p>
                            <p className="mt-1 text-xl font-semibold tracking-tight tabular-nums">
                                {formatCurrency(summary.outstanding_amount)}
                            </p>
                        </div>
                        <p className="text-muted-foreground text-xs">
                            {summary.outstanding_count} tagihan belum selesai
                        </p>
                    </div>
                    <div className="border-b">
                        <nav
                            className="grid grid-cols-4 px-2 lg:flex"
                            aria-label="Status tagihan"
                        >
                            {tabs.map(([value, label, count]) => (
                                <button
                                    key={value}
                                    type="button"
                                    disabled={loading}
                                    aria-current={
                                        mode === value ? 'page' : undefined
                                    }
                                    onClick={() => filter(value, search)}
                                    className={cn(
                                        'focus-visible:ring-ring flex min-w-0 flex-col items-center justify-center gap-1.5 border-b-2 px-1 py-3 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:opacity-60 lg:flex-row lg:gap-2 lg:px-4 lg:text-sm',
                                        mode === value
                                            ? 'border-primary text-primary font-semibold'
                                            : 'text-muted-foreground hover:text-foreground border-transparent',
                                    )}
                                >
                                    <span className="flex min-h-8 items-center justify-center lg:min-h-0">
                                        {label}
                                    </span>
                                    <span className="bg-muted text-muted-foreground rounded-md px-1.5 py-0.5 text-xs tabular-nums">
                                        {count}
                                    </span>
                                </button>
                            ))}
                        </nav>
                    </div>
                    <form
                        aria-label="Filter tagihan"
                        className="space-y-2 border-b p-4"
                        onSubmit={(event) => {
                            event.preventDefault();
                            filter(mode, searchForm.data.search);
                        }}
                    >
                        <div className="flex min-w-0 items-center gap-2">
                            <div className="relative min-w-0 flex-1">
                                <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                                <Input
                                    type="search"
                                    name="search"
                                    value={searchForm.data.search}
                                    onChange={(event) =>
                                        searchForm.setData(
                                            'search',
                                            event.target.value,
                                        )
                                    }
                                    maxLength={100}
                                    aria-label="Cari tagihan"
                                    aria-invalid={Boolean(
                                        searchForm.errors.search,
                                    )}
                                    aria-describedby={
                                        searchForm.errors.search
                                            ? 'billing-search-error'
                                            : undefined
                                    }
                                    placeholder="Cari pasien, RM, atau tagihan"
                                    className="pl-9"
                                />
                            </div>
                            <Button
                                type="submit"
                                variant="outline"
                                disabled={loading}
                            >
                                {loading ? <Spinner /> : <Search />} Cari
                            </Button>
                            {search && (
                                <Button
                                    type="button"
                                    size="icon"
                                    variant="ghost"
                                    aria-label="Hapus pencarian"
                                    disabled={loading}
                                    onClick={() => filter(mode, '')}
                                >
                                    <X />
                                </Button>
                            )}
                        </div>
                        {searchForm.errors.search && (
                            <p
                                id="billing-search-error"
                                role="alert"
                                className="text-destructive text-xs"
                            >
                                {searchForm.errors.search}
                            </p>
                        )}
                    </form>
                    <div className="text-muted-foreground flex items-center justify-between gap-3 border-b px-4 py-3 text-xs">
                        <h2 className="text-foreground font-medium">
                            {invoices.total} tagihan
                        </h2>
                        <span>
                            {active
                                ? 'Terlama lebih dahulu'
                                : 'Riwayat terbaru'}
                        </span>
                    </div>
                    {invoices.data.length > 0 && (
                        <div
                            aria-hidden="true"
                            className="bg-muted/30 text-muted-foreground hidden grid-cols-[minmax(0,1fr)_11rem_8rem] gap-5 border-b px-4 py-3 text-xs lg:grid"
                        >
                            <span>Pasien / tagihan</span>
                            <span className="text-right">
                                {active ? 'Sisa tagihan' : 'Total tagihan'}
                            </span>
                            <span className="text-right">Aksi</span>
                        </div>
                    )}
                    {invoices.data.length === 0 ? (
                        <div className="grid justify-items-center gap-2 px-5 py-14 text-center">
                            <span className="bg-muted mb-1 rounded-full p-3">
                                <ReceiptText className="text-muted-foreground size-6" />
                            </span>
                            <h2 className="text-sm font-semibold">
                                {search
                                    ? 'Tagihan tidak ditemukan'
                                    : 'Belum ada tagihan'}
                            </h2>
                            <p className="text-muted-foreground max-w-sm text-sm">
                                {search
                                    ? 'Coba kata kunci lain atau hapus pencarian.'
                                    : 'Tagihan akan tersedia setelah pelayanan pasien selesai.'}
                            </p>
                            {search && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => filter(mode, '')}
                                >
                                    Tampilkan semua tagihan
                                </Button>
                            )}
                        </div>
                    ) : (
                        <div
                            className={cn(
                                'divide-y transition-opacity',
                                loading && 'opacity-60',
                            )}
                        >
                            {invoices.data.map((invoice) => (
                                <article
                                    key={invoice.uuid}
                                    className="hover:bg-muted/25 grid gap-3 p-4 transition-colors lg:grid-cols-[minmax(0,1fr)_11rem_8rem] lg:items-center lg:gap-5"
                                >
                                    <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h2 className="text-sm font-semibold break-words">
                                                {invoice.patient.name}
                                            </h2>
                                            <Badge
                                                variant="outline"
                                                className={invoiceTone(
                                                    invoice.status,
                                                )}
                                            >
                                                {invoice.status_label}
                                            </Badge>
                                        </div>
                                        <p className="text-muted-foreground mt-1 text-xs break-words">
                                            {
                                                invoice.patient
                                                    .medical_record_number
                                            }{' '}
                                            · {invoice.invoice_number}
                                        </p>
                                        <p className="text-muted-foreground mt-1 text-xs">
                                            {dateFormat.format(
                                                new Date(invoice.issued_at),
                                            )}{' '}
                                            · {invoice.registration_number}
                                        </p>
                                    </div>
                                    <div className="grid grid-cols-[1fr_auto] items-baseline gap-x-3 gap-y-1 lg:block lg:text-right">
                                        <p className="text-muted-foreground text-xs lg:sr-only">
                                            {active
                                                ? 'Sisa tagihan'
                                                : 'Total tagihan'}
                                        </p>
                                        <p className="text-sm font-semibold tabular-nums">
                                            {formatCurrency(
                                                active
                                                    ? invoice.balance_due
                                                    : invoice.total_amount,
                                            )}
                                        </p>
                                        {invoice.paid_amount > 0 && active && (
                                            <p className="text-muted-foreground col-span-2 text-right text-xs lg:mt-1">
                                                Dibayar{' '}
                                                {formatCurrency(
                                                    invoice.paid_amount,
                                                )}
                                            </p>
                                        )}
                                    </div>
                                    <Button
                                        asChild
                                        variant={active ? 'default' : 'outline'}
                                        size="sm"
                                        className="h-9 justify-self-start lg:justify-self-end"
                                    >
                                        <Link
                                            href={show(invoice.uuid)}
                                            aria-label={
                                                (active
                                                    ? 'Buka tagihan '
                                                    : 'Lihat riwayat ') +
                                                invoice.patient.name
                                            }
                                        >
                                            {active
                                                ? 'Buka tagihan'
                                                : 'Lihat riwayat'}
                                            <ArrowRight className="size-4" />
                                        </Link>
                                    </Button>
                                </article>
                            ))}
                        </div>
                    )}
                    {invoices.total > 0 && (
                        <div className="flex flex-col gap-3 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                            <p
                                className="text-muted-foreground text-xs"
                                role="status"
                            >
                                {invoices.from ?? 0}–{invoices.to ?? 0} dari{' '}
                                {invoices.total} tagihan
                            </p>
                            <PaginationLinks
                                links={invoices.links}
                                only={['invoices']}
                                preserveState
                            />
                        </div>
                    )}
                </section>
            </div>
        </>
    );
}

BillingIndex.layout = {
    breadcrumbs: [
        { title: 'Ringkasan', href: dashboard() },
        { title: 'Kasir', href: index() },
    ],
};
