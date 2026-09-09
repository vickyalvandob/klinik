import { Head, router, usePage } from '@inertiajs/react';
import {
    BarChart3,
    Download,
    LoaderCircle,
    Printer,
    RefreshCw,
} from 'lucide-react';
import { useState } from 'react';
import { FormField } from '@/components/form-field';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatCurrency, formatDate } from '@/lib/billing';
import { cn } from '@/lib/utils';
import { index, exportMethod } from '@/routes/reports';

type Row = {
    label: string;
    count: number;
    amount: number | null;
    balance?: number;
};
type Period = { from: string; to: string };
type ReportSection =
    | 'visits'
    | 'revenue'
    | 'billing'
    | 'services'
    | 'diagnoses'
    | 'doctors'
    | 'pharmacy';
const reports: Record<
    ReportSection,
    {
        title: string;
        description: string;
        label: string;
        count: string;
        amount?: string;
        note: string;
    }
> = {
    revenue: {
        title: 'Penerimaan',
        description: 'Penerimaan pembayaran menurut metode.',
        label: 'Metode pembayaran',
        count: 'Transaksi',
        amount: 'Diterima',
        note: 'Berdasarkan tanggal pembayaran dalam waktu klinik. Pembayaran yang kini dibatalkan tidak dihitung sebagai penerimaan aktif.',
    },
    billing: {
        title: 'Tagihan & piutang',
        description: 'Nilai tagihan dan sisa yang perlu ditagih.',
        label: 'Status tagihan',
        count: 'Tagihan',
        amount: 'Total tagihan',
        note: 'Berdasarkan tanggal tagihan diterbitkan. Status dan sisa tagihan menunjukkan kondisi saat ini, bukan saldo pada akhir periode. Nilai tagihan dibatalkan ditampilkan sebagai riwayat.',
    },
    visits: {
        title: 'Kunjungan',
        description: 'Volume kunjungan pasien per hari.',
        label: 'Tanggal kunjungan',
        count: 'Kunjungan',
        note: 'Berdasarkan tanggal kunjungan. Jumlah mencakup kunjungan yang selesai, masih berjalan, dan dibatalkan.',
    },
    services: {
        title: 'Layanan & tindakan',
        description: 'Layanan yang diberikan dan nilai tarifnya.',
        label: 'Layanan / tindakan',
        count: 'Tindakan',
        amount: 'Nilai layanan',
        note: 'Berdasarkan tanggal kunjungan dan catatan medis final. Nilai layanan adalah tarif tindakan yang tercatat, bukan penerimaan kas. Maksimal 100 kelompok teratas.',
    },
    diagnoses: {
        title: 'Diagnosis',
        description: 'Distribusi diagnosis untuk evaluasi pelayanan.',
        label: 'Diagnosis',
        count: 'Diagnosis',
        note: 'Berdasarkan tanggal kunjungan dan diagnosis dalam catatan medis final. Kunjungan yang dibatalkan tidak dihitung. Maksimal 100 kelompok teratas, tanpa identitas pasien.',
    },
    doctors: {
        title: 'Dokter',
        description: 'Distribusi kunjungan menurut dokter.',
        label: 'Dokter',
        count: 'Kunjungan',
        note: 'Berdasarkan tanggal kunjungan. Kunjungan yang dibatalkan tidak dihitung. Maksimal 100 dokter.',
    },
    pharmacy: {
        title: 'Farmasi',
        description: 'Jumlah resep menurut status pelayanan.',
        label: 'Status resep',
        count: 'Resep',
        note: 'Berdasarkan tanggal kunjungan. Status resep menunjukkan kondisi saat ini. Resep draf dan kunjungan yang dibatalkan tidak dihitung.',
    },
};
const metrics: Array<{
    key: string;
    label: string;
    detail: string;
    currency?: boolean;
}> = [
    {
        key: 'revenue',
        label: 'Penerimaan aktif',
        detail: 'Pembayaran diterima dalam periode',
        currency: true,
    },
    {
        key: 'invoiced',
        label: 'Nilai tagihan',
        detail: 'Terbit dalam periode, selain dibatalkan',
        currency: true,
    },
    {
        key: 'outstanding',
        label: 'Sisa tagihan saat ini',
        detail: 'Dari tagihan terbit dalam periode',
        currency: true,
    },
    {
        key: 'visits',
        label: 'Total kunjungan',
        detail: 'Seluruh status kunjungan',
    },
    {
        key: 'completed',
        label: 'Kunjungan selesai',
        detail: 'Pelayanan telah selesai',
    },
    {
        key: 'cancelled',
        label: 'Kunjungan dibatalkan',
        detail: 'Tetap tercatat dalam riwayat',
    },
];

