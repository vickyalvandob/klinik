import { Head, usePage } from '@inertiajs/react';
import { ArrowRight, CalendarDays, ClipboardList, Users } from 'lucide-react';
import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { dashboard } from '@/routes';

export default function Dashboard() {
    const { currentClinic, currentMembership } = usePage().props;
    const today = new Intl.DateTimeFormat('id-ID', {
        dateStyle: 'full',
        timeZone: 'Asia/Jakarta',
    }).format(new Date());

    return (
        <>
            <Head title="Hari Ini" />
            <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                <PageHeader
                    eyebrow={today}
                    title="Hari Ini"
                    description={`Pantau alur kunjungan pasien di ${currentClinic?.name ?? 'klinik Anda'}. Akses: ${currentMembership?.role.name ?? '-'}.`}
                    actions={
                        <Button disabled title="Tersedia pada Phase 4">
                            <Users />
                            Daftar Pasien
                        </Button>
                    }
                />

                <section
                    className="grid gap-3 sm:grid-cols-3"
                    aria-label="Ringkasan hari ini"
                >
                    {[
                        {
                            label: 'Total kunjungan',
                            value: '0',
                            icon: CalendarDays,
                        },
                        { label: 'Menunggu', value: '0', icon: ClipboardList },
                        { label: 'Selesai', value: '0', icon: ArrowRight },
                    ].map((metric) => (
                        <div
                            key={metric.label}
                            className="bg-card rounded-lg border p-4"
                        >
                            <div className="flex items-center justify-between">
                                <p className="text-muted-foreground text-sm">
                                    {metric.label}
                                </p>
                                <metric.icon
                                    className="text-primary size-4"
                                    aria-hidden="true"
                                />
                            </div>
                            <p className="mt-3 text-2xl font-semibold">
                                {metric.value}
                            </p>
                        </div>
                    ))}
                </section>

                <EmptyState
                    icon={ClipboardList}
                    title="Belum ada pasien hari ini"
                    description="Daftar pasien baru akan muncul di sini dan mengikuti alur pemeriksaan klinik."
                    className="flex-1"
                />
            </div>
        </>
    );
}

Dashboard.layout = {
    breadcrumbs: [
        {
            title: 'Hari Ini',
            href: dashboard(),
        },
    ],
};
