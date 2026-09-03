import { Head } from '@inertiajs/react';
import { PageHeader } from '@/components/page-header';
import { PatientForm } from '@/pages/patients/form';
import { dashboard } from '@/routes';
import { index } from '@/routes/patients';
import type { PatientDetail } from '@/types';

export default function EditPatient({ patient }: { patient: PatientDetail }) {
    return (
        <>
            <Head title={`Edit ${patient.name}`} />
            <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-5 p-4 md:p-6">
                <PageHeader
                    eyebrow={patient.medical_record_number}
                    title="Edit data pasien"
                    description="Perubahan identitas akan diperiksa kembali untuk mencegah data pasien ganda."
                />
                <PatientForm patient={patient} />
            </div>
        </>
    );
}

EditPatient.layout = {
    breadcrumbs: [
        { title: 'Hari Ini', href: dashboard() },
        { title: 'Pasien', href: index() },
        { title: 'Detail pasien', href: index() },
        { title: 'Edit', href: index() },
    ],
};
