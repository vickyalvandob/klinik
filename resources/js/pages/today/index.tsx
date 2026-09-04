import { Form, Head, Link, useForm } from '@inertiajs/react';
import {
    Activity,
    CalendarDays,
    CheckCircle2,
    Clock3,
    Plus,
    Search,
    Stethoscope,
    UserRound,
    X,
} from 'lucide-react';
import { useState } from 'react';
import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';
import {
    PaginationLinks,
    type PaginationLink,
} from '@/components/pagination-links';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { dashboard } from '@/routes';
import { store as cancelEncounter } from '@/routes/encounters/cancellations';
import { show as showPatient } from '@/routes/patients';
import { create as createRegistration } from '@/routes/registrations';
import { edit as editTriage } from '@/routes/triages';
import type { TodayEncounter } from '@/types';

type TodayPagination = {
    data: TodayEncounter[];
    links: PaginationLink[];
    from: number | null;
    to: number | null;
    total: number;
};

export default function TodayIndex({
    encounters,
    summary,
    filters,
    statusOptions,
    serviceUnits,
    can,
}: {
    encounters: TodayPagination;
    summary: {
        total: number;
        waiting: number;
        in_service: number;
        completed: number;
    };
    filters: { search: string; status: string; service_unit: string };
    statusOptions: Array<{ value: string; label: string }>;
    serviceUnits: Array<{ uuid: string; name: string }>;
    can: { create: boolean };
}) {
    const [cancelTarget, setCancelTarget] = useState<TodayEncounter | null>(
        null,
    );
    const cancelForm = useForm({ reason: '' });
    const hasFilters = Object.values(filters).some((value) => value !== '');

    return (
        <>
            <Head title="Hari Ini" />
            <div className="flex flex-1 flex-col gap-5 p-4 md:p-6">
                <PageHeader
                    eyebrow={new Intl.DateTimeFormat('id-ID', {
                        dateStyle: 'full',
                        timeZone: 'Asia/Jakarta',
                    }).format(new Date())}
                    title="Hari Ini"
                    description="Pantau pasien dari pendaftaran sampai pelayanan berikutnya dalam satu daftar kerja."
                    actions={
                        can.create ? (
                            <Button asChild>
                                <Link href={createRegistration()}>
                                    <Plus /> Daftar Pasien
                                </Link>
                            </Button>
                        ) : undefined
                    }
                />

                <section
                    className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
                    aria-label="Ringkasan kunjungan hari ini"
                >
                    <Metric
                        label="Total kunjungan"
                        value={summary.total}
                        icon={CalendarDays}
                    />
                    <Metric
                        label="Menunggu"
                        value={summary.waiting}
                        icon={Clock3}
                    />
                    <Metric
                        label="Diperiksa"
                        value={summary.in_service}
                        icon={Stethoscope}
                    />
                    <Metric
                        label="Selesai"
                        value={summary.completed}
                        icon={CheckCircle2}
                    />
                </section>

                <section className="bg-card rounded-xl border">
                    <div className="border-b p-4 md:p-5">
                        <Form
                            {...dashboard.form()}
                            className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_13rem_13rem_auto]"
                        >
                            <div className="relative">
                                <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                                <Input
                                    name="search"
                                    defaultValue={filters.search}
                                    className="pl-9"
                                    placeholder="Cari pasien, RM, antrean..."
                                    aria-label="Cari kunjungan"
                                />
                            </div>
                            <select
                                name="status"
                                defaultValue={filters.status}
                                className={selectClassName}
                                aria-label="Filter status"
                            >
                                <option value="">Semua status</option>
                                {statusOptions.map((status) => (
                                    <option
                                        key={status.value}
                                        value={status.value}
                                    >
                                        {status.label}
                                    </option>
                                ))}
                            </select>
                            <select
                                name="service_unit"
                                defaultValue={filters.service_unit}
                                className={selectClassName}
                                aria-label="Filter unit layanan"
                            >
                                <option value="">Semua unit</option>
                                {serviceUnits.map((unit) => (
                                    <option key={unit.uuid} value={unit.uuid}>
                                        {unit.name}
                                    </option>
                                ))}
                            </select>
                            <div className="flex gap-2">
                                <Button
                                    type="submit"
                                    className="flex-1 lg:flex-none"
                                >
                                    Terapkan
                                </Button>
                                {hasFilters && (
                                    <Button asChild variant="ghost" size="icon">
                                        <Link
                                            href={dashboard()}
                                            aria-label="Reset filter"
                                        >
                                            <X />
                                        </Link>
                                    </Button>
                                )}
                            </div>
                        </Form>
                    </div>

                    {encounters.data.length === 0 ? (
                        <EmptyState
                            icon={Activity}
                            title={
                                hasFilters
                                    ? 'Kunjungan tidak ditemukan'
                                    : 'Belum ada pasien hari ini'
                            }
                            description={
                                hasFilters
                                    ? 'Ubah pencarian atau reset filter untuk melihat antrean lain.'
                                    : 'Daftarkan pasien agar langsung masuk ke alur pelayanan klinik.'
                            }
                            className="rounded-none border-0"
                            action={
                                can.create && !hasFilters ? (
                                    <Button asChild variant="outline">
                                        <Link href={createRegistration()}>
                                            <Plus /> Daftar Pasien
                                        </Link>
                                    </Button>
                                ) : undefined
                            }
                        />
                    ) : (
                        <>
                            <div className="grid divide-y">
                                {encounters.data.map((encounter) => (
                                    <EncounterRow
                                        key={encounter.uuid}
                                        encounter={encounter}
                                        onCancel={() => {
                                            cancelForm.reset();
                                            cancelForm.clearErrors();
                                            setCancelTarget(encounter);
                                        }}
                                    />
                                ))}
                            </div>
                            <div className="flex flex-col gap-3 border-t p-4 sm:flex-row sm:items-center sm:justify-between">
                                <p className="text-muted-foreground text-xs">
                                    Menampilkan {encounters.from ?? 0}–
                                    {encounters.to ?? 0} dari {encounters.total}{' '}
                                    kunjungan
                                </p>
                                <PaginationLinks links={encounters.links} />
                            </div>
                        </>
                    )}
                </section>
            </div>

            <Dialog
                open={cancelTarget !== null}
                onOpenChange={(open) => {
                    if (!open && !cancelForm.processing) {
                        setCancelTarget(null);
                    }
                }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Batalkan kunjungan?</DialogTitle>
                        <DialogDescription>
                            {cancelTarget
                                ? `${cancelTarget.patient.name} (${cancelTarget.queue.number}) akan dikeluarkan dari antrean. Tindakan ini tercatat.`
                                : ''}
                        </DialogDescription>
                    </DialogHeader>
                    <form
                        className="grid gap-4"
                        onSubmit={(event) => {
                            event.preventDefault();
                            if (!cancelTarget) return;
                            cancelForm.submit(
                                cancelEncounter(cancelTarget.uuid),
                                {
                                    preserveScroll: true,
                                    onSuccess: () => setCancelTarget(null),
                                },
                            );
                        }}
                    >
                        <div className="grid gap-2">
                            <label
                                htmlFor="cancellation-reason"
                                className="text-sm font-medium"
                            >
                                Alasan pembatalan
                            </label>
                            <textarea
                                id="cancellation-reason"
                                value={cancelForm.data.reason}
                                onChange={(event) =>
                                    cancelForm.setData(
                                        'reason',
                                        event.target.value,
                                    )
                                }
                                rows={4}
                                className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 w-full resize-y rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-[3px]"
                                autoFocus
                            />
                            {cancelForm.errors.reason && (
                                <p
                                    className="text-destructive text-xs"
                                    role="alert"
                                >
                                    {cancelForm.errors.reason}
                                </p>
                            )}
                        </div>
                        <DialogFooter>
                            <DialogClose asChild>
                                <Button
                                    type="button"
                                    variant="outline"
                                    disabled={cancelForm.processing}
                                >
                                    Kembali
                                </Button>
                            </DialogClose>
                            <Button
                                type="submit"
                                variant="destructive"
                                disabled={cancelForm.processing}
                            >
                                {cancelForm.processing && <Spinner />}
                                Batalkan kunjungan
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
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
                <Icon className="text-primary size-4" aria-hidden="true" />
            </div>
            <p className="mt-3 text-2xl font-semibold">{value}</p>
        </div>
    );
}

