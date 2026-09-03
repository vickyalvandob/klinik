import { Head, Link } from '@inertiajs/react';
import {
    Building2,
    CheckCircle2,
    Clock3,
    Mail,
    MapPin,
    Phone,
    Settings2,
} from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { dashboard } from '@/routes';
import { edit } from '@/routes/clinics';

type Clinic = {
    uuid: string;
    name: string;
    legal_name: string | null;
    facility_type: string;
    facility_identifier: string | null;
    address: string;
    phone: string;
    email: string;
    timezone: string;
    is_active: boolean;
};

export default function ClinicShow({
    clinic,
    can,
}: {
    clinic: Clinic;
    can: { update: boolean };
}) {
    return (
        <>
            <Head title={clinic.name} />
            <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                <PageHeader
                    eyebrow="Konteks klinik aktif"
                    title={clinic.name}
                    description="Informasi ini hanya dapat dibuka oleh membership aktif pada klinik yang sama."
                    actions={
                        <>
                            <Badge
                                variant={
                                    clinic.is_active ? 'default' : 'secondary'
                                }
                            >
                                <CheckCircle2 />{' '}
                                {clinic.is_active ? 'Aktif' : 'Nonaktif'}
                            </Badge>
                            {can.update && (
                                <Button asChild>
                                    <Link href={edit(clinic.uuid)}>
                                        <Settings2 /> Edit Profil
                                    </Link>
                                </Button>
                            )}
                        </>
                    }
                />

                <div className="grid gap-4 lg:grid-cols-2">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base">
                                <Building2 className="text-primary size-4" />{' '}
                                Identitas fasilitas
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-4 text-sm">
                            <Info
                                label="Nama legal"
                                value={clinic.legal_name ?? 'Belum dilengkapi'}
                            />
                            <Info
                                label="Jenis fasilitas"
                                value={clinic.facility_type}
                            />
                            <Info
                                label="ID fasilitas"
                                value={
                                    clinic.facility_identifier ??
                                    'Belum dilengkapi'
                                }
                            />
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">
                                Kontak dan lokasi
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-4 text-sm">
                            <Contact
                                icon={MapPin}
                                label="Alamat"
                                value={clinic.address}
                            />
                            <Contact
                                icon={Phone}
                                label="Telepon"
                                value={clinic.phone}
                            />
                            <Contact
                                icon={Mail}
                                label="Email"
                                value={clinic.email}
                            />
                            <Contact
                                icon={Clock3}
                                label="Zona waktu"
                                value={clinic.timezone}
                            />
                        </CardContent>
                    </Card>
                </div>
            </div>
        </>
    );
}

function Info({ label, value }: { label: string; value: string }) {
    return (
        <div className="grid gap-1 sm:grid-cols-[10rem_1fr]">
            <span className="text-muted-foreground">{label}</span>
            <span className="font-medium">{value}</span>
        </div>
    );
}

function Contact({
    icon: Icon,
    label,
    value,
}: {
    icon: typeof MapPin;
    label: string;
    value: string;
}) {
    return (
        <div className="flex gap-3">
            <Icon className="text-primary mt-0.5 size-4 shrink-0" />
            <div className="min-w-0">
                <p className="text-muted-foreground">{label}</p>
                <p className="font-medium break-words">{value}</p>
            </div>
        </div>
    );
}

ClinicShow.layout = {
    breadcrumbs: [
        { title: 'Hari Ini', href: dashboard() },
        { title: 'Klinik', href: dashboard() },
    ],
};
