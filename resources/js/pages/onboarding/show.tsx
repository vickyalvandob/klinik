import { Form, Head } from '@inertiajs/react';
import {
    Building2,
    Check,
    ChevronRight,
    CircleUserRound,
    Stethoscope,
    Users,
    Workflow,
} from 'lucide-react';
import { FormField } from '@/components/form-field';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import {
    clinic as saveClinic,
    complete,
    doctor,
    services,
    show,
    users,
    workflow,
} from '@/routes/onboarding';

type Clinic = {
    name: string;
    legal_name: string | null;
    facility_type: string;
    facility_identifier: string | null;
    address: string;
    phone: string;
    email: string;
    timezone: string;
};

type Role = { id: number; code: string; name: string };
type Readiness = {
    practitioners: number;
    users: number;
    service_units: number;
    services: number;
    workflow: boolean;
};

const steps = [
    'Klinik',
    'Dokter',
    'Pengguna',
    'Layanan',
    'Workflow',
    'Selesai',
];

export default function OnboardingShow({
    step,
    clinic,
    roles,
    readiness,
}: {
    step: number;
    clinic: Clinic;
    roles: Role[];
    readiness: Readiness;
}) {
    return (
        <>
            <Head title="Onboarding Klinik" />
            <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 p-4 md:p-6">
                <PageHeader
                    eyebrow={`Langkah ${step} dari 6`}
                    title="Siapkan Klinik Anda"
                    description="Lengkapi konfigurasi inti agar tim dapat bekerja tanpa mengubah database secara manual."
                />

                <ol
                    className="grid grid-cols-3 gap-2 sm:grid-cols-6"
                    aria-label="Progres onboarding"
                >
                    {steps.map((label, index) => {
                        const number = index + 1;
                        const completed = number < step;
                        const active = number === step;
                        return (
                            <li
                                key={label}
                                className={`rounded-lg border px-2 py-3 text-center text-xs ${active ? 'border-primary bg-primary/5 text-primary' : completed ? 'bg-muted/60 text-foreground' : 'text-muted-foreground'}`}
                                aria-current={active ? 'step' : undefined}
                            >
                                <span
                                    className={`mx-auto mb-1 flex size-6 items-center justify-center rounded-full ${active ? 'bg-primary text-primary-foreground' : completed ? 'bg-foreground text-background' : 'bg-muted'}`}
                                >
                                    {completed ? (
                                        <Check className="size-3.5" />
                                    ) : (
                                        number
                                    )}
                                </span>
                                {label}
                            </li>
                        );
                    })}
                </ol>

                {step === 1 && <ClinicStep clinic={clinic} />}
                {step === 2 && <DoctorStep />}
                {step === 3 && <UsersStep roles={roles} />}
                {step === 4 && <ServicesStep />}
                {step === 5 && <WorkflowStep />}
                {step === 6 && <CompleteStep readiness={readiness} />}
            </div>
        </>
    );
}