function EncounterRow({
    encounter,
    onCancel,
}: {
    encounter: TodayEncounter;
    onCancel: () => void;
}) {
    return (
        <article className="grid gap-4 p-4 md:p-5 lg:grid-cols-[6rem_minmax(0,1.5fr)_minmax(0,1fr)_10rem_auto] lg:items-center">
            <div>
                <p className="text-primary font-mono text-xl font-semibold">
                    {encounter.queue.number}
                </p>
                <p className="text-muted-foreground mt-1 text-xs">
                    {formatTime(encounter.registered_at)}
                </p>
            </div>
            <div className="min-w-0">
                <Link
                    href={showPatient(encounter.patient.uuid)}
                    className="hover:text-primary truncate font-medium underline-offset-4 hover:underline"
                >
                    {encounter.patient.name}
                </Link>
                <p className="text-muted-foreground mt-1 text-xs">
                    {encounter.patient.medical_record_number} ·{' '}
                    {age(encounter.patient.birth_date)} th ·{' '}
                    {encounter.patient.gender === 'male' ? 'L' : 'P'}
                </p>
                <p className="text-muted-foreground mt-2 line-clamp-1 text-xs">
                    {encounter.chief_complaint}
                </p>
            </div>
            <div>
                <p className="text-sm font-medium">
                    {encounter.practitioner.name}
                </p>
                <p className="text-muted-foreground mt-1 text-xs">
                    {encounter.service_unit.name}
                </p>
            </div>
            <div className="grid gap-1">
                <Badge
                    variant="outline"
                    className={statusClass(encounter.status.tone)}
                >
                    {encounter.status.label}
                </Badge>
                <p className="text-muted-foreground text-xs">
                    {waitingTime(encounter.registered_at)}
                </p>
            </div>
            <div className="flex flex-wrap gap-2 lg:justify-end">
                {encounter.can_triage && (
                    <Button asChild size="sm">
                        <Link href={editTriage(encounter.uuid)}>
                            <Activity /> Periksa
                        </Link>
                    </Button>
                )}
                {!encounter.can_triage && (
                    <Button asChild size="sm" variant="outline">
                        <Link href={showPatient(encounter.patient.uuid)}>
                            <UserRound /> Buka
                        </Link>
                    </Button>
                )}
                {encounter.can_cancel && (
                    <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={onCancel}
                    >
                        Batalkan
                    </Button>
                )}
            </div>
        </article>
    );
}

