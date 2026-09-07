import { Head, Link } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import {
    RegistrationForm,
    type RegistrationFormData,
} from '@/components/registration-form';
import { Button } from '@/components/ui/button';
import { dashboard } from '@/routes';
import { create, index } from '@/routes/registrations';

export default function RegistrationCreate({
    initialPatient,
    serviceUnits,
    practitioners,
    can,
}: Omit<RegistrationFormData, 'canCreatePatient'> & {
    can: { create_patient: boolean; view_list: boolean };
}) {
    return (
        <>
            <Head title="Daftar pasien" />
            <div className="flex flex-1 flex-col gap-5 p-4 md:p-6">
                <PageHeader
                    title="Pendaftaran"
                    description="Pilih pasien dan tujuan layanan untuk memulai kunjungan hari ini."
                    actions={
                        <Button asChild variant="ghost">
                            <Link href={can.view_list ? index() : dashboard()}>
                                <ArrowLeft /> Kembali
                            </Link>
                        </Button>
                    }
                />
                <RegistrationForm
                    initialPatient={initialPatient}
                    serviceUnits={serviceUnits}
                    practitioners={practitioners}
                    canCreatePatient={can.create_patient}
                />
            </div>
        </>
    );
}

RegistrationCreate.layout = {
    breadcrumbs: [
        { title: 'Pendaftaran', href: index() },
        { title: 'Daftar Pasien', href: create() },
    ],
};