function ClinicStep({ clinic }: { clinic: Clinic }) {
    return (
        <StepCard
            icon={Building2}
            title="Identitas klinik"
            description="Data ini akan dipakai pada dokumen, antrean, dan komunikasi pasien."
        >
            <Form
                {...saveClinic.form()}
                className="grid gap-4 md:grid-cols-2"
                disableWhileProcessing
            >
                {({ errors, processing }) => (
                    <>
                        <FormField
                            id="name"
                            label="Nama klinik"
                            error={errors.name}
                            required
                        >
                            <Input
                                id="name"
                                name="name"
                                defaultValue={clinic.name}
                            />
                        </FormField>
                        <FormField
                            id="legal_name"
                            label="Nama legal"
                            error={errors.legal_name}
                        >
                            <Input
                                id="legal_name"
                                name="legal_name"
                                defaultValue={clinic.legal_name ?? ''}
                            />
                        </FormField>
                        <FormField
                            id="facility_type"
                            label="Jenis fasilitas"
                            error={errors.facility_type}
                            required
                        >
                            <select
                                id="facility_type"
                                name="facility_type"
                                defaultValue={clinic.facility_type}
                                className="border-input bg-background h-9 rounded-md border px-3 text-sm"
                            >
                                <option value="clinic">Klinik</option>
                                <option value="primary_clinic">
                                    Klinik pratama
                                </option>
                                <option value="dental_clinic">
                                    Klinik gigi
                                </option>
                                <option value="laboratory">Laboratorium</option>
                            </select>
                        </FormField>
                        <FormField
                            id="facility_identifier"
                            label="Nomor fasilitas"
                            error={errors.facility_identifier}
                        >
                            <Input
                                id="facility_identifier"
                                name="facility_identifier"
                                defaultValue={clinic.facility_identifier ?? ''}
                            />
                        </FormField>
                        <FormField
                            id="address"
                            label="Alamat lengkap"
                            error={errors.address}
                            className="md:col-span-2"
                            required
                        >
                            <textarea
                                id="address"
                                name="address"
                                defaultValue={clinic.address}
                                rows={3}
                                className="border-input bg-background rounded-md border px-3 py-2 text-sm"
                            />
                        </FormField>
                        <FormField
                            id="phone"
                            label="Telepon"
                            error={errors.phone}
                            required
                        >
                            <Input
                                id="phone"
                                name="phone"
                                defaultValue={clinic.phone}
                            />
                        </FormField>
                        <FormField
                            id="email"
                            label="Email klinik"
                            error={errors.email}
                            required
                        >
                            <Input
                                id="email"
                                name="email"
                                type="email"
                                defaultValue={clinic.email}
                            />
                        </FormField>
                        <FormField
                            id="timezone"
                            label="Zona waktu"
                            error={errors.timezone}
                            required
                        >
                            <select
                                id="timezone"
                                name="timezone"
                                defaultValue={clinic.timezone}
                                className="border-input bg-background h-9 rounded-md border px-3 text-sm"
                            >
                                <option value="Asia/Jakarta">
                                    WIB — Asia/Jakarta
                                </option>
                                <option value="Asia/Makassar">
                                    WITA — Asia/Makassar
                                </option>
                                <option value="Asia/Jayapura">
                                    WIT — Asia/Jayapura
                                </option>
                            </select>
                        </FormField>
                        <NextButton processing={processing} />
                    </>
                )}
            </Form>
        </StepCard>
    );
}

function DoctorStep() {
    return (
        <StepCard
            icon={Stethoscope}
            title="Dokter penanggung jawab"
            description="Buat profil praktisi pertama. Akun login dokter dapat ditambahkan pada langkah berikutnya."
        >
            <Form
                {...doctor.form()}
                className="grid gap-4 md:grid-cols-2"
                disableWhileProcessing
            >
                {({ errors, processing }) => (
                    <>
                        <FormField
                            id="doctor_name"
                            label="Nama dokter"
                            error={errors.name}
                            required
                        >
                            <Input
                                id="doctor_name"
                                name="name"
                                placeholder="dr. Nama Dokter"
                            />
                        </FormField>
                        <FormField
                            id="employee_number"
                            label="Nomor pegawai"
                            error={errors.employee_number}
                        >
                            <Input
                                id="employee_number"
                                name="employee_number"
                                placeholder="STF-001"
                            />
                        </FormField>
                        <FormField
                            id="doctor_email"
                            label="Email"
                            error={errors.email}
                        >
                            <Input
                                id="doctor_email"
                                name="email"
                                type="email"
                            />
                        </FormField>
                        <FormField
                            id="doctor_phone"
                            label="Telepon"
                            error={errors.phone}
                        >
                            <Input id="doctor_phone" name="phone" />
                        </FormField>
                        <FormField
                            id="specialization"
                            label="Spesialisasi"
                            error={errors.specialization}
                        >
                            <Input
                                id="specialization"
                                name="specialization"
                                defaultValue="Dokter umum"
                            />
                        </FormField>
                        <FormField
                            id="license_number"
                            label="Nomor STR"
                            error={errors.license_number}
                            required
                        >
                            <Input id="license_number" name="license_number" />
                        </FormField>
                        <FormField
                            id="practice_license_number"
                            label="Nomor SIP"
                            error={errors.practice_license_number}
                        >
                            <Input
                                id="practice_license_number"
                                name="practice_license_number"
                            />
                        </FormField>
                        <NextButton processing={processing} />
                    </>
                )}
            </Form>
        </StepCard>
    );
}

