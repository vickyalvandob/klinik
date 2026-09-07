import { Head, router, useForm, usePoll } from '@inertiajs/react';
import {
    ArrowRight,
    Clock3,
    Megaphone,
    Monitor,
    Radio,
    RotateCcw,
    UsersRound,
} from 'lucide-react';
import { useState } from 'react';
import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';
import { PaginationLinks } from '@/components/pagination-links';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { display, index } from '@/routes/queues';
import { store } from '@/routes/queues/calls';
import type { Paginator } from '@/types';

type Queue = {
    uuid: string;
    number: string;
    patient_name: string;
    medical_record_number: string;
    status: 'waiting' | 'called';
    called_at: string | null;
};
type Filters = { service_unit: string; stage: 'triage' | 'doctor' };
type RecentCall = {
    uuid: string;
    queue_number: string;
    destination: string;
    created_at: string;
};

export default function QueueIndex({
    queues,
    summary,
    recentCalls,
    serviceUnits,
    filters,
    canCall,
    today,
    timezone,
}: {
    queues: Paginator<Queue>;
    summary: { waiting: number; called: number };
    recentCalls: RecentCall[];
    serviceUnits: { uuid: string; name: string }[];
    filters: Filters;
    canCall: boolean;
    today: string;
    timezone: string;
}) {
    const form = useForm({});
    const [filtering, setFiltering] = useState(false);
    const [pendingNumber, setPendingNumber] = useState<string | null>(null);
    const { start, stop } = usePoll(
        5000,
        { only: ['queues', 'summary', 'recentCalls', 'today'] },
        { mode: 'rest' },
    );
    const unitName = serviceUnits.find(
        (unit) => unit.uuid === filters.service_unit,
    )?.name;
    const changeFilter = (changes: Partial<Filters>) => {
        stop();
        router.get(
            index.url(),
            { ...filters, ...changes },
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
                onStart: () => setFiltering(true),
                onFinish: () => {
                    setFiltering(false);
                    start();
                },
            },
        );
    };
    const call = (queue?: Queue) => {
        if (form.processing || filtering) return;
        stop();
        setPendingNumber(queue?.uuid ?? 'next');
        form.transform(() => ({
            service_unit_id: filters.service_unit,
            stage: filters.stage,
            queue_id: queue?.uuid ?? null,
            intent: queue?.status === 'called' ? 'recall' : 'call',
            request_key: crypto.randomUUID(),
        }));
        form.post(store.url(), {
            preserveScroll: true,
            onFinish: () => {
                setPendingNumber(null);
                start();
            },
        });
    };
    const busy = form.processing || filtering;
    const formatTime = (value: string) =>
        new Intl.DateTimeFormat('id-ID', {
            hour: '2-digit',
            minute: '2-digit',
            timeZone: timezone,
        }).format(new Date(value));

    return (
        <>
            <Head title="Antrean" />
            <div className="flex flex-1 flex-col gap-5 p-4 md:p-6">
                <PageHeader
                    eyebrow="Pelayanan hari ini"
                    title="Antrean"
                    description="Panggil pasien sesuai urutan dan arahkan ke layanan yang dituju."
                    actions={
                        <Button
                            asChild
                            variant="outline"
                            className="w-full sm:w-auto"
                        >
                            <a
                                href={display.url()}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                <Monitor /> Layar Antrean{' '}
                                <ArrowRight className="size-3.5" />
                            </a>
                        </Button>
                    }
                />
                <div className="grid items-start gap-5 xl:grid-cols-[19rem_minmax(0,1fr)]">
                    <aside className="grid min-w-0 gap-4">
                        <section className="bg-card grid gap-5 rounded-xl border p-4 sm:p-5">
                            <div className="flex items-center gap-2 text-sm font-semibold">
                                <Radio className="text-primary size-4" />{' '}
                                Pemanggilan
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="queue-unit">Unit layanan</Label>
                                <Select
                                    value={filters.service_unit}
                                    onValueChange={(value) =>
                                        changeFilter({ service_unit: value })
                                    }
                                    disabled={busy || serviceUnits.length === 0}
                                >
                                    <SelectTrigger
                                        id="queue-unit"
                                        className="w-full"
                                    >
                                        <SelectValue placeholder="Belum ada unit" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {serviceUnits.map((unit) => (
                                            <SelectItem
                                                key={unit.uuid}
                                                value={unit.uuid}
                                            >
                                                {unit.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="queue-stage">
                                    Tujuan panggilan
                                </Label>
                                <Select
                                    value={filters.stage}
                                    onValueChange={(value) =>
                                        changeFilter({
                                            stage: value as Filters['stage'],
                                        })
                                    }
                                    disabled={busy}
                                >
                                    <SelectTrigger
                                        id="queue-stage"
                                        className="w-full"
                                    >
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="triage">
                                            Pemeriksaan Awal
                                        </SelectItem>
                                        <SelectItem value="doctor">
                                            Pemeriksaan Dokter
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="bg-primary/5 border-primary/15 grid grid-cols-2 divide-x rounded-lg border py-4 text-center">
                                <div>
                                    <p className="text-primary text-3xl font-semibold tabular-nums">
                                        {summary.waiting}
                                    </p>
                                    <p className="text-muted-foreground mt-1 text-xs">
                                        Menunggu
                                    </p>
                                </div>
                                <div>
                                    <p className="text-3xl font-semibold tabular-nums">
                                        {summary.called}
                                    </p>
                                    <p className="text-muted-foreground mt-1 text-xs">
                                        Sudah dipanggil
                                    </p>
                                </div>
                            </div>
                            {canCall ? (
                                <Button
                                    className="min-h-11 w-full"
                                    disabled={
                                        busy ||
                                        !filters.service_unit ||
                                        summary.waiting === 0
                                    }
                                    onClick={() => call()}
                                >
                                    {pendingNumber === 'next' ? (
                                        <Spinner />
                                    ) : (
                                        <Megaphone />
                                    )}{' '}
                                    Panggil Berikutnya
                                </Button>
                            ) : (
                                <p className="text-muted-foreground text-xs">
                                    Akun ini memiliki akses untuk melihat
                                    antrean.
                                </p>
                            )}
                            <p className="text-muted-foreground text-xs leading-relaxed">
                                Nomor tampil di layar antrean. Aktifkan suara
                                pada perangkat monitor untuk pengumuman
                                otomatis.
                            </p>
                        </section>
                        <section className="bg-card rounded-xl border p-4 sm:p-5">
                            <h2 className="flex items-center gap-2 text-sm font-semibold">
                                <Clock3 className="text-muted-foreground size-4" />{' '}
                                Panggilan Terakhir
                            </h2>
                            {recentCalls.length === 0 ? (
                                <p className="text-muted-foreground mt-4 text-xs">
                                    Belum ada pemanggilan hari ini.
                                </p>
                            ) : (
                                <ol className="mt-4 grid gap-4">
                                    {recentCalls.map((recent) => (
                                        <li
                                            key={recent.uuid}
                                            className="flex items-start gap-3"
                                        >
                                            <span className="bg-muted rounded-md px-2 py-1 font-mono text-sm font-semibold">
                                                {recent.queue_number}
                                            </span>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-xs leading-relaxed">
                                                    {recent.destination}
                                                </p>
                                                <p className="text-muted-foreground mt-1 text-xs">
                                                    {formatTime(
                                                        recent.created_at,
                                                    )}
                                                </p>
                                            </div>
                                        </li>
                                    ))}
                                </ol>
                            )}
                        </section>
                    </aside>
                    <section
                        className="bg-card min-w-0 overflow-hidden rounded-xl border"
                        aria-busy={filtering}
                    >
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4 sm:p-5">
                            <div>
                                <h2 className="font-semibold">
                                    {unitName ?? 'Daftar Antrean'}
                                </h2>
                                <p className="text-muted-foreground mt-1 text-xs">
                                    {filters.stage === 'triage'
                                        ? 'Pemeriksaan awal'
                                        : 'Pemeriksaan dokter'}{' '}
                                    ·{' '}
                                    {new Intl.DateTimeFormat('id-ID', {
                                        dateStyle: 'long',
                                    }).format(new Date(today + 'T12:00:00'))}
                                </p>
                            </div>
                            <Badge variant="outline" className="gap-1.5">
                                <span className="size-1.5 rounded-full bg-emerald-500" />{' '}
                                Otomatis diperbarui
                            </Badge>
                        </div>
                        {queues.data.length === 0 ? (
                            <EmptyState
                                icon={UsersRound}
                                title="Tidak ada antrean menunggu"
                                description="Antrean akan muncul setelah pasien didaftarkan atau diteruskan ke tahap ini."
                                className="rounded-none border-0"
                            />
                        ) : (
                            <div className="divide-y">
                                {queues.data.map((queue) => (
                                    <article
                                        key={queue.uuid}
                                        className="flex flex-wrap items-center gap-3 p-4 sm:gap-4 sm:p-5"
                                    >
                                        <div
                                            className={
                                                queue.status === 'called'
                                                    ? 'border-primary/20 bg-primary/5 text-primary grid h-14 w-20 shrink-0 place-items-center rounded-lg border font-mono text-xl font-semibold'
                                                    : 'bg-muted/40 grid h-14 w-20 shrink-0 place-items-center rounded-lg border font-mono text-xl font-semibold'
                                            }
                                        >
                                            {queue.number}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="font-medium break-words">
                                                {queue.patient_name}
                                            </p>
                                            <p className="text-muted-foreground mt-1 text-xs">
                                                RM {queue.medical_record_number}
                                            </p>
                                            <p className="text-muted-foreground mt-1 text-xs">
                                                {queue.called_at
                                                    ? 'Dipanggil pukul ' +
                                                      formatTime(
                                                          queue.called_at,
                                                      )
                                                    : 'Menunggu panggilan'}
                                            </p>
                                        </div>
                                        {canCall && (
                                            <Button
                                                variant={
                                                    queue.status === 'called'
                                                        ? 'outline'
                                                        : 'secondary'
                                                }
                                                className="min-h-10 w-full sm:w-auto"
                                                disabled={busy}
                                                onClick={() => call(queue)}
                                            >
                                                {pendingNumber ===
                                                queue.uuid ? (
                                                    <Spinner />
                                                ) : queue.status ===
                                                  'called' ? (
                                                    <RotateCcw />
                                                ) : (
                                                    <Megaphone />
                                                )}
                                                {queue.status === 'called'
                                                    ? 'Panggil Ulang'
                                                    : 'Panggil'}
                                                <span className="sr-only">
                                                    {' '}
                                                    {queue.number}
                                                </span>
                                            </Button>
                                        )}
                                    </article>
                                ))}
                            </div>
                        )}
                        {queues.links.length > 3 && (
                            <div className="border-t p-4">
                                <PaginationLinks links={queues.links} />
                            </div>
                        )}
                    </section>
                </div>
            </div>
        </>
    );
}