export default function Reports({
    filters,
    summary,
    sections,
    section,
    rows,
    periods,
    timezone,
    canExport,
}: {
    filters: Period;
    summary: Record<string, number>;
    sections: ReportSection[];
    section: ReportSection | null;
    rows: Row[];
    periods: Array<Period & { label: string }>;
    timezone: string;
    canExport: boolean;
}) {
    const { errors, currentClinic } = usePage().props;
    const [loading, setLoading] = useState(false);
    const selected = section ? reports[section] : null;

    function visit(period: Period, nextSection = section, only?: string[]) {
        router.get(
            index.url(),
            { ...period, ...(nextSection ? { section: nextSection } : {}) },
            {
                only: only ?? [
                    'filters',
                    'summary',
                    'rows',
                    'section',
                    'sections',
                    'periods',
                    'timezone',
                    'canExport',
                ],
                preserveState: true,
                preserveScroll: true,
                replace: true,
                onStart: () => setLoading(true),
                onFinish: () => setLoading(false),
            },
        );
    }

    return (
        <>
            <Head title="Laporan Manajemen" />
            <div className="print-document flex min-w-0 flex-1 flex-col gap-5 p-4 md:p-6 print:gap-4 print:p-0">
                <PageHeader
                    eyebrow={currentClinic?.name}
                    title="Laporan Manajemen"
                    description="Pantau keuangan dan pelayanan klinik sesuai periode."
                    actions={
                        <div className="flex gap-2 print:hidden">
                            <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={loading}
                                onClick={() => visit(filters)}
                            >
                                <RefreshCw
                                    className={loading ? 'animate-spin' : ''}
                                />
                                Perbarui
                            </Button>
                            <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={loading || !section}
                                onClick={() => window.print()}
                            >
                                <Printer />
                                Cetak
                            </Button>
                        </div>
                    }
                />
                <section className="bg-card rounded-xl border p-4 print:hidden">
                    <form
                        className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end lg:max-w-2xl"
                        onSubmit={(event) => {
                            event.preventDefault();
                            const data = new FormData(event.currentTarget);
                            const from = data.get('from');
                            const to = data.get('to');
                            visit({
                                from: typeof from === 'string' ? from : '',
                                to: typeof to === 'string' ? to : '',
                            });
                        }}
                    >
                        <FormField
                            id="from"
                            label="Tanggal awal"
                            error={errors.from}
                        >
                            <Input
                                key={filters.from}
                                id="from"
                                name="from"
                                type="date"
                                defaultValue={filters.from}
                                required
                                disabled={loading}
                            />
                        </FormField>
                        <FormField
                            id="to"
                            label="Tanggal akhir"
                            error={errors.to}
                        >
                            <Input
                                key={filters.to}
                                id="to"
                                name="to"
                                type="date"
                                defaultValue={filters.to}
                                required
                                disabled={loading}
                            />
                        </FormField>
                        <Button type="submit" disabled={loading}>
                            {loading && (
                                <LoaderCircle className="size-4 animate-spin" />
                            )}
                            Tampilkan laporan
                        </Button>
                    </form>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                        {periods.map((period) => (
                            <Button
                                key={period.label}
                                type="button"
                                size="sm"
                                variant={
                                    period.from === filters.from &&
                                    period.to === filters.to
                                        ? 'secondary'
                                        : 'ghost'
                                }
                                disabled={loading}
                                onClick={() =>
                                    visit({ from: period.from, to: period.to })
                                }
                            >
                                {period.label}
                            </Button>
                        ))}
                    </div>
                </section>
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <p className="font-medium">
                        {formatDate(filters.from)} – {formatDate(filters.to)}
                    </p>
                    <p className="text-muted-foreground">
                        Waktu klinik · {timezone}
                    </p>
                </div>
                <div
                    className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 print:grid-cols-3"
                    aria-busy={loading}
                >
                    {metrics
                        .filter((metric) => summary[metric.key] !== undefined)
                        .map((metric) => (
                            <section
                                key={metric.key}
                                className="bg-card min-w-0 rounded-xl border p-4 print:break-inside-avoid"
                            >
                                <p className="text-muted-foreground text-xs">
                                    {metric.label}
                                </p>
                                <p className="mt-2 text-2xl font-semibold tracking-tight break-words tabular-nums">
                                    {metric.currency
                                        ? formatCurrency(summary[metric.key])
                                        : summary[metric.key].toLocaleString(
                                              'id-ID',
                                          )}
                                </p>
                                <p className="text-muted-foreground mt-1 text-xs">
                                    {metric.detail}
                                </p>
                            </section>
                        ))}
                </div>
                {summary.voided_count > 0 && (
                    <p className="text-muted-foreground text-xs">
                        {summary.voided_count} pembayaran dalam periode ini
                        telah dibatalkan, senilai{' '}
                        {formatCurrency(summary.voided_payments)}.
                    </p>
                )}
                {selected && section ? (
                    <section
                        className="bg-card min-w-0 overflow-hidden rounded-xl border"
                        aria-busy={loading}
                    >
                        <nav
                            className="flex overflow-x-auto border-b px-2 print:hidden"
                            aria-label="Jenis laporan"
                        >
                            {sections.map((value) => (
                                <button
                                    key={value}
                                    type="button"
                                    disabled={loading}
                                    aria-current={
                                        section === value ? 'page' : undefined
                                    }
                                    onClick={() =>
                                        visit(filters, value, [
                                            'section',
                                            'rows',
                                            'sections',
                                            'canExport',
                                        ])
                                    }
                                    className={cn(
                                        'focus-visible:ring-ring shrink-0 border-b-2 px-3 py-3.5 text-sm transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:opacity-60',
                                        section === value
                                            ? 'border-primary text-primary font-semibold'
                                            : 'text-muted-foreground hover:text-foreground border-transparent',
                                    )}
                                >
                                    {reports[value].title}
                                </button>
                            ))}
                        </nav>
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
                            <div>
                                <h2 className="text-sm font-semibold">
                                    {selected.title}
                                </h2>
                                <p className="text-muted-foreground mt-1 text-xs">
                                    {selected.description}
                                </p>
                            </div>
                            {canExport && (
                                <Button
                                    asChild
                                    variant="outline"
                                    size="sm"
                                    className="print:hidden"
                                    disabled={loading}
                                >
                                    <a
                                        href={exportMethod.url({
                                            query: { ...filters, section },
                                        })}
                                    >
                                        <Download className="size-4" />
                                        Unduh CSV
                                    </a>
                                </Button>
                            )}
                        </div>
                        {rows.length === 0 ? (
                            <div className="grid justify-items-center gap-2 px-5 py-12 text-center">
                                <BarChart3 className="text-muted-foreground mb-1 size-7" />
                                <h3 className="text-sm font-semibold">
                                    Belum ada data pada periode ini
                                </h3>
                                <p className="text-muted-foreground text-sm">
                                    Pilih rentang tanggal lain untuk melihat
                                    laporan.
                                </p>
                            </div>
                        ) : (
                            <div
                                className={cn(
                                    'overflow-x-auto transition-opacity',
                                    loading && 'opacity-50',
                                )}
                            >
                                <table className="w-full text-sm">
                                    <caption className="sr-only">
                                        {selected.title} periode {filters.from}{' '}
                                        sampai {filters.to}
                                    </caption>
                                    <thead className="bg-muted/30 text-muted-foreground">
                                        <tr>
                                            <th
                                                scope="col"
                                                className="px-4 py-3 text-left text-xs font-medium"
                                            >
                                                {selected.label}
                                            </th>
                                            <th
                                                scope="col"
                                                className="px-4 py-3 text-right text-xs font-medium"
                                            >
                                                {selected.count}
                                            </th>
                                            {selected.amount && (
                                                <th
                                                    scope="col"
                                                    className="px-4 py-3 text-right text-xs font-medium whitespace-nowrap"
                                                >
                                                    {selected.amount}
                                                </th>
                                            )}
                                            {section === 'billing' && (
                                                <th
                                                    scope="col"
                                                    className="px-4 py-3 text-right text-xs font-medium whitespace-nowrap"
                                                >
                                                    Sisa saat ini
                                                </th>
                                            )}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {rows.map((row) => (
                                            <tr key={row.label}>
                                                <td className="px-4 py-3 break-words">
                                                    {section === 'visits'
                                                        ? formatDate(row.label)
                                                        : row.label}
                                                </td>
                                                <td className="px-4 py-3 text-right tabular-nums">
                                                    {row.count.toLocaleString(
                                                        'id-ID',
                                                    )}
                                                </td>
                                                {selected.amount && (
                                                    <td className="px-4 py-3 text-right whitespace-nowrap tabular-nums">
                                                        {formatCurrency(
                                                            row.amount ?? 0,
                                                        )}
                                                    </td>
                                                )}
                                                {section === 'billing' && (
                                                    <td className="px-4 py-3 text-right font-medium whitespace-nowrap tabular-nums">
                                                        {formatCurrency(
                                                            row.balance ?? 0,
                                                        )}
                                                    </td>
                                                )}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                        <div className="bg-muted/20 border-t px-4 py-3">
                            <p className="text-muted-foreground text-xs leading-relaxed">
                                {selected.note}
                            </p>
                        </div>
                    </section>
                ) : (
                    <section className="rounded-xl border p-6 text-center">
                        <h2 className="text-sm font-semibold">
                            Belum ada kategori laporan yang dapat diakses
                        </h2>
                        <p className="text-muted-foreground mt-2 text-sm">
                            Hubungi admin klinik untuk menyesuaikan hak akses
                            laporan.
                        </p>
                    </section>
                )}
                <p className="text-muted-foreground text-xs">
                    Laporan dan ekspor berisi ringkasan tanpa identitas pasien.
                </p>
            </div>
        </>
    );
}
Reports.layout = {
    breadcrumbs: [{ title: 'Laporan Manajemen', href: index() }],
};
