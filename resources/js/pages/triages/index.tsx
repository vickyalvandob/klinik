import { Head, Link } from '@inertiajs/react';
import { AlertTriangle, ArrowRight, CheckCircle2, Clock3 } from 'lucide-react';
import { useMemo } from 'react';
import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';
import { PaginationLinks } from '@/components/pagination-links';
import { WorklistFilters } from '@/components/worklist-filters';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { dashboard } from '@/routes';
import { edit, index } from '@/routes/triages';
import type { Paginator, TriageQueueEncounter } from '@/types';

const listProps = ['encounters', 'filters', 'mode', 'today'];

export default function TriageIndex({
    encounters,
    mode,
    summary,
    filters,
    serviceUnits,
    today,
    timezone,
}: {
    encounters: Paginator<TriageQueueEncounter>;
    mode: 'queue' | 'completed';
    summary: { waiting: number; completed: number };
    filters: { search: string; service_unit: string; date: string };
    serviceUnits: Array<{ uuid: string; name: string }>;
    today: string;
    timezone: string;
}) {
    const filtered = Boolean(filters.search || filters.service_unit);
    const timeFormat = useMemo(
        () =>
            new Intl.DateTimeFormat('id-ID', {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
                timeZone: timezone,
            }),
        [timezone],
    );

    return (
        <>
            <Head title="Pemeriksaan Awal" />
            <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-5 p-4 md:p-6">
                <PageHeader
                    eyebrow="Ruang perawat"
                    title="Pemeriksaan awal"
                    description="Catat kondisi awal pasien sebelum pemeriksaan dokter."
                />
                <section
                    className="bg-card min-w-0 overflow-hidden rounded-xl border"
                    aria-label="Daftar pemeriksaan awal"
                >
                    <nav
                        aria-label="Daftar pemeriksaan"
                        className="flex border-b px-4"
                    >
                        {(
                            [
                                {
                                    value: 'queue',
                                    label: 'Menunggu',
                                    count: summary.waiting,
                                    icon: Clock3,
                                },
                                {
                                    value: 'completed',
                                    label: 'Selesai',
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
                                preserveState
                                preserveScroll
                                aria-current={
                                    mode === tab.value ? 'page' : undefined
                                }
                                className={cn(
                                    'focus-visible:ring-ring -mb-px flex min-w-0 items-center justify-center gap-2 border-b-2 px-3 py-3.5 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none sm:px-4',
                                    mode === tab.value
                                        ? 'border-primary text-foreground'
                                        : 'text-muted-foreground hover:text-foreground border-transparent',
                                )}
                            >
                                <tab.icon className="hidden size-4 sm:block" />
                                {tab.label}
                                <span
                                    className={cn(
                                        'rounded-md px-1.5 py-0.5 text-xs tabular-nums',
                                        mode === tab.value
                                            ? 'bg-primary/10 text-primary'
                                            : 'bg-muted',
                                    )}
                                >
                                    {tab.count}
                                </span>
                            </Link>
                        ))}
                    </nav>
                    <WorklistFilters
                        key={JSON.stringify([mode, filters])}
                        action={index.url()}
                        resetUrl={index.url({ query: { mode } })}
                        filters={{ ...filters, mode }}
                        today={today}
                        serviceUnits={serviceUnits}
                        only={listProps}
                        dateLabel={
                            mode === 'completed'
                                ? 'Tanggal pemeriksaan selesai'
                                : undefined
                        }
                    />
                    <div className="text-muted-foreground flex items-center justify-between gap-3 border-b px-4 py-3 text-xs">
                        <h2 className="text-foreground font-medium">
                            {encounters.total} pasien
                        </h2>
                        <span>
                            {mode === 'queue'
                                ? 'Antrean aktif'
                                : filters.date === today
                                  ? 'Selesai hari ini'
                                  : 'Riwayat pemeriksaan'}
                        </span>
                    </div>
                    {encounters.data.length === 0 ? (
                        <EmptyState
                            icon={mode === 'queue' ? Clock3 : CheckCircle2}
                            title={
                                filtered
                                    ? 'Pasien tidak ditemukan'
                                    : mode === 'queue'
                                      ? 'Antrean kosong'
                                      : 'Belum ada hasil pemeriksaan'
                            }
                            description={
                                filtered
                                    ? 'Coba kata kunci atau filter lain.'
                                    : mode === 'queue'
                                      ? 'Pasien yang menunggu pemeriksaan akan tampil di sini.'
                                      : 'Tidak ada pemeriksaan selesai pada tanggal ini.'
                            }
                            className="rounded-none border-0"
                        />
                    ) : (
                        <>
                            <div className="divide-y">
                                {encounters.data.map((encounter) => (
                                    <article
                                        key={encounter.uuid}
                                        className="hover:bg-muted/25 grid grid-cols-[3.5rem_minmax(0,1fr)] items-start gap-x-3 gap-y-3 p-4 transition-colors lg:grid-cols-[4rem_minmax(0,1.4fr)_minmax(0,1fr)_auto] lg:gap-5"
                                    >
                                        <div className="row-span-2 lg:row-span-1">
                                            <span className="sr-only">
                                                Antrean{' '}
                                            </span>
                                            <p className="bg-muted/60 rounded-md px-1 py-2 text-center text-sm font-semibold tabular-nums">
                                                {encounter.queue_number}
                                            </p>
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <h3 className="text-sm font-semibold break-words">
                                                    {encounter.patient.name}
                                                </h3>
                                                {encounter.triage_status ===
                                                    'draft' && (
                                                    <Badge
                                                        variant="outline"
                                                        className="text-muted-foreground text-[11px] font-normal"
                                                    >
                                                        Draft
                                                    </Badge>
                                                )}
                                            </div>
                                            <p className="text-muted-foreground mt-1 text-xs">
                                                {
                                                    encounter.patient
                                                        .medical_record_number
                                                }{' '}
                                                ·{' '}
                                                {encounter.patient.gender ===
                                                'male'
                                                    ? 'Laki-laki'
                                                    : 'Perempuan'}
                                            </p>
                                            <p className="mt-2 line-clamp-2 text-sm break-words">
                                                {encounter.chief_complaint ||
                                                    'Keluhan belum dicatat'}
                                            </p>
                                            {encounter.patient.allergies
                                                .length > 0 && (
                                                <p className="mt-2 flex items-start gap-1.5 text-xs font-medium text-amber-800 dark:text-amber-300">
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
                                            <p className="text-xs font-medium break-words">
                                                {encounter.service_unit}
                                            </p>
                                            <p className="text-muted-foreground mt-1 text-xs break-words">
                                                {encounter.practitioner}
                                            </p>
                                            <p className="text-muted-foreground mt-2 text-xs tabular-nums">
                                                {mode === 'completed' &&
                                                encounter.completed_at
                                                    ? 'Selesai '
                                                    : 'Daftar '}
                                                {timeFormat.format(
                                                    new Date(
                                                        mode === 'completed' &&
                                                            encounter.completed_at
                                                            ? encounter.completed_at
                                                            : encounter.registered_at,
                                                    ),
                                                )}
                                            </p>
                                        </div>
                                        <Button
                                            asChild
                                            size="sm"
                                            variant={
                                                mode === 'queue'
                                                    ? 'default'
                                                    : 'outline'
                                            }
                                            className="col-start-2 h-9 justify-self-start lg:col-start-auto"
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
                            <div className="flex flex-col gap-3 border-t p-4 sm:flex-row sm:items-center sm:justify-between">
                                <p className="text-muted-foreground text-xs">
                                    Menampilkan {encounters.from ?? 0}–
                                    {encounters.to ?? 0} dari {encounters.total}{' '}
                                    pasien
                                </p>
                                <PaginationLinks
                                    links={encounters.links}
                                    only={listProps}
                                    preserveState
                                />
                            </div>
                        </>
                    )}
                </section>
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
