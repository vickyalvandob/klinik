import { Head, router, usePage } from '@inertiajs/react';
import {
    Activity,
    ArrowLeft,
    ArrowRight,
    ChevronRight,
    ClipboardList,
    FileClock,
    History,
    LockKeyhole,
    Pill,
    Receipt,
    RefreshCw,
    Search,
    ShieldCheck,
    X,
} from 'lucide-react';
import { useRef, useState } from 'react';
import { DateRangePicker } from '@/components/date-range-picker';
import { EmptyState } from '@/components/empty-state';
import { FormField } from '@/components/form-field';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Sheet,
    SheetClose,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { index } from '@/routes/audit';

const sources = {
    activity: {
        label: 'Aktivitas aplikasi',
        icon: Activity,
        description:
            'Perubahan data, pengaturan akses, dan permintaan aplikasi.',
    },
    access: {
        label: 'Akses RME',
        icon: LockKeyhole,
        description:
            'Pembacaan rekam medis, riwayat pasien, dan unduhan lampiran.',
    },
    clinical: {
        label: 'Perubahan RME',
        icon: FileClock,
        description:
            'Penyimpanan draf, penyelesaian pemeriksaan, dan amendemen rekam medis.',
    },
    triage: {
        label: 'Pemeriksaan awal',
        icon: ClipboardList,
        description:
            'Penyimpanan draf dan penyelesaian pemeriksaan awal oleh perawat.',
    },
    billing: {
        label: 'Tagihan & pembayaran',
        icon: Receipt,
        description:
            'Penerbitan tagihan, penerimaan pembayaran, dan pembatalan transaksi.',
    },
    pharmacy: {
        label: 'Farmasi',
        icon: Pill,
        description: 'Penyiapan obat, penyerahan obat, dan pembatalan resep.',
    },
};
type Source = keyof typeof sources;
type Filters = {
    source: Source;
    search: string;
    action: string;
    from: string;
    to: string;
};
type Period = { label: string; from: string; to: string };
type Log = {
    uuid: string;
    action: string;
    label: string;
    actor: string;
    created_at: string;
    status_code: number | null;
};
type Props = {
    logs: {
        data: Log[];
        current_page: number;
        prev_page_url: string | null;
        next_page_url: string | null;
        from: number | null;
        to: number | null;
    };
    filters: Filters;
    actions: Array<{ value: string; label: string }>;
    periods: Period[];
    today: string;
    timezone: string;
};

