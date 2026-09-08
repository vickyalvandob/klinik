import { Form, Head, Link, router, useForm } from '@inertiajs/react';
import {
    AlertTriangle,
    ArrowUpRight,
    CheckCircle2,
    Clock3,
    FileText,
    Play,
    Search,
    Stethoscope,
    X,
} from 'lucide-react';
import { useEffect } from 'react';
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
const listProps = ['encounters', 'filters', 'mode'];
const modes = [
    { value: 'queue', label: 'Menunggu', key: 'waiting', icon: Clock3 },
    {
        value: 'active',
        label: 'Dalam pemeriksaan',
        key: 'active',
        icon: Stethoscope,
    },
    {
        value: 'history',
        label: 'Riwayat rekam medis',
        key: 'finished',
        icon: CheckCircle2,
    },
] as const;
export default function DoctorQueueIndex({
    encounters,
    mode,
    scope,
    practitioner,
    summary,
    filters,
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
}) {
    const filter = useForm(filters);
    const { setData } = filter;
    useEffect(() => setData(filters), [filters, setData]);
    const hasFilters = Boolean(filters.search || filters.from || filters.to);
    return (
        <>
            <Head title="Rekam Medis" />
            <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 p-4 md:p-6">
                <PageHeader
                    eyebrow="Pelayanan klinis"
                    title="Rekam Medis"
                    description={
                        scope === 'clinic'
                            ? 'Pemeriksaan dan riwayat pasien dalam satu tempat.'
                            : practitioner
                              ? `${practitioner.name}${practitioner.specialization ? ` · ${practitioner.specialization}` : ''}`
                              : 'Hubungkan akun ke profil dokter untuk melihat pasien.'
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
                <nav
                    className="grid grid-cols-3 gap-2 sm:gap-3"
                    aria-label="Status rekam medis"
                >
                    {modes.map(({ value, label, key, icon: Icon }) => (
                        <Link
                            key={value}
                            href={index({ query: { mode: value, ...filters } })}
                            only={listProps}
                            preserveScroll
                            preserveState
                            aria-current={mode === value ? 'page' : undefined}
                            className={cn(
                                'group focus-visible:ring-ring flex min-w-0 flex-col gap-3 rounded-xl border p-3 transition-colors focus-visible:ring-2 focus-visible:outline-none sm:p-4',
                                mode === value
                                    ? 'border-primary/40 bg-primary/5'
                                    : 'bg-card hover:bg-muted/40',
                            )}
                        >
                            <div className="flex items-center justify-between gap-2">
                                <Icon
                                    className={cn(
                                        'size-4',
                                        mode === value
                                            ? 'text-primary'
                                            : 'text-muted-foreground',
                                    )}
                                />
                                <span className="text-xl font-semibold tabular-nums sm:text-2xl">
                                    {summary[key]}
                                </span>
                            </div>
                            <span
                                className={cn(
                                    'text-xs font-medium sm:text-sm',
                                    mode !== value && 'text-muted-foreground',
                                )}
                            >
                                {label}
                            </span>
                        </Link>
                    ))}
                </nav>
                <section
                    className="bg-card overflow-hidden rounded-xl border"
                    aria-busy={filter.processing}
                >
                    <div className="grid gap-4 border-b p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <h2 className="text-sm font-semibold">
                                {
                                    modes.find((item) => item.value === mode)
                                        ?.label
                                }
                            </h2>
                            <span className="text-muted-foreground text-xs">
                                {encounters.total} kunjungan
                                {hasFilters ? ' sesuai filter' : ''}
                            </span>
                        </div>
                        <form
                            className="grid items-end gap-3 sm:grid-cols-[minmax(12rem,1fr)_auto]"
                            onSubmit={(event) => {
                                event.preventDefault();
                                filter.transform((data) => ({ ...data, mode }));
                                filter.get(index.url(), {
                                    only: listProps,
                                    preserveState: true,
                                    preserveScroll: true,
                                    replace: true,
                                });
                            }}
                        >
                            <FormField
                                id="record-search"
                                label="Cari pasien"
                                error={filter.errors.search}
                            >
                                <div className="relative">
                                    <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                                    <Input
                                        id="record-search"
                                        value={filter.data.search}
                                        onChange={(event) =>
                                            filter.setData(
                                                'search',
                                                event.target.value,
                                            )
                                        }
                                        maxLength={100}
                                        placeholder="Nama, nomor RM, atau nomor kunjungan"
                                        className="pl-9"
                                    />
                                </div>
                            </FormField>
                            <Button type="submit" disabled={filter.processing}>
                                {filter.processing ? <Spinner /> : <Search />}{' '}
                                Cari
                            </Button>
                            <div className="grid gap-3 sm:col-span-2 sm:grid-cols-[1fr_1fr_auto]">
                                <FormField
                                    id="record-from"
                                    label="Dari tanggal"
                                    error={filter.errors.from}
                                >
                                    <Input
                                        id="record-from"
                                        type="date"
                                        value={filter.data.from}
                                        onChange={(event) =>
                                            filter.setData(
                                                'from',
                                                event.target.value,
                                            )
                                        }
                                    />
                                </FormField>
                                <FormField
                                    id="record-to"
                                    label="Sampai tanggal"
                                    error={filter.errors.to}
                                >
                                    <Input
                                        id="record-to"
                                        type="date"
                                        min={filter.data.from || undefined}
                                        value={filter.data.to}
                                        onChange={(event) =>
                                            filter.setData(
                                                'to',
                                                event.target.value,
                                            )
                                        }
                                    />
                                </FormField>
                                {hasFilters && (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        className="self-end"
                                        onClick={() => {
                                            filter.setData({
                                                search: '',
                                                from: '',
                                                to: '',
                                            });
                                            filter.clearErrors();
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
                                        <X /> Reset filter
                                    </Button>
                                )}
                            </div>
                        </form>
                    </div>
                    <div className="bg-muted/30 text-muted-foreground hidden grid-cols-[minmax(0,1fr)_11rem_9rem_10rem] gap-4 border-b px-5 py-3 text-xs font-medium lg:grid">
                        <span>Pasien & keluhan</span>
                        <span>Dokter & unit</span>
                        <span>
                            {mode === 'history'
                                ? 'Difinalisasi'
                                : 'Waktu kunjungan'}
                        </span>
                        <span className="text-right">Tindakan</span>
                    </div>
                    {encounters.data.length === 0 ? (
                        <div className="grid justify-items-center gap-2 px-4 py-16 text-center">
                            <div className="bg-muted mb-2 grid size-12 place-items-center rounded-full">
                                <FileText className="text-muted-foreground size-5" />
                            </div>
                            <h3 className="text-sm font-semibold">
                                {hasFilters
                                    ? 'Tidak ada hasil yang sesuai'
                                    : 'Belum ada kunjungan di daftar ini'}
                            </h3>
                            <p className="text-muted-foreground max-w-sm text-sm">
                                {hasFilters
                                    ? 'Coba nama atau nomor RM lain, atau ubah rentang tanggal.'
                                    : mode === 'history'
                                      ? 'Rekam medis yang sudah difinalisasi akan muncul di sini.'
                                      : 'Pasien akan muncul sesuai tahapan pemeriksaannya.'}
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
        <article className="hover:bg-muted/20 grid gap-4 p-4 transition-colors lg:grid-cols-[minmax(0,1fr)_11rem_9rem_10rem] lg:items-center lg:px-5">
            <div className="flex min-w-0 gap-3">
                <span className="bg-muted/30 mt-0.5 flex h-9 min-w-12 shrink-0 items-center justify-center rounded-md border px-2 font-mono text-xs font-semibold">
                    {encounter.queue_number}
                </span>
                <div className="min-w-0">
                    <Link
                        href={editMedicalRecord(encounter.uuid)}
                        className="hover:text-primary font-semibold break-words hover:underline"
                    >
                        {encounter.patient.name}
                    </Link>
                    <p className="text-muted-foreground mt-1 text-xs">
                        {encounter.patient.medical_record_number} ·{' '}
                        {age(encounter.patient.birth_date)} tahun ·{' '}
                        {encounter.patient.gender === 'male' ? 'L' : 'P'}
                    </p>
                    <p className="text-muted-foreground mt-2 line-clamp-2 text-sm">
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
            <div className="flex justify-end">
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
                            {mode === 'active'
                                ? 'Lanjutkan'
                                : 'Lihat rekam medis'}
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
