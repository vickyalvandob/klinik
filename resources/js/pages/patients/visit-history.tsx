import { Link } from '@inertiajs/react';
import { CalendarDays, FileText, Plus, Receipt, Ticket } from 'lucide-react';
import { EmptyState } from '@/components/empty-state';
import { PaginationLinks } from '@/components/pagination-links';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { show as showInvoice } from '@/routes/billing';
import { edit as viewMedicalRecord } from '@/routes/medical-records';
import { show } from '@/routes/patients';
import { create as createRegistration, ticket } from '@/routes/registrations';
import type { EncounterHistory, Paginator } from '@/types';

export type VisitSummary = {
    total: number;
    active: number;
    completed: number;
    cancelled: number;
    last_visit_at: string | null;
};

export function PatientVisitHistory({
    patientUuid,
    encounters,
    summary,
    history,
    timezone,
    canRegister,
    canViewTicket,
}: {
    patientUuid: string;
    encounters: Paginator<EncounterHistory>;
    summary: VisitSummary;
    history: string;
    timezone: string;
    canRegister: boolean;
    canViewTicket: boolean;
}) {
    const filters = [
        { value: 'all', label: 'Semua', count: summary.total },
        { value: 'active', label: 'Masih dilayani', count: summary.active },
        { value: 'completed', label: 'Selesai', count: summary.completed },
        { value: 'cancelled', label: 'Dibatalkan', count: summary.cancelled },
    ];

    return (
        <div className="grid min-w-0 gap-5">
            <nav
                aria-label="Filter riwayat kunjungan"
                className="flex flex-wrap gap-2"
            >
                {filters.map((filter) => (
                    <Link
                        key={filter.value}
                        href={show(patientUuid, {
                            query:
                                filter.value === 'all'
                                    ? {}
                                    : { history: filter.value },
                        })}
                        only={['encounters', 'filters', 'visitSummary']}
                        preserveScroll
                        preserveState
                        aria-current={
                            history === filter.value ? 'page' : undefined
                        }
                        className={cn(
                            'focus-visible:ring-ring flex min-h-9 items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-colors focus-visible:ring-2',
                            history === filter.value
                                ? 'border-primary/25 bg-primary/5 text-primary'
                                : 'text-muted-foreground hover:bg-muted/50',
                        )}
                    >
                        {filter.label}
                        <span className="bg-background rounded px-1.5 py-0.5 text-[11px] tabular-nums">
                            {filter.count}
                        </span>
                    </Link>
                ))}
            </nav>

            {encounters.data.length === 0 ? (
                <EmptyState
                    icon={CalendarDays}
                    title={
                        summary.total === 0
                            ? 'Belum ada riwayat kunjungan'
                            : 'Tidak ada kunjungan pada halaman ini'
                    }
                    description={
                        summary.total === 0
                            ? 'Daftarkan kunjungan pertama pasien untuk memulai pelayanan di klinik ini.'
                            : 'Pilih Semua untuk kembali ke seluruh riwayat kunjungan pasien.'
                    }
                    className="bg-muted/20 min-h-52 rounded-lg border-dashed"
                    action={
                        summary.total === 0 ? (
                            canRegister ? (
                                <Button asChild variant="outline">
                                    <Link
                                        href={createRegistration({
                                            query: { patient: patientUuid },
                                        })}
                                    >
                                        <Plus /> Daftarkan kunjungan
                                    </Link>
                                </Button>
                            ) : undefined
                        ) : (
                            <Button asChild variant="outline">
                                <Link href={show(patientUuid)} preserveScroll>
                                    Lihat semua kunjungan
                                </Link>
                            </Button>
                        )
                    }
                />
            ) : (
                <ol
                    className="grid gap-3"
                    aria-label="Daftar riwayat kunjungan"
                >
                    {encounters.data.map((encounter) => (
                        <li
                            key={encounter.uuid}
                            className="min-w-0 rounded-lg border"
                        >
                            <article>
                                <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start">
                                    <div
                                        aria-hidden="true"
                                        className="bg-muted/40 hidden w-12 shrink-0 rounded-lg border py-2 text-center sm:block"
                                    >
                                        <p className="text-lg font-semibold tabular-nums">
                                            {formatDate(
                                                encounter.registered_at,
                                                timezone,
                                                { day: '2-digit' },
                                            )}
                                        </p>
                                        <p className="text-muted-foreground text-[11px]">
                                            {formatDate(
                                                encounter.registered_at,
                                                timezone,
                                                { month: 'short' },
                                            )}
                                        </p>
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-start justify-between gap-2">
                                            <div>
                                                <h3 className="text-sm font-semibold">
                                                    {encounter.service_unit}
                                                </h3>
                                                <p className="text-muted-foreground mt-1 text-xs">
                                                    {encounter.practitioner}
                                                </p>
                                            </div>
                                            <Badge
                                                variant="outline"
                                                className={cn(
                                                    'max-w-full whitespace-normal',
                                                    statusClass(
                                                        encounter.status.tone,
                                                    ),
                                                )}
                                            >
                                                {encounter.status.label}
                                            </Badge>
                                        </div>
                                        <p className="text-muted-foreground mt-3 text-xs">
                                            <time
                                                dateTime={
                                                    encounter.registered_at
                                                }
                                            >
                                                {formatDate(
                                                    encounter.registered_at,
                                                    timezone,
                                                    {
                                                        day: 'numeric',
                                                        month: 'short',
                                                        year: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit',
                                                    },
                                                )}
                                            </time>
                                            {encounter.queue_number && (
                                                <>
                                                    {' '}
                                                    · Antrean{' '}
                                                    <span className="font-mono font-medium">
                                                        {encounter.queue_number}
                                                    </span>
                                                </>
                                            )}
                                        </p>
                                        <p className="mt-3 text-sm leading-relaxed break-words">
                                            <span className="text-muted-foreground">
                                                Keluhan:{' '}
                                            </span>
                                            {encounter.chief_complaint ||
                                                'Belum dicatat'}
                                        </p>
                                    </div>
                                </div>
                                <div className="bg-muted/15 flex flex-wrap items-center justify-between gap-3 border-t px-4 py-2.5">
                                    <span className="text-muted-foreground font-mono text-[11px] break-all">
                                        {encounter.registration_number}
                                    </span>
                                    <div className="flex flex-wrap gap-1">
                                        {canViewTicket &&
                                            encounter.queue_number && (
                                                <Button
                                                    asChild
                                                    variant="ghost"
                                                    size="sm"
                                                >
                                                    <Link
                                                        href={ticket(
                                                            encounter.uuid,
                                                        )}
                                                    >
                                                        <Ticket /> Bukti daftar
                                                    </Link>
                                                </Button>
                                            )}
                                        {encounter.can_view_medical_record && (
                                            <Button
                                                asChild
                                                variant="outline"
                                                size="sm"
                                            >
                                                <Link
                                                    href={viewMedicalRecord(
                                                        encounter.uuid,
                                                    )}
                                                >
                                                    <FileText /> Rekam medis
                                                </Link>
                                            </Button>
                                        )}
                                        {encounter.invoice && (
                                            <Button
                                                asChild
                                                variant="outline"
                                                size="sm"
                                            >
                                                <Link
                                                    href={showInvoice(
                                                        encounter.invoice.uuid,
                                                    )}
                                                >
                                                    <Receipt /> Tagihan
                                                </Link>
                                            </Button>
                                        )}
                                    </div>
                                </div>
                                {encounter.invoice && (
                                    <div className="text-muted-foreground flex flex-wrap justify-between gap-2 border-t px-4 py-2.5 text-xs">
                                        <span>
                                            Pembayaran ·{' '}
                                            {encounter.invoice.status_label}
                                        </span>
                                        {encounter.invoice.balance_due > 0 && (
                                            <span className="font-medium tabular-nums">
                                                Sisa{' '}
                                                {new Intl.NumberFormat(
                                                    'id-ID',
                                                    {
                                                        style: 'currency',
                                                        currency: 'IDR',
                                                        maximumFractionDigits: 0,
                                                    },
                                                ).format(
                                                    encounter.invoice
                                                        .balance_due,
                                                )}
                                            </span>
                                        )}
                                    </div>
                                )}
                            </article>
                        </li>
                    ))}
                </ol>
            )}

            {encounters.total > 0 && (
                <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-muted-foreground text-xs">
                        Menampilkan {encounters.from ?? 0}–{encounters.to ?? 0}{' '}
                        dari {encounters.total} kunjungan
                    </p>
                    <PaginationLinks
                        links={encounters.links}
                        only={['encounters', 'filters', 'visitSummary']}
                        preserveState
                    />
                </div>
            )}
        </div>
    );
}

function formatDate(
    value: string,
    timezone: string,
    options: Intl.DateTimeFormatOptions,
) {
    return new Intl.DateTimeFormat('id-ID', {
        ...options,
        timeZone: timezone,
    }).format(new Date(value));
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
