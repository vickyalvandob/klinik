import { Head, Link } from '@inertiajs/react';
import {
    Activity,
    ArrowLeft,
    BriefcaseBusiness,
    CalendarDays,
    ContactRound,
    HeartPulse,
    History,
    Mail,
    MapPin,
    Pencil,
    Phone,
    ShieldAlert,
    UserRoundCheck,
} from 'lucide-react';
import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { dashboard } from '@/routes';
import { edit, index } from '@/routes/patients';
import type { PatientAllergy, PatientDetail } from '@/types';

export default function PatientShow({
    patient,
    can,
}: {
    patient: PatientDetail;
    can: { update: boolean };
}) {
    const activeAllergies = patient.allergies.filter(
        (allergy) => allergy.status === 'active',
    );
    const inactiveAllergies = patient.allergies.filter(
        (allergy) => allergy.status === 'inactive',
    );

    return (
        <>
            <Head title={patient.name} />
            <div className="flex flex-1 flex-col gap-5 p-4 md:p-6">
                <PageHeader
                    eyebrow={patient.medical_record_number}
                    title={patient.name}
                    description={`${formatDate(patient.birth_date)} · ${genderLabel(patient.gender)}`}
                    actions={
                        <>
                            <Button asChild variant="ghost">
                                <Link href={index()}>
                                    <ArrowLeft /> Kembali
                                </Link>
                            </Button>
                            {can.update && (
                                <Button asChild>
                                    <Link href={edit(patient.uuid)}>
                                        <Pencil /> Edit pasien
                                    </Link>
                                </Button>
                            )}
                        </>
                    }
                />

                {activeAllergies.length > 0 && (
                    <section className="rounded-xl border border-amber-300 bg-amber-50/60 p-4 dark:border-amber-900 dark:bg-amber-950/20">
                        <div className="flex items-start gap-3">
                            <ShieldAlert className="mt-0.5 size-5 shrink-0 text-amber-700 dark:text-amber-400" />
                            <div>
                                <h2 className="text-sm font-semibold">
                                    Alergi aktif
                                </h2>
                                <p className="text-muted-foreground mt-1 text-xs">
                                    {activeAllergies
                                        .map((allergy) => allergy.substance)
                                        .join(', ')}
                                </p>
                            </div>
                        </div>
                    </section>
                )}

                <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
                    <div className="grid gap-5">
                        <DetailSection
                            icon={ContactRound}
                            title="Identitas"
                            description="Identitas utama dan nomor rekam medis pasien."
                        >
                            <dl className="grid gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
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
                                    value={formatDate(patient.birth_date)}
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
                                    label="ID SATUSEHAT"
                                    value={patient.satusehat_patient_id}
                                    mono
                                />
                            </dl>
                        </DetailSection>

                        <DetailSection
                            icon={MapPin}
                            title="Kontak dan alamat"
                            description="Informasi yang dipakai untuk komunikasi administratif."
                        >
                            <div className="grid gap-5 sm:grid-cols-2">
                                <IconDetail
                                    icon={Phone}
                                    label="Telepon"
                                    value={patient.phone}
                                />
                                <IconDetail
                                    icon={Mail}
                                    label="Email"
                                    value={patient.email}
                                />
                                <IconDetail
                                    icon={BriefcaseBusiness}
                                    label="Pekerjaan"
                                    value={patient.occupation}
                                />
                                <IconDetail
                                    icon={MapPin}
                                    label="Alamat"
                                    value={patient.address}
                                />
                            </div>
                            {(patient.province_code ||
                                patient.city_code ||
                                patient.district_code ||
                                patient.village_code) && (
                                <div className="bg-muted/30 mt-5 grid gap-3 rounded-lg border p-4 sm:grid-cols-2 lg:grid-cols-4">
                                    <DetailItem
                                        label="Provinsi"
                                        value={patient.province_code}
                                        mono
                                    />
                                    <DetailItem
                                        label="Kota/Kab."
                                        value={patient.city_code}
                                        mono
                                    />
                                    <DetailItem
                                        label="Kecamatan"
                                        value={patient.district_code}
                                        mono
                                    />
                                    <DetailItem
                                        label="Kelurahan/Desa"
                                        value={patient.village_code}
                                        mono
                                    />
                                </div>
                            )}
                        </DetailSection>

                        <DetailSection
                            icon={History}
                            title="Riwayat kunjungan"
                            description="Kunjungan pasien akan tersusun kronologis pada profil ini."
                        >
                            <EmptyState
                                icon={CalendarDays}
                                title="Belum ada riwayat kunjungan"
                                description="Riwayat akan tampil setelah pasien didaftarkan ke layanan. Data pasien ini tetap siap digunakan untuk pendaftaran berikutnya."
                                className="min-h-52 rounded-lg border-0 bg-muted/20"
                            />
                        </DetailSection>
                    </div>

                    <aside className="grid gap-5">
                        <DetailSection
                            icon={HeartPulse}
                            title="Alergi"
                            description="Alergi aktif ditampilkan lebih menonjol."
                        >
                            {patient.allergies.length === 0 ? (
                                <p className="text-muted-foreground rounded-lg border border-dashed p-4 text-sm">
                                    Belum ada alergi tercatat.
                                </p>
                            ) : (
                                <div className="grid gap-3">
                                    {activeAllergies.map((allergy) => (
                                        <AllergyItem
                                            key={allergy.uuid}
                                            allergy={allergy}
                                        />
                                    ))}
                                    {inactiveAllergies.length > 0 && (
                                        <div className="border-t pt-3">
                                            <p className="text-muted-foreground mb-2 text-xs font-medium uppercase tracking-wide">
                                                Riwayat tidak aktif
                                            </p>
                                            <div className="grid gap-2 opacity-70">
                                                {inactiveAllergies.map(
                                                    (allergy) => (
                                                        <AllergyItem
                                                            key={allergy.uuid}
                                                            allergy={allergy}
                                                        />
                                                    ),
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </DetailSection>

                        <DetailSection
                            icon={UserRoundCheck}
                            title="Kontak darurat"
                            description="Digunakan hanya ketika diperlukan."
                        >
                            <div className="grid gap-4">
                                <DetailItem
                                    label="Nama"
                                    value={patient.emergency_contact_name}
                                />
                                <DetailItem
                                    label="Telepon"
                                    value={patient.emergency_contact_phone}
                                />
                            </div>
                        </DetailSection>
                    </aside>
                </div>
            </div>
        </>
    );
}

function DetailSection({
    icon: Icon,
    title,
    description,
    children,
}: {
    icon: typeof Activity;
    title: string;
    description: string;
    children: React.ReactNode;
}) {
    return (
        <section className="bg-card rounded-xl border">
            <div className="flex items-start gap-3 border-b px-4 py-4 md:px-5">
                <span className="bg-primary/10 text-primary flex size-8 shrink-0 items-center justify-center rounded-lg">
                    <Icon className="size-4" />
                </span>
                <div>
                    <h2 className="font-semibold">{title}</h2>
                    <p className="text-muted-foreground mt-1 text-xs">
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
}: {
    label: string;
    value: string | null;
    mono?: boolean;
}) {
    return (
        <div>
            <dt className="text-muted-foreground text-xs">{label}</dt>
            <dd
                className={`mt-1 text-sm font-medium break-words ${mono ? 'font-mono' : ''}`}
            >
                {value || '—'}
            </dd>
        </div>
    );
}

function IconDetail({
    icon: Icon,
    label,
    value,
}: {
    icon: typeof Activity;
    label: string;
    value: string | null;
}) {
    return (
        <div className="flex gap-3">
            <Icon className="text-primary mt-0.5 size-4 shrink-0" />
            <div className="min-w-0">
                <p className="text-muted-foreground text-xs">{label}</p>
                <p className="mt-1 text-sm font-medium break-words">
                    {value || '—'}
                </p>
            </div>
        </div>
    );
}

function AllergyItem({ allergy }: { allergy: PatientAllergy }) {
    const severityLabels: Record<string, string> = {
        mild: 'Ringan',
        moderate: 'Sedang',
        severe: 'Berat',
    };

    return (
        <div className="rounded-lg border p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold">{allergy.substance}</p>
                <Badge variant="outline">
                    {allergy.status === 'active' ? 'Aktif' : 'Tidak aktif'}
                </Badge>
            </div>
            <p className="text-muted-foreground mt-2 text-xs">
                {allergy.reaction || 'Reaksi belum dicatat'}
                {allergy.severity
                    ? ` · ${severityLabels[allergy.severity]}`
                    : ''}
            </p>
        </div>
    );
}

function formatDate(value: string) {
    return new Intl.DateTimeFormat('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    }).format(new Date(`${value}T00:00:00`));
}

function genderLabel(gender: PatientDetail['gender']) {
    return gender === 'male' ? 'Laki-laki' : 'Perempuan';
}

PatientShow.layout = {
    breadcrumbs: [
        { title: 'Hari Ini', href: dashboard() },
        { title: 'Pasien', href: index() },
        { title: 'Detail pasien', href: index() },
    ],
};
