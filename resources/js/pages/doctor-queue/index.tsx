import { Head, Link, router } from '@inertiajs/react';
import {
    AlertTriangle,
    CheckCircle2,
    Clock3,
    Play,
    Stethoscope,
} from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { PaginationLinks } from '@/components/pagination-links';
import { Button } from '@/components/ui/button';
import { store as startConsultation } from '@/routes/consultations';
import { index } from '@/routes/doctor-queue';
import { edit as editMedicalRecord } from '@/routes/medical-records';
import type { DoctorQueueEncounter, DoctorQueuePage } from '@/types';

type Mode = 'queue' | 'active' | 'history';

export default function DoctorQueueIndex({
    encounters,
    mode,
    practitioner,
    summary,
}: {
    encounters: DoctorQueuePage;
    mode: Mode;
    practitioner: {
        uuid: string;
        name: string;
        specialization: string | null;
    } | null;
    summary: { waiting: number; active: number; finished: number };
}) {
    return (
        <>
            <Head title="Pasien Saya" />
            <div className="flex flex-1 flex-col gap-5 p-4 md:p-6">
                <PageHeader
                    eyebrow="Workspace dokter"
                    title="Pasien Saya"
                    description={
                        practitioner
                            ? `${practitioner.name}${practitioner.specialization ? ` · ${practitioner.specialization}` : ''}`
                            : 'Akun ini belum terhubung ke data practitioner aktif.'
                    }
                />

                {!practitioner && (
                    <div className="border-amber-300 bg-amber-50/60 text-amber-950 flex gap-3 rounded-xl border p-4 dark:border-amber-900 dark:bg-amber-950/20 dark:text-amber-100">
                        <AlertTriangle className="mt-0.5 size-5 shrink-0" />
                        <div>
                            <p className="text-sm font-semibold">
                                Identitas dokter belum terhubung
                            </p>
                            <p className="mt-1 text-xs">
                                Hubungkan akun ke profil staf yang memiliki data
                                practitioner agar antrean pasien dapat dibuka.
                            </p>
                        </div>
                    </div>
                )}

                <div className="grid gap-3 sm:grid-cols-3">
                    <SummaryCard
                        label="Menunggu"
                        value={summary.waiting}
                        icon={<Clock3 className="size-4" />}
                    />
                    <SummaryCard
                        label="Sedang diperiksa"
                        value={summary.active}
                        icon={<Stethoscope className="size-4" />}
                    />
                    <SummaryCard
                        label="Selesai klinis"
                        value={summary.finished}
                        icon={<CheckCircle2 className="size-4" />}
                    />
                </div>

                <nav className="flex gap-2 overflow-x-auto pb-1" aria-label="Status antrean dokter">
                    {([
                        ['queue', 'Menunggu'],
                        ['active', 'Sedang Diperiksa'],
                        ['history', 'Selesai'],
                    ] as Array<[Mode, string]>).map(([value, label]) => (
                        <Button
                            key={value}
                            asChild
                            size="sm"
                            variant={mode === value ? 'default' : 'outline'}
                        >
                            <Link href={index({ query: { mode: value } })} preserveState>
                                {label}
                            </Link>
                        </Button>
                    ))}
                </nav>

                <section className="bg-card overflow-hidden rounded-xl border">
                    {encounters.data.length === 0 ? (
                        <div className="grid place-items-center gap-2 px-4 py-14 text-center">
                            <Stethoscope className="text-muted-foreground size-8" />
                            <p className="text-sm font-semibold">
                                Tidak ada pasien pada daftar ini
                            </p>
                            <p className="text-muted-foreground max-w-sm text-xs">
                                Daftar akan terisi otomatis mengikuti status
                                pelayanan pasien hari ini.
                            </p>
                        </div>
                    ) : (
                        <div className="divide-y">
                            {encounters.data.map((encounter) => (
                                <QueueRow key={encounter.uuid} encounter={encounter} mode={mode} />
                            ))}
                        </div>
                    )}
                    <div className="border-t px-4 py-3">
                        <PaginationLinks links={encounters.links} />
                    </div>
                </section>
            </div>
        </>
    );
}

function QueueRow({ encounter, mode }: { encounter: DoctorQueueEncounter; mode: Mode }) {
    return (
        <article className="grid gap-4 p-4 lg:grid-cols-[5rem_minmax(0,1fr)_11rem_auto] lg:items-center">
            <div className="bg-primary/10 text-primary flex h-14 items-center justify-center rounded-lg font-mono text-lg font-bold">
                {encounter.queue_number}
            </div>
            <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                    <h2 className="truncate font-semibold">{encounter.patient.name}</h2>
                    {encounter.patient.allergies.length > 0 && (
                        <span className="border-red-300 bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700 rounded-full border dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
                            Alergi: {encounter.patient.allergies.join(', ')}
                        </span>
                    )}
                </div>
                <p className="text-muted-foreground mt-1 text-xs">
                    {encounter.patient.medical_record_number} · {age(encounter.patient.birth_date)} tahun ·{' '}
                    {encounter.patient.gender === 'male' ? 'L' : 'P'} · {encounter.service_unit}
                </p>
                <p className="mt-2 line-clamp-2 text-sm">{encounter.chief_complaint}</p>
            </div>
            <div className="text-sm">
                <p className="text-muted-foreground text-xs">
                    {mode === 'active' ? 'Mulai' : 'Terdaftar'}
                </p>
                <p className="mt-1 font-medium">
                    {formatTime(encounter.started_at ?? encounter.registered_at)}
                </p>
                {encounter.medical_record && (
                    <p className="text-muted-foreground mt-1 text-xs">
                        RME {encounter.medical_record.status}
                    </p>
                )}
            </div>
            <div className="flex justify-end">
                {encounter.can_start ? (
                    <Button
                        onClick={() => router.post(startConsultation.url(encounter.uuid))}
                    >
                        <Play /> Mulai Pemeriksaan
                    </Button>
                ) : (
                    <Button asChild variant="outline">
                        <Link href={editMedicalRecord(encounter.uuid)}>
                            <Stethoscope /> Buka
                        </Link>
                    </Button>
                )}
            </div>
        </article>
    );
}

function SummaryCard({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
    return (
        <div className="bg-card flex items-center justify-between rounded-xl border p-4">
            <div>
                <p className="text-muted-foreground text-xs">{label}</p>
                <p className="mt-1 text-2xl font-semibold">{value}</p>
            </div>
            <span className="bg-muted text-muted-foreground grid size-9 place-items-center rounded-lg">
                {icon}
            </span>
        </div>
    );
}

function age(birthDate: string) {
    const birth = new Date(`${birthDate}T00:00:00`);
    const now = new Date();
    let result = now.getFullYear() - birth.getFullYear();
    if (now < new Date(now.getFullYear(), birth.getMonth(), birth.getDate())) result--;
    return result;
}

function formatTime(value: string) {
    return new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}
