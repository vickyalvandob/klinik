import { Head, Link } from '@inertiajs/react';
import { Activity, AlertTriangle, CheckCircle2, Clock3 } from 'lucide-react';
import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';
import { PaginationLinks } from '@/components/pagination-links';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { dashboard } from '@/routes';
import { edit, index } from '@/routes/triages';
import type { Paginator, TriageQueueEncounter } from '@/types';

export default function TriageIndex({
    encounters,
    mode,
    summary,
}: {
    encounters: Paginator<TriageQueueEncounter>;
    mode: 'queue' | 'completed';
    summary: { waiting: number; completed: number };
}) {
    return (
        <>
            <Head title="Pemeriksaan Awal" />
            <div className="flex flex-1 flex-col gap-5 p-4 md:p-6">
                <PageHeader
                    eyebrow="Antrean perawat"
                    title="Pemeriksaan Awal"
                    description="Catat keluhan dan tanda vital, simpan draft bila perlu, lalu kirim pasien ke dokter."
                />

                <section className="grid gap-3 sm:grid-cols-2">
                    <Metric
                        label="Menunggu"
                        value={summary.waiting}
                        icon={Clock3}
                    />
                    <Metric
                        label="Selesai hari ini"
                        value={summary.completed}
                        icon={CheckCircle2}
                    />
                </section>

                <section className="bg-card rounded-xl border">
                    <div className="flex flex-wrap gap-2 border-b p-4">
                        <Button
                            asChild
                            size="sm"
                            variant={mode === 'queue' ? 'default' : 'outline'}
                        >
                            <Link href={index({ query: { mode: 'queue' } })}>
                                Antrean ({summary.waiting})
                            </Link>
                        </Button>
                        <Button
                            asChild
                            size="sm"
                            variant={
                                mode === 'completed' ? 'default' : 'outline'
                            }
                        >
                            <Link
                                href={index({ query: { mode: 'completed' } })}
                            >
                                Selesai ({summary.completed})
                            </Link>
                        </Button>
                    </div>

                    {encounters.data.length === 0 ? (
                        <EmptyState
                            icon={mode === 'queue' ? Clock3 : CheckCircle2}
                            title={
                                mode === 'queue'
                                    ? 'Tidak ada pasien menunggu'
                                    : 'Belum ada pemeriksaan selesai hari ini'
                            }
                            description={
                                mode === 'queue'
                                    ? 'Pasien baru akan muncul otomatis setelah pendaftaran.'
                                    : 'Pemeriksaan yang diselesaikan akan tetap dapat ditinjau di sini.'
                            }
                            className="rounded-none border-0"
                        />
                    ) : (
                        <>
                            <div className="grid divide-y">
                                {encounters.data.map((encounter) => (
                                    <article
                                        key={encounter.uuid}
                                        className="grid gap-4 p-4 md:p-5 lg:grid-cols-[6rem_minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-center"
                                    >
                                        <div>
                                            <p className="text-primary font-mono text-xl font-semibold">
                                                {encounter.queue_number}
                                            </p>
                                            <p className="text-muted-foreground mt-1 text-xs">
                                                {formatTime(
                                                    encounter.registered_at,
                                                )}
                                            </p>
                                        </div>
                                        <div className="min-w-0">
                                            <p className="truncate font-medium">
                                                {encounter.patient.name}
                                            </p>
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
                                            {encounter.patient.allergies
                                                .length > 0 && (
                                                <p className="mt-2 flex items-center gap-1 text-xs font-medium text-amber-700 dark:text-amber-400">
                                                    <AlertTriangle className="size-3.5" />
                                                    Alergi:{' '}
                                                    {encounter.patient.allergies.join(
                                                        ', ',
                                                    )}
                                                </p>
                                            )}
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium">
                                                {encounter.service_unit} ·{' '}
                                                {encounter.practitioner}
                                            </p>
                                            <p className="text-muted-foreground mt-1 line-clamp-2 text-xs">
                                                {encounter.chief_complaint}
                                            </p>
                                            {encounter.triage_status ===
                                                'draft' && (
                                                <Badge
                                                    variant="outline"
                                                    className="mt-2"
                                                >
                                                    Draft tersimpan
                                                </Badge>
                                            )}
                                        </div>
                                        <Button
                                            asChild
                                            size="sm"
                                            variant={
                                                mode === 'queue'
                                                    ? 'default'
                                                    : 'outline'
                                            }
                                        >
                                            <Link href={edit(encounter.uuid)}>
                                                <Activity />
                                                {mode === 'queue'
                                                    ? encounter.triage_status ===
                                                      'draft'
                                                        ? 'Lanjutkan'
                                                        : 'Periksa'
                                                    : 'Tinjau'}
                                            </Link>
                                        </Button>
                                    </article>
                                ))}
                            </div>
                            <div className="border-t p-4">
                                <PaginationLinks links={encounters.links} />
                            </div>
                        </>
                    )}
                </section>
            </div>
        </>
    );
}

function Metric({
    label,
    value,
    icon: Icon,
}: {
    label: string;
    value: number;
    icon: typeof Activity;
}) {
    return (
        <div className="bg-card rounded-lg border p-4">
            <div className="flex items-center justify-between gap-3">
                <p className="text-muted-foreground text-sm">{label}</p>
                <Icon className="text-primary size-4" />
            </div>
            <p className="mt-3 text-2xl font-semibold">{value}</p>
        </div>
    );
}

function formatTime(value: string) {
    return new Intl.DateTimeFormat('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
    }).format(new Date(value));
}

TriageIndex.layout = {
    breadcrumbs: [
        { title: 'Hari Ini', href: dashboard() },
        { title: 'Pemeriksaan Awal', href: index() },
    ],
};
