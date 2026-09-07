import { Head, Link, usePage } from '@inertiajs/react';
import { ArrowRight, CalendarDays, Plus } from 'lucide-react';
import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { operationalNavigation } from '@/lib/operational-navigation';
import { dashboard } from '@/routes';
import { index as reportsIndex } from '@/routes/reports';
import { create as createRegistration } from '@/routes/registrations';

type Summary = {
    total: number;
    stages: Array<{ status: string; label: string; count: number }>;
};

export default function Dashboard({
    today,
    summary,
    growth,
}: {
    today: string;
    summary: Summary | null;
    growth: Record<string, number> | null;
}) {
    const { currentClinic, currentMembership } = usePage().props;
    const permissions = currentMembership?.permissions ?? [];
    const shortcuts = operationalNavigation(permissions).slice(1);
    const dateLabel = new Intl.DateTimeFormat('id-ID', {
        dateStyle: 'full',
    }).format(new Date(`${today}T12:00:00`));

    return (
        <>
            <Head title="Ringkasan" />
            <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                <PageHeader
                    eyebrow={dateLabel}
                    title="Ringkasan"
                    description={`${currentClinic?.name ?? 'Klinik'} · ${currentMembership?.role.name ?? ''}`}
                    actions={
                        permissions.includes('encounter.create') ? (
                            <Button asChild>
                                <Link href={createRegistration()}>
                                    <Plus /> Daftar Pasien
                                </Link>
                            </Button>
                        ) : undefined
                    }
                />
                {summary && (
                    <section
                        aria-label="Ringkasan kunjungan hari ini"
                        className="grid grid-cols-2 gap-3 lg:grid-cols-4"
                    >
                        <div className="bg-primary/5 border-primary/20 rounded-xl border p-4">
                            <CalendarDays className="text-primary mb-3 size-5" />
                            <p className="text-sm">Total kunjungan hari ini</p>
                            <p className="mt-2 text-3xl font-semibold">
                                {summary.total}
                            </p>
                        </div>
                        {summary.stages.map((stage) => (
                            <div
                                key={stage.status}
                                className="bg-card rounded-xl border p-4"
                            >
                                <p className="text-muted-foreground text-sm">
                                    {stage.label}
                                </p>
                                <p className="mt-3 text-2xl font-semibold">
                                    {stage.count}
                                </p>
                            </div>
                        ))}
                    </section>
                )}
                {growth && (
                    <section className="bg-card grid gap-3 rounded-xl border p-4 sm:grid-cols-3">
                        {'revenue' in growth && (
                            <div>
                                <p className="text-muted-foreground text-sm">
                                    Pendapatan hari ini
                                </p>
                                <p className="mt-2 text-xl font-semibold">
                                    Rp{growth.revenue.toLocaleString('id-ID')}
                                </p>
                            </div>
                        )}
                        {'outstanding' in growth && (
                            <div>
                                <p className="text-muted-foreground text-sm">
                                    Sisa tagihan kunjungan hari ini
                                </p>
                                <p className="mt-2 text-xl font-semibold">
                                    Rp
                                    {growth.outstanding.toLocaleString('id-ID')}
                                </p>
                            </div>
                        )}
                        <Button
                            variant="outline"
                            asChild
                            className="self-center"
                        >
                            <Link href={reportsIndex()}>
                                Lihat laporan & filter tanggal <ArrowRight />
                            </Link>
                        </Button>
                    </section>
                )}
                <section
                    aria-labelledby="shortcut-heading"
                    className="grid gap-3"
                >
                    <div>
                        <h2 id="shortcut-heading" className="font-semibold">
                            Mulai bekerja
                        </h2>
                        <p className="text-muted-foreground mt-1 text-sm">
                            Buka daftar kerja sesuai tugas Anda. Pintasan
                            keyboard: Ctrl + K.
                        </p>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        {shortcuts.map((item) => (
                            <Link
                                key={item.title}
                                href={item.href}
                                className="bg-card hover:bg-accent focus-visible:ring-ring flex items-center gap-3 rounded-xl border p-4 outline-none focus-visible:ring-2"
                            >
                                {item.icon && (
                                    <item.icon className="text-primary size-5 shrink-0" />
                                )}
                                <span className="min-w-0 flex-1 text-sm font-medium">
                                    {item.title}
                                </span>
                                <ArrowRight className="text-muted-foreground size-4" />
                            </Link>
                        ))}
                    </div>
                    {shortcuts.length === 0 && (
                        <EmptyState
                            icon={CalendarDays}
                            title="Belum ada akses operasional"
                            description="Hubungi pengelola klinik untuk menyesuaikan hak akses akun Anda."
                        />
                    )}
                </section>
                <section className="bg-muted/30 rounded-xl border p-4">
                    <h2 className="text-sm font-semibold">Alur pelayanan</h2>
                    <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
                        Pendaftaran → Pemeriksaan Awal → Dokter → Apotek bila
                        ada resep → Kasir → Selesai.
                    </p>
                    {permissions.includes('registration.view') && (
                        <p className="text-muted-foreground mt-1 text-xs">
                            Daftar dan riwayat kunjungan tersedia di menu
                            Pendaftaran.
                        </p>
                    )}
                </section>
            </div>
        </>
    );
}

Dashboard.layout = { breadcrumbs: [{ title: 'Ringkasan', href: dashboard() }] };
