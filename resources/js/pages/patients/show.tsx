import { Head, Link } from '@inertiajs/react';
import {
    ArrowLeft,
    CalendarDays,
    CheckCheck,
    ClipboardList,
    ContactRound,
    HeartPulse,
    History,
    LockKeyhole,
    MapPin,
    Pencil,
    Phone,
    Plus,
    ShieldAlert,
    UserRoundCheck,
    type LucideIcon,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { dashboard } from '@/routes';
import { edit, index } from '@/routes/patients';
import { create as createRegistration } from '@/routes/registrations';
import type {
    EncounterHistory,
    Paginator,
    PatientAllergy,
    PatientDetail,
} from '@/types';
import { PatientVisitHistory, type VisitSummary } from './visit-history';

type PatientShowProps = {
    patient: PatientDetail & { age_label: string; updated_at: string | null };
    clinic: { name: string; timezone: string };
    encounters: Paginator<EncounterHistory> | null;
    visitSummary: VisitSummary | null;
    filters: { history: string };
    can: {
        update: boolean;
        register: boolean;
        view_encounters: boolean;
        view_ticket: boolean;
    };
};

export default function PatientShow({
    patient,
    clinic,
    encounters,
    visitSummary,
    filters,
    can,
}: PatientShowProps) {
    const activeAllergies = patient.allergies.filter(
        (allergy) => allergy.status === 'active',
    );
    const inactiveAllergies = patient.allergies.filter(
        (allergy) => allergy.status === 'inactive',
    );
    const registrationUrl = createRegistration({
        query: { patient: patient.uuid },
    });

    return (
        <>
            <Head title={`Detail pasien · ${patient.name}`} />
            <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-5 p-4 md:p-6">
                <div className="flex items-center justify-between gap-3">
                    <Button asChild variant="ghost" size="sm" className="-ml-2">
                        <Link href={index()}>
                            <ArrowLeft /> Daftar pasien
                        </Link>
                    </Button>
                    <span className="text-muted-foreground text-xs">
                        Detail pasien
                    </span>
                </div>

                <section className="bg-card min-w-0 overflow-hidden rounded-xl border">
                    <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start md:p-6">
                        <div
                            aria-hidden="true"
                            className="bg-primary/10 text-primary flex size-14 shrink-0 items-center justify-center rounded-2xl text-xl font-semibold"
                        >
                            {patient.name
                                .trim()
                                .split(/\s+/)
                                .slice(0, 2)
                                .map((part) => part[0])
                                .join('')
                                .toUpperCase()}
                        </div>
                        <PageHeader
                            className="min-w-0 flex-1 sm:flex-col sm:items-start lg:flex-row lg:items-center"
                            eyebrow="Profil pasien"
                            title={patient.name}
                            description={`${patient.age_label} · ${genderLabel(patient.gender)} · Lahir ${formatDate(patient.birth_date)}`}
                            actions={
                                <>
                                    {can.update && (
                                        <Button asChild variant="outline">
                                            <Link href={edit(patient.uuid)}>
                                                <Pencil /> Edit pasien
                                            </Link>
                                        </Button>
                                    )}
                                    {can.register && (
                                        <Button asChild>
                                            <Link href={registrationUrl}>
                                                <Plus /> Daftarkan kunjungan
                                            </Link>
                                        </Button>
                                    )}
                                </>
                            }
                        />
                    </div>
                    <div className="bg-muted/20 flex flex-wrap items-center gap-x-6 gap-y-3 border-t px-5 py-3 md:px-6">
                        <div className="flex items-center gap-2 text-sm">
                            <span className="text-muted-foreground text-xs">
                                No. RM
                            </span>
                            <span className="font-mono font-semibold">
                                {patient.medical_record_number}
                            </span>
                        </div>
                        <span className="text-muted-foreground text-xs">
                            {patient.created_at
                                ? `Terdaftar sejak ${formatDateTime(patient.created_at, clinic.timezone)}`
                                : 'Tanggal pendaftaran belum tercatat'}
                        </span>
                        <a
                            href="#alergi"
                            className={cn(
                                'focus-visible:ring-ring rounded-sm text-xs underline-offset-4 hover:underline focus-visible:ring-2',
                                activeAllergies.length > 0
                                    ? 'font-medium text-amber-800 dark:text-amber-300'
                                    : 'text-muted-foreground',
                            )}
                        >
                            {activeAllergies.length > 0
                                ? `${activeAllergies.length} alergi aktif`
                                : 'Belum ada alergi aktif tercatat'}
                        </a>
                    </div>
                </section>

                {activeAllergies.length > 0 && (
                    <section
                        aria-label="Alergi aktif pasien"
                        className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50/70 p-4 dark:border-amber-900 dark:bg-amber-950/20"
                    >
                        <ShieldAlert className="mt-0.5 size-5 shrink-0 text-amber-700 dark:text-amber-400" />
                        <div className="min-w-0 flex-1">
                            <h2 className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                                Perhatikan alergi pasien
                            </h2>
                            <p className="mt-1 text-sm break-words text-amber-900/80 dark:text-amber-200/80">
                                {activeAllergies
                                    .map((allergy) => allergy.substance)
                                    .join(', ')}
                            </p>
                        </div>
                        <a
                            href="#alergi"
                            className="shrink-0 rounded-sm text-xs font-medium text-amber-900 underline underline-offset-4 focus-visible:ring-2 dark:text-amber-200"
                        >
                            Lihat detail
                        </a>
                    </section>
                )}

                {visitSummary && (
                    <section
                        aria-label="Ringkasan kunjungan"
                        className="grid grid-cols-2 gap-3 lg:grid-cols-4"
                    >
                        <SummaryItem
                            icon={ClipboardList}
                            label="Total kunjungan"
                            value={String(visitSummary.total)}
                            description="Di klinik ini"
                        />
                        <SummaryItem
                            icon={HeartPulse}
                            label="Masih dilayani"
                            value={String(visitSummary.active)}
                            description="Belum selesai"
                        />
                        <SummaryItem
                            icon={CheckCheck}
                            label="Kunjungan selesai"
                            value={String(visitSummary.completed)}
                            description="Pelayanan tuntas"
                        />
                        <SummaryItem
                            icon={CalendarDays}
                            label="Kunjungan terakhir"
                            value={
                                visitSummary.last_visit_at
                                    ? formatDateTime(
                                          visitSummary.last_visit_at,
                                          clinic.timezone,
                                      )
                                    : 'Belum ada'
                            }
                            description={clinic.name}
                            compact
                        />
                    </section>
                )}

                <nav
                    aria-label="Bagian detail pasien"
                    className="flex flex-wrap gap-x-5 gap-y-2 border-b pb-3 text-sm"
                >
                    <SectionLink href="#riwayat">Riwayat kunjungan</SectionLink>
                    <SectionLink href="#profil">Identitas & kontak</SectionLink>
                    <SectionLink href="#alergi">Alergi</SectionLink>
                </nav>

                <div className="grid min-w-0 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_21rem]">
                    <div className="grid min-w-0 gap-5">
                        <DetailSection
                            id="riwayat"
                            icon={History}
                            title="Riwayat kunjungan"
                            description={`Riwayat pelayanan di ${clinic.name}, dari yang terbaru.`}
                        >
                            {encounters && visitSummary ? (
                                <PatientVisitHistory
                                    patientUuid={patient.uuid}
                                    encounters={encounters}
                                    summary={visitSummary}
                                    history={filters.history}
                                    timezone={clinic.timezone}
                                    canRegister={can.register}
                                    canViewTicket={can.view_ticket}
                                />
                            ) : (
                                <div className="bg-muted/20 flex items-start gap-3 rounded-lg border border-dashed p-5">
                                    <LockKeyhole className="text-muted-foreground mt-0.5 size-5 shrink-0" />
                                    <div>
                                        <p className="text-sm font-medium">
                                            Riwayat kunjungan terbatas
                                        </p>
                                        <p className="text-muted-foreground mt-1 text-sm">
                                            Akun Anda belum memiliki akses untuk
                                            melihat riwayat pelayanan pasien.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </DetailSection>

                        <DetailSection
                            id="profil"
                            icon={ContactRound}
                            title="Identitas pasien"
                            description="Data utama pasien untuk identifikasi dan administrasi."
                        >
                            <dl className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
                                <DetailItem
                                    label="Nama lengkap"
                                    value={patient.name}
                                />
                                <DetailItem
                                    label="Nomor rekam medis"
                                    value={patient.medical_record_number}
                                    mono
                                />
                                <DetailItem
                                    label="NIK"
                                    value={patient.national_id_number}
                                    mono
                                />
                                <DetailItem
                                    label="Tanggal lahir"
                                    value={`${formatDate(patient.birth_date)} (${patient.age_label})`}
                                />
                                <DetailItem
                                    label="Jenis kelamin"
                                    value={genderLabel(patient.gender)}
                                />
                                <DetailItem
                                    label="Golongan darah"
                                    value={patient.blood_type}
                                />
                                <DetailItem
                                    label="Pekerjaan"
                                    value={patient.occupation}
                                />
                                <DetailItem
                                    label="ID SATUSEHAT"
                                    value={patient.satusehat_patient_id}
                                    mono
                                />
                            </dl>
                        </DetailSection>

                        <DetailSection
                            icon={MapPin}
                            title="Kontak dan alamat"
                            description="Informasi untuk menghubungi pasien."
                        >
                            <dl className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
                                <DetailItem
                                    label="Nomor telepon"
                                    value={patient.phone}
                                    href={
                                        patient.phone
                                            ? `tel:${patient.phone}`
                                            : undefined
                                    }
                                />
                                <DetailItem
                                    label="Email"
                                    value={patient.email}
                                    href={
                                        patient.email
                                            ? `mailto:${patient.email}`
                                            : undefined
                                    }
                                />
                                <div className="sm:col-span-2">
                                    <DetailItem
                                        label="Alamat"
                                        value={patient.address}
                                    />
                                </div>
                            </dl>
                            {(patient.province_code ||
                                patient.city_code ||
                                patient.district_code ||
                                patient.village_code) && (
                                <dl className="bg-muted/20 mt-5 grid grid-cols-2 gap-4 rounded-lg border p-4">
                                    <DetailItem
                                        label="Kode provinsi"
                                        value={patient.province_code}
                                        mono
                                    />
                                    <DetailItem
                                        label="Kode kota / kabupaten"
                                        value={patient.city_code}
                                        mono
                                    />
                                    <DetailItem
                                        label="Kode kecamatan"
                                        value={patient.district_code}
                                        mono
                                    />
                                    <DetailItem
                                        label="Kode kelurahan / desa"
                                        value={patient.village_code}
                                        mono
                                    />
                                </dl>
                            )}
                        </DetailSection>
                    </div>

                    <aside className="grid min-w-0 gap-5">
                        <DetailSection
                            id="alergi"
                            icon={ShieldAlert}
                            title="Alergi pasien"
                            description="Zat pemicu, reaksi, dan tingkat keparahan."
                        >
                            {activeAllergies.length === 0 ? (
                                <div className="bg-muted/20 rounded-lg border border-dashed p-4">
                                    <p className="text-sm font-medium">
                                        Belum ada alergi aktif tercatat
                                    </p>
                                    <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                                        Konfirmasi riwayat alergi kepada pasien
                                        sebelum pelayanan.
                                    </p>
                                </div>
                            ) : (
                                <div className="grid gap-3">
                                    {activeAllergies.map((allergy) => (
                                        <AllergyItem
                                            key={allergy.uuid}
                                            allergy={allergy}
                                        />
                                    ))}
                                </div>
                            )}
                            {inactiveAllergies.length > 0 && (
                                <details className="mt-4 border-t pt-4">
                                    <summary className="focus-visible:ring-ring cursor-pointer rounded-sm text-xs font-medium focus-visible:ring-2">
                                        Riwayat alergi tidak aktif (
                                        {inactiveAllergies.length})
                                    </summary>
                                    <div className="mt-3 grid gap-3">
                                        {inactiveAllergies.map((allergy) => (
                                            <AllergyItem
                                                key={allergy.uuid}
                                                allergy={allergy}
                                            />
                                        ))}
                                    </div>
                                </details>
                            )}
                            {can.update && (
                                <Button
                                    asChild
                                    variant="outline"
                                    size="sm"
                                    className="mt-4 w-full"
                                >
                                    <Link href={edit(patient.uuid)}>
                                        <Pencil /> Perbarui data alergi
                                    </Link>
                                </Button>
                            )}
                        </DetailSection>

                        <DetailSection
                            icon={UserRoundCheck}
                            title="Kontak darurat"
                            description="Orang yang dapat dihubungi saat diperlukan."
                        >
                            <dl className="grid gap-4">
                                <DetailItem
                                    label="Nama kontak"
                                    value={patient.emergency_contact_name}
                                />
                                <DetailItem
                                    label="Nomor telepon"
                                    value={patient.emergency_contact_phone}
                                    href={
                                        patient.emergency_contact_phone
                                            ? `tel:${patient.emergency_contact_phone}`
                                            : undefined
                                    }
                                />
                            </dl>
                        </DetailSection>

                        <div className="text-muted-foreground flex items-start gap-2 px-1 text-xs leading-relaxed">
                            <ContactRound className="mt-0.5 size-4 shrink-0" />
                            <p>
                                {patient.updated_at
                                    ? `Data pasien diperbarui ${formatDateTime(patient.updated_at, clinic.timezone, true)}.`
                                    : 'Waktu pembaruan belum tercatat.'}
                            </p>
                        </div>
                    </aside>
                </div>
            </div>
        </>
    );
}

function SectionLink({
    href,
    children,
}: {
    href: string;
    children: ReactNode;
}) {
    return (
        <a
            href={href}
            className="text-muted-foreground hover:text-foreground focus-visible:ring-ring rounded-sm py-1 font-medium underline-offset-4 hover:underline focus-visible:ring-2"
        >
            {children}
        </a>
    );
}

function SummaryItem({
    icon: Icon,
    label,
    value,
    description,
    compact = false,
}: {
    icon: LucideIcon;
    label: string;
    value: string;
    description: string;
    compact?: boolean;
}) {
    return (
        <div className="bg-card min-w-0 rounded-xl border p-4">
            <div className="text-muted-foreground flex items-center gap-2 text-xs">
                <Icon className="size-4 shrink-0" />
                <span>{label}</span>
            </div>
            <p
                className={cn(
                    'mt-3 font-semibold tracking-tight tabular-nums',
                    compact ? 'text-base sm:text-lg' : 'text-2xl',
                )}
            >
                {value}
            </p>
            <p className="text-muted-foreground mt-1 text-xs break-words">
                {description}
            </p>
        </div>
    );
}

function DetailSection({
    id,
    icon: Icon,
    title,
    description,
    children,
}: {
    id?: string;
    icon: LucideIcon;
    title: string;
    description: string;
    children: ReactNode;
}) {
    return (
        <section
            id={id}
            className="bg-card min-w-0 scroll-mt-20 rounded-xl border"
        >
            <div className="flex items-start gap-3 border-b p-4 md:px-5">
                <span className="bg-muted text-muted-foreground flex size-8 shrink-0 items-center justify-center rounded-lg">
                    <Icon className="size-4" />
                </span>
                <div className="min-w-0">
                    <h2 className="font-semibold">{title}</h2>
                    <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                        {description}
                    </p>
                </div>
            </div>
            <div className="p-4 md:p-5">{children}</div>
        </section>
    );
}

function DetailItem({
    label,
    value,
    mono = false,
    href,
}: {
    label: string;
    value: string | null;
    mono?: boolean;
    href?: string;
}) {
    return (
        <div className="min-w-0">
            <dt className="text-muted-foreground text-xs">{label}</dt>
            <dd
                className={cn(
                    'mt-1.5 text-sm font-medium break-words whitespace-pre-line',
                    mono && 'font-mono',
                    !value && 'text-muted-foreground font-normal',
                )}
            >
                {value && href ? (
                    <a
                        href={href}
                        className="text-primary focus-visible:ring-ring inline-flex max-w-full items-center gap-1.5 rounded-sm underline-offset-4 hover:underline focus-visible:ring-2"
                    >
                        {href.startsWith('tel:') && (
                            <Phone className="size-3.5 shrink-0" />
                        )}
                        <span className="min-w-0 break-all">{value}</span>
                    </a>
                ) : (
                    value || 'Belum diisi'
                )}
            </dd>
        </div>
    );
}

function AllergyItem({ allergy }: { allergy: PatientAllergy }) {
    const severityLabels = {
        mild: 'Ringan',
        moderate: 'Sedang',
        severe: 'Berat',
    };
    const severe = allergy.status === 'active' && allergy.severity === 'severe';

    return (
        <div
            className={cn(
                'rounded-lg border p-3',
                severe &&
                    'border-red-300 bg-red-50/50 dark:border-red-900 dark:bg-red-950/20',
            )}
        >
            <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="min-w-0 text-sm font-semibold break-words">
                    {allergy.substance}
                </p>
                <Badge
                    variant="outline"
                    className={cn(
                        severe &&
                            'border-red-300 text-red-700 dark:text-red-300',
                    )}
                >
                    {allergy.severity
                        ? severityLabels[allergy.severity]
                        : 'Keparahan belum dicatat'}
                </Badge>
            </div>
            <p className="text-muted-foreground mt-2 text-xs leading-relaxed break-words">
                {allergy.reaction || 'Reaksi belum dicatat'}
            </p>
            <p className="text-muted-foreground mt-2 text-[11px]">
                {allergy.status === 'active' ? 'Alergi aktif' : 'Tidak aktif'}
                {allergy.code
                    ? ` · ${allergy.code_system ?? ''} ${allergy.code}`
                    : ''}
            </p>
        </div>
    );
}

function formatDate(value: string) {
    return new Intl.DateTimeFormat('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    }).format(new Date(`${value}T00:00:00`));
}

function formatDateTime(value: string, timezone: string, withTime = false) {
    return new Intl.DateTimeFormat('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        timeZone: timezone,
        ...(withTime ? ({ hour: '2-digit', minute: '2-digit' } as const) : {}),
    }).format(new Date(value));
}

function genderLabel(gender: PatientDetail['gender']) {
    return gender === 'male' ? 'Laki-laki' : 'Perempuan';
}

PatientShow.layout = {
    breadcrumbs: [
        { title: 'Ringkasan', href: dashboard() },
        { title: 'Pasien', href: index() },
        { title: 'Detail pasien', href: '#' },
    ],
};
