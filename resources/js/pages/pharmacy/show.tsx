import { Form, Head, Link } from '@inertiajs/react';
import {
    ArrowLeft,
    Ban,
    CheckCircle2,
    Clock3,
    PackageCheck,
    Pill,
    TriangleAlert,
} from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { dashboard } from '@/routes';
import { index } from '@/routes/pharmacy';
import { store as cancelPrescription } from '@/routes/pharmacy/cancellations';
import { store as dispensePrescription } from '@/routes/pharmacy/dispensing';
import { store as processPrescription } from '@/routes/pharmacy/processing';
import type { PharmacyPrescription } from '@/types';

export default function PharmacyShow({
    prescription,
    can,
}: {
    prescription: PharmacyPrescription;
    can: { process: boolean; dispense: boolean; cancel: boolean };
}) {
    const insufficientStock = prescription.items.some(
        (item) => Number(item.stock) < Number(item.quantity),
    );

    return (
        <>
            <Head title={`Resep ${prescription.patient.name}`} />
            <div className="flex flex-1 flex-col gap-5 p-4 md:p-6">
                <PageHeader
                    eyebrow="Detail resep"
                    title={prescription.patient.name}
                    description={`${prescription.patient.medical_record_number} · ${prescription.encounter.registration_number} · Dr. ${prescription.doctor.name}`}
                    actions={
                        <Button asChild variant="outline">
                            <Link href={index()}>
                                <ArrowLeft /> Kembali
                            </Link>
                        </Button>
                    }
                />

                <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
                    <main className="grid gap-4">
                        <section className="bg-card rounded-xl border p-5">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                    <p className="text-muted-foreground text-xs">
                                        Status resep
                                    </p>
                                    <div className="mt-1 flex items-center gap-2">
                                        <Badge variant="outline">
                                            {prescription.status_label}
                                        </Badge>
                                        <span className="text-muted-foreground text-xs">
                                            {formatDateTime(
                                                prescription.prescribed_at,
                                            )}
                                        </span>
                                    </div>
                                </div>
                                <Pill className="text-muted-foreground size-6" />
                            </div>
                            {prescription.notes && (
                                <div className="bg-muted/40 mt-4 rounded-lg border p-3">
                                    <p className="text-muted-foreground text-xs">
                                        Catatan dokter
                                    </p>
                                    <p className="mt-1 text-sm whitespace-pre-wrap">
                                        {prescription.notes}
                                    </p>
                                </div>
                            )}
                        </section>

                        <section className="bg-card overflow-hidden rounded-xl border">
                            <div className="border-b p-4">
                                <h2 className="font-semibold">Daftar Obat</h2>
                                <p className="text-muted-foreground mt-1 text-xs">
                                    Cocokkan nama, jumlah, dan aturan pakai
                                    sebelum diserahkan.
                                </p>
                            </div>
                            <div className="divide-y">
                                {prescription.items.map((item, itemIndex) => {
                                    const enough =
                                        Number(item.stock) >=
                                        Number(item.quantity);
                                    return (
                                        <article
                                            key={item.uuid}
                                            className="grid gap-4 p-4 lg:grid-cols-[2rem_minmax(0,1fr)_10rem_10rem]"
                                        >
                                            <span className="bg-muted grid size-8 place-items-center rounded-lg text-sm font-semibold">
                                                {itemIndex + 1}
                                            </span>
                                            <div>
                                                <h3 className="font-semibold">
                                                    {item.name} {item.strength}
                                                </h3>
                                                <p className="text-muted-foreground mt-1 text-xs">
                                                    {item.dosage_form} ·{' '}
                                                    {item.dose_text ??
                                                        'Dosis tidak dicantumkan'}{' '}
                                                    ·{' '}
                                                    {item.frequency_text ??
                                                        'Frekuensi tidak dicantumkan'}
                                                </p>
                                                <p className="mt-2 text-sm">
                                                    {item.instruction}
                                                </p>
                                            </div>
                                            <Info
                                                label="Jumlah resep"
                                                value={`${formatQuantity(item.quantity)} ${item.unit}`}
                                            />
                                            <div>
                                                <Info
                                                    label="Stok tersedia"
                                                    value={`${formatQuantity(item.stock)} ${item.unit}`}
                                                />
                                                {!enough && (
                                                    <p className="text-destructive mt-1 flex items-center gap-1 text-xs">
                                                        <TriangleAlert className="size-3" />{' '}
                                                        Tidak mencukupi
                                                    </p>
                                                )}
                                            </div>
                                        </article>
                                    );
                                })}
                            </div>
                        </section>

                        {prescription.cancellation_reason && (
                            <section className="border-destructive/30 bg-destructive/5 rounded-xl border p-4">
                                <h2 className="text-sm font-semibold">
                                    Alasan pembatalan
                                </h2>
                                <p className="mt-2 text-sm whitespace-pre-wrap">
                                    {prescription.cancellation_reason}
                                </p>
                            </section>
                        )}
                    </main>

                    <aside className="grid content-start gap-4">
                        <section className="bg-card rounded-xl border p-4">
                            <h2 className="text-sm font-semibold">
                                Tindakan Farmasi
                            </h2>
                            <div className="mt-4 grid gap-3">
                                {can.process && (
                                    <Form
                                        {...processPrescription.form(
                                            prescription.uuid,
                                        )}
                                        disableWhileProcessing
                                    >
                                        {({ processing }) => (
                                            <Button
                                                type="submit"
                                                className="w-full"
                                                disabled={processing}
                                            >
                                                <PackageCheck /> Mulai Siapkan
                                                Obat
                                            </Button>
                                        )}
                                    </Form>
                                )}
                                {can.dispense && (
                                    <Form
                                        {...dispensePrescription.form(
                                            prescription.uuid,
                                        )}
                                        disableWhileProcessing
                                    >
                                        {({ processing, errors }) => (
                                            <>
                                                <Button
                                                    type="submit"
                                                    className="w-full"
                                                    disabled={
                                                        processing ||
                                                        insufficientStock
                                                    }
                                                >
                                                    <CheckCircle2 /> Konfirmasi
                                                    Penyerahan
                                                </Button>
                                                {insufficientStock && (
                                                    <p className="text-destructive text-xs">
                                                        Stok belum mencukupi.
                                                        Sesuaikan stok sebelum
                                                        penyerahan.
                                                    </p>
                                                )}
                                                {errors.stock && (
                                                    <p className="text-destructive text-xs">
                                                        {errors.stock}
                                                    </p>
                                                )}
                                                {errors.status && (
                                                    <p className="text-destructive text-xs">
                                                        {errors.status}
                                                    </p>
                                                )}
                                            </>
                                        )}
                                    </Form>
                                )}
                                {!can.process && !can.dispense && (
                                    <p className="text-muted-foreground rounded-lg border border-dashed p-3 text-xs">
                                        Tidak ada tindakan utama untuk status
                                        resep ini.
                                    </p>
                                )}
                            </div>
                        </section>

                        {can.cancel && (
                            <section className="bg-card rounded-xl border p-4">
                                <h2 className="text-sm font-semibold">
                                    Batalkan Resep
                                </h2>
                                <p className="text-muted-foreground mt-1 text-xs">
                                    Riwayat resep tetap tersimpan dan pasien
                                    diteruskan ke tahap berikutnya.
                                </p>
                                <Form
                                    {...cancelPrescription.form(
                                        prescription.uuid,
                                    )}
                                    className="mt-3 grid gap-3"
                                    disableWhileProcessing
                                >
                                    {({ errors, processing }) => (
                                        <>
                                            <Input
                                                name="reason"
                                                placeholder="Alasan pembatalan"
                                            />
                                            {errors.reason && (
                                                <p className="text-destructive text-xs">
                                                    {errors.reason}
                                                </p>
                                            )}
                                            <Button
                                                type="submit"
                                                variant="destructive"
                                                disabled={processing}
                                            >
                                                <Ban /> Batalkan Resep
                                            </Button>
                                        </>
                                    )}
                                </Form>
                            </section>
                        )}

                        <section className="bg-card rounded-xl border p-4">
                            <h2 className="text-sm font-semibold">
                                Jejak Proses
                            </h2>
                            {prescription.audits.length === 0 ? (
                                <p className="text-muted-foreground mt-3 text-xs">
                                    Belum ada aktivitas farmasi.
                                </p>
                            ) : (
                                <div className="mt-3 grid gap-3">
                                    {prescription.audits.map(
                                        (audit, indexValue) => (
                                            <div
                                                key={`${audit.action}-${audit.created_at}-${indexValue}`}
                                                className="flex gap-3"
                                            >
                                                <span className="bg-muted grid size-7 shrink-0 place-items-center rounded-full">
                                                    <Clock3 className="size-3.5" />
                                                </span>
                                                <div>
                                                    <p className="text-xs font-medium">
                                                        {auditLabel(
                                                            audit.action,
                                                        )}
                                                    </p>
                                                    <p className="text-muted-foreground mt-0.5 text-xs">
                                                        {audit.actor} ·{' '}
                                                        {formatDateTime(
                                                            audit.created_at,
                                                        )}
                                                    </p>
                                                </div>
                                            </div>
                                        ),
                                    )}
                                </div>
                            )}
                        </section>
                    </aside>
                </div>
            </div>
        </>
    );
}

function Info({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <p className="text-muted-foreground text-xs">{label}</p>
            <p className="mt-1 text-sm font-medium">{value}</p>
        </div>
    );
}
function formatQuantity(value: string) {
    return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 }).format(
        Number(value),
    );
}
function formatDateTime(value: string | null) {
    return value
        ? new Intl.DateTimeFormat('id-ID', {
              dateStyle: 'medium',
              timeStyle: 'short',
          }).format(new Date(value))
        : '—';
}
function auditLabel(action: string) {
    return (
        (
            {
                processing_started: 'Penyiapan dimulai',
                dispensed: 'Obat diserahkan',
                cancelled: 'Resep dibatalkan',
            } as Record<string, string>
        )[action] ?? action
    );
}

PharmacyShow.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Apotek', href: index() },
        { title: 'Detail Resep', href: index() },
    ],
};
