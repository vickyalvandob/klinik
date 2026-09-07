import { Form, Head, Link, useForm } from '@inertiajs/react';
import {
    Activity,
    Plus,
    MoreHorizontal,
    SlidersHorizontal,
    Search,
    UserRound,
    Printer,
    X,
} from 'lucide-react';
import { useState } from 'react';
import {
    RegistrationForm,
    type RegistrationFormData,
} from '@/components/registration-form';
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
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import {
    index as registrationIndex,
    ticket as registrationTicket,
} from '@/routes/registrations';
import { store as cancelEncounter } from '@/routes/encounters/cancellations';
import { show as showPatient } from '@/routes/patients';
import { edit as editTriage } from '@/routes/triages';
import type { TodayEncounter } from '@/types';

type TodayPagination = {
    data: TodayEncounter[];
    links: PaginationLink[];
    from: number | null;
    to: number | null;
    total: number;
};

export default function RegistrationIndex({
    encounters,
    registration,
    summary,
    filters,
    statusOptions,
    serviceUnits,
    can,
    today,
    timezone,
}: {
    encounters: TodayPagination;
    registration: RegistrationFormData | null;
    summary: {
        total: number;
        waiting: number;
        in_service: number;
        completed: number;
    };
    filters: {
        search: string;
        status: string;
        service_unit: string;
        date: string;
    };
    statusOptions: Array<{ value: string; label: string }>;
    serviceUnits: Array<{ uuid: string; name: string }>;
    can: { create: boolean; view_patient: boolean };
    today: string;
    timezone: string;
}) {
    const [cancelTarget, setCancelTarget] = useState<TodayEncounter | null>(
        null,
    );
    const [formOpen, setFormOpen] = useState(
        Boolean(registration?.initialPatient),
    );
    const [filtersOpen, setFiltersOpen] = useState(
        Boolean(filters.status || filters.service_unit),
    );
    const canRegister = can.create && registration !== null;
    const cancelForm = useForm({ reason: '' });
    const hasFilters =
        filters.search !== '' ||
        filters.status !== '' ||
        filters.service_unit !== '' ||
        filters.date !== today;

    return (
        <>
            <Head title="Pendaftaran" />
            <div className="flex flex-1 flex-col gap-5 p-4 md:p-6">
                <PageHeader
                    title="Pendaftaran"
                    description={new Intl.DateTimeFormat('id-ID', {
                        dateStyle: 'full',
                    }).format(new Date(`${filters.date}T12:00:00`))}
                    actions={
                        canRegister && (
                            <Button
                                id="open-registration-form"
                                variant={formOpen ? 'secondary' : 'default'}
                                onClick={() => setFormOpen(!formOpen)}
                                aria-expanded={formOpen}
                                aria-controls="registration-form"
                            >
                                {formOpen ? <X /> : <Plus />}
                                {formOpen ? 'Tutup form' : 'Daftarkan pasien'}
                            </Button>
                        )
                    }
                />

                <dl
                    className="text-muted-foreground flex flex-wrap gap-x-5 gap-y-2 text-xs"
                    aria-label="Ringkasan kunjungan pada tanggal terpilih"
                >
                    <Metric label="Total" value={summary.total} />
                    <Metric
                        label="Menunggu"
                        value={summary.waiting}
                        tone="bg-amber-500"
                    />
                    <Metric
                        label="Diperiksa"
                        value={summary.in_service}
                        tone="bg-blue-500"
                    />
                    <Metric
                        label="Selesai"
                        value={summary.completed}
                        tone="bg-emerald-500"
                    />
                </dl>

                <div
                    className={cn(
                        'grid min-w-0 items-start gap-5',
                        formOpen &&
                            canRegister &&
                            'xl:grid-cols-[minmax(0,1fr)_22rem]',
                    )}
                >
                    <section
                        className="bg-card min-w-0 overflow-hidden rounded-xl border"
                        aria-labelledby="visit-list-heading"
                    >
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3 md:px-5">
                            <h2
                                id="visit-list-heading"
                                className="text-sm font-semibold"
                            >
                                Daftar kunjungan
                            </h2>
                            <p className="text-muted-foreground text-xs">
                                {filters.date === today
                                    ? 'Hari ini'
                                    : 'Riwayat kunjungan'}{' '}
                                · {encounters.total} kunjungan
                            </p>
                        </div>
                        <div className="border-b p-4">
                            <Form
                                key={JSON.stringify(filters)}
                                disableWhileProcessing
                                options={{
                                    only: ['encounters', 'summary', 'filters'],
                                    preserveState: true,
                                    preserveScroll: true,
                                    replace: true,
                                }}
                                {...registrationIndex.form()}
                                className="flex flex-wrap items-center gap-2"
                            >
                                {({ processing, errors }) => (
                                    <>
                                        <Input
                                            className="w-auto max-w-full"
                                            type="date"
                                            name="date"
                                            defaultValue={filters.date}
                                            aria-label="Tanggal kunjungan"
                                            required
                                        />
                                        <div className="relative order-first min-w-40 flex-1 basis-full sm:order-none sm:basis-auto">
                                            <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                                            <Input
                                                name="search"
                                                maxLength={100}
                                                defaultValue={filters.search}
                                                className="pl-9"
                                                placeholder="Cari pasien, RM, antrean..."
                                                aria-label="Cari kunjungan"
                                            />
                                        </div>
                                        <select
                                            name="status"
                                            hidden={!filtersOpen}
                                            defaultValue={filters.status}
                                            className={cn(
                                                selectClassName,
                                                'order-last sm:w-auto sm:flex-1',
                                            )}
                                            aria-label="Filter status"
                                        >
                                            <option value="">
                                                Semua status
                                            </option>
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
                                            hidden={!filtersOpen}
                                            defaultValue={filters.service_unit}
                                            className={cn(
                                                selectClassName,
                                                'order-last sm:w-auto sm:flex-1',
                                            )}
                                            aria-label="Filter unit layanan"
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
                                        <div className="flex gap-2">
                                            <Button
                                                type="button"
                                                variant={
                                                    filtersOpen
                                                        ? 'secondary'
                                                        : 'outline'
                                                }
                                                size="icon"
                                                onClick={() =>
                                                    setFiltersOpen(!filtersOpen)
                                                }
                                                aria-label="Filter tambahan"
                                                aria-expanded={filtersOpen}
                                                className="relative"
                                            >
                                                <SlidersHorizontal />
                                                {(filters.status ||
                                                    filters.service_unit) && (
                                                    <span className="bg-primary absolute top-1 right-1 size-1.5 rounded-full" />
                                                )}
                                            </Button>
                                            <Button
                                                type="submit"
                                                variant="outline"
                                                className="flex-1 lg:flex-none"
                                            >
                                                {processing ? (
                                                    <Spinner />
                                                ) : (
                                                    <Search />
                                                )}{' '}
                                                Cari
                                            </Button>
                                            {hasFilters && (
                                                <Button
                                                    asChild
                                                    variant="ghost"
                                                    size="icon"
                                                >
                                                    <Link
                                                        href={registrationIndex()}
                                                        only={[
                                                            'encounters',
                                                            'summary',
                                                            'filters',
                                                        ]}
                                                        preserveState
                                                        preserveScroll
                                                        aria-label="Reset filter"
                                                    >
                                                        <X />
                                                    </Link>
                                                </Button>
                                            )}
                                        </div>
                                        {Object.entries(errors).map(
                                            ([field, error]) => (
                                                <p
                                                    key={field}
                                                    role="alert"
                                                    className="text-destructive order-last w-full text-xs"
                                                >
                                                    {error}
                                                </p>
                                            ),
                                        )}
                                    </>
                                )}
                            </Form>
                        </div>

                        {encounters.data.length === 0 ? (
                            <EmptyState
                                icon={Activity}
                                title={
                                    hasFilters
                                        ? 'Kunjungan tidak ditemukan'
                                        : 'Belum ada kunjungan pada tanggal ini'
                                }
                                description={
                                    hasFilters
                                        ? 'Ubah pencarian atau reset filter untuk melihat antrean lain.'
                                        : 'Daftarkan pasien agar langsung masuk ke alur pelayanan klinik.'
                                }
                                className="rounded-none border-0"
                                action={
                                    canRegister && !hasFilters ? (
                                        <Button
                                            variant="outline"
                                            onClick={() => setFormOpen(true)}
                                        >
                                            <Plus /> Daftarkan pasien
                                        </Button>
                                    ) : undefined
                                }
                            />
                        ) : (
                            <>
                                <Table
                                    className="block md:table md:min-w-[600px]"
                                    aria-label="Daftar kunjungan pasien"
                                >
                                    <TableHeader className="bg-muted/35 hidden md:table-header-group">
                                        <TableRow className="hover:bg-transparent">
                                            <TableHead className="text-muted-foreground w-24 pl-4 text-xs">
                                                Antrean
                                            </TableHead>
                                            <TableHead className="text-muted-foreground text-xs">
                                                Pasien
                                            </TableHead>
                                            <TableHead className="text-muted-foreground text-xs">
                                                Layanan
                                            </TableHead>
                                            <TableHead className="text-muted-foreground text-xs">
                                                Status
                                            </TableHead>
                                            <TableHead className="text-muted-foreground w-28 pr-4 text-right text-xs">
                                                Aksi
                                            </TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody className="block md:table-row-group">
                                        {encounters.data.map((encounter) => (
                                            <EncounterRow
                                                key={encounter.uuid}
                                                encounter={encounter}
                                                canViewPatient={
                                                    can.view_patient
                                                }
                                                timezone={timezone}
                                                onCancel={() => {
                                                    cancelForm.reset();
                                                    cancelForm.clearErrors();
                                                    setCancelTarget(encounter);
                                                }}
                                            />
                                        ))}
                                    </TableBody>
                                </Table>
                                <div className="flex flex-col gap-3 border-t p-4 sm:flex-row sm:items-center sm:justify-between">
                                    <p className="text-muted-foreground text-xs">
                                        Menampilkan {encounters.from ?? 0}–
                                        {encounters.to ?? 0} dari{' '}
                                        {encounters.total} kunjungan
                                    </p>
                                    <PaginationLinks
                                        links={encounters.links}
                                        only={['encounters', 'filters']}
                                        preserveState
                                    />
                                </div>
                            </>
                        )}
                    </section>
                    {canRegister && registration && (
                        <RegistrationForm
                            {...registration}
                            panelOpen={formOpen}
                            onPanelOpenChange={(open) => {
                                setFormOpen(open);
                                if (!open)
                                    document
                                        .getElementById(
                                            'open-registration-form',
                                        )
                                        ?.focus();
                            }}
                        />
                    )}
                </div>
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
    tone,
}: {
    label: string;
    value: number;
    tone?: string;
}) {
    return (
        <div className="flex items-center gap-1.5">
            {tone && (
                <span
                    className={cn('size-1.5 rounded-full', tone)}
                    aria-hidden="true"
                />
            )}
            <dt>{label}</dt>
            <dd className="text-foreground font-medium tabular-nums">
                {value}
            </dd>
        </div>
    );
}

