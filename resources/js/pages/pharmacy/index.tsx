import { Head, Link, router, useForm } from '@inertiajs/react';
import {
    ArrowRight,
    Pill,
    RefreshCw,
    Search,
    SlidersHorizontal,
    TriangleAlert,
    X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '@/components/page-header';
import { PaginationLinks } from '@/components/pagination-links';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/components/date-picker';
import { Spinner } from '@/components/ui/spinner';
import { formatQuantity, pharmacyDateFormatter } from '@/lib/pharmacy';
import { cn } from '@/lib/utils';
import { dashboard } from '@/routes';
import { index, show } from '@/routes/pharmacy';
import type {
    MedicineStockItem,
    MedicineStockPage,
    PharmacyMode,
    PharmacyPrescriptionPage,
    PharmacyStockStatus,
} from '@/types';
import { StockAdjustmentDialog } from './stock-adjustment-dialog';

const listProps = [
    'mode',
    'search',
    'date',
    'stockStatus',
    'today',
    'prescriptions',
    'stocks',
];
const modes = [
    { value: 'new', label: 'Resep baru' },
    { value: 'processing', label: 'Disiapkan' },
    { value: 'history', label: 'Riwayat' },
    { value: 'stock', label: 'Stok obat' },
] as const;

export default function PharmacyIndex({
    mode,
    search,
    date,
    today,
    stockStatus,
    timezone,
    prescriptions,
    stocks,
    summary,
    can,
}: {
    mode: PharmacyMode;
    search: string;
    date: string;
    today: string;
    stockStatus: PharmacyStockStatus;
    timezone: string;
    prescriptions: PharmacyPrescriptionPage | null;
    stocks: MedicineStockPage | null;
    summary: { new: number; processing: number; low_stock: number };
    can: { adjust_stock: boolean };
}) {
    const [navigating, setNavigating] = useState(false);
    const filters = useForm({ search, date, stock_status: stockStatus });
    const { setData } = filters;
    useEffect(
        () => setData({ search, date, stock_status: stockStatus }),
        [mode, search, date, stockStatus, setData],
    );
    const loading = navigating || filters.processing;
    const [selectedMedicine, setSelectedMedicine] =
        useState<MedicineStockItem | null>(null);
    const formatDateTime = useMemo(
        () => pharmacyDateFormatter(timezone),
        [timezone],
    );
    const page = mode === 'stock' ? stocks : prescriptions;
    const filtered =
        !!search ||
        (mode === 'history' && date !== today) ||
        (mode === 'stock' && stockStatus !== 'all');
    const visitOptions = {
        only: listProps,
        preserveState: true,
        preserveScroll: true,
        onStart: () => setNavigating(true),
        onFinish: () => setNavigating(false),
    };

    return (
        <>
            <Head title="Apotek" />
            <div className="mx-auto flex w-full max-w-7xl min-w-0 flex-1 flex-col gap-5 p-4 md:p-6">
                <PageHeader
                    eyebrow="Pelayanan obat"
                    title="Apotek"
                    description="Siapkan resep, serahkan obat, dan pantau persediaan."
                    actions={
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={loading}
                            onClick={() =>
                                router.reload({
                                    ...visitOptions,
                                    only: [...listProps, 'summary', 'can'],
                                })
                            }
                        >
                            <RefreshCw
                                className={cn(
                                    'size-4',
                                    loading && 'animate-spin',
                                )}
                            />
                            {loading ? 'Memuat…' : 'Perbarui'}
                        </Button>
                    }
                />
                <section className="bg-card min-w-0 overflow-hidden rounded-xl border">
                    <nav
                        className="grid grid-cols-4 border-b px-2 lg:flex"
                        aria-label="Bagian apotek"
                    >
                        {modes.map((item) => (
                            <Link
                                key={item.value}
                                href={index({ query: { mode: item.value } })}
                                {...visitOptions}
                                aria-current={
                                    mode === item.value ? 'page' : undefined
                                }
                                className={cn(
                                    'focus-visible:ring-ring -mb-px flex min-w-0 flex-col items-center justify-center gap-1.5 border-b-2 px-1 py-3 text-xs font-medium focus-visible:ring-2 focus-visible:outline-none lg:flex-row lg:gap-2 lg:px-4 lg:text-sm',
                                    mode === item.value
                                        ? 'border-primary text-foreground'
                                        : 'text-muted-foreground hover:text-foreground border-transparent',
                                )}
                            >
                                {item.label}
                                {(item.value === 'new' ||
                                    item.value === 'processing') && (
                                    <span
                                        className={cn(
                                            'rounded-md px-1.5 py-0.5 text-xs tabular-nums',
                                            mode === item.value
                                                ? 'bg-primary/10 text-primary'
                                                : 'bg-muted text-muted-foreground',
                                        )}
                                    >
                                        {summary[item.value]}
                                    </span>
                                )}
                            </Link>
                        ))}
                    </nav>
                    <form
                        aria-label="Filter apotek"
                        onSubmit={(event) => {
                            event.preventDefault();
                            filters.transform((data) => ({
                                mode,
                                search: data.search.trim(),
                                date: mode === 'history' ? data.date : '',
                                stock_status:
                                    mode === 'stock'
                                        ? data.stock_status
                                        : 'all',
                            }));
                            filters.get(index.url(), {
                                ...visitOptions,
                                replace: true,
                            });
                        }}
                        className="space-y-2 border-b p-4"
                    >
                        <fieldset
                            disabled={loading}
                            className="flex min-w-0 flex-wrap items-center gap-2 disabled:opacity-60"
                        >
                            <div
                                className={cn(
                                    'flex min-w-0 flex-1 items-center gap-2',
                                    mode === 'history' || mode === 'stock'
                                        ? 'basis-full lg:basis-48'
                                        : 'basis-40',
                                )}
                            >
                                <div className="relative min-w-0 flex-1">
                                    <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                                    <Input
                                        id="pharmacy-search"
                                        name="search"
                                        type="search"
                                        aria-label={
                                            mode === 'stock'
                                                ? 'Cari obat'
                                                : 'Cari resep'
                                        }
                                        aria-invalid={Boolean(
                                            filters.errors.search,
                                        )}
                                        maxLength={100}
                                        value={filters.data.search}
                                        onChange={(event) =>
                                            filters.setData(
                                                'search',
                                                event.target.value,
                                            )
                                        }
                                        className="pl-9"
                                        placeholder={
                                            mode === 'stock'
                                                ? 'Cari nama, kode, atau generik'
                                                : 'Cari pasien, RM, atau registrasi'
                                        }
                                    />
                                </div>
                                {filtered && (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        aria-label="Reset filter"
                                        onClick={() =>
                                            router.get(
                                                index.url(),
                                                { mode },
                                                {
                                                    ...visitOptions,
                                                    replace: true,
                                                },
                                            )
                                        }
                                    >
                                        <X />
                                    </Button>
                                )}
                            </div>
                            {mode === 'history' && (
                                <div className="min-w-40 flex-1 lg:max-w-44">
                                    <label
                                        htmlFor="pharmacy-date"
                                        className="sr-only"
                                    >
                                        Tanggal selesai
                                    </label>
                                    <DatePicker
                                        id="pharmacy-date"
                                        today={today}
                                        value={filters.data.date}
                                        disabled={loading}
                                        onChange={(value) =>
                                            filters.setData('date', value)
                                        }
                                        aria-invalid={Boolean(
                                            filters.errors.date,
                                        )}
                                    />
                                </div>
                            )}
                            {mode === 'stock' && (
                                <select
                                    id="stock-status"
                                    name="stock_status"
                                    aria-label="Kondisi stok"
                                    value={filters.data.stock_status}
                                    onChange={(event) =>
                                        filters.setData(
                                            'stock_status',
                                            event.target
                                                .value as PharmacyStockStatus,
                                        )
                                    }
                                    className="border-input bg-background focus-visible:ring-ring h-9 min-w-0 flex-1 rounded-md border px-3 text-sm focus-visible:ring-2 focus-visible:outline-none lg:max-w-44"
                                >
                                    <option value="all">Semua obat</option>
                                    <option value="low">Stok menipis</option>
                                    <option value="empty">Stok kosong</option>
                                    <option value="inactive">
                                        Obat nonaktif
                                    </option>
                                </select>
                            )}
                            <Button type="submit" variant="outline">
                                {loading ? <Spinner /> : <Search />} Cari
                            </Button>
                        </fieldset>
                        {Object.entries(filters.errors).map(
                            ([field, message]) => (
                                <p
                                    key={field}
                                    role="alert"
                                    className="text-destructive text-xs"
                                >
                                    {message}
                                </p>
                            ),
                        )}
                    </form>
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3 text-xs">
                        <h2 className="font-medium">
                            {page?.total ?? 0}{' '}
                            {mode === 'stock' ? 'obat' : 'resep'}
                        </h2>
                        <Link
                            href={index({
                                query: { mode: 'stock', stock_status: 'low' },
                            })}
                            {...visitOptions}
                            className={cn(
                                'focus-visible:ring-ring flex items-center gap-1.5 rounded-sm underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:outline-none',
                                summary.low_stock > 0
                                    ? 'text-amber-800 dark:text-amber-300'
                                    : 'text-muted-foreground',
                            )}
                        >
                            <TriangleAlert className="size-3.5" />{' '}
                            {summary.low_stock} stok menipis{' '}
                            <ArrowRight className="size-3" />
                        </Link>
                    </div>
                    {Boolean(page?.data.length) && (
                        <div
                            aria-hidden="true"
                            className={cn(
                                'bg-muted/30 text-muted-foreground hidden gap-4 border-b px-4 py-3 text-xs lg:grid',
                                mode === 'stock'
                                    ? 'grid-cols-[minmax(0,1fr)_8rem_9rem_8rem]'
                                    : 'grid-cols-[minmax(0,1fr)_minmax(0,1fr)_9rem_8rem]',
                            )}
                        >
                            <span>{mode === 'stock' ? 'Obat' : 'Pasien'}</span>
                            <span>
                                {mode === 'stock' ? 'Stok tersedia' : 'Resep'}
                            </span>
                            <span>
                                {mode === 'stock'
                                    ? 'Diperbarui'
                                    : mode === 'history'
                                      ? 'Selesai'
                                      : 'Diresepkan'}
                            </span>
                            <span className="text-right">Aksi</span>
                        </div>
                    )}
                    <div
                        aria-busy={loading}
                        className={cn(loading && 'opacity-60')}
                    >
                        {!page?.data.length ? (
                            <div className="flex flex-col items-center gap-2 px-5 py-14 text-center">
                                <Pill className="text-muted-foreground mb-1 size-7" />
                                <h3 className="text-sm font-semibold">
                                    {filtered
                                        ? 'Tidak ada hasil yang sesuai'
                                        : mode === 'stock'
                                          ? 'Belum ada data obat'
                                          : mode === 'processing'
                                            ? 'Belum ada resep disiapkan'
                                            : mode === 'history'
                                              ? 'Belum ada riwayat resep'
                                              : 'Tidak ada resep baru'}
                                </h3>
                                <p className="text-muted-foreground max-w-sm text-xs leading-relaxed">
                                    {filtered
                                        ? 'Coba kata kunci atau filter lain.'
                                        : mode === 'new'
                                          ? 'Resep dari dokter akan tampil di sini.'
                                          : mode === 'history'
                                            ? 'Tidak ada resep selesai pada tanggal ini.'
                                            : mode === 'stock'
                                              ? 'Tambahkan obat melalui Master Data sesuai hak akses Anda.'
                                              : 'Pilih resep baru untuk mulai menyiapkan obat.'}
                                </p>
                            </div>
                        ) : mode === 'stock' && stocks ? (
                            <div className="divide-y">
                                {stocks.data.map((medicine) => (
                                    <article
                                        key={medicine.uuid}
                                        className="hover:bg-muted/25 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 p-4 transition-colors lg:grid-cols-[minmax(0,1fr)_8rem_9rem_8rem] lg:gap-4"
                                    >
                                        <div className="col-span-2 min-w-0 lg:col-span-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <h3 className="text-sm font-semibold break-words">
                                                    {medicine.name}{' '}
                                                    {medicine.strength}
                                                </h3>
                                                <Badge
                                                    variant={
                                                        !medicine.is_active
                                                            ? 'secondary'
                                                            : Number(
                                                                    medicine.quantity,
                                                                ) <= 0
                                                              ? 'destructive'
                                                              : 'outline'
                                                    }
                                                >
                                                    {!medicine.is_active
                                                        ? 'Nonaktif'
                                                        : Number(
                                                                medicine.quantity,
                                                            ) <= 0
                                                          ? 'Kosong'
                                                          : Number(
                                                                  medicine.quantity,
                                                              ) <=
                                                              medicine.minimum_stock
                                                            ? 'Menipis'
                                                            : 'Tersedia'}
                                                </Badge>
                                            </div>
                                            <p className="text-muted-foreground mt-1 text-xs break-words">
                                                {medicine.code}
                                                {medicine.generic_name
                                                    ? ` · ${medicine.generic_name}`
                                                    : ''}
                                            </p>
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-semibold tabular-nums">
                                                {formatQuantity(
                                                    medicine.quantity,
                                                )}{' '}
                                                <span className="font-normal">
                                                    {medicine.unit}
                                                </span>
                                            </p>
                                            <p className="text-muted-foreground mt-1 text-xs">
                                                Min.{' '}
                                                {formatQuantity(
                                                    medicine.minimum_stock,
                                                )}{' '}
                                                {medicine.unit}
                                            </p>
                                        </div>
                                        <div className="text-muted-foreground order-last col-span-2 text-xs lg:order-none lg:col-span-1">
                                            <p className="inline lg:sr-only">
                                                Diperbarui{' '}
                                            </p>
                                            <p className="inline lg:block">
                                                {formatDateTime(
                                                    medicine.last_movement_at,
                                                )}
                                            </p>
                                        </div>
                                        {can.adjust_stock && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="justify-self-end"
                                                onClick={() =>
                                                    setSelectedMedicine(
                                                        medicine,
                                                    )
                                                }
                                                aria-label={`Sesuaikan stok ${medicine.name}`}
                                            >
                                                <SlidersHorizontal className="size-3.5" />
                                                Sesuaikan
                                            </Button>
                                        )}
                                    </article>
                                ))}
                            </div>
                        ) : prescriptions ? (
                            <div className="divide-y">
                                {prescriptions.data.map((prescription) => (
                                    <article
                                        key={prescription.uuid}
                                        className="hover:bg-muted/25 grid gap-3 p-4 transition-colors lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_9rem_8rem] lg:items-center lg:gap-4"
                                    >
                                        <div className="min-w-0">
                                            <h3 className="text-sm font-semibold break-words">
                                                {prescription.patient.name}
                                            </h3>
                                            <p className="text-muted-foreground mt-1 text-xs break-words">
                                                {
                                                    prescription.patient
                                                        .medical_record_number
                                                }
                                            </p>
                                            <p className="text-muted-foreground mt-1 text-xs break-words">
                                                {
                                                    prescription.registration_number
                                                }
                                            </p>
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <p className="text-xs font-medium">
                                                    {prescription.items_count}{' '}
                                                    item obat
                                                </p>
                                                <Badge
                                                    variant={
                                                        prescription.status ===
                                                        'cancelled'
                                                            ? 'secondary'
                                                            : 'outline'
                                                    }
                                                    className="text-[11px] font-normal"
                                                >
                                                    {prescription.status_label}
                                                </Badge>
                                            </div>
                                            <p className="text-muted-foreground mt-1 text-xs break-words">
                                                {prescription.doctor}
                                            </p>
                                        </div>
                                        <div className="text-muted-foreground text-xs">
                                            <span className="lg:sr-only">
                                                {mode === 'history'
                                                    ? prescription.status ===
                                                      'cancelled'
                                                        ? 'Dibatalkan '
                                                        : 'Diserahkan '
                                                    : 'Diresepkan '}
                                            </span>
                                            {formatDateTime(
                                                mode === 'history'
                                                    ? (prescription.dispensed_at ??
                                                          prescription.cancelled_at)
                                                    : prescription.prescribed_at,
                                            )}
                                        </div>
                                        <Button
                                            asChild
                                            size="sm"
                                            variant={
                                                mode === 'history'
                                                    ? 'outline'
                                                    : 'default'
                                            }
                                            className="h-9 justify-self-start lg:justify-self-end"
                                        >
                                            <Link
                                                href={show(prescription.uuid, {
                                                    query: {
                                                        mode,
                                                        search,
                                                        date,
                                                        page:
                                                            Math.floor(
                                                                ((prescriptions.from ??
                                                                    1) -
                                                                    1) /
                                                                    20,
                                                            ) + 1,
                                                    },
                                                })}
                                                aria-label={`Buka resep ${prescription.patient.name}`}
                                            >
                                                Buka resep{' '}
                                                <ArrowRight className="size-3.5" />
                                            </Link>
                                        </Button>
                                    </article>
                                ))}
                            </div>
                        ) : null}
                    </div>
                    {page && page.total > 0 && (
                        <footer className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3">
                            <p className="text-muted-foreground text-xs">
                                {page.from}–{page.to} dari {page.total}{' '}
                                {mode === 'stock' ? 'obat' : 'resep'}
                            </p>
                            <PaginationLinks
                                links={page.links}
                                only={listProps}
                                preserveState
                            />
                        </footer>
                    )}
                </section>
            </div>
            {selectedMedicine && (
                <StockAdjustmentDialog
                    key={selectedMedicine.uuid}
                    medicine={selectedMedicine}
                    onClose={() => setSelectedMedicine(null)}
                />
            )}
        </>
    );
}

PharmacyIndex.layout = {
    breadcrumbs: [
        { title: 'Ringkasan', href: dashboard() },
        { title: 'Apotek', href: index() },
    ],
};
