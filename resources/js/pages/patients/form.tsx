import { Form, Link } from '@inertiajs/react';
import {
    AlertTriangle,
    Check,
    CirclePlus,
    LoaderCircle,
    Save,
    ShieldAlert,
    X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { FormField } from '@/components/form-field';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { duplicates, index, show, store, update } from '@/routes/patients';
import type {
    PatientAllergy,
    PatientDetail,
    PatientDuplicateCandidate,
} from '@/types';

type AllergyRow = Omit<PatientAllergy, 'code_system' | 'code' | 'noted_at'> & {
    clientId: string;
};

const selectClassName =
    'border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 h-9 w-full rounded-md border px-3 text-sm outline-none focus-visible:ring-[3px]';
const textareaClassName =
    'border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 min-h-24 w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-[3px]';

export function PatientForm({ patient }: { patient?: PatientDetail }) {
    const [name, setName] = useState(patient?.name ?? '');
    const [birthDate, setBirthDate] = useState(patient?.birth_date ?? '');
    const [nationalIdNumber, setNationalIdNumber] = useState(
        patient?.national_id_number ?? '',
    );
    const [phone, setPhone] = useState(patient?.phone ?? '');
    const [candidates, setCandidates] = useState<PatientDuplicateCandidate[]>(
        [],
    );
    const [checkingDuplicates, setCheckingDuplicates] = useState(false);
    const [duplicateReviewed, setDuplicateReviewed] = useState(false);
    const [allergies, setAllergies] = useState<AllergyRow[]>(
        patient?.allergies.map((allergy) => ({
            uuid: allergy.uuid,
            clientId: allergy.uuid,
            substance: allergy.substance,
            reaction: allergy.reaction,
            severity: allergy.severity,
            status: allergy.status,
        })) ?? [],
    );

    const formRoute = patient ? update.form(patient.uuid) : store.form();
    const hasExactNationalId = candidates.some(
        (candidate) => candidate.exact_national_id,
    );

    useEffect(() => {
        const normalizedNik = nationalIdNumber.replace(/\D/g, '');
        const normalizedPhone = phone.replace(/\D/g, '');
        const hasEnoughIdentity =
            normalizedNik.length === 16 ||
            normalizedPhone.length >= 8 ||
            (name.trim().length >= 3 && birthDate !== '');

        if (!hasEnoughIdentity) {
            return;
        }

        const abortController = new AbortController();
        const timer = window.setTimeout(async () => {
            setCheckingDuplicates(true);

            try {
                const response = await fetch(
                    duplicates.url({
                        query: {
                            name: name || undefined,
                            birth_date: birthDate || undefined,
                            national_id_number: nationalIdNumber || undefined,
                            phone: phone || undefined,
                            except: patient?.uuid,
                        },
                    }),
                    {
                        headers: { Accept: 'application/json' },
                        signal: abortController.signal,
                    },
                );

                if (!response.ok) {
                    setCandidates([]);
                    return;
                }

                const result = (await response.json()) as {
                    candidates: PatientDuplicateCandidate[];
                };
                setCandidates(result.candidates);
                setDuplicateReviewed(result.candidates.length === 0);
            } catch (error) {
                if (
                    !(
                        error instanceof DOMException &&
                        error.name === 'AbortError'
                    )
                ) {
                    setCandidates([]);
                }
            } finally {
                if (!abortController.signal.aborted) {
                    setCheckingDuplicates(false);
                }
            }
        }, 450);

        return () => {
            window.clearTimeout(timer);
            abortController.abort();
        };
    }, [birthDate, name, nationalIdNumber, patient?.uuid, phone]);

    function identityChanged(setter: (value: string) => void, value: string) {
        setter(value);
        setCandidates([]);
        setDuplicateReviewed(false);
        setCheckingDuplicates(false);
    }

    function addAllergy() {
        setAllergies((current) => [
            ...current,
            {
                clientId: crypto.randomUUID(),
                uuid: '',
                substance: '',
                reaction: '',
                severity: null,
                status: 'active',
            },
        ]);
    }

    function updateAllergy(
        clientId: string,
        values: Partial<Omit<AllergyRow, 'clientId'>>,
    ) {
        setAllergies((current) =>
            current.map((allergy) =>
                allergy.clientId === clientId
                    ? { ...allergy, ...values }
                    : allergy,
            ),
        );
    }

    function cancelNewAllergy(clientId: string) {
        setAllergies((current) =>
            current.filter((allergy) => allergy.clientId !== clientId),
        );
    }

    return (
        <Form {...formRoute} className="grid gap-5" disableWhileProcessing>
            {({ errors, processing }) => (
                <>
                    <input
                        type="hidden"
                        name="duplicate_reviewed"
                        value={duplicateReviewed ? '1' : '0'}
                    />

                    <FormSection
                        number="01"
                        title="Identitas pasien"
                        description="Gunakan identitas sesuai dokumen resmi agar pasien mudah ditemukan kembali."
                    >
                        <div className="grid gap-4 md:grid-cols-2">
                            <FormField
                                id="name"
                                label="Nama lengkap"
                                error={errors.name}
                                required
                                className="md:col-span-2"
                            >
                                <Input
                                    id="name"
                                    name="name"
                                    value={name}
                                    onChange={(event) =>
                                        identityChanged(
                                            setName,
                                            event.target.value,
                                        )
                                    }
                                    autoComplete="name"
                                    placeholder="Contoh: Budi Santoso"
                                    aria-invalid={Boolean(errors.name)}
                                />
                            </FormField>
                            <FormField
                                id="national_id_number"
                                label="NIK"
                                error={errors.national_id_number}
                                description="16 digit. Boleh dikosongkan jika belum tersedia."
                            >
                                <Input
                                    id="national_id_number"
                                    name="national_id_number"
                                    inputMode="numeric"
                                    value={nationalIdNumber}
                                    onChange={(event) =>
                                        identityChanged(
                                            setNationalIdNumber,
                                            event.target.value,
                                        )
                                    }
                                    maxLength={19}
                                    placeholder="3201xxxxxxxxxxxx"
                                    aria-invalid={Boolean(
                                        errors.national_id_number,
                                    )}
                                />
                            </FormField>
                            <FormField
                                id="birth_date"
                                label="Tanggal lahir"
                                error={errors.birth_date}
                                required
                            >
                                <Input
                                    id="birth_date"
                                    name="birth_date"
                                    type="date"
                                    value={birthDate}
                                    max={new Date().toISOString().slice(0, 10)}
                                    onChange={(event) =>
                                        identityChanged(
                                            setBirthDate,
                                            event.target.value,
                                        )
                                    }
                                    aria-invalid={Boolean(errors.birth_date)}
                                />
                            </FormField>
                            <FormField
                                id="gender"
                                label="Jenis kelamin"
                                error={errors.gender}
                                required
                            >
                                <select
                                    id="gender"
                                    name="gender"
                                    defaultValue={patient?.gender ?? ''}
                                    className={selectClassName}
                                    aria-invalid={Boolean(errors.gender)}
                                >
                                    <option value="" disabled>
                                        Pilih jenis kelamin
                                    </option>
                                    <option value="male">Laki-laki</option>
                                    <option value="female">Perempuan</option>
                                </select>
                            </FormField>
                            <FormField
                                id="blood_type"
                                label="Golongan darah"
                                error={errors.blood_type}
                            >
                                <select
                                    id="blood_type"
                                    name="blood_type"
                                    defaultValue={patient?.blood_type ?? ''}
                                    className={selectClassName}
                                >
                                    <option value="">Belum diketahui</option>
                                    <option value="A">A</option>
                                    <option value="B">B</option>
                                    <option value="AB">AB</option>
                                    <option value="O">O</option>
                                </select>
                            </FormField>
                        </div>

                        <DuplicateReview
                            candidates={candidates}
                            checking={checkingDuplicates}
                            reviewed={duplicateReviewed}
                            onReviewedChange={setDuplicateReviewed}
                            error={errors.duplicate_reviewed}
                        />
                    </FormSection>

                    <FormSection
                        number="02"
                        title="Kontak"
                        description="Kontak membantu pencarian cepat dan komunikasi administratif."
                    >
                        <div className="grid gap-4 md:grid-cols-2">
                            <FormField
                                id="phone"
                                label="Nomor telepon"
                                error={errors.phone}
                            >
                                <Input
                                    id="phone"
                                    name="phone"
                                    inputMode="tel"
                                    value={phone}
                                    onChange={(event) =>
                                        identityChanged(
                                            setPhone,
                                            event.target.value,
                                        )
                                    }
                                    autoComplete="tel"
                                    placeholder="0812xxxxxxxx"
                                    aria-invalid={Boolean(errors.phone)}
                                />
                            </FormField>
                            <FormField
                                id="email"
                                label="Email"
                                error={errors.email}
                            >
                                <Input
                                    id="email"
                                    name="email"
                                    type="email"
                                    defaultValue={patient?.email ?? ''}
                                    autoComplete="email"
                                    placeholder="pasien@example.com"
                                />
                            </FormField>
                            <FormField
                                id="occupation"
                                label="Pekerjaan"
                                error={errors.occupation}
                                className="md:col-span-2"
                            >
                                <Input
                                    id="occupation"
                                    name="occupation"
                                    defaultValue={patient?.occupation ?? ''}
                                    placeholder="Contoh: Wiraswasta"
                                />
                            </FormField>
                        </div>
                    </FormSection>

                    <FormSection
                        number="03"
                        title="Alamat"
                        description="Kode wilayah bersifat opsional dan disiapkan untuk integrasi berikutnya."
                    >
                        <div className="grid gap-4 md:grid-cols-2">
                            <FormField
                                id="address"
                                label="Alamat lengkap"
                                error={errors.address}
                                className="md:col-span-2"
                            >
                                <textarea
                                    id="address"
                                    name="address"
                                    defaultValue={patient?.address ?? ''}
                                    className={textareaClassName}
                                    placeholder="Jalan, nomor rumah, RT/RW, dan keterangan lokasi"
                                />
                            </FormField>
                            {[
                                ['province_code', 'Kode provinsi'],
                                ['city_code', 'Kode kota/kabupaten'],
                                ['district_code', 'Kode kecamatan'],
                                ['village_code', 'Kode kelurahan/desa'],
                            ].map(([key, label]) => (
                                <FormField
                                    key={key}
                                    id={key}
                                    label={label}
                                    error={errors[key]}
                                >
                                    <Input
                                        id={key}
                                        name={key}
                                        defaultValue={
                                            patient?.[
                                                key as keyof PatientDetail
                                            ] as string | undefined
                                        }
                                    />
                                </FormField>
                            ))}
                        </div>
                    </FormSection>

                    <FormSection
                        number="04"
                        title="Kontak darurat"
                        description="Isi jika ada orang yang dapat dihubungi ketika diperlukan."
                    >
                        <div className="grid gap-4 md:grid-cols-2">
                            <FormField
                                id="emergency_contact_name"
                                label="Nama kontak"
                                error={errors.emergency_contact_name}
                            >
                                <Input
                                    id="emergency_contact_name"
                                    name="emergency_contact_name"
                                    defaultValue={
                                        patient?.emergency_contact_name ?? ''
                                    }
                                />
                            </FormField>
                            <FormField
                                id="emergency_contact_phone"
                                label="Nomor telepon"
                                error={errors.emergency_contact_phone}
                            >
                                <Input
                                    id="emergency_contact_phone"
                                    name="emergency_contact_phone"
                                    inputMode="tel"
                                    defaultValue={
                                        patient?.emergency_contact_phone ?? ''
                                    }
                                    placeholder="0812xxxxxxxx"
                                />
                            </FormField>
                        </div>
                    </FormSection>

                    <FormSection
                        number="05"
                        title="Alergi"
                        description="Catat zat pemicu dan reaksi yang diketahui. Riwayat lama dinonaktifkan, bukan dihapus."
                        action={
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={addAllergy}
                            >
                                <CirclePlus /> Tambah alergi
                            </Button>
                        }
                    >
                        {allergies.length === 0 ? (
                            <div className="bg-muted/30 rounded-lg border border-dashed px-4 py-6 text-center">
                                <p className="text-sm font-medium">
                                    Belum ada alergi tercatat
                                </p>
                                <p className="text-muted-foreground mt-1 text-xs">
                                    Tambahkan hanya jika pasien menyampaikan
                                    alergi yang diketahui.
                                </p>
                            </div>
                        ) : (
                            <div className="grid gap-3">
                                {allergies.map((allergy, index) => (
                                    <div
                                        key={allergy.clientId}
                                        className="bg-muted/20 grid gap-4 rounded-lg border p-4"
                                    >
                                        <input
                                            type="hidden"
                                            name={`allergies[${index}][uuid]`}
                                            value={allergy.uuid}
                                        />
                                        <div className="flex items-center justify-between gap-3">
                                            <p className="text-sm font-medium">
                                                Alergi {index + 1}
                                            </p>
                                            {allergy.uuid === '' ? (
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() =>
                                                        cancelNewAllergy(
                                                            allergy.clientId,
                                                        )
                                                    }
                                                >
                                                    <X /> Batalkan baris
                                                </Button>
                                            ) : (
                                                <span className="text-muted-foreground text-xs">
                                                    Riwayat tersimpan
                                                </span>
                                            )}
                                        </div>
                                        <div className="grid gap-4 md:grid-cols-2">
                                            <FormField
                                                id={`allergy-${index}-substance`}
                                                label="Zat pemicu"
                                                error={
                                                    errors[
                                                        `allergies.${index}.substance`
                                                    ]
                                                }
                                                required
                                            >
                                                <Input
                                                    id={`allergy-${index}-substance`}
                                                    name={`allergies[${index}][substance]`}
                                                    value={allergy.substance}
                                                    onChange={(event) =>
                                                        updateAllergy(
                                                            allergy.clientId,
                                                            {
                                                                substance:
                                                                    event.target
                                                                        .value,
                                                            },
                                                        )
                                                    }
                                                    placeholder="Contoh: Penisilin"
                                                />
                                            </FormField>
                                            <FormField
                                                id={`allergy-${index}-reaction`}
                                                label="Reaksi"
                                                error={
                                                    errors[
                                                        `allergies.${index}.reaction`
                                                    ]
                                                }
                                            >
                                                <Input
                                                    id={`allergy-${index}-reaction`}
                                                    name={`allergies[${index}][reaction]`}
                                                    value={
                                                        allergy.reaction ?? ''
                                                    }
                                                    onChange={(event) =>
                                                        updateAllergy(
                                                            allergy.clientId,
                                                            {
                                                                reaction:
                                                                    event.target
                                                                        .value,
                                                            },
                                                        )
                                                    }
                                                    placeholder="Contoh: Ruam dan gatal"
                                                />
                                            </FormField>
                                            <FormField
                                                id={`allergy-${index}-severity`}
                                                label="Tingkat"
                                                error={
                                                    errors[
                                                        `allergies.${index}.severity`
                                                    ]
                                                }
                                            >
                                                <select
                                                    id={`allergy-${index}-severity`}
                                                    name={`allergies[${index}][severity]`}
                                                    value={
                                                        allergy.severity ?? ''
                                                    }
                                                    onChange={(event) =>
                                                        updateAllergy(
                                                            allergy.clientId,
                                                            {
                                                                severity: (event
                                                                    .target
                                                                    .value ||
                                                                    null) as AllergyRow['severity'],
                                                            },
                                                        )
                                                    }
                                                    className={selectClassName}
                                                >
                                                    <option value="">
                                                        Belum dinilai
                                                    </option>
                                                    <option value="mild">
                                                        Ringan
                                                    </option>
                                                    <option value="moderate">
                                                        Sedang
                                                    </option>
                                                    <option value="severe">
                                                        Berat
                                                    </option>
                                                </select>
                                            </FormField>
                                            <FormField
                                                id={`allergy-${index}-status`}
                                                label="Status"
                                                error={
                                                    errors[
                                                        `allergies.${index}.status`
                                                    ]
                                                }
                                                required
                                            >
                                                <select
                                                    id={`allergy-${index}-status`}
                                                    name={`allergies[${index}][status]`}
                                                    value={allergy.status}
                                                    onChange={(event) =>
                                                        updateAllergy(
                                                            allergy.clientId,
                                                            {
                                                                status: event
                                                                    .target
                                                                    .value as AllergyRow['status'],
                                                            },
                                                        )
                                                    }
                                                    className={selectClassName}
                                                >
                                                    <option value="active">
                                                        Aktif
                                                    </option>
                                                    <option value="inactive">
                                                        Tidak aktif
                                                    </option>
                                                </select>
                                            </FormField>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </FormSection>

                    <div className="bg-background/95 sticky bottom-0 z-10 flex flex-col-reverse gap-2 border-t py-3 backdrop-blur sm:flex-row sm:items-center sm:justify-end">
                        <Button asChild type="button" variant="ghost">
                            <Link href={patient ? show(patient.uuid) : index()}>
                                Batal
                            </Link>
                        </Button>
                        <Button
                            type="submit"
                            disabled={processing || hasExactNationalId}
                        >
                            {processing ? <Spinner /> : <Save />}
                            {processing
                                ? 'Menyimpan...'
                                : patient
                                  ? 'Simpan Perubahan'
                                  : 'Buat Pasien'}
                        </Button>
                    </div>
                </>
            )}
        </Form>
    );
}

function FormSection({
    number,
    title,
    description,
    action,
    children,
}: {
    number: string;
    title: string;
    description: string;
    action?: React.ReactNode;
    children: React.ReactNode;
}) {
    return (
        <section className="bg-card rounded-xl border">
            <div className="flex flex-col gap-3 border-b px-4 py-4 sm:flex-row sm:items-start sm:justify-between md:px-5">
                <div className="flex min-w-0 gap-3">
                    <span className="bg-primary/10 text-primary flex size-8 shrink-0 items-center justify-center rounded-lg text-xs font-semibold">
                        {number}
                    </span>
                    <div>
                        <h2 className="font-semibold">{title}</h2>
                        <p className="text-muted-foreground mt-1 text-xs">
                            {description}
                        </p>
                    </div>
                </div>
                {action}
            </div>
            <div className="grid gap-4 p-4 md:p-5">{children}</div>
        </section>
    );
}

function DuplicateReview({
    candidates,
    checking,
    reviewed,
    onReviewedChange,
    error,
}: {
    candidates: PatientDuplicateCandidate[];
    checking: boolean;
    reviewed: boolean;
    onReviewedChange: (reviewed: boolean) => void;
    error?: string;
}) {
    if (checking) {
        return (
            <div
                className="text-muted-foreground flex items-center gap-2 rounded-lg border border-dashed px-3 py-2 text-xs"
                aria-live="polite"
            >
                <LoaderCircle className="size-4 animate-spin" /> Memeriksa
                kemungkinan data ganda...
            </div>
        );
    }

    if (candidates.length === 0) {
        return null;
    }

    const hasExactNationalId = candidates.some(
        (candidate) => candidate.exact_national_id,
    );

    return (
        <div
            className={
                hasExactNationalId
                    ? 'rounded-lg border border-red-300 bg-red-50/60 p-4 dark:border-red-900 dark:bg-red-950/20'
                    : 'rounded-lg border border-amber-300 bg-amber-50/60 p-4 dark:border-amber-900 dark:bg-amber-950/20'
            }
            aria-live="polite"
        >
            <div className="flex items-start gap-3">
                {hasExactNationalId ? (
                    <ShieldAlert className="mt-0.5 size-5 shrink-0 text-red-700 dark:text-red-400" />
                ) : (
                    <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-700 dark:text-amber-400" />
                )}
                <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold">
                        {hasExactNationalId
                            ? 'NIK sudah terdaftar'
                            : 'Kemungkinan pasien sudah terdaftar'}
                    </h3>
                    <p className="text-muted-foreground mt-1 text-xs">
                        {hasExactNationalId
                            ? 'Gunakan data pasien yang sudah ada. NIK yang sama tidak dapat disimpan dua kali.'
                            : 'Buka kandidat untuk memastikan ini bukan pasien yang sama.'}
                    </p>
                    <div className="mt-3 grid gap-2">
                        {candidates.map((candidate) => (
                            <div
                                key={candidate.uuid}
                                className="bg-background/70 flex flex-col gap-3 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between"
                            >
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-medium">
                                        {candidate.name}
                                    </p>
                                    <p className="text-muted-foreground mt-0.5 text-xs">
                                        {candidate.medical_record_number} ·{' '}
                                        {formatDate(candidate.birth_date)} ·{' '}
                                        {candidate.gender === 'male'
                                            ? 'Laki-laki'
                                            : 'Perempuan'}
                                    </p>
                                    <p className="text-muted-foreground mt-1 text-xs">
                                        {candidate.reasons.join(', ')}
                                    </p>
                                </div>
                                <Button asChild size="sm" variant="outline">
                                    <Link
                                        href={show(candidate.uuid)}
                                        target="_blank"
                                    >
                                        Buka pasien
                                    </Link>
                                </Button>
                            </div>
                        ))}
                    </div>

                    {!hasExactNationalId && (
                        <Button
                            type="button"
                            size="sm"
                            variant={reviewed ? 'default' : 'outline'}
                            className="mt-3"
                            onClick={() => onReviewedChange(!reviewed)}
                        >
                            {reviewed ? <Check /> : <CirclePlus />}
                            {reviewed
                                ? 'Sudah diperiksa, pasien berbeda'
                                : 'Konfirmasi pasien berbeda'}
                        </Button>
                    )}
                    {error && (
                        <p className="text-destructive mt-2 text-xs">{error}</p>
                    )}
                </div>
            </div>
        </div>
    );
}

function formatDate(value: string) {
    return new Intl.DateTimeFormat('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    }).format(new Date(`${value}T00:00:00`));
}
