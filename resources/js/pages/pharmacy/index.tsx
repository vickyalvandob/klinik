import { Form, Head, Link, router } from '@inertiajs/react';
import {
    ClipboardList,
    History,
    PackageCheck,
    Pill,
    Search,
    TriangleAlert,
} from 'lucide-react';
import type { FormEvent } from 'react';
import { PageHeader } from '@/components/page-header';
import { PaginationLinks } from '@/components/pagination-links';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { dashboard } from '@/routes';
import { index, show } from '@/routes/pharmacy';
import { store as adjustStock } from '@/routes/pharmacy/stock/adjustments';
import type {
    MedicineStockPage,
    PharmacyMode,
    PharmacyPrescriptionPage,
} from '@/types';

export default function PharmacyIndex({
    mode,
    search,
    prescriptions,
    stocks,
    summary,
}: {
    mode: PharmacyMode;
    search: string;
    prescriptions: PharmacyPrescriptionPage | null;
    stocks: MedicineStockPage | null;
    summary: { new: number; processing: number; low_stock: number };
}) {
    function submitSearch(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const searchInput = event.currentTarget.elements.namedItem('search');
        router.get(
            index.url(),
            {
                mode,
                search:
                    searchInput instanceof HTMLInputElement
                        ? searchInput.value
                        : '',
            },
            { preserveState: true, replace: true },
        );
    }

    return (
        <>
            <Head title="Apotek" />
            <div className="flex flex-1 flex-col gap-5 p-4 md:p-6">
                <PageHeader
                    eyebrow="Pelayanan obat"
                    title="Apotek"
                    description="Validasi resep, siapkan obat, serahkan kepada pasien, dan pantau stok dalam satu alur."
                />

                <div className="grid gap-3 sm:grid-cols-3">
                    <Summary
                        label="Resep baru"
                        value={summary.new}
                        icon={<ClipboardList className="size-4" />}
                    />
                    <Summary
                        label="Sedang disiapkan"
                        value={summary.processing}
                        icon={<PackageCheck className="size-4" />}
                    />
                    <Summary
                        label="Stok menipis"
                        value={summary.low_stock}
                        icon={<TriangleAlert className="size-4" />}
                    />
                </div>

                <nav
                    className="flex gap-2 overflow-x-auto pb-1"
                    aria-label="Bagian apotek"
                >
                    {(
                        [
                            ['new', 'Resep Baru'],
                            ['processing', 'Disiapkan'],
                            ['history', 'Riwayat'],
                            ['stock', 'Stok Obat'],
                        ] as Array<[PharmacyMode, string]>
                    ).map(([value, label]) => (
                        <Button
                            key={value}
                            asChild
                            size="sm"
                            variant={mode === value ? 'default' : 'outline'}
                        >
                            <Link href={index({ query: { mode: value } })}>
                                {label}
                            </Link>
                        </Button>
                    ))}
                </nav>

                <form onSubmit={submitSearch} className="flex max-w-xl gap-2">
                    <div className="relative flex-1">
                        <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                        <Input
                            name="search"
                            defaultValue={search}
                            className="pl-9"
                            placeholder={
                                mode === 'stock'
                                    ? 'Cari kode atau nama obat'
                                    : 'Cari pasien, nomor RM, atau registrasi'
                            }
                        />
                    </div>
                    <Button type="submit" variant="outline">
                        Cari
                    </Button>
                </form>

                {mode === 'stock' && stocks ? (
                    <StockList stocks={stocks} />
                ) : prescriptions ? (
                    <PrescriptionList
                        prescriptions={prescriptions}
                        mode={mode}
                    />
                ) : null}
            </div>
        </>
    );
}

function PrescriptionList({
    prescriptions,
    mode,
}: {
    prescriptions: PharmacyPrescriptionPage;
    mode: PharmacyMode;
}) {
    return (
        <section className="bg-card overflow-hidden rounded-xl border">
            {prescriptions.data.length === 0 ? (
                <div className="grid place-items-center gap-2 px-4 py-14 text-center">
                    {mode === 'history' ? (
                        <History className="text-muted-foreground size-8" />
                    ) : (
                        <Pill className="text-muted-foreground size-8" />
                    )}
                    <p className="text-sm font-semibold">
                        Belum ada resep pada daftar ini
                    </p>
                    <p className="text-muted-foreground max-w-md text-xs">
                        Resep akan masuk otomatis setelah dokter memfinalisasi
                        rekam medis.
                    </p>
                </div>
            ) : (
                <div className="divide-y">
                    {prescriptions.data.map((prescription) => (
                        <article
                            key={prescription.uuid}
                            className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_12rem_10rem_auto] lg:items-center"
                        >
                            <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                    <h2 className="truncate font-semibold">
                                        {prescription.patient.name}
                                    </h2>
                                    <Badge variant="outline">
                                        {prescription.status_label}
                                    </Badge>
                                </div>
                                <p className="text-muted-foreground mt-1 text-xs">
                                    {prescription.patient.medical_record_number}{' '}
                                    · {prescription.registration_number}
                                </p>
                                <p className="mt-2 text-sm">
                                    {prescription.items_count} item obat · Dr.{' '}
                                    {prescription.doctor}
                                </p>
                            </div>
                            <Info
                                label="Diresepkan"
                                value={formatDateTime(
                                    prescription.prescribed_at,
                                )}
                            />
                            <Info
                                label={
                                    mode === 'history' ? 'Selesai' : 'Proses'
                                }
                                value={formatDateTime(
                                    prescription.dispensed_at ??
                                        prescription.processing_started_at,
                                )}
                            />
                            <Button asChild variant="outline">
                                <Link href={show(prescription.uuid)}>
                                    Buka Resep
                                </Link>
                            </Button>
                        </article>
                    ))}
                </div>
            )}
            <div className="border-t px-4 py-3">
                <PaginationLinks links={prescriptions.links} />
            </div>
        </section>
    );
}