function UsersStep({ roles }: { roles: Role[] }) {
    return (
        <StepCard
            icon={Users}
            title="Pengguna operasional"
            description="Tambahkan satu akun petugas sekarang, atau lanjutkan dan atur seluruh tim dari menu Pengguna."
        >
            <Form
                {...users.form()}
                className="grid gap-4 md:grid-cols-2"
                disableWhileProcessing
            >
                {({ errors, processing }) => (
                    <>
                        <input type="hidden" name="skip" value="0" />
                        <FormField
                            id="user_name"
                            label="Nama pengguna"
                            error={errors.name}
                            required
                        >
                            <Input id="user_name" name="name" />
                        </FormField>
                        <FormField
                            id="user_email"
                            label="Email login"
                            error={errors.email}
                            required
                        >
                            <Input id="user_email" name="email" type="email" />
                        </FormField>
                        <FormField
                            id="role_id"
                            label="Peran"
                            error={errors.role_id}
                            required
                        >
                            <select
                                id="role_id"
                                name="role_id"
                                defaultValue=""
                                className="border-input bg-background h-9 rounded-md border px-3 text-sm"
                            >
                                <option value="" disabled>
                                    Pilih peran
                                </option>
                                {roles.map((role) => (
                                    <option key={role.id} value={role.id}>
                                        {role.name}
                                    </option>
                                ))}
                            </select>
                        </FormField>
                        <FormField
                            id="password"
                            label="Kata sandi sementara"
                            error={errors.password}
                            required
                        >
                            <Input
                                id="password"
                                name="password"
                                type="password"
                                autoComplete="new-password"
                            />
                        </FormField>
                        <FormField
                            id="password_confirmation"
                            label="Konfirmasi kata sandi"
                            className="md:col-start-2"
                            required
                        >
                            <Input
                                id="password_confirmation"
                                name="password_confirmation"
                                type="password"
                                autoComplete="new-password"
                            />
                        </FormField>
                        <NextButton processing={processing} />
                    </>
                )}
            </Form>
            <div className="mt-5 border-t pt-4">
                <Form {...users.form()}>
                    <input type="hidden" name="skip" value="1" />
                    <Button type="submit" variant="ghost">
                        Tambahkan pengguna nanti
                    </Button>
                </Form>
            </div>
        </StepCard>
    );
}

function ServicesStep() {
    return (
        <StepCard
            icon={CircleUserRound}
            title="Unit dan layanan pertama"
            description="Buat satu unit pelayanan beserta tarif layanan utamanya."
        >
            <Form
                {...services.form()}
                className="grid gap-4 md:grid-cols-2"
                disableWhileProcessing
            >
                {({ errors, processing }) => (
                    <>
                        <FormField
                            id="unit_code"
                            label="Kode unit"
                            error={errors.unit_code}
                            required
                        >
                            <Input
                                id="unit_code"
                                name="unit_code"
                                defaultValue="PU"
                            />
                        </FormField>
                        <FormField
                            id="unit_name"
                            label="Nama unit"
                            error={errors.unit_name}
                            required
                        >
                            <Input
                                id="unit_name"
                                name="unit_name"
                                defaultValue="Poli Umum"
                            />
                        </FormField>
                        <FormField
                            id="queue_prefix"
                            label="Prefix antrean"
                            error={errors.queue_prefix}
                            required
                        >
                            <Input
                                id="queue_prefix"
                                name="queue_prefix"
                                defaultValue="A"
                            />
                        </FormField>
                        <div className="hidden md:block" />
                        <FormField
                            id="service_code"
                            label="Kode layanan"
                            error={errors.service_code}
                            required
                        >
                            <Input
                                id="service_code"
                                name="service_code"
                                defaultValue="KONS-UMUM"
                            />
                        </FormField>
                        <FormField
                            id="service_name"
                            label="Nama layanan"
                            error={errors.service_name}
                            required
                        >
                            <Input
                                id="service_name"
                                name="service_name"
                                defaultValue="Konsultasi Dokter Umum"
                            />
                        </FormField>
                        <FormField
                            id="price"
                            label="Tarif"
                            error={errors.price}
                            required
                        >
                            <Input
                                id="price"
                                name="price"
                                type="number"
                                min={0}
                                step={500}
                                defaultValue={75000}
                            />
                        </FormField>
                        <FormField
                            id="duration_minutes"
                            label="Durasi (menit)"
                            error={errors.duration_minutes}
                            required
                        >
                            <Input
                                id="duration_minutes"
                                name="duration_minutes"
                                type="number"
                                min={5}
                                step={5}
                                defaultValue={20}
                            />
                        </FormField>
                        <NextButton processing={processing} />
                    </>
                )}
            </Form>
        </StepCard>
    );
}