function statusClass(tone: string) {
    return {
        amber: 'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300',
        blue: 'border-blue-300 bg-blue-50 text-blue-800 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-300',
        violet: 'border-violet-300 bg-violet-50 text-violet-800 dark:border-violet-900 dark:bg-violet-950/30 dark:text-violet-300',
        emerald:
            'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300',
        red: 'border-red-300 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300',
    }[tone];
}

function formatTime(value: string) {
    return new Intl.DateTimeFormat('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
    }).format(new Date(value));
}

function age(birthDate: string) {
    const birth = new Date(`${birthDate}T00:00:00`);
    const now = new Date();
    let years = now.getFullYear() - birth.getFullYear();
    if (
        now.getMonth() < birth.getMonth() ||
        (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())
    ) {
        years--;
    }
    return years;
}

function waitingTime(value: string) {
    const minutes = Math.max(
        0,
        Math.floor((Date.now() - new Date(value).getTime()) / 60000),
    );
    if (minutes < 60) return `${minutes} menit`;
    return `${Math.floor(minutes / 60)}j ${minutes % 60}m`;
}

const selectClassName =
    'border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 h-9 w-full rounded-md border px-3 text-sm outline-none focus-visible:ring-[3px]';

TodayIndex.layout = {
    breadcrumbs: [{ title: 'Hari Ini', href: dashboard() }],
};