function EncounterRow({
    encounter,
    onCancel,
    canViewPatient,
    timezone,
}: {
    encounter: TodayEncounter;
    onCancel: () => void;
    canViewPatient: boolean;
    timezone: string;
}) {
    return (
        <TableRow className="grid grid-cols-[3.5rem_minmax(0,1fr)_auto] gap-x-3 gap-y-2 px-4 py-4 md:table-row md:p-0">
            <TableCell className="row-span-2 p-0 align-top md:py-4 md:pl-4">
                <p className="text-sm font-semibold tabular-nums">
                    {encounter.queue.number}
                </p>
                <p className="text-muted-foreground mt-1 text-[11px] tabular-nums">
                    {formatTime(encounter.registered_at, timezone)}
                </p>
            </TableCell>
            <TableCell className="min-w-0 p-0 whitespace-normal md:px-2 md:py-4">
                {canViewPatient ? (
                    <Link
                        href={showPatient(encounter.patient.uuid)}
                        className="hover:text-primary font-medium break-words underline-offset-4 hover:underline"
                    >
                        {encounter.patient.name}
                    </Link>
                ) : (
                    <p className="font-medium break-words">
                        {encounter.patient.name}
                    </p>
                )}
                <p className="text-muted-foreground mt-1 text-xs">
                    {encounter.patient.medical_record_number} ·{' '}
                    {age(encounter.patient.birth_date)} th ·{' '}
                    {encounter.patient.gender === 'male' ? 'L' : 'P'}
                </p>
            </TableCell>
            <TableCell className="col-start-2 min-w-0 p-0 whitespace-normal md:px-2 md:py-4">
                <p className="text-xs font-medium">
                    {encounter.service_unit.name}
                </p>
                <p className="text-muted-foreground mt-1 text-xs break-words">
                    {encounter.practitioner.name}
                </p>
            </TableCell>
            <TableCell className="col-span-2 col-start-2 p-0 whitespace-normal md:px-2 md:py-4">
                <Badge
                    variant="outline"
                    className={cn(
                        'max-w-full text-[11px] font-medium whitespace-normal',
                        statusClass(encounter.status.tone),
                    )}
                >
                    {encounter.status.label}
                </Badge>
            </TableCell>
            <TableCell className="col-start-3 row-span-2 row-start-1 p-0 md:py-4 md:pr-4">
                <div className="flex items-center justify-end gap-1">
                    {encounter.can_triage && (
                        <Button asChild size="sm" variant="outline">
                            <Link href={editTriage(encounter.uuid)}>
                                Periksa
                            </Link>
                        </Button>
                    )}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="size-9"
                                aria-label={`Tindakan kunjungan ${encounter.queue.number}`}
                            >
                                <MoreHorizontal />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                            {canViewPatient && (
                                <DropdownMenuItem asChild>
                                    <Link
                                        href={showPatient(
                                            encounter.patient.uuid,
                                        )}
                                    >
                                        <UserRound /> Lihat pasien
                                    </Link>
                                </DropdownMenuItem>
                            )}
                            <DropdownMenuItem asChild>
                                <Link href={registrationTicket(encounter.uuid)}>
                                    <Printer /> Cetak tiket
                                </Link>
                            </DropdownMenuItem>
                            {encounter.can_cancel && (
                                <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                        onSelect={onCancel}
                                        className="text-destructive focus:text-destructive"
                                    >
                                        <X /> Batalkan kunjungan
                                    </DropdownMenuItem>
                                </>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </TableCell>
        </TableRow>
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

function formatTime(value: string, timezone: string) {
    return new Intl.DateTimeFormat('id-ID', {
        timeZone: timezone,
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

const selectClassName =
    'border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 h-9 w-full rounded-md border px-3 text-sm outline-none focus-visible:ring-[3px]';

RegistrationIndex.layout = {
    breadcrumbs: [{ title: 'Pendaftaran', href: registrationIndex() }],
};