function WorkflowStep() {
    return (
        <StepCard
            icon={Workflow}
            title="Workflow pelayanan"
            description="Tentukan jam operasional dan jalur default pasien."
        >
            <Form
                {...workflow.form()}
                className="grid gap-4"
                disableWhileProcessing
            >
                {({ errors, processing }) => (
                    <>
                        <div className="grid gap-4 sm:grid-cols-3">
                            <FormField
                                id="opening_time"
                                label="Jam buka"
                                error={errors.opening_time}
                                required
                            >
                                <Input
                                    id="opening_time"
                                    name="opening_time"
                                    type="time"
                                    defaultValue="08:00"
                                />
                            </FormField>
                            <FormField
                                id="closing_time"
                                label="Jam tutup"
                                error={errors.closing_time}
                                required
                            >
                                <Input
                                    id="closing_time"
                                    name="closing_time"
                                    type="time"
                                    defaultValue="17:00"
                                />
                            </FormField>
                            <FormField
                                id="default_visit_duration_minutes"
                                label="Durasi kunjungan"
                                error={errors.default_visit_duration_minutes}
                                required
                            >
                                <Input
                                    id="default_visit_duration_minutes"
                                    name="default_visit_duration_minutes"
                                    type="number"
                                    min={5}
                                    step={5}
                                    defaultValue={20}
                                />
                            </FormField>
                        </div>
                        <div className="grid gap-3 md:grid-cols-2">
                            <OnboardingToggle
                                name="require_triage"
                                label="Wajib triase"
                            />
                            <OnboardingToggle
                                name="allow_walk_in"
                                label="Izinkan pasien walk-in"
                            />
                            <OnboardingToggle
                                name="pharmacy_enabled"
                                label="Aktifkan alur farmasi"
                            />
                            <OnboardingToggle
                                name="auto_send_prescription_to_pharmacy"
                                label="Kirim resep otomatis ke farmasi"
                            />
                        </div>
                        <NextButton processing={processing} />
                    </>
                )}
            </Form>
        </StepCard>
    );
}

function CompleteStep({ readiness }: { readiness: Readiness }) {
    const checks = [
        ['Dokter aktif', readiness.practitioners > 0],
        ['Pengguna dapat login', readiness.users > 0],
        ['Unit layanan tersedia', readiness.service_units > 0],
        ['Layanan dan tarif tersedia', readiness.services > 0],
        ['Workflow tersimpan', readiness.workflow],
    ] as Array<[string, boolean]>;

    return (
        <StepCard
            icon={Check}
            title="Klinik siap digunakan"
            description="Konfigurasi inti sudah tersimpan. Anda tetap dapat mengubah semuanya dari menu Pengelolaan."
        >
            <div className="grid gap-2 sm:grid-cols-2">
                {checks.map(([label, ready]) => (
                    <div
                        key={label}
                        className="flex items-center gap-2 rounded-lg border p-3 text-sm"
                    >
                        <span
                            className={`flex size-6 items-center justify-center rounded-full ${ready ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'}`}
                        >
                            <Check className="size-4" />
                        </span>
                        {label}
                    </div>
                ))}
            </div>
            <Form {...complete.form()} className="mt-6 flex justify-end">
                {({ processing }) => (
                    <Button type="submit" size="lg" disabled={processing}>
                        {processing ? <Spinner /> : <Check />} Selesaikan
                        Onboarding
                    </Button>
                )}
            </Form>
        </StepCard>
    );
}

function StepCard({
    icon: Icon,
    title,
    description,
    children,
}: {
    icon: typeof Building2;
    title: string;
    description: string;
    children: React.ReactNode;
}) {
    return (
        <Card>
            <CardHeader>
                <div className="bg-primary/10 text-primary mb-2 flex size-10 items-center justify-center rounded-lg">
                    <Icon className="size-5" />
                </div>
                <CardTitle>{title}</CardTitle>
                <p className="text-muted-foreground text-sm">{description}</p>
            </CardHeader>
            <CardContent>{children}</CardContent>
        </Card>
    );
}

function NextButton({ processing }: { processing: boolean }) {
    return (
        <div className="flex justify-end md:col-span-2">
            <Button type="submit" disabled={processing}>
                {processing ? <Spinner /> : <ChevronRight />} Simpan & Lanjutkan
            </Button>
        </div>
    );
}

function OnboardingToggle({ name, label }: { name: string; label: string }) {
    return (
        <label className="flex items-center gap-3 rounded-lg border p-4 text-sm font-medium">
            <input type="hidden" name={name} value="0" />
            <input
                type="checkbox"
                name={name}
                value="1"
                defaultChecked
                className="accent-primary size-4"
            />
            {label}
        </label>
    );
}

OnboardingShow.layout = {
    breadcrumbs: [{ title: 'Onboarding', href: show() }],
};
