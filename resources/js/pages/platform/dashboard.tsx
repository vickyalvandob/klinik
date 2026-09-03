import { Head, Link } from '@inertiajs/react';
import {
    Building2,
    ChevronRight,
    CircleUserRound,
    ShieldCheck,
} from 'lucide-react';
import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { show as showTenant } from '@/routes/platform/tenants';

type Summary = {
    tenants: number;
    active_clinics: number;
    active_users: number;
};

type Tenant = {
    uuid: string;
    name: string;
    slug: string;
    status: 'active' | 'suspended' | 'cancelled';
    trial_ends_at: string | null;
};

export default function PlatformDashboard({
    summary,
    tenants,
}: {
    summary: Summary;
    tenants: Tenant[];
}) {
    return (
        <>
            <Head title="Platform Admin" />
            <div className="grid gap-6">
                <PageHeader
                    eyebrow="Control plane SaaS"
                    title="Platform Admin"
                    description="Pantau tenant dan klinik tanpa membuka isi rekam medis klinis."
                />

                <section
                    className="grid gap-3 sm:grid-cols-3"
                    aria-label="Ringkasan platform"
                >
                    <Metric
                        label="Tenant"
                        value={summary.tenants}
                        icon={ShieldCheck}
                    />
                    <Metric
                        label="Klinik aktif"
                        value={summary.active_clinics}
                        icon={Building2}
                    />
                    <Metric
                        label="Pengguna aktif"
                        value={summary.active_users}
                        icon={CircleUserRound}
                    />
                </section>

                <Card>
                    <CardContent className="p-0">
                        {tenants.length === 0 ? (
                            <EmptyState
                                icon={Building2}
                                title="Belum ada tenant"
                                description="Tenant baru akan tampil di sini setelah akun klinik dibuat."
                                className="border-0"
                            />
                        ) : (
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Tenant</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>
                                                Trial berakhir
                                            </TableHead>
                                            <TableHead className="w-12">
                                                <span className="sr-only">
                                                    Buka
                                                </span>
                                            </TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {tenants.map((tenant) => (
                                            <TableRow key={tenant.uuid}>
                                                <TableCell>
                                                    <Link
                                                        href={showTenant(
                                                            tenant.uuid,
                                                        )}
                                                        className="font-medium hover:underline"
                                                    >
                                                        {tenant.name}
                                                    </Link>
                                                    <p className="text-muted-foreground text-xs">
                                                        {tenant.slug}
                                                    </p>
                                                </TableCell>
                                                <TableCell>
                                                    <StatusBadge
                                                        status={tenant.status}
                                                    />
                                                </TableCell>
                                                <TableCell className="whitespace-nowrap">
                                                    {tenant.trial_ends_at
                                                        ? new Intl.DateTimeFormat(
                                                              'id-ID',
                                                              {
                                                                  dateStyle:
                                                                      'medium',
                                                              },
                                                          ).format(
                                                              new Date(
                                                                  tenant.trial_ends_at,
                                                              ),
                                                          )
                                                        : 'Tidak ada'}
                                                </TableCell>
                                                <TableCell>
                                                    <Link
                                                        href={showTenant(
                                                            tenant.uuid,
                                                        )}
                                                        aria-label={`Buka ${tenant.name}`}
                                                    >
                                                        <ChevronRight className="size-4" />
                                                    </Link>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <p className="text-muted-foreground text-sm">
                    Plan, subscription, usage, dan system health akan dilengkapi
                    pada fase SaaS berikutnya.
                </p>
            </div>
        </>
    );
}

function Metric({
    label,
    value,
    icon: Icon,
}: {
    label: string;
    value: number;
    icon: typeof ShieldCheck;
}) {
    return (
        <Card>
            <CardContent className="flex items-center justify-between p-4">
                <div>
                    <p className="text-muted-foreground text-sm">{label}</p>
                    <p className="mt-1 text-2xl font-semibold">{value}</p>
                </div>
                <Icon className="text-primary size-5" />
            </CardContent>
        </Card>
    );
}

function StatusBadge({ status }: { status: Tenant['status'] }) {
    const labels = {
        active: 'Aktif',
        suspended: 'Ditangguhkan',
        cancelled: 'Dibatalkan',
    };

    return (
        <Badge
            variant={
                status === 'active'
                    ? 'default'
                    : status === 'suspended'
                      ? 'secondary'
                      : 'destructive'
            }
        >
            {labels[status]}
        </Badge>
    );
}
