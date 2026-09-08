import { Head, Link, router } from '@inertiajs/react';
import {
    ArrowRight,
    ClipboardList,
    PackageCheck,
    Pill,
    RefreshCw,
    Search,
    SlidersHorizontal,
    TriangleAlert,
    X,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { PageHeader } from '@/components/page-header';
import { PaginationLinks } from '@/components/pagination-links';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
    stockStatus: PharmacyStockStatus;
    timezone: string;
    prescriptions: PharmacyPrescriptionPage | null;
    stocks: MedicineStockPage | null;
    summary: { new: number; processing: number; low_stock: number };
    can: { adjust_stock: boolean };
}) {
    const [loading, setLoading] = useState(false);
    const [selectedMedicine, setSelectedMedicine] =
        useState<MedicineStockItem | null>(null);
    const formatDateTime = useMemo(
        () => pharmacyDateFormatter(timezone),
        [timezone],
    );
    const page = mode === 'stock' ? stocks : prescriptions;
    const filtered =
        !!search || !!date || (mode === 'stock' && stockStatus !== 'all');
    const visitOptions = {
        only: listProps,
        preserveState: true,
        preserveScroll: true,
        onStart: () => setLoading(true),
        onFinish: () => setLoading(false),
    };

    function submitSearch(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const values = new FormData(event.currentTarget);
        const searchValue = values.get('search');
        const dateValue = values.get('date');
        const stockValue = values.get('stock_status');
        router.get(
            index.url(),
            {
                mode,
                search:
                    typeof searchValue === 'string' ? searchValue.trim() : '',
                date:
                    mode === 'history' && typeof dateValue === 'string'
                        ? dateValue
                        : '',
                stock_status:
                    mode === 'stock' && typeof stockValue === 'string'
                        ? stockValue
                        : 'all',
            },
            { ...visitOptions, replace: true },
        );
    }

    return (
        <>
            <Head title="Apotek" />
            <div className="flex min-w-0 flex-1 flex-col gap-5 p-4 md:p-6">
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
                <div className="bg-card grid grid-cols-3 divide-x rounded-xl border">
                    {[
                        {
                            label: 'Resep baru',
                            value: summary.new,
                            mode: 'new',
                            icon: ClipboardList,
                        },
                        {
                            label: 'Disiapkan',
                            value: summary.processing,
                            mode: 'processing',
                            icon: PackageCheck,
                        },
                        {
                            label: 'Stok menipis',
                            value: summary.low_stock,
                            mode: 'stock',
                            icon: TriangleAlert,
                        },
                    ].map((item) => (
                        <Link
                            key={item.mode}
                            href={index({
                                query: {
                                    mode: item.mode,
                                    ...(item.mode === 'stock'
                                        ? { stock_status: 'low' }
                                        : {}),
                                },
                            })}
                            {...visitOptions}
                            className="hover:bg-muted/40 focus-visible:ring-ring flex min-w-0 items-center justify-between gap-2 p-3 first:rounded-l-xl last:rounded-r-xl focus-visible:ring-2 focus-visible:outline-none sm:p-4"
                        >
                            <div>
                                <p className="text-muted-foreground text-xs">
                                    {item.label}
                                </p>
                                <p className="mt-1 text-2xl font-semibold tabular-nums">
                                    {item.value}
                                </p>
                            </div>
                            <item.icon
                                className={cn(
                                    'hidden size-5 shrink-0 sm:block',
                                    item.mode === 'stock' && item.value > 0
                                        ? 'text-amber-600 dark:text-amber-400'
                                        : 'text-muted-foreground',
                                )}
                            />
                        </Link>
                    ))}
                </div>
                <section className="bg-card min-w-0 overflow-hidden rounded-xl border">
                    <nav
                        className="grid grid-cols-4 border-b px-1 sm:flex sm:gap-5 sm:px-4"
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
                                    'focus-visible:ring-ring -mb-px border-b-2 px-1 py-3 text-center text-xs font-medium focus-visible:ring-2 focus-visible:outline-none sm:px-0 sm:text-sm',
                                    mode === item.value
                                        ? 'border-primary text-foreground'
                                        : 'text-muted-foreground hover:text-foreground border-transparent',
                                )}
                            >
                                {item.label}
                            </Link>
                        ))}
                    </nav>
                    <form
                        key={`${mode}-${search}-${date}-${stockStatus}`}
                        onSubmit={submitSearch}
                        className="grid gap-3 border-b p-4 sm:flex sm:flex-wrap sm:items-end"
                    >
                        <div className="grid min-w-0 gap-2 sm:min-w-56 sm:flex-1">
                            <Label htmlFor="pharmacy-search">
                                {mode === 'stock' ? 'Cari obat' : 'Cari resep'}
                            </Label>
                            <div className="relative">
                                <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                                <Input
                                    id="pharmacy-search"
                                    name="search"
                                    type="search"
                                    maxLength={100}
                                    defaultValue={search}
                                    className="pl-9"
                                    placeholder={
                                        mode === 'stock'
                                            ? 'Nama, kode, atau generik'
                                            : 'Nama pasien, nomor RM, atau registrasi'
                                    }
                                />
                            </div>
                        </div>
                        {mode === 'history' && (
                            <div className="grid min-w-0 gap-2">
                                <Label htmlFor="pharmacy-date">
                                    Tanggal selesai
                                </Label>
                                <Input
                                    id="pharmacy-date"
                                    name="date"
                                    type="date"
                                    defaultValue={date}
                                    className="w-full sm:w-44"
                                />
                            </div>
                        )}
                        {mode === 'stock' && (
                            <div className="grid gap-2">
                                <Label htmlFor="stock-status">
                                    Kondisi stok
                                </Label>
                                <select
                                    id="stock-status"
                                    name="stock_status"
                                    defaultValue={stockStatus}
                                    className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 h-9 rounded-md border px-3 text-sm focus-visible:ring-2 focus-visible:outline-none"
                                >
                                    <option value="all">Semua obat</option>
                                    <option value="low">Stok menipis</option>
                                    <option value="empty">Stok kosong</option>
                                    <option value="inactive">
                                        Obat nonaktif
                                    </option>
                                </select>
                            </div>
                        )}
                        <div className="flex gap-2">
                            <Button
                                type="submit"
                                variant="outline"
                                disabled={loading}
                                className="flex-1 sm:flex-none"
                            >
                                Terapkan
                            </Button>
                            {filtered && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    disabled={loading}
                                    onClick={() =>
                                        router.get(
                                            index.url(),
                                            { mode },
                                            { ...visitOptions, replace: true },
                                        )
                                    }
                                >
                                    <X className="size-4" />
                                    Reset
                                </Button>
                            )}
                        </div>
                    </form>
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
                        <h2 className="text-sm font-semibold">
                            {modes.find((item) => item.value === mode)?.label}
                            <span className="text-muted-foreground ml-2 font-normal">
                                {page?.total ?? 0}
                            </span>
                        </h2>
                        <p
                            className="text-muted-foreground text-xs"
                            role="status"
                        >
                            {loading
                                ? 'Memperbarui daftar…'
                                : mode === 'history'
                                  ? 'Terakhir selesai di atas'
                                  : mode === 'stock'
                                    ? 'Stok terkini saat halaman dimuat'
                                    : 'Resep terlama didahulukan'}
                        </p>
                    </div>
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
                                            ? 'Tidak ada resep yang sedang disiapkan'
                                            : mode === 'history'
                                              ? 'Belum ada riwayat resep'
                                              : 'Semua resep baru sudah ditangani'}
                                </h3>
                                <p className="text-muted-foreground max-w-sm text-xs leading-relaxed">
                                    {filtered
                                        ? 'Coba kata pencarian lain atau reset filter.'
                                        : mode === 'new'
                                          ? 'Resep baru tampil setelah rekam medis difinalisasi oleh dokter.'
                                          : mode === 'history'
                                            ? 'Resep yang diserahkan atau dibatalkan akan tersimpan di sini.'
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
                                        className="grid gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center lg:grid-cols-[minmax(0,1fr)_10rem_10rem_auto]"
                                    >
                                        <div className="min-w-0">
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
                                        <div className="flex items-baseline gap-2 lg:block">
                                            <p className="text-sm font-semibold tabular-nums">
                                                {formatQuantity(
                                                    medicine.quantity,
                                                )}{' '}
                                                <span className="font-normal">
                                                    {medicine.unit}
                                                </span>
                                            </p>
                                            <p className="text-muted-foreground text-xs lg:mt-1">
                                                Min.{' '}
                                                {formatQuantity(
                                                    medicine.minimum_stock,
                                                )}{' '}
                                                {medicine.unit}
                                            </p>
                                        </div>
                                        <div className="text-xs">
                                            <p className="text-muted-foreground">
                                                Terakhir berubah
                                            </p>
                                            <p className="mt-1">
                                                {formatDateTime(
                                                    medicine.last_movement_at,
                                                )}
                                            </p>
                                        </div>
                                        {can.adjust_stock && (
                                            <Button
                                                variant="outline"
                                                size="sm"
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
                                        className="grid gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center xl:grid-cols-[minmax(0,1fr)_12rem_auto]"
                                    >
                                        <div className="min-w-0">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <h3 className="text-sm font-semibold break-words">
                                                    {prescription.patient.name}
                                                </h3>
                                                <Badge
                                                    variant={
                                                        prescription.status ===
                                                        'cancelled'
                                                            ? 'secondary'
                                                            : 'outline'
                                                    }
                                                >
                                                    {prescription.status_label}
                                                </Badge>
                                            </div>
                                            <p className="text-muted-foreground mt-1 text-xs break-words">
                                                {
                                                    prescription.patient
                                                        .medical_record_number
                                                }{' '}
                                                ·{' '}
                                                {
                                                    prescription.registration_number
                                                }
                                            </p>
                                            <p className="mt-2 text-xs">
                                                {prescription.items_count} item
                                                obat{' '}
                                                <span className="text-muted-foreground">
                                                    · {prescription.doctor}
                                                </span>
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-muted-foreground text-xs">
                                                {mode === 'history'
                                                    ? prescription.status ===
                                                      'cancelled'
                                                        ? 'Dibatalkan'
                                                        : 'Diserahkan'
                                                    : 'Diresepkan'}
                                            </p>
                                            <p className="mt-1 text-xs">
                                                {formatDateTime(
                                                    mode === 'history'
                                                        ? (prescription.dispensed_at ??
                                                              prescription.cancelled_at)
                                                        : prescription.prescribed_at,
                                                )}
                                            </p>
                                            {mode === 'processing' && (
                                                <p className="text-muted-foreground mt-1 text-xs">
                                                    Disiapkan{' '}
                                                    {formatDateTime(
                                                        prescription.processing_started_at,
                                                    )}
                                                </p>
                                            )}
                                        </div>
                                        <Button
                                            asChild
                                            size="sm"
                                            variant="outline"
                                            className="sm:col-span-2 xl:col-span-1"
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
                                                Buka resep
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