export default function Audit({
    logs,
    filters,
    actions,
    periods,
    today,
    timezone,
}: Props) {
    const { currentClinic } = usePage().props;
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [selected, setSelected] = useState<Log | null>(null);
    const lastAttempt = useRef({ filters, page: logs.current_page });
    const category = sources[filters.source];
    const dateFormat = new Intl.DateTimeFormat('id-ID', {
        dateStyle: 'medium',
        timeZone: timezone,
    });
    const timeFormat = new Intl.DateTimeFormat('id-ID', {
        timeStyle: 'medium',
        timeZone: timezone,
    });
    const defaultPeriod = periods[1];
    const resetFilters = {
        ...filters,
        search: '',
        action: '',
        from: defaultPeriod.from,
        to: defaultPeriod.to,
    };
    const filtered = Boolean(
        filters.search ||
        filters.action ||
        filters.from !== defaultPeriod.from ||
        filters.to !== defaultPeriod.to,
    );

    function visit(next: Filters, page = 1) {
        lastAttempt.current = { filters: next, page };
        router.get(
            index.url(),
            { ...next, page },
            {
                only: [
                    'logs',
                    'filters',
                    ...(next.source !== filters.source ? ['actions'] : []),
                ],
                preserveState: true,
                preserveScroll: true,
                onStart: () => {
                    setLoading(true);
                    setError('');
                },
                onSuccess: () => setSelected(null),
                onError: (errors) => setError(Object.values(errors).join(' ')),
                onNetworkError: () => {
                    setError(
                        'Koneksi terputus. Periksa jaringan lalu coba lagi.',
                    );
                    return false;
                },
                onHttpException: () => {
                    setError('Catatan belum dapat dimuat. Silakan coba lagi.');
                    return false;
                },
                onFinish: () => setLoading(false),
            },
        );
    }

    return (
        <>
            <Head title="Audit & Akses" />
            <div className="flex min-w-0 flex-1 flex-col gap-5 p-4 md:p-6">
                <PageHeader
                    eyebrow={currentClinic?.name}
                    title="Audit & Akses"
                    description="Telusuri aktivitas pengguna dan riwayat akses layanan klinik."
                    actions={
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={loading}
                            onClick={() => visit(filters)}
                        >
                            <RefreshCw
                                className={cn(loading && 'animate-spin')}
                            />
                            Perbarui
                        </Button>
                    }
                />
                <section
                    className="bg-card min-w-0 overflow-hidden rounded-xl border"
                    aria-label="Riwayat audit"
                >
                    <nav
                        aria-label="Jenis catatan audit"
                        className="flex flex-wrap gap-1 border-b p-2"
                    >
                        {(
                            Object.entries(sources) as Array<
                                [Source, typeof category]
                            >
                        ).map(([source, item]) => (
                            <Button
                                key={source}
                                variant="ghost"
                                size="sm"
                                disabled={loading}
                                aria-current={
                                    source === filters.source
                                        ? 'page'
                                        : undefined
                                }
                                className={cn(
                                    'h-auto min-h-9 justify-start px-3 py-2 text-xs sm:text-sm',
                                    source === filters.source
                                        ? 'bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary'
                                        : 'text-muted-foreground',
                                )}
                                onClick={() => {
                                    if (source !== filters.source)
                                        visit({
                                            ...filters,
                                            source,
                                            action: '',
                                        });
                                }}
                            >
                                <item.icon className="size-4 shrink-0" />
                                {item.label}
                            </Button>
                        ))}
                    </nav>
                    <div className="flex flex-wrap items-start justify-between gap-3 px-4 pt-4 sm:px-5">
                        <div>
                            <h2 className="text-sm font-semibold">
                                {category.label}
                            </h2>
                            <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                                {category.description}
                            </p>
                        </div>
                        <span className="text-muted-foreground inline-flex items-center gap-1.5 text-xs">
                            <ShieldCheck className="size-3.5" />
                            Hanya baca
                        </span>
                    </div>
                    <AuditFilters
                        key={JSON.stringify(filters)}
                        filters={filters}
                        actions={actions}
                        periods={periods}
                        today={today}
                        loading={loading}
                        filtered={filtered}
                        onApply={visit}
                        onReset={() => visit(resetFilters)}
                    />
                    {error && (
                        <div
                            role="alert"
                            className="text-destructive mx-4 mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-current/20 p-3 text-sm"
                        >
                            <span>{error}</span>
                            <Button
                                size="sm"
                                variant="outline"
                                disabled={loading}
                                onClick={() =>
                                    visit(
                                        lastAttempt.current.filters,
                                        lastAttempt.current.page,
                                    )
                                }
                            >
                                Coba lagi
                            </Button>
                        </div>
                    )}
                    <div className="bg-muted/30 text-muted-foreground flex flex-wrap items-center justify-between gap-2 border-y px-4 py-2.5 text-xs sm:px-5">
                        <p role="status" aria-live="polite">
                            {loading
                                ? 'Memuat catatan…'
                                : logs.data.length
                                  ? `Menampilkan ${logs.from}–${logs.to} catatan · terbaru lebih dahulu`
                                  : 'Tidak ada catatan untuk ditampilkan'}
                        </p>
                        <span>
                            Waktu klinik · {timezone.replaceAll('_', ' ')}
                        </span>
                    </div>
                    <div
                        aria-busy={loading}
                        className={cn(
                            'transition-opacity',
                            loading && 'pointer-events-none opacity-50',
                        )}
                    >
                        {logs.data.length === 0 ? (
                            <EmptyState
                                icon={History}
                                title="Tidak ada catatan yang sesuai"
                                description="Coba kategori lain, perluas periode, atau ubah kata pencarian."
                                className="min-h-64 rounded-none border-0"
                                action={
                                    filtered ? (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            disabled={loading}
                                            onClick={() => visit(resetFilters)}
                                        >
                                            Reset filter
                                        </Button>
                                    ) : undefined
                                }
                            />
                        ) : (
                            <>
                                <div
                                    aria-hidden="true"
                                    className="text-muted-foreground hidden grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_10rem_2rem] gap-4 border-b px-5 py-2.5 text-xs font-medium md:grid"
                                >
                                    <span>Aktivitas</span>
                                    <span>Pengguna</span>
                                    <span>Waktu</span>
                                    <span />
                                </div>
                                <div className="divide-y">
                                    {logs.data.map((log) => (
                                        <button
                                            key={log.uuid}
                                            type="button"
                                            disabled={loading}
                                            onClick={() => setSelected(log)}
                                            aria-label={`Detail ${log.label} oleh ${log.actor}`}
                                            className="hover:bg-muted/40 focus-visible:ring-ring grid w-full min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 px-4 py-3.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-inset md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_10rem_2rem] md:px-5"
                                        >
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium break-words">
                                                    {log.label}
                                                </p>
                                                {log.status_code !== null && (
                                                    <div className="mt-1.5">
                                                        <ResponseStatus
                                                            code={
                                                                log.status_code
                                                            }
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                            <p className="text-muted-foreground col-start-1 row-start-2 text-xs break-words md:col-start-2 md:row-start-1 md:text-sm">
                                                {log.actor}
                                            </p>
                                            <time
                                                dateTime={log.created_at}
                                                className="text-muted-foreground col-start-1 row-start-3 flex flex-wrap gap-x-2 text-xs tabular-nums md:col-start-3 md:row-start-1 md:flex-col md:gap-y-1"
                                            >
                                                <span>
                                                    {dateFormat.format(
                                                        new Date(
                                                            log.created_at,
                                                        ),
                                                    )}
                                                </span>
                                                <span>
                                                    {timeFormat.format(
                                                        new Date(
                                                            log.created_at,
                                                        ),
                                                    )}
                                                </span>
                                            </time>
                                            <ChevronRight className="text-muted-foreground col-start-2 row-span-3 row-start-1 size-4 md:col-start-4 md:row-span-1" />
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                    {(logs.prev_page_url || logs.next_page_url) && (
                        <nav
                            aria-label="Halaman catatan audit"
                            className="flex flex-wrap items-center justify-between gap-3 border-t p-4"
                        >
                            <span className="text-muted-foreground text-xs">
                                Halaman {logs.current_page}
                            </span>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={loading || !logs.prev_page_url}
                                    onClick={() =>
                                        visit(filters, logs.current_page - 1)
                                    }
                                >
                                    <ArrowLeft />
                                    Sebelumnya
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={loading || !logs.next_page_url}
                                    onClick={() =>
                                        visit(filters, logs.current_page + 1)
                                    }
                                >
                                    Berikutnya
                                    <ArrowRight />
                                </Button>
                            </div>
                        </nav>
                    )}
                </section>
                <p className="text-muted-foreground flex items-start gap-2 text-xs leading-relaxed">
                    <LockKeyhole className="mt-0.5 size-3.5 shrink-0" />
                    Catatan audit tersimpan otomatis dan tidak dapat diubah. Isi
                    pemeriksaan serta identitas pasien tidak ditampilkan di
                    halaman ini.
                </p>
            </div>
            <Sheet
                open={selected !== null}
                onOpenChange={(open) => {
                    if (!open) setSelected(null);
                }}
            >
                <SheetContent className="w-full overflow-y-auto sm:max-w-md">
                    <SheetHeader className="border-b pr-10">
                        <SheetTitle>Detail catatan</SheetTitle>
                        <SheetDescription>
                            Informasi aktivitas yang tercatat di klinik.
                        </SheetDescription>
                    </SheetHeader>
                    {selected && (
                        <div className="space-y-5 px-4">
                            <div>
                                <p className="text-muted-foreground text-xs">
                                    {category.label}
                                </p>
                                <h3 className="mt-1 text-base font-semibold break-words">
                                    {selected.label}
                                </h3>
                            </div>
                            <dl className="space-y-4 text-sm">
                                <div>
                                    <dt className="text-muted-foreground text-xs">
                                        Pengguna
                                    </dt>
                                    <dd className="mt-1 break-words">
                                        {selected.actor}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-muted-foreground text-xs">
                                        Waktu klinik
                                    </dt>
                                    <dd className="mt-1">
                                        {dateFormat.format(
                                            new Date(selected.created_at),
                                        )}
                                        ,{' '}
                                        {timeFormat.format(
                                            new Date(selected.created_at),
                                        )}
                                        <span className="text-muted-foreground mt-1 block text-xs">
                                            {timezone}
                                        </span>
                                    </dd>
                                </div>
                                {selected.status_code !== null && (
                                    <div>
                                        <dt className="text-muted-foreground text-xs">
                                            Respons aplikasi
                                        </dt>
                                        <dd className="mt-1">
                                            <ResponseStatus
                                                code={selected.status_code}
                                            />
                                            <span className="text-muted-foreground ml-2 text-xs">
                                                HTTP {selected.status_code}
                                            </span>
                                        </dd>
                                        {selected.status_code >= 300 &&
                                            selected.status_code < 400 && (
                                                <dd className="text-muted-foreground mt-2 text-xs leading-relaxed">
                                                    Respons pengalihan belum
                                                    memastikan perubahan
                                                    tersimpan. Periksa kategori
                                                    layanan terkait untuk
                                                    melihat perubahan yang
                                                    tercatat.
                                                </dd>
                                            )}
                                    </div>
                                )}
                                <div>
                                    <dt className="text-muted-foreground text-xs">
                                        Kode aktivitas
                                    </dt>
                                    <dd className="bg-muted/50 mt-1 rounded-md border px-3 py-2 font-mono text-xs break-all">
                                        {selected.action}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-muted-foreground text-xs">
                                        ID catatan
                                    </dt>
                                    <dd className="mt-1 font-mono text-xs break-all select-all">
                                        {selected.uuid}
                                    </dd>
                                </div>
                            </dl>
                        </div>
                    )}
                    <SheetFooter className="border-t">
                        <SheetClose asChild>
                            <Button variant="outline">Tutup</Button>
                        </SheetClose>
                    </SheetFooter>
                </SheetContent>
            </Sheet>
        </>
    );
}

function AuditFilters({
    filters,
    actions,
    periods,
    today,
    loading,
    filtered,
    onApply,
    onReset,
}: Pick<Props, 'filters' | 'actions' | 'periods' | 'today'> & {
    loading: boolean;
    filtered: boolean;
    onApply: (filters: Filters) => void;
    onReset: () => void;
}) {
    const [draft, setDraft] = useState(filters);
    return (
        <form
            aria-label="Filter catatan audit"
            onSubmit={(event) => {
                event.preventDefault();
                onApply(draft);
            }}
            className="space-y-3 p-4 sm:px-5"
        >
            <fieldset
                disabled={loading}
                className="grid min-w-0 gap-3 disabled:opacity-60 sm:grid-cols-2 xl:grid-cols-[minmax(12rem,1fr)_minmax(12rem,16rem)_minmax(12rem,16rem)_auto] xl:items-start"
            >
                <FormField
                    id="audit-search"
                    label="Cari catatan"
                    className="min-w-0"
                >
                    <div className="relative">
                        <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                        <Input
                            id="audit-search"
                            type="search"
                            placeholder="Pengguna, aktivitas, atau ID catatan"
                            maxLength={100}
                            value={draft.search}
                            onChange={(event) =>
                                setDraft({
                                    ...draft,
                                    search: event.target.value,
                                })
                            }
                            className="pl-9"
                        />
                    </div>
                </FormField>
                <FormField
                    id="audit-action"
                    label="Aktivitas"
                    className="min-w-0"
                >
                    <Select
                        value={draft.action || 'all'}
                        disabled={loading}
                        onValueChange={(value) =>
                            setDraft({
                                ...draft,
                                action: value === 'all' ? '' : value,
                            })
                        }
                    >
                        <SelectTrigger
                            id="audit-action"
                            className="w-full min-w-0"
                        >
                            <SelectValue placeholder="Semua aktivitas" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Semua aktivitas</SelectItem>
                            {draft.action &&
                                !actions.some(
                                    (action) => action.value === draft.action,
                                ) && (
                                    <SelectItem value={draft.action}>
                                        {draft.action}
                                    </SelectItem>
                                )}
                            {actions.map((action) => (
                                <SelectItem
                                    key={action.value}
                                    value={action.value}
                                >
                                    {action.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </FormField>
                <FormField
                    id="audit-period"
                    label="Periode"
                    className="min-w-0"
                >
                    <DateRangePicker
                        id="audit-period"
                        from={draft.from}
                        to={draft.to}
                        today={today}
                        disabled={loading}
                        onChange={(period) => setDraft({ ...draft, ...period })}
                    />
                </FormField>
                <div className="flex items-center gap-2 self-end xl:pt-5">
                    <Button type="submit" disabled={loading}>
                        <Search />
                        Terapkan
                    </Button>
                    {filtered && (
                        <Button
                            variant="ghost"
                            type="button"
                            disabled={loading}
                            onClick={onReset}
                        >
                            <X />
                            Reset
                        </Button>
                    )}
                </div>
            </fieldset>
            <div
                className="flex flex-wrap items-center gap-1.5"
                aria-label="Periode cepat"
            >
                {periods.map((period) => (
                    <Button
                        key={period.label}
                        type="button"
                        size="sm"
                        variant={
                            draft.from === period.from && draft.to === period.to
                                ? 'secondary'
                                : 'ghost'
                        }
                        className="h-7 px-2.5 text-xs"
                        disabled={loading}
                        aria-pressed={
                            draft.from === period.from && draft.to === period.to
                        }
                        onClick={() => {
                            const next = {
                                ...draft,
                                from: period.from,
                                to: period.to,
                            };
                            setDraft(next);
                            onApply(next);
                        }}
                    >
                        {period.label}
                    </Button>
                ))}
                <Button
                    type="button"
                    size="sm"
                    variant={!draft.from && !draft.to ? 'secondary' : 'ghost'}
                    className="h-7 px-2.5 text-xs"
                    disabled={loading}
                    aria-pressed={!draft.from && !draft.to}
                    onClick={() => {
                        const next = { ...draft, from: '', to: '' };
                        setDraft(next);
                        onApply(next);
                    }}
                >
                    Semua tanggal
                </Button>
            </div>
        </form>
    );
}

function ResponseStatus({ code }: { code: number }) {
    const failed = code >= 400;
    const label =
        code >= 500
            ? 'Gangguan server'
            : code >= 400
              ? 'Permintaan ditolak'
              : code >= 300
                ? 'Dialihkan'
                : 'Respons berhasil';
    return (
        <span
            className={cn(
                'inline-flex items-center gap-1.5 text-xs',
                failed ? 'text-destructive' : 'text-muted-foreground',
            )}
        >
            <span
                className={cn(
                    'size-1.5 rounded-full',
                    failed
                        ? 'bg-destructive'
                        : code >= 300
                          ? 'bg-muted-foreground/60'
                          : 'bg-emerald-500',
                )}
            />
            {label}
        </span>
    );
}

Audit.layout = { breadcrumbs: [{ title: 'Audit & Akses', href: index() }] };
