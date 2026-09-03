import { Form, Head, Link } from '@inertiajs/react';
import { ArrowLeft, Building2, Save } from 'lucide-react';
import { FormField } from '@/components/form-field';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { dashboard } from '@/routes';
import { show, update } from '@/routes/clinics';

type Clinic = {
    uuid: string;
    name: string;
    legal_name: string | null;
    facility_type: string;
    facility_identifier: string | null;
    address: string;
    province_code: string | null;
    city_code: string | null;
    district_code: string | null;
    village_code: string | null;
    phone: string;
    email: string;
    timezone: string;
    satusehat_organization_id: string | null;
    logo_url: string | null;
};

export default function ClinicEdit({ clinic }: { clinic: Clinic }) {
    return (
        <>
            <Head title="Edit Profil Klinik" />
            <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                <PageHeader
                    eyebrow="Pengaturan klinik"
                    title="Profil Klinik"
                    description="Lengkapi identitas fasilitas yang dipakai di seluruh alur operasional."
                    actions={
                        <Button asChild variant="outline">
                            <Link href={show(clinic.uuid)}>
                                <ArrowLeft /> Kembali
                            </Link>
                        </Button>
                    }
                />

                <Form
                    {...update.form(clinic.uuid)}
                    className="grid gap-4"
                    disableWhileProcessing
                >
                    {({ errors, processing }) => (
                        <>
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-base">
                                        <Building2 className="text-primary size-4" />{' '}
                                        Identitas fasilitas
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="grid gap-4 md:grid-cols-2">
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
                                            defaultValue={
                                                clinic.legal_name ?? ''
                                            }
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
                                            <option value="clinic">
                                                Klinik
                                            </option>
                                            <option value="primary_clinic">
                                                Klinik pratama
                                            </option>
                                            <option value="dental_clinic">
                                                Klinik gigi
                                            </option>
                                            <option value="laboratory">
                                                Laboratorium
                                            </option>
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
                                            defaultValue={
                                                clinic.facility_identifier ?? ''
                                            }
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
                                            className="border-input bg-background min-h-24 rounded-md border px-3 py-2 text-sm"
                                        />
                                    </FormField>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base">
                                        Kontak dan referensi
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="grid gap-4 md:grid-cols-2">
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
                                    <FormField
                                        id="satusehat_organization_id"
                                        label="ID organisasi SATUSEHAT"
                                        error={errors.satusehat_organization_id}
                                    >
                                        <Input
                                            id="satusehat_organization_id"
                                            name="satusehat_organization_id"
                                            defaultValue={
                                                clinic.satusehat_organization_id ??
                                                ''
                                            }
                                        />
                                    </FormField>
                                    {(
                                        [
                                            'province_code',
                                            'city_code',
                                            'district_code',
                                            'village_code',
                                        ] as const
                                    ).map((field) => (
                                        <FormField
                                            key={field}
                                            id={field}
                                            label={
                                                {
                                                    province_code:
                                                        'Kode provinsi',
                                                    city_code:
                                                        'Kode kota/kabupaten',
                                                    district_code:
                                                        'Kode kecamatan',
                                                    village_code:
                                                        'Kode kelurahan/desa',
                                                }[field]
                                            }
                                            error={errors[field]}
                                        >
                                            <Input
                                                id={field}
                                                name={field}
                                                defaultValue={
                                                    clinic[field] ?? ''
                                                }
                                            />
                                        </FormField>
                                    ))}
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base">
                                        Logo klinik
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="grid gap-4 sm:grid-cols-[7rem_1fr] sm:items-center">
                                    <div className="bg-muted flex size-28 items-center justify-center overflow-hidden rounded-lg border">
                                        {clinic.logo_url ? (
                                            <img
                                                src={clinic.logo_url}
                                                alt={`Logo ${clinic.name}`}
                                                className="size-full object-contain"
                                            />
                                        ) : (
                                            <Building2 className="text-muted-foreground size-8" />
                                        )}
                                    </div>
                                    <div className="grid gap-3">
                                        <FormField
                                            id="logo"
                                            label="Unggah logo"
                                            description="PNG, JPG, atau WebP. Maksimal 2 MB."
                                            error={errors.logo}
                                        >
                                            <Input
                                                id="logo"
                                                name="logo"
                                                type="file"
                                                accept="image/png,image/jpeg,image/webp"
                                            />
                                        </FormField>
                                        {clinic.logo_url && (
                                            <label className="flex items-center gap-2 text-sm">
                                                <input
                                                    type="checkbox"
                                                    name="remove_logo"
                                                    value="1"
                                                    className="accent-primary size-4"
                                                />{' '}
                                                Hapus logo saat ini
                                            </label>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>

                            <div className="flex justify-end">
                                <Button type="submit" disabled={processing}>
                                    {processing ? <Spinner /> : <Save />} Simpan
                                    Profil
                                </Button>
                            </div>
                        </>
                    )}
                </Form>
            </div>
        </>
    );
}

ClinicEdit.layout = {
    breadcrumbs: [
        { title: 'Hari Ini', href: dashboard() },
        { title: 'Klinik', href: dashboard() },
        { title: 'Edit Profil', href: dashboard() },
    ],
};
