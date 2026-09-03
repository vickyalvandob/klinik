import { Head } from '@inertiajs/react';
import { PageHeader } from '@/components/page-header';
import { PatientForm } from '@/pages/patients/form';
import { dashboard } from '@/routes';
import { create, index } from '@/routes/patients';

export default function CreatePatient() {
    return (
        <>
            <Head title="Pasien baru" />
            <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-5 p-4 md:p-6">
                <PageHeader
                    eyebrow="Master pasien"
                    title="Pasien baru"
                    description="Isi identitas utama terlebih dahulu. Sistem memeriksa kemungkinan data ganda sebelum pasien disimpan."
                />
                <PatientForm />
            </div>
        </>
    );
}

CreatePatient.layout = {
    breadcrumbs: [
        { title: 'Hari Ini', href: dashboard() },
        { title: 'Pasien', href: index() },
        { title: 'Pasien baru', href: create() },
    ],
};
