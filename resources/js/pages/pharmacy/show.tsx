import { Head, Link, router } from '@inertiajs/react';
import {
    ArrowLeft,
    Check,
    Clock3,
    RefreshCw,
    TriangleAlert,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatQuantity, pharmacyDateFormatter } from '@/lib/pharmacy';
import { cn } from '@/lib/utils';
import { dashboard } from '@/routes';
import { index } from '@/routes/pharmacy';
import type { PharmacyFilters, PharmacyPrescription } from '@/types';
import { PrescriptionActions } from './prescription-actions';

export default function PharmacyShow({
    prescription,
    can,
    timezone,
    returnFilters,
}: {
    prescription: PharmacyPrescription;
    can: { process: boolean; dispense: boolean; cancel: boolean };
    timezone: string;
    returnFilters: PharmacyFilters;
}) {
    const [refreshing, setRefreshing] = useState(false);
    const formatDateTime = useMemo(
        () => pharmacyDateFormatter(timezone),
        [timezone],
    );
    const active =
        prescription.status === 'prescribed' ||
        prescription.status === 'processing';
    const insufficientStock =
        prescription.items.length === 0 ||
        prescription.items.some((item) => !item.stock_sufficient);
    const currentStep =
        prescription.status === 'prescribed'
            ? 0
            : prescription.status === 'processing'
              ? 1
              : 2;

    return (
        <>
            <Head title={`Resep ${prescription.patient.name}`} />
            <div className="flex min-w-0 flex-1 flex-col gap-5 p-4 md:p-6">
                <PageHeader
                    eyebrow="Detail resep"
                    title={prescription.patient.name}
                    description={`${prescription.patient.medical_record_number} · ${prescription.encounter.registration_number}`}
                    actions={
                        <Button asChild variant="outline" size="sm">
                            <Link href={index({ query: returnFilters })}>
                                <ArrowLeft />
                                Kembali ke daftar
                            </Link>
                        </Button>
                    }
                />
                <section className="bg-card rounded-xl border p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-2">
                            <Badge
                                variant={
                                    prescription.status === 'cancelled'
                                        ? 'secondary'
                                        : 'outline'
                                }
                            >
                                {prescription.status_label}
                            </Badge>
                            <span className="text-muted-foreground text-xs">
                                {formatDateTime(prescription.prescribed_at)}
                            </span>
                        </div>
                        <p className="text-xs">{prescription.doctor.name}</p>
                    </div>
                    {prescription.status !== 'cancelled' && (
                        <ol
                            className="mt-4 grid grid-cols-3 gap-2 border-t pt-4"
                            aria-label="Tahapan resep"
                        >
                            {['Resep diterima', 'Disiapkan', 'Diserahkan'].map(
                                (label, step) => (
                                    <li
                                        key={label}
                                        aria-current={
                                            step === currentStep
                                                ? 'step'
                                                : undefined
                                        }
                                        className={cn(
                                            'flex flex-col gap-2 text-xs sm:flex-row sm:items-center',
                                            step > currentStep &&
                                                'text-muted-foreground',
                                        )}
                                    >
                                        <span
                                            className={cn(
                                                'grid size-6 shrink-0 place-items-center rounded-full text-xs',
                                                step <= currentStep
                                                    ? 'bg-primary text-primary-foreground'
                                                    : 'bg-muted',
                                            )}
                                        >
                                            {step < currentStep ? (
                                                <Check className="size-3.5" />
                                            ) : (
                                                step + 1
                                            )}
                                        </span>
                                        {label}
                                    </li>
                                ),
                            )}
                        </ol>
                    )}
                </section>
                <div className="grid min-w-0 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_19rem]">
                    <div className="order-2 grid min-w-0 gap-4 xl:order-1">
                        {prescription.notes && (
                            <section className="bg-muted/30 rounded-xl border p-4">
                                <h2 className="text-xs font-semibold">
                                    Catatan dokter
                                </h2>
                                <p className="mt-2 text-sm break-words whitespace-pre-wrap">
                                    {prescription.notes}
                                </p>
                            </section>
                        )}
                        {prescription.cancellation_reason && (
                            <section className="rounded-xl border p-4">
                                <h2 className="text-sm font-semibold">
                                    Alasan pembatalan
                                </h2>
                                <p className="mt-2 text-sm break-words whitespace-pre-wrap">
                                    {prescription.cancellation_reason}
                                </p>
                                <p className="text-muted-foreground mt-2 text-xs">
                                    {formatDateTime(prescription.cancelled_at)}
                                </p>
                            </section>
                        )}
                        <section className="bg-card min-w-0 overflow-hidden rounded-xl border">
                            <header className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
                                <div>
                                    <h2 className="text-sm font-semibold">
                                        Daftar obat{' '}
                                        <span className="text-muted-foreground ml-1 font-normal">
                                            {prescription.items.length} item
                                        </span>
                                    </h2>
                                    <p className="text-muted-foreground mt-1 text-xs">
                                        Jumlah dan aturan pakai sesuai resep
                                        dokter.
                                    </p>
                                </div>
                                {active && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={refreshing}
                                        onClick={() =>
                                            router.reload({
                                                only: ['prescription', 'can'],
                                                onStart: () =>
                                                    setRefreshing(true),
                                                onFinish: () =>
                                                    setRefreshing(false),
                                            })
                                        }
                                    >
                                        <RefreshCw
                                            className={cn(
                                                'size-3.5',
                                                refreshing && 'animate-spin',
                                            )}
                                        />
                                        {refreshing
                                            ? 'Memuat…'
                                            : 'Perbarui stok'}
                                    </Button>
                                )}
                            </header>
                            <div className="divide-y" aria-busy={refreshing}>
                                {prescription.items.map((item, itemIndex) => (
                                    <article key={item.uuid} className="p-4">
                                        <div className="flex items-start gap-3">
                                            <span className="bg-muted text-muted-foreground grid size-7 shrink-0 place-items-center rounded-md text-xs font-medium">
                                                {itemIndex + 1}
                                            </span>
                                            <div className="min-w-0 flex-1">
                                                <div className="flex flex-wrap items-start justify-between gap-2">
                                                    <div className="min-w-0">
                                                        <h3 className="text-sm font-semibold break-words">
                                                            {item.name}{' '}
                                                            {item.strength}
                                                        </h3>
                                                        {item.dosage_form && (
                                                            <p className="text-muted-foreground mt-1 text-xs">
                                                                {
                                                                    item.dosage_form
                                                                }
                                                            </p>
                                                        )}
                                                    </div>
                                                    <p className="text-sm font-semibold tabular-nums">
                                                        {formatQuantity(
                                                            item.quantity,
                                                        )}{' '}
                                                        <span className="font-normal">
                                                            {item.unit}
                                                        </span>
                                                    </p>
                                                </div>
                                                <div className="bg-muted/30 mt-3 rounded-lg p-3">
                                                    <p className="text-muted-foreground text-xs">
                                                        Aturan pakai
                                                    </p>
                                                    <p className="mt-1 text-sm leading-relaxed break-words whitespace-pre-wrap">
                                                        {item.instruction}
                                                    </p>
                                                    {[
                                                        item.dose_text,
                                                        item.frequency_text,
                                                        item.timing_text,
                                                        item.duration_text,
                                                    ].some(Boolean) && (
                                                        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                                                            {[
                                                                [
                                                                    'Dosis',
                                                                    item.dose_text,
                                                                ],
                                                                [
                                                                    'Frekuensi',
                                                                    item.frequency_text,
                                                                ],
                                                                [
                                                                    'Waktu',
                                                                    item.timing_text,
                                                                ],
                                                                [
                                                                    'Durasi',
                                                                    item.duration_text,
                                                                ],
                                                            ].map(
                                                                ([
                                                                    label,
                                                                    value,
                                                                ]) =>
                                                                    value && (
                                                                        <div
                                                                            key={
                                                                                label
                                                                            }
                                                                            className="min-w-0"
                                                                        >
                                                                            <dt className="text-muted-foreground">
                                                                                {
                                                                                    label
                                                                                }
                                                                            </dt>
                                                                            <dd className="mt-0.5 break-words">
                                                                                {
                                                                                    value
                                                                                }
                                                                            </dd>
                                                                        </div>
                                                                    ),
                                                            )}
                                                        </dl>
                                                    )}
                                                </div>
                                                {active && (
                                                    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                                                        <span className="text-muted-foreground">
                                                            Stok{' '}
                                                            {formatQuantity(
                                                                item.stock,
                                                            )}{' '}
                                                            {item.unit}
                                                        </span>
                                                        {!item.stock_sufficient ? (
                                                            <span className="text-destructive flex items-center gap-1">
                                                                <TriangleAlert className="size-3.5" />
                                                                Belum mencukupi
                                                            </span>
                                                        ) : (
                                                            <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
                                                                <Check className="size-3.5" />
                                                                Mencukupi
                                                            </span>
                                                        )}
                                                        {item.required_quantity >
                                                            Number(
                                                                item.quantity,
                                                            ) && (
                                                            <span className="text-muted-foreground w-full">
                                                                Total kebutuhan
                                                                obat ini dalam
                                                                resep:{' '}
                                                                {formatQuantity(
                                                                    item.required_quantity,
                                                                )}{' '}
                                                                {item.unit}.
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </article>
                                ))}
                            </div>
                        </section>
                    </div>
                    <aside className="order-1 xl:sticky xl:top-4 xl:order-2">
                        <PrescriptionActions
                            prescription={prescription}
                            can={can}
                            insufficientStock={insufficientStock}
                        />
                    </aside>
                    <section className="bg-card order-3 rounded-xl border p-4 xl:col-span-2">
                        <details>
                            <summary className="cursor-pointer text-sm font-semibold">
                                Riwayat proses{' '}
                                <span className="text-muted-foreground ml-1 font-normal">
                                    {prescription.audits.length} aktivitas
                                </span>
                            </summary>
                            {prescription.audits.length === 0 ? (
                                <p className="text-muted-foreground mt-3 text-xs">
                                    Belum ada aktivitas apotek.
                                </p>
                            ) : (
                                <ol className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                    {prescription.audits.map(
                                        (audit, auditIndex) => (
                                            <li
                                                key={`${audit.action}-${audit.created_at}-${auditIndex}`}
                                                className="flex gap-2"
                                            >
                                                <Clock3 className="text-muted-foreground mt-0.5 size-3.5 shrink-0" />
                                                <div className="min-w-0">
                                                    <p className="text-xs font-medium">
                                                        {auditLabel(
                                                            audit.action,
                                                        )}
                                                    </p>
                                                    <p className="text-muted-foreground mt-1 text-xs break-words">
                                                        {audit.actor}
                                                    </p>
                                                    <p className="text-muted-foreground mt-1 text-xs">
                                                        {formatDateTime(
                                                            audit.created_at,
                                                        )}
                                                    </p>
                                                </div>
                                            </li>
                                        ),
                                    )}
                                </ol>
                            )}
                        </details>
                    </section>
                </div>
            </div>
        </>
    );
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
        { title: 'Ringkasan', href: dashboard() },
        { title: 'Apotek', href: index() },
        { title: 'Detail resep', href: index() },
    ],
};
