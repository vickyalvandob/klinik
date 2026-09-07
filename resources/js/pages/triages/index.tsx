import { Form, Head, Link } from '@inertiajs/react';
import {
    AlertTriangle,
    ArrowRight,
    CheckCircle2,
    Clock3,
    Search,
    Stethoscope,
    X,
} from 'lucide-react';
import { EmptyState } from '@/components/empty-state';
import { FormField } from '@/components/form-field';
import { PageHeader } from '@/components/page-header';
import { PaginationLinks } from '@/components/pagination-links';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import { dashboard } from '@/routes';
import { edit, index } from '@/routes/triages';
import type { Paginator, TriageQueueEncounter } from '@/types';

const listProps = ['encounters', 'filters', 'mode'];

export default function TriageIndex({
    encounters,
    mode,
    summary,
    filters,
    serviceUnits,
    timezone,
}: {
    encounters: Paginator<TriageQueueEncounter>;
    mode: 'queue' | 'completed';
    summary: { waiting: number; completed: number };
    filters: { search: string; service_unit: string };
    serviceUnits: Array<{ uuid: string; name: string }>;
    timezone: string;
}) {
    const filtered = Boolean(filters.search || filters.service_unit);
    const timeFormat = new Intl.DateTimeFormat('id-ID', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: timezone,
    });

    return (
        <>
            <Head title="Pemeriksaan Awal" />
            <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-5 p-4 md:p-6">
                <PageHeader
                    eyebrow="Ruang perawat"
                    title="Pemeriksaan awal"
                    description="Pilih pasien, catat hasil pemeriksaan, lalu teruskan ke dokter."
                />
                <nav
                    aria-label="Daftar pemeriksaan"
                    className="grid grid-cols-2 gap-3"
                >
                    {(
                        [
                            {
                                value: 'queue',
                                label: 'Menunggu diperiksa',
                                count: summary.waiting,
                                icon: Clock3,
                            },
                            {
                                value: 'completed',
                                label: 'Selesai hari ini',
                                count: summary.completed,
                                icon: CheckCircle2,
                            },
                        ] as const
                    ).map((tab) => (
                        <Link
                            key={tab.value}
                            href={index({
                                query: { ...filters, mode: tab.value },
                            })}
                            only={[...listProps, 'summary']}
                            preserveScroll
                            aria-current={
                                mode === tab.value ? 'page' : undefined
                            }
                            className={cn(
                                'focus-visible:ring-ring flex min-w-0 items-center gap-3 rounded-xl border p-3 transition-colors focus-visible:ring-2 focus-visible:outline-none sm:p-4',
                                mode === tab.value
                                    ? 'border-primary/40 bg-primary/5'
                                    : 'bg-card hover:bg-muted/50',
                            )}
                        >
                            <tab.icon
                                className={cn(
                                    'hidden size-5 shrink-0 sm:block',
                                    mode === tab.value
                                        ? 'text-primary'
                                        : 'text-muted-foreground',
                                )}
                            />
                            <div className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                                <span className="text-xs font-medium sm:text-sm">
                                    {tab.label}
                                </span>
                                <span className="text-2xl font-semibold tabular-nums">
                                    {tab.count}
                                </span>
                            </div>
                        </Link>
                    ))}
                </nav>
                <section className="bg-card min-w-0 rounded-xl border">
                    <Form
                        {...index.form()}
                        key={JSON.stringify([mode, filters])}
                        options={{
                            only: listProps,
                            preserveScroll: true,
                            preserveState: true,
                            replace: true,
                        }}
                        className="border-b p-4"
                    >
                        {({ processing, errors }) => (
                            <>
                                <input type="hidden" name="mode" value={mode} />
                                <div className="grid items-end gap-3 sm:grid-cols-[minmax(0,1fr)_12rem_auto]">
                                    <FormField
                                        id="search"
                                        label="Cari pasien"
                                        error={errors.search}
                                    >
                                        <div className="relative">
                                            <Search className="text-muted-foreground pointer-events-none absolute top-3 left-3 size-4" />
                                            <Input
                                                id="search"
                                                name="search"
                                                type="search"
                                                defaultValue={filters.search}
                                                placeholder="Nama, nomor RM, atau antrean"
                                                maxLength={100}
                                                className="h-11 pl-9 sm:h-10"
                                            />
                                        </div>
                                    </FormField>
                                    <FormField
                                        id="service_unit"
                                        label="Unit layanan"
                                        error={errors.service_unit}
                                    >
                                        <select
                                            id="service_unit"
                                            name="service_unit"
                                            defaultValue={filters.service_unit}
                                            className="border-input bg-background focus-visible:ring-ring h-11 w-full min-w-0 rounded-md border px-3 text-base focus-visible:ring-2 focus-visible:outline-none sm:h-10 sm:text-sm"
                                        >
                                            <option value="">Semua unit</option>
                                            {serviceUnits.map((unit) => (
                                                <option
                                                    key={unit.uuid}
                                                    value={unit.uuid}
                                                >
                                                    {unit.name}
                                                </option>
                                            ))}
                                        </select>
                                    </FormField>
                                    <Button
                                        type="submit"
                                        variant="outline"
                                        disabled={processing}
                                        className="h-11 sm:h-10"
                                    >
                                        {processing ? <Spinner /> : <Search />}{' '}
                                        Cari
                                    </Button>
                                </div>
                            </>
                        )}
                    </Form>
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
                        <p className="text-muted-foreground text-xs">
                            <span className="text-foreground font-medium">
                                {encounters.total} pasien
                            </span>
                            {mode === 'queue'
                                ? ' · Urutan pendaftaran terlama'
                                : ' · Pemeriksaan yang selesai hari ini'}
                        </p>
                        {filtered && (
                            <Button asChild variant="ghost" size="sm">
                                <Link
                                    href={index({ query: { mode } })}
                                    only={listProps}
                                    preserveScroll
                                >
                                    <X /> Hapus filter
                                </Link>
                            </Button>
                        )}
                    </div>
                    {encounters.data.length === 0 ? (
                        <EmptyState
                            icon={
                                filtered
                                    ? Search
                                    : mode === 'queue'
                                      ? Clock3
                                      : CheckCircle2
                            }
                            title={
                                filtered
                                    ? 'Pasien tidak ditemukan'
                                    : mode === 'queue'
                                      ? 'Tidak ada pasien menunggu'
                                      : 'Belum ada pemeriksaan selesai'
                            }
                            description={
                                filtered
                                    ? 'Coba nama atau nomor lain, atau hapus filter unit.'
                                    : mode === 'queue'
                                      ? 'Gunakan tombol Perbarui untuk melihat pendaftaran terbaru.'
                                      : 'Hasil pemeriksaan yang selesai hari ini dapat dibaca kembali di sini.'
                            }
                            className="rounded-none border-0"
                        />
                    ) : (
                        <div className="divide-y">
                            {encounters.data.map((encounter) => (
                                <article
                                    key={encounter.uuid}
                                    className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-3 p-4 sm:gap-4 lg:grid-cols-[5.5rem_minmax(0,1fr)_minmax(0,0.8fr)_auto] lg:items-center lg:p-5"
                                >
                                    <div className="bg-muted/50 flex min-h-16 flex-col items-center justify-center gap-1 self-start rounded-lg border px-1 py-3">
                                        <span className="text-muted-foreground text-[10px]">
                                            Antrean
                                        </span>
                                        <span className="text-primary text-center font-mono text-base font-semibold break-all sm:text-lg">
                                            {encounter.queue_number}
                                        </span>
                                    </div>
                                    <div className="min-w-0">
                                        <h2 className="font-semibold break-words">
                                            {encounter.patient.name}
                                        </h2>
                                        <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                                            RM{' '}
                                            {
                                                encounter.patient
                                                    .medical_record_number
                                            }{' '}
                                            ·{' '}
                                            {encounter.patient.gender === 'male'
                                                ? 'Laki-laki'
                                                : 'Perempuan'}
                                        </p>
                                        <p className="text-muted-foreground mt-1 text-xs">
                                            {mode === 'completed' &&
                                            encounter.completed_at
                                                ? 'Selesai ' +
                                                  timeFormat.format(
                                                      new Date(
                                                          encounter.completed_at,
                                                      ),
                                                  )
                                                : 'Daftar ' +
                                                  timeFormat.format(
                                                      new Date(
                                                          encounter.registered_at,
                                                      ),
                                                  )}
                                        </p>
                                        {encounter.patient.allergies.length >
                                            0 && (
                                            <p className="mt-2 flex items-start gap-1.5 text-xs leading-relaxed font-medium text-amber-800 dark:text-amber-300">
                                                <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                                                <span className="break-words">
                                                    Alergi:{' '}
                                                    {encounter.patient.allergies.join(
                                                        ', ',
                                                    )}
                                                </span>
                                            </p>
                                        )}
                                    </div>
                                    <div className="col-start-2 min-w-0 lg:col-start-auto">
                                        <p className="text-sm font-medium break-words">
                                            {encounter.service_unit}
                                        </p>
                                        <p className="text-muted-foreground mt-1 flex items-start gap-1.5 text-xs">
                                            <Stethoscope className="size-3.5 shrink-0" />
                                            {encounter.practitioner}
                                        </p>
                                        <p className="mt-2 line-clamp-2 text-sm break-words">
                                            {encounter.chief_complaint ||
                                                'Keluhan belum dicatat'}
                                        </p>
                                        {encounter.triage_status ===
                                            'draft' && (
                                            <Badge
                                                variant="outline"
                                                className="mt-2 gap-1 text-xs"
                                            >
                                                <Clock3 className="size-3" />
                                                Draft tersimpan
                                            </Badge>
                                        )}
                                    </div>
                                    <Button
                                        asChild
                                        variant={
                                            mode === 'queue'
                                                ? 'default'
                                                : 'outline'
                                        }
                                        className="col-start-2 h-11 lg:col-start-auto lg:h-10"
                                    >
                                        <Link
                                            href={edit(encounter.uuid)}
                                            aria-label={
                                                (mode === 'completed'
                                                    ? 'Lihat hasil '
                                                    : encounter.triage_status ===
                                                        'draft'
                                                      ? 'Lanjutkan pemeriksaan '
                                                      : 'Periksa ') +
                                                encounter.patient.name
                                            }
                                        >
                                            {mode === 'completed'
                                                ? 'Lihat hasil'
                                                : encounter.triage_status ===
                                                    'draft'
                                                  ? 'Lanjutkan'
                                                  : 'Periksa'}
                                            <ArrowRight />
                                        </Link>
                                    </Button>
                                </article>
                            ))}
                        </div>
                    )}
                    {encounters.links.length > 3 && (
                        <div className="border-t p-4">
                            <PaginationLinks
                                links={encounters.links}
                                only={listProps}
                                preserveState
                            />
                        </div>
                    )}
                </section>
                {mode === 'queue' && (
                    <p className="text-muted-foreground text-xs">
                        Pasien dari hari sebelumnya tetap tampil sampai
                        pemeriksaan awal selesai.
                    </p>
                )}
            </div>
        </>
    );
}

TriageIndex.layout = {
    breadcrumbs: [
        { title: 'Ringkasan', href: dashboard() },
        { title: 'Pemeriksaan Awal', href: index() },
    ],
};
