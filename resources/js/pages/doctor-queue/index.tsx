import { Form, Head, Link, router, useForm } from '@inertiajs/react';
import {
    AlertTriangle,
    ArrowUpRight,
    CalendarDays,
    FileText,
    Play,
    Search,
    X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { DatePicker } from '@/components/date-picker';
import { FormField } from '@/components/form-field';
import { PageHeader } from '@/components/page-header';
import { PaginationLinks } from '@/components/pagination-links';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import { store as startConsultation } from '@/routes/consultations';
import { index } from '@/routes/doctor-queue';
import { edit as editMedicalRecord } from '@/routes/medical-records';
import type { DoctorQueueEncounter, DoctorQueuePage } from '@/types';
type Mode = 'queue' | 'active' | 'history';
type Filters = { search: string; from: string; to: string };
const listProps = ['encounters', 'filters', 'mode', 'summary', 'today'];
const modes = [
    { value: 'queue', label: 'Menunggu', key: 'waiting' },
    {
        value: 'active',
        label: 'Pemeriksaan',
        key: 'active',
    },
    {
        value: 'history',
        label: 'Riwayat',
        key: 'finished',
    },
] as const;
export default function DoctorQueueIndex({
    encounters,
    mode,
    scope,
    practitioner,
    summary,
    filters,
    today,
}: {
    encounters: DoctorQueuePage;
    mode: Mode;
    scope: 'clinic' | 'practitioner';
    practitioner: {
        uuid: string;
        name: string;
        specialization: string | null;
    } | null;
    summary: { waiting: number; active: number; finished: number };
    filters: Filters;
    today: string;
}) {
    const filter = useForm(filters);
    const [datesOpen, setDatesOpen] = useState(
        Boolean(filters.from || filters.to),
    );
    const { setData } = filter;
    useEffect(() => setData(filters), [filters, setData]);
    const hasCustomDates = filters.from !== today || filters.to !== today;
    const hasFilters = Boolean(filters.search || hasCustomDates);
    return (
        <>
            <Head title="Rekam Medis" />
            <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 p-4 md:p-6">
                <PageHeader
                    title="Rekam Medis"
                    description={
                        scope === 'practitioner' && practitioner
                            ? `${practitioner.name}${practitioner.specialization ? ` · ${practitioner.specialization}` : ''}`
                            : undefined
                    }
                />
                {scope === 'practitioner' && !practitioner && (
                    <div className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50/60 p-4 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/20 dark:text-amber-100">
                        <AlertTriangle className="size-5 shrink-0" />
                        <p>
                            Identitas dokter belum terhubung. Hubungkan akun
                            dengan profil dokter aktif di klinik ini.
                        </p>
                    </div>
                )}
                <section
                    className="bg-card overflow-hidden rounded-xl border"
                    aria-busy={filter.processing}
                >
                    <nav
                        className="flex gap-1 border-b px-3 pt-2 sm:px-4"
                        aria-label="Status rekam medis"
                    >
                        {modes.map(({ value, label, key }) => (
                            <Link
                                key={value}
                                href={index({
                                    query: { mode: value, ...filters },
                                })}
                                only={listProps}
                                preserveScroll
                                preserveState
                                aria-current={
                                    mode === value ? 'page' : undefined
                                }
                                className={cn(
                                    'focus-visible:ring-ring -mb-px flex min-w-0 flex-1 items-center justify-center gap-1.5 border-b-2 px-2 py-3 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none sm:flex-none sm:gap-2 sm:px-4 sm:text-sm',
                                    mode === value
                                        ? 'border-primary text-primary'
                                        : 'text-muted-foreground hover:text-foreground border-transparent',
                                )}
                            >
                                {label}
                                <span
                                    className={cn(
                                        'rounded-md px-1.5 py-0.5 text-[11px] tabular-nums',
                                        mode === value
                                            ? 'bg-primary/10'
                                            : 'bg-muted',
                                    )}
                                >
                                    {summary[key]}
                                </span>
                            </Link>
                        ))}
                    </nav>
                    <div className="border-b p-4">
                        <form
                            noValidate
                            className="flex flex-wrap items-start gap-2"
                            onSubmit={(event) => {
                                event.preventDefault();
                                filter.transform((data) => ({ ...data, mode }));
                                filter.get(index.url(), {
                                    only: listProps,
                                    preserveState: true,
                                    preserveScroll: true,
                                    replace: true,
                                    onError: (errors) => {
                                        if (errors.from || errors.to) {
                                            setDatesOpen(true);
                                        }
                                    },
                                });
                            }}
                        >
                            <div className="relative min-w-0 flex-1 basis-full sm:basis-56">
                                <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                                <Input
                                    id="record-search"
                                    aria-label="Cari pasien"
                                    aria-invalid={Boolean(filter.errors.search)}
                                    aria-describedby={
                                        filter.errors.search
                                            ? 'record-search-error'
                                            : undefined
                                    }
                                    value={filter.data.search}
                                    onChange={(event) =>
                                        filter.setData(
                                            'search',
                                            event.target.value,
                                        )
                                    }
                                    maxLength={100}
                                    placeholder="Cari nama, no. RM, atau kunjungan"
                                    className="pl-9"
                                />
                            </div>
                            <Button
                                type="button"
                                variant="outline"
                                aria-expanded={datesOpen}
                                aria-controls="record-date-filters"
                                onClick={() => setDatesOpen(!datesOpen)}
                            >
                                <CalendarDays /> Tanggal
                                {hasCustomDates && (
                                    <span className="bg-primary size-1.5 rounded-full">
                                        <span className="sr-only">
                                            Filter aktif
                                        </span>
                                    </span>
                                )}
                            </Button>
                            <Button type="submit" disabled={filter.processing}>
                                {filter.processing ? <Spinner /> : <Search />}{' '}
                                Cari
                            </Button>
                            {hasFilters && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={() => {
                                        filter.setData({
                                            search: '',
                                            from: today,
                                            to: today,
                                        });
                                        filter.clearErrors();
                                        setDatesOpen(true);
                                        router.get(
                                            index.url(),
                                            { mode },
                                            {
                                                only: listProps,
                                                preserveState: true,
                                                preserveScroll: true,
                                                replace: true,
                                            },
                                        );
                                    }}
                                >
                                    <X /> Reset
                                </Button>
                            )}
                            {filter.errors.search && (
                                <p
                                    id="record-search-error"
                                    role="alert"
                                    className="text-destructive w-full text-xs"
                                >
                                    {filter.errors.search}
                                </p>
                            )}
                            <div
                                id="record-date-filters"
                                hidden={!datesOpen}
                                className="w-full"
                            >
                                <div className="grid grid-cols-2 gap-3 pt-2 sm:max-w-lg">
                                    <FormField
                                        id="record-from"
                                        label="Dari tanggal"
                                        error={filter.errors.from}
                                    >
                                        <DatePicker
                                            id="record-from"
                                            today={today}
                                            aria-invalid={Boolean(
                                                filter.errors.from,
                                            )}
                                            aria-describedby={
                                                filter.errors.from
                                                    ? 'record-from-error'
                                                    : undefined
                                            }
                                            value={filter.data.from}
                                            onChange={(from) =>
                                                filter.setData((data) => ({
                                                    ...data,
                                                    from,
                                                    to:
                                                        data.to &&
                                                        data.to < from
                                                            ? from
                                                            : data.to,
                                                }))
                                            }
                                        />
                                    </FormField>
                                    <FormField
                                        id="record-to"
                                        label="Sampai tanggal"
                                        error={filter.errors.to}
                                    >
                                        <DatePicker
                                            id="record-to"
                                            today={today}
                                            aria-invalid={Boolean(
                                                filter.errors.to,
                                            )}
                                            aria-describedby={
                                                filter.errors.to
                                                    ? 'record-to-error'
                                                    : undefined
                                            }
                                            min={filter.data.from || undefined}
                                            value={filter.data.to}
                                            onChange={(value) =>
                                                filter.setData('to', value)
                                            }
                                        />
                                    </FormField>
                                </div>
                            </div>
                        </form>
                    </div>
                    <div className="bg-muted/30 text-muted-foreground hidden grid-cols-[minmax(0,1fr)_11rem_9rem_10rem] gap-4 border-b px-5 py-3 text-xs font-medium lg:grid">
                        <span>Pasien</span>
                        <span>Dokter / unit</span>
                        <span>
                            {mode === 'history'
                                ? 'Difinalisasi'
                                : 'Waktu kunjungan'}
                        </span>
                        <span className="sr-only">Aksi</span>
                    </div>
                    {encounters.data.length === 0 ? (
                        <div className="grid justify-items-center gap-2 px-4 py-16 text-center">
                            <div className="bg-muted mb-2 grid size-12 place-items-center rounded-full">
                                <FileText className="text-muted-foreground size-5" />
                            </div>
                            <h3 className="text-sm font-semibold">
                                {hasFilters
                                    ? 'Tidak ada hasil yang sesuai'
                                    : 'Belum ada kunjungan'}
                            </h3>
                            <p className="text-muted-foreground max-w-sm text-sm">
                                {hasFilters
                                    ? 'Ubah pencarian atau rentang tanggal.'
                                    : mode === 'history'
                                      ? 'Rekam medis final akan tampil di sini.'
                                      : 'Daftar mengikuti tahap pemeriksaan pasien.'}
                            </p>
                        </div>
                    ) : (
                        <div className="divide-y">
                            {encounters.data.map((encounter) => (
                                <QueueRow
                                    key={encounter.uuid}
                                    encounter={encounter}
                                    mode={mode}
                                />
                            ))}
                        </div>
                    )}
                    {encounters.total > 0 && (
                        <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3">
                            <p className="text-muted-foreground text-xs">
                                {encounters.from}–{encounters.to} dari{' '}
                                {encounters.total} kunjungan
                            </p>
                            <PaginationLinks
                                links={encounters.links}
                                only={listProps}
                                preserveState
                            />
                        </div>
                    )}
                </section>
            </div>
        </>
    );
}
function QueueRow({
    encounter,
    mode,
}: {
    encounter: DoctorQueueEncounter;
    mode: Mode;
}) {
    const status = encounter.medical_record?.status;
    return (
        <article className="hover:bg-muted/20 grid grid-cols-2 gap-4 p-4 transition-colors lg:grid-cols-[minmax(0,1fr)_11rem_9rem_10rem] lg:items-center lg:px-5">
            <div className="col-span-2 flex min-w-0 gap-3 lg:col-span-1">
                <span className="bg-muted/30 mt-0.5 flex h-9 min-w-12 shrink-0 items-center justify-center rounded-md border px-2 font-mono text-xs font-semibold">
                    {encounter.queue_number}
                </span>
                <div className="min-w-0">
                    <Link
                        href={editMedicalRecord(encounter.uuid)}
                        className="hover:text-primary text-sm font-semibold break-words hover:underline"
                    >
                        {encounter.patient.name}
                    </Link>
                    <p className="text-muted-foreground mt-1 text-xs">
                        {encounter.patient.medical_record_number} ·{' '}
                        {age(encounter.patient.birth_date)} tahun ·{' '}
                        {encounter.patient.gender === 'male' ? 'L' : 'P'}
                    </p>
                    <p className="text-muted-foreground mt-1.5 line-clamp-2 text-xs">
                        {encounter.chief_complaint}
                    </p>
                    {encounter.patient.allergies.length > 0 && (
                        <p className="mt-2 flex items-start gap-1.5 text-xs font-medium text-red-700 dark:text-red-300">
                            <AlertTriangle className="size-3.5 shrink-0" />
                            Alergi: {encounter.patient.allergies.join(', ')}
                        </p>
                    )}
                </div>
            </div>
            <div className="min-w-0 text-sm">
                <p className="font-medium break-words">
                    {encounter.practitioner}
                </p>
                <p className="text-muted-foreground mt-1 text-xs">
                    {encounter.service_unit}
                </p>
            </div>
            <div className="text-xs">
                <p>
                    {formatTime(
                        mode === 'history'
                            ? (encounter.medical_record?.finalized_at ??
                                  encounter.registered_at)
                            : (encounter.started_at ?? encounter.registered_at),
                    )}
                </p>
                <span
                    className={cn(
                        'mt-2 inline-flex rounded-md border px-2 py-0.5',
                        status === 'final' || status === 'amended'
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300'
                            : 'text-muted-foreground',
                    )}
                >
                    {status === 'amended'
                        ? 'Dengan koreksi'
                        : status === 'final'
                          ? 'Final'
                          : status === 'draft'
                            ? 'Draft tersimpan'
                            : mode === 'active'
                              ? 'Belum ada draft'
                              : 'Siap diperiksa'}
                </span>
            </div>
            <div className="col-span-2 flex justify-end lg:col-span-1">
                {encounter.can_start ? (
                    <Form {...startConsultation.form(encounter.uuid)}>
                        {({ processing }) => (
                            <Button
                                type="submit"
                                size="sm"
                                disabled={processing}
                            >
                                {processing ? <Spinner /> : <Play />} Mulai
                                periksa
                            </Button>
                        )}
                    </Form>
                ) : (
                    <Button asChild variant="outline" size="sm">
                        <Link href={editMedicalRecord(encounter.uuid)}>
                            {mode === 'active' ? 'Lanjutkan' : 'Lihat'}
                            <ArrowUpRight />
                        </Link>
                    </Button>
                )}
            </div>
        </article>
    );
}
function age(birthDate: string) {
    const birth = new Date(`${birthDate}T00:00:00`);
    const today = new Date();
    let result = today.getFullYear() - birth.getFullYear();
    if (
        today < new Date(today.getFullYear(), birth.getMonth(), birth.getDate())
    )
        result--;
    return result;
}
function formatTime(value: string) {
    return new Intl.DateTimeFormat('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(new Date(value));
}
