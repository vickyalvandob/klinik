import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, Building2, Mail, Phone } from 'lucide-react';
import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { index as platformIndex } from '@/routes/platform';

type Tenant = {
    uuid: string;
    name: string;
    slug: string;
    status: 'active' | 'suspended' | 'cancelled';
    trial_ends_at: string | null;
};

type Clinic = {
    uuid: string;
    name: string;
    facility_type: string;
    email: string;
    phone: string;
    is_active: boolean;
};

export default function PlatformTenantShow({
    tenant,
    clinics,
}: {
    tenant: Tenant;
    clinics: Clinic[];
}) {
    return (
        <>
            <Head title={tenant.name} />
            <div className="grid gap-6">
                <PageHeader
                    eyebrow="Tenant SaaS"
                    title={tenant.name}
                    description={`Slug: ${tenant.slug}. Halaman ini sengaja tidak memuat data klinis.`}
                    actions={
                        <Button asChild variant="outline">
                            <Link href={platformIndex()}>
                                <ArrowLeft /> Kembali
                            </Link>
                        </Button>
                    }
                />

                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">
                            Status tenant
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-wrap items-center gap-3 text-sm">
                        <Badge
                            variant={
                                tenant.status === 'active'
                                    ? 'default'
                                    : 'secondary'
                            }
                        >
                            {tenant.status === 'active'
                                ? 'Aktif'
                                : tenant.status === 'suspended'
                                  ? 'Ditangguhkan'
                                  : 'Dibatalkan'}
                        </Badge>
                        <span className="text-muted-foreground">
                            Trial:{' '}
                            {tenant.trial_ends_at
                                ? new Intl.DateTimeFormat('id-ID', {
                                      dateStyle: 'long',
                                  }).format(new Date(tenant.trial_ends_at))
                                : 'tidak ada'}
                        </span>
                    </CardContent>
                </Card>

                <section
                    className="grid gap-3"
                    aria-labelledby="clinics-heading"
                >
                    <h2 id="clinics-heading" className="text-lg font-semibold">
                        Klinik
                    </h2>
                    {clinics.length === 0 ? (
                        <EmptyState
                            icon={Building2}
                            title="Belum ada klinik"
                            description="Tenant ini belum mempunyai fasilitas klinik."
                        />
                    ) : (
                        <div className="grid gap-3 md:grid-cols-2">
                            {clinics.map((clinic) => (
                                <Card key={clinic.uuid}>
                                    <CardContent className="grid gap-3 p-4">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <h3 className="truncate font-semibold">
                                                    {clinic.name}
                                                </h3>
                                                <p className="text-muted-foreground text-xs">
                                                    {clinic.facility_type}
                                                </p>
                                            </div>
                                            <Badge
                                                variant={
                                                    clinic.is_active
                                                        ? 'outline'
                                                        : 'secondary'
                                                }
                                            >
                                                {clinic.is_active
                                                    ? 'Aktif'
                                                    : 'Nonaktif'}
                                            </Badge>
                                        </div>
                                        <p className="text-muted-foreground flex items-center gap-2 text-sm break-all">
                                            <Mail className="size-4 shrink-0" />{' '}
                                            {clinic.email}
                                        </p>
                                        <p className="text-muted-foreground flex items-center gap-2 text-sm">
                                            <Phone className="size-4 shrink-0" />{' '}
                                            {clinic.phone}
                                        </p>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </section>
            </div>
        </>
    );
}
