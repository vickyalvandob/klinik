import { Form, Head, router } from '@inertiajs/react';
import { Download, RefreshCw } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { FormField } from '@/components/form-field';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { index, exportMethod } from '@/routes/reports';

type Row = { label: string; count: number; amount: number | null };
const titles: Record<string, string> = {
    visits: 'Kunjungan per hari',
    revenue: 'Pendapatan per metode',
    services: 'Layanan & tindakan',
    diagnoses: 'Diagnosis',
    doctors: 'Kunjungan per dokter',
    pharmacy: 'Farmasi',
};
const summaryTitles: Record<string, string> = {
    visits: 'Total kunjungan',
    completed: 'Selesai',
    cancelled: 'Dibatalkan',
    revenue: 'Pembayaran diterima',
    voided_payments: 'Pembayaran dibatalkan',
    outstanding: 'Sisa tagihan kunjungan',
};
const money = (value: number) =>
    new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0,
    }).format(value);

export default function Reports({
    filters,
    summary,
    sections,
    details,
    canExport,
}: {
    filters: { from: string; to: string };
    summary: Record<string, number>;
    sections: string[];
    details?: Record<string, Row[]>;
    canExport: boolean;
}) {
    return (
        <>
            <Head title="Laporan" />
            <div className="flex flex-1 flex-col gap-5 p-4 md:p-6">
                <PageHeader
                    title="Laporan"
                    description="Ringkasan operasional sesuai periode dan hak akses Anda."
                />
                <Form
                    {...index.form()}
                    className="bg-card flex flex-wrap items-end gap-3 rounded-xl border p-4"
                >
                    {({ errors, processing }) => (
                        <>
                            <FormField
                                id="from"
                                label="Tanggal awal"
                                error={errors.from}
                            >
                                <Input
                                    id="from"
                                    name="from"
                                    type="date"
                                    defaultValue={filters.from}
                                    required
                                />
                            </FormField>
                            <FormField
                                id="to"
                                label="Tanggal akhir"
                                error={errors.to}
                            >
                                <Input
                                    id="to"
                                    name="to"
                                    type="date"
                                    defaultValue={filters.to}
                                    required
                                />
                            </FormField>
                            <Button type="submit" disabled={processing}>
                                Tampilkan
                            </Button>
                        </>
                    )}
                </Form>
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
                    {Object.entries(summary).map(([key, value]) => (
                        <section
                            key={key}
                            className="bg-card rounded-xl border p-4"
                        >
                            <p className="text-muted-foreground text-sm">
                                {summaryTitles[key] ?? key}
                            </p>
                            <p className="mt-2 text-xl font-semibold break-words">
                                {[
                                    'revenue',
                                    'voided_payments',
                                    'outstanding',
                                ].includes(key)
                                    ? money(value)
                                    : value.toLocaleString('id-ID')}
                            </p>
                        </section>
                    ))}
                </div>
                <p className="text-muted-foreground text-xs leading-relaxed">
                    Pendapatan memakai waktu pembayaran dalam zona waktu klinik
                    dan mengecualikan pembayaran yang dibatalkan. Layanan dan
                    diagnosis hanya dari RME final. Layanan, diagnosis, dan
                    dokter menampilkan maksimal 100 kelompok teratas. Ekspor
                    berisi ringkasan tanpa identitas pasien.
                </p>
                {!details ? (
                    <section
                        className="rounded-xl border p-5"
                        aria-live="polite"
                    >
                        <div className="bg-muted h-24 animate-pulse rounded-lg" />
                        <p className="text-muted-foreground mt-3 text-sm">
                            Memuat rincian laporan…
                        </p>
                        <Button
                            variant="outline"
                            className="mt-3"
                            onClick={() => router.reload({ only: ['details'] })}
                        >
                            <RefreshCw /> Muat ulang
                        </Button>
                    </section>
                ) : (
                    <div className="grid items-start gap-5 xl:grid-cols-2">
                        {sections.map((section) => (
                            <section
                                key={section}
                                className="bg-card overflow-hidden rounded-xl border"
                            >
                                <div className="flex items-center justify-between gap-3 border-b p-4">
                                    <h2 className="text-sm font-semibold">
                                        {titles[section]}
                                    </h2>
                                    {canExport && (
                                        <Button
                                            asChild
                                            variant="outline"
                                            size="sm"
                                        >
                                            <a
                                                href={exportMethod.url({
                                                    query: {
                                                        ...filters,
                                                        section,
                                                    },
                                                })}
                                            >
                                                <Download className="size-4" />{' '}
                                                CSV
                                            </a>
                                        </Button>
                                    )}
                                </div>
                                {(details[section] ?? []).length === 0 ? (
                                    <p className="text-muted-foreground p-5 text-sm">
                                        Belum ada data untuk periode ini.
                                    </p>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead className="bg-muted/30 text-muted-foreground">
                                                <tr>
                                                    <th className="p-3 text-left font-medium">
                                                        Ringkasan
                                                    </th>
                                                    <th className="p-3 text-right font-medium">
                                                        Jumlah
                                                    </th>
                                                    {[
                                                        'revenue',
                                                        'services',
                                                    ].includes(section) && (
                                                        <th className="p-3 text-right font-medium">
                                                            Nominal
                                                        </th>
                                                    )}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y">
                                                {details[section].map((row) => (
                                                    <tr key={row.label}>
                                                        <td className="p-3">
                                                            {row.label}
                                                        </td>
                                                        <td className="p-3 text-right tabular-nums">
                                                            {row.count}
                                                        </td>
                                                        {[
                                                            'revenue',
                                                            'services',
                                                        ].includes(section) && (
                                                            <td className="p-3 text-right whitespace-nowrap tabular-nums">
                                                                {money(
                                                                    row.amount ??
                                                                        0,
                                                                )}
                                                            </td>
                                                        )}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </section>
                        ))}
                    </div>
                )}
            </div>
        </>
    );
}
Reports.layout = { breadcrumbs: [{ title: 'Laporan', href: index() }] };
