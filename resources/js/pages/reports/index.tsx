import { Head, router, usePage } from '@inertiajs/react';
import {
    Activity,
    ArrowDownToLine,
    Banknote,
    CalendarDays,
    ChevronRight,
    ClipboardList,
    FileText,
    LoaderCircle,
    Pill,
    Printer,
    RefreshCw,
    Stethoscope,
} from 'lucide-react';
import { useState } from 'react';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { formatDate } from '@/lib/billing';
import { cn } from '@/lib/utils';
import { index, exportMethod } from '@/routes/reports';
import { PeriodFilter } from './period-filter';
import { reports } from './report-config';
import type { Period, ReportSection, ReportSummary, Row } from './report-config';
import { ReportOverview } from './report-overview';
import { ReportDetails } from './report-details';

const icons = {
    revenue: Banknote,
    billing: FileText,
    visits: CalendarDays,
    services: Activity,
    diagnoses: ClipboardList,
    doctors: Stethoscope,
    pharmacy: Pill,
};
const groups: Array<{ title: string; sections: ReportSection[] }> = [
    { title: 'Keuangan', sections: ['revenue', 'billing'] },
    {
        title: 'Pelayanan',
        sections: ['visits', 'services', 'diagnoses', 'doctors', 'pharmacy'],
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
    generatedAt,
    canExport,
}: {
    filters: Period;
    summary: ReportSummary;
    sections: ReportSection[];
    section: ReportSection | null;
    rows: Row[];
    periods: Array<Period & { label: string }>;
    timezone: string;
    generatedAt: string;
    canExport: boolean;
}) {
    const { errors, currentClinic } = usePage().props;
    const [loading, setLoading] = useState(false);
    const [failure, setFailure] = useState<string | null>(null);
    const [retry, setRetry] = useState<{
        period: Period;
        section: ReportSection | null;
    } | null>(null);
    const selected = section ? reports[section] : null;
    const SelectedIcon = section ? icons[section] : FileText;

    function visit(
        period: Period,
        nextSection = section,
        onSuccess?: () => void,
    ) {
        if (loading) return;
        const categoryOnly =
            nextSection !== section &&
            period.from === filters.from &&
            period.to === filters.to;
        setRetry({ period, section: nextSection });
        setFailure(null);
        router.get(
            index.url(),
            { ...period, ...(nextSection ? { section: nextSection } : {}) },
            {
                only: [
                    'filters',
                    'rows',
                    'summary',
                    'section',
                    'sections',
                    'canExport',
                    'generatedAt',
                    ...(categoryOnly ? [] : ['periods', 'timezone']),
                ],
                preserveState: true,
                preserveScroll: true,
                onStart: () => setLoading(true),
                onSuccess: () => {
                    setRetry(null);
                    onSuccess?.();
                },
                onError: () =>
                    setFailure(
                        'Periode belum diterapkan. Periksa kembali tanggal yang dipilih.',
                    ),
                onNetworkError: () => {
                    setFailure(
                        'Laporan gagal dimuat. Periksa koneksi lalu coba lagi. Data sebelumnya tetap ditampilkan.',
                    );
                    return false;
                },
                onHttpException: () => {
                    setFailure(
                        'Laporan belum dapat dimuat. Coba lagi atau muat ulang halaman untuk memperbarui akses.',
                    );
                    return false;
                },
                onFinish: () => setLoading(false),
            },
        );
    }

    return (
        <>
            <Head title="Laporan Manajemen" />
            <div className="print-document mx-auto flex w-full max-w-7xl min-w-0 flex-1 flex-col gap-5 p-4 md:p-6 print:gap-4 print:p-0 print:text-black print:[--color-border:#e4e4e7] print:[--color-card:white] print:[--color-muted-foreground:#52525b] print:[--color-muted:#f4f4f5] print:[--color-primary:#0f766e]">
                <PageHeader
                    eyebrow={currentClinic?.name}
                    title="Laporan Manajemen"
                    description="Ringkasan keuangan dan pelayanan, dalam satu tempat."
                    actions={
                        <div className="flex flex-wrap gap-2 print:hidden">
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={loading}
                                onClick={() => visit(filters)}
                            >
                                <RefreshCw
                                    className={cn(loading && 'animate-spin')}
                                />{' '}
                                Perbarui
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={loading || !section}
                                onClick={() => window.print()}
                            >
                                <Printer /> Cetak
                            </Button>
                            {canExport && section && (
                                <Button asChild size="sm">
                                    <a
                                        href={
                                            loading
                                                ? undefined
                                                : exportMethod.url({
                                                      query: {
                                                          ...filters,
                                                          section,
                                                      },
                                                  })
                                        }
                                        aria-disabled={loading}
                                        tabIndex={loading ? -1 : undefined}
                                        className={cn(
                                            loading &&
                                                'pointer-events-none opacity-50',
                                        )}
                                    >
                                        <ArrowDownToLine /> Unduh CSV
                                    </a>
                                </Button>
                            )}
                        </div>
                    }
                />
                <div className="bg-card flex flex-col gap-3 rounded-xl border p-3 sm:flex-row sm:items-center sm:justify-between print:hidden">
                    <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center">
                        <span className="text-muted-foreground px-1 text-xs font-medium">
                            Periode laporan
                        </span>
                        <PeriodFilter
                            key={filters.from + filters.to}
                            filters={filters}
                            periods={periods}
                            loading={loading}
                            errors={errors}
                            onApply={(period, onSuccess) =>
                                visit(period, section, onSuccess)
                            }
                        />
                    </div>
                    <p className="text-muted-foreground px-1 text-xs">
                        {timezone}
                    </p>
                </div>
                <p className="hidden text-sm print:block">
                    Periode {formatDate(filters.from)} –{' '}
                    {formatDate(filters.to)} · {timezone}
                </p>
                {failure && (
                    <div
                        role="alert"
                        className="border-destructive/30 bg-destructive/5 flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3 print:hidden"
                    >
                        <p className="text-destructive text-sm">{failure}</p>
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={loading}
                            onClick={() =>
                                retry && visit(retry.period, retry.section)
                            }
                        >
                            Coba lagi
                        </Button>
                    </div>
                )}
                <div className="sr-only" role="status" aria-live="polite">
                    {loading
                        ? 'Memuat laporan…'
                        : selected
                          ? `Laporan ${selected.title} siap ditampilkan.`
                          : ''}
                </div>
                {selected && section ? (
                    <div className="grid min-w-0 items-start gap-4 xl:grid-cols-[200px_minmax(0,1fr)] print:block">
                        <nav
                            aria-label="Jenis laporan"
                            className="bg-card hidden rounded-xl border p-2 xl:block print:hidden"
                        >
                            {groups.map((group) => {
                                const available = group.sections.filter(
                                    (value) => sections.includes(value),
                                );
                                return (
                                    available.length > 0 && (
                                        <div
                                            key={group.title}
                                            className="mb-2 last:mb-0"
                                        >
                                            <p className="text-muted-foreground px-3 pt-2 pb-2 text-[11px] font-medium tracking-wide uppercase">
                                                {group.title}
                                            </p>
                                            {available.map((value) => {
                                                const Icon = icons[value];
                                                return (
                                                    <button
                                                        key={value}
                                                        type="button"
                                                        disabled={loading}
                                                        aria-current={
                                                            section === value
                                                                ? 'page'
                                                                : undefined
                                                        }
                                                        onClick={() =>
                                                            visit(
                                                                filters,
                                                                value,
                                                            )
                                                        }
                                                        className={cn(
                                                            'focus-visible:ring-ring flex min-h-10 w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-xs transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:opacity-60',
                                                            section === value
                                                                ? 'bg-primary/8 text-primary font-semibold'
                                                                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                                                        )}
                                                    >
                                                        <Icon className="size-4 shrink-0" />
                                                        <span className="flex-1">
                                                            {
                                                                reports[value]
                                                                    .title
                                                            }
                                                        </span>
                                                        {section === value && (
                                                            <ChevronRight className="size-3.5" />
                                                        )}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )
                                );
                            })}
                        </nav>
                        <section
                            className="bg-card min-w-0 overflow-hidden rounded-xl border print:overflow-visible"
                            aria-busy={loading}
                            aria-labelledby="report-title"
                        >
                            <div className="border-b p-3 xl:hidden print:hidden">
                                <Select
                                    value={section}
                                    disabled={loading}
                                    onValueChange={(value) =>
                                        visit(filters, value as ReportSection)
                                    }
                                >
                                    <SelectTrigger
                                        className="w-full"
                                        aria-label="Jenis laporan"
                                    >
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent
                                        avoidCollisions
                                        collisionPadding={12}
                                        align="start"
                                    >
                                        {groups
                                            .flatMap((group) => group.sections)
                                            .filter((value) =>
                                                sections.includes(value),
                                            )
                                            .map((value) => (
                                                <SelectItem
                                                    key={value}
                                                    value={value}
                                                >
                                                    {reports[value].title}
                                                </SelectItem>
                                            ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex items-start gap-3 border-b p-4">
                                <div className="bg-muted/30 rounded-lg border p-2 print:hidden">
                                    <SelectedIcon className="text-muted-foreground size-4" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h2
                                        id="report-title"
                                        className="text-sm font-semibold"
                                    >
                                        {selected.title}
                                    </h2>
                                    <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                                        {selected.description}
                                    </p>
                                </div>
                                {loading && (
                                    <LoaderCircle className="text-primary size-4 shrink-0 animate-spin print:hidden" />
                                )}
                            </div>
                            <ReportOverview section={section} summary={summary} rows={rows} />
                            <ReportDetails
                                key={section + filters.from + filters.to}
                                rows={rows}
                                section={section}
                                filters={filters}
                                loading={loading}
                            />
                        </section>
                    </div>
                ) : (
                    <section className="rounded-xl border p-8 text-center">
                        <h2 className="text-sm font-semibold">
                            Belum ada kategori laporan yang dapat diakses
                        </h2>
                        <p className="text-muted-foreground mt-2 text-sm">
                            Hubungi admin klinik untuk menyesuaikan hak akses
                            laporan.
                        </p>
                    </section>
                )}
                <footer className="text-muted-foreground flex flex-wrap items-center justify-between gap-2 text-xs leading-relaxed">
                    <p>Ringkasan tanpa identitas pasien.</p>
                    <p>
                        Laporan dimuat{' '}
                        {new Intl.DateTimeFormat('id-ID', {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                            timeZone: timezone,
                        }).format(new Date(generatedAt))}
                    </p>
                </footer>
            </div>
        </>
    );
}
Reports.layout = {
    breadcrumbs: [{ title: 'Laporan Manajemen', href: index() }],
};