function StockList({ stocks }: { stocks: MedicineStockPage }) {
    return (
        <section className="grid gap-3">
            {stocks.data.length === 0 ? (
                <div className="bg-card grid place-items-center gap-2 rounded-xl border px-4 py-14 text-center">
                    <Pill className="text-muted-foreground size-8" />
                    <p className="text-sm font-semibold">
                        Data obat tidak ditemukan
                    </p>
                </div>
            ) : (
                stocks.data.map((medicine) => {
                    const low =
                        Number(medicine.quantity) <= medicine.minimum_stock;
                    return (
                        <article
                            key={medicine.uuid}
                            className="bg-card grid gap-4 rounded-xl border p-4 xl:grid-cols-[minmax(0,1fr)_9rem_9rem_minmax(22rem,auto)] xl:items-center"
                        >
                            <div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <h2 className="font-semibold">
                                        {medicine.name} {medicine.strength}
                                    </h2>
                                    {low && (
                                        <Badge variant="destructive">
                                            Stok menipis
                                        </Badge>
                                    )}
                                </div>
                                <p className="text-muted-foreground mt-1 text-xs">
                                    {medicine.code}
                                    {medicine.generic_name
                                        ? ` · ${medicine.generic_name}`
                                        : ''}
                                </p>
                            </div>
                            <Info
                                label="Stok tersedia"
                                value={`${formatQuantity(medicine.quantity)} ${medicine.unit}`}
                            />
                            <Info
                                label="Batas minimum"
                                value={`${medicine.minimum_stock} ${medicine.unit}`}
                            />
                            <Form
                                {...adjustStock.form(medicine.uuid)}
                                className="grid gap-2 sm:grid-cols-[8rem_minmax(0,1fr)_auto]"
                                disableWhileProcessing
                            >
                                {({ errors, processing }) => (
                                    <>
                                        <div>
                                            <Input
                                                name="quantity_change"
                                                type="number"
                                                step="0.01"
                                                placeholder="+ / -"
                                                aria-label={`Perubahan stok ${medicine.name}`}
                                            />
                                            {errors.quantity_change && (
                                                <p className="text-destructive mt-1 text-xs">
                                                    {errors.quantity_change}
                                                </p>
                                            )}
                                        </div>
                                        <div>
                                            <Input
                                                name="reason"
                                                placeholder="Alasan penyesuaian"
                                                aria-label={`Alasan penyesuaian ${medicine.name}`}
                                            />
                                            {errors.reason && (
                                                <p className="text-destructive mt-1 text-xs">
                                                    {errors.reason}
                                                </p>
                                            )}
                                        </div>
                                        <Button
                                            type="submit"
                                            variant="outline"
                                            disabled={processing}
                                        >
                                            Catat
                                        </Button>
                                    </>
                                )}
                            </Form>
                        </article>
                    );
                })
            )}
            <div className="bg-card rounded-xl border px-4 py-3">
                <PaginationLinks links={stocks.links} />
            </div>
        </section>
    );
}

function Summary({
    label,
    value,
    icon,
}: {
    label: string;
    value: number;
    icon: React.ReactNode;
}) {
    return (
        <div className="bg-card flex items-center justify-between rounded-xl border p-4">
            <div>
                <p className="text-muted-foreground text-xs">{label}</p>
                <p className="mt-1 text-2xl font-semibold">{value}</p>
            </div>
            <span className="bg-muted text-muted-foreground grid size-9 place-items-center rounded-lg">
                {icon}
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
function formatQuantity(value: string) {
    return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 }).format(
        Number(value),
    );
}
function formatDateTime(value: string | null) {
    return value
        ? new Intl.DateTimeFormat('id-ID', {
              dateStyle: 'medium',
              timeStyle: 'short',
          }).format(new Date(value))
        : '—';
}

PharmacyIndex.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Apotek', href: index() },
    ],
};
