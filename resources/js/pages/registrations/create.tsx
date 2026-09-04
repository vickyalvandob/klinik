import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowLeft, Check, Search, UserPlus, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { FormField } from '@/components/form-field';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { dashboard } from '@/routes';
import { create as createPatient } from '@/routes/patients';
import {
    create as createRegistration,
    patients as searchPatients,
    store,
} from '@/routes/registrations';
import type { RegistrationPatient } from '@/types';

type Option = { uuid: string; name: string };
type ServiceUnitOption = Option & { queue_prefix: string };
type PractitionerOption = Option & { specialization: string | null };

export default function RegistrationCreate({
    initialPatient,
    serviceUnits,
    practitioners,
}: {
    initialPatient: RegistrationPatient | null;
    serviceUnits: ServiceUnitOption[];
    practitioners: PractitionerOption[];
}) {
    const [query, setQuery] = useState(initialPatient?.name ?? '');
    const [results, setResults] = useState<RegistrationPatient[]>([]);
    const [selectedPatient, setSelectedPatient] =
        useState<RegistrationPatient | null>(initialPatient);
    const [searching, setSearching] = useState(false);
    const [searchError, setSearchError] = useState<string | null>(null);
    const form = useForm({
        patient_id: initialPatient?.uuid ?? '',
        service_unit_id: serviceUnits.length === 1 ? serviceUnits[0].uuid : '',
        practitioner_id:
            practitioners.length === 1 ? practitioners[0].uuid : '',
        chief_complaint: '',
    });

    useEffect(() => {
        const term = query.trim();

        if (term.length < 2 || selectedPatient?.name === query) {
            setResults([]);
            setSearching(false);
            setSearchError(null);

            return;
        }

        const controller = new AbortController();
        const timer = window.setTimeout(async () => {
            setSearching(true);
            setSearchError(null);

            try {
                const response = await fetch(
                    searchPatients.url({ query: { search: term } }),
                    {
                        headers: { Accept: 'application/json' },
                        signal: controller.signal,
                    },
                );

                if (!response.ok) {
                    throw new Error('Pencarian pasien gagal.');
                }

                const data = (await response.json()) as {
                    patients: RegistrationPatient[];
                };
                setResults(data.patients);
            } catch (error) {
                if (!controller.signal.aborted) {
                    setSearchError(
                        error instanceof Error
                            ? error.message
                            : 'Pencarian pasien gagal.',
                    );
                }
            } finally {
                if (!controller.signal.aborted) {
                    setSearching(false);
                }
            }
        }, 300);

        return () => {
            window.clearTimeout(timer);
            controller.abort();
        };
    }, [query, selectedPatient]);

    const canSubmit =
        form.data.patient_id !== '' &&
        serviceUnits.length > 0 &&
        practitioners.length > 0;

    return (
        <>
            <Head title="Daftar pasien" />
            <div className="flex flex-1 flex-col gap-5 p-4 md:p-6">
                <PageHeader
                    eyebrow="Kunjungan baru"
                    title="Daftar Pasien"
                    description="Cari pasien yang sudah ada, pilih layanan dan dokter, lalu pasien langsung masuk antrean yang benar."
                    actions={
                        <Button asChild variant="ghost">
                            <Link href={dashboard()}>
                                <ArrowLeft /> Kembali
                            </Link>
                        </Button>
                    }
                />

                <form
                    className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]"
                    onSubmit={(event) => {
                        event.preventDefault();
                        form.submit(store());
                    }}
                >
                    <div className="grid gap-5">
                        <section className="bg-card rounded-xl border">
                            <div className="border-b p-4 md:p-5">
                                <h2 className="font-semibold">
                                    1. Pilih pasien
                                </h2>
                                <p className="text-muted-foreground mt-1 text-xs">
                                    Cari dengan nama, nomor RM, NIK, atau
                                    telepon.
                                </p>
                            </div>
                            <div className="grid gap-3 p-4 md:p-5">
                                <FormField
                                    id="patient-search"
                                    label="Pasien"
                                    error={form.errors.patient_id}
                                    required
                                >
                                    <div className="relative">
                                        <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                                        <Input
                                            id="patient-search"
                                            value={query}
                                            onChange={(event) => {
                                                setQuery(event.target.value);
                                                setSelectedPatient(null);
                                                form.setData('patient_id', '');
                                            }}
                                            className="pl-9"
                                            placeholder="Ketik minimal 2 karakter..."
                                            autoComplete="off"
                                        />
                                    </div>
                                </FormField>

                                {selectedPatient && (
                                    <PatientOption
                                        patient={selectedPatient}
                                        selected
                                        onSelect={() => undefined}
                                    />
                                )}

                                {searching && (
                                    <p className="text-muted-foreground flex items-center gap-2 text-xs">
                                        <Spinner /> Mencari pasien...
                                    </p>
                                )}
                                {searchError && (
                                    <p
                                        className="text-destructive text-xs"
                                        role="alert"
                                    >
                                        {searchError}
                                    </p>
                                )}
                                {!searching && results.length > 0 && (
                                    <div className="grid gap-2" role="listbox">
                                        {results.map((patient) => (
                                            <PatientOption
                                                key={patient.uuid}
                                                patient={patient}
                                                selected={false}
                                                onSelect={() => {
                                                    setSelectedPatient(patient);
                                                    setQuery(patient.name);
                                                    setResults([]);
                                                    form.setData(
                                                        'patient_id',
                                                        patient.uuid,
                                                    );
                                                    form.clearErrors(
                                                        'patient_id',
                                                    );
                                                }}
                                            />
                                        ))}
                                    </div>
                                )}
                                {!searching &&
                                    query.trim().length >= 2 &&
                                    results.length === 0 &&
                                    !selectedPatient &&
                                    !searchError && (
                                        <div className="rounded-lg border border-dashed p-4 text-center">
                                            <p className="text-sm font-medium">
                                                Pasien tidak ditemukan
                                            </p>
                                            <p className="text-muted-foreground mt-1 text-xs">
                                                Pastikan ejaan benar sebelum
                                                membuat pasien baru.
                                            </p>
                                        </div>
                                    )}

                                <Button
                                    asChild
                                    variant="outline"
                                    className="justify-self-start"
                                >
                                    <Link href={createPatient()}>
                                        <UserPlus /> Buat pasien baru
                                    </Link>
                                </Button>
                            </div>
                        </section>

                        <section className="bg-card rounded-xl border">
                            <div className="border-b p-4 md:p-5">
                                <h2 className="font-semibold">
                                    2. Tujuan layanan
                                </h2>
                                <p className="text-muted-foreground mt-1 text-xs">
                                    Pilih unit dan dokter yang akan menangani
                                    pasien.
                                </p>
                            </div>
                            <div className="grid gap-4 p-4 sm:grid-cols-2 md:p-5">
                                <FormField
                                    id="service_unit_id"
                                    label="Unit layanan"
                                    error={form.errors.service_unit_id}
                                    required
                                >
                                    <select
                                        id="service_unit_id"
                                        value={form.data.service_unit_id}
                                        onChange={(event) =>
                                            form.setData(
                                                'service_unit_id',
                                                event.target.value,
                                            )
                                        }
                                        className={selectClassName}
                                    >
                                        <option value="">Pilih unit</option>
                                        {serviceUnits.map((unit) => (
                                            <option
                                                key={unit.uuid}
                                                value={unit.uuid}
                                            >
                                                {unit.name} ({unit.queue_prefix}
                                                )
                                            </option>
                                        ))}
                                    </select>
                                </FormField>
                                <FormField
                                    id="practitioner_id"
                                    label="Dokter"
                                    error={form.errors.practitioner_id}
                                    required
                                >
                                    <select
                                        id="practitioner_id"
                                        value={form.data.practitioner_id}
                                        onChange={(event) =>
                                            form.setData(
                                                'practitioner_id',
                                                event.target.value,
                                            )
                                        }
                                        className={selectClassName}
                                    >
                                        <option value="">Pilih dokter</option>
                                        {practitioners.map((practitioner) => (
                                            <option
                                                key={practitioner.uuid}
                                                value={practitioner.uuid}
                                            >
                                                {practitioner.name}
                                                {practitioner.specialization
                                                    ? ` — ${practitioner.specialization}`
                                                    : ''}
                                            </option>
                                        ))}
                                    </select>
                                </FormField>
                                <FormField
                                    id="chief_complaint"
                                    label="Keluhan utama"
                                    error={form.errors.chief_complaint}
                                    className="sm:col-span-2"
                                    required
                                >
                                    <textarea
                                        id="chief_complaint"
                                        value={form.data.chief_complaint}
                                        onChange={(event) =>
                                            form.setData(
                                                'chief_complaint',
                                                event.target.value,
                                            )
                                        }
                                        rows={4}
                                        maxLength={2000}
                                        className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 w-full resize-y rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-[3px]"
                                        placeholder="Keluhan singkat yang disampaikan pasien"
                                    />
                                </FormField>
                            </div>
                        </section>
                    </div>

                    <aside className="bg-card rounded-xl border p-4 xl:sticky xl:top-4">
                        <h2 className="font-semibold">Ringkasan</h2>
                        <dl className="mt-4 grid gap-4 text-sm">
                            <SummaryItem
                                label="Pasien"
                                value={selectedPatient?.name ?? 'Belum dipilih'}
                            />
                            <SummaryItem
                                label="Unit"
                                value={
                                    serviceUnits.find(
                                        (unit) =>
                                            unit.uuid ===
                                            form.data.service_unit_id,
                                    )?.name ?? 'Belum dipilih'
                                }
                            />
                            <SummaryItem
                                label="Dokter"
                                value={
                                    practitioners.find(
                                        (item) =>
                                            item.uuid ===
                                            form.data.practitioner_id,
                                    )?.name ?? 'Belum dipilih'
                                }
                            />
                        </dl>
                        {(serviceUnits.length === 0 ||
                            practitioners.length === 0) && (
                            <p className="text-destructive border-destructive/30 mt-4 rounded-md border p-3 text-xs">
                                Unit rawat jalan dan dokter aktif harus tersedia
                                sebelum pendaftaran.
                            </p>
                        )}
                        <Button
                            type="submit"
                            className="mt-5 w-full"
                            disabled={!canSubmit || form.processing}
                        >
                            {form.processing ? <Spinner /> : <Users />}
                            {form.processing
                                ? 'Mendaftarkan...'
                                : 'Daftarkan pasien'}
                        </Button>
                    </aside>
                </form>
            </div>
        </>
    );
}

function PatientOption({
    patient,
    selected,
    onSelect,
}: {
    patient: RegistrationPatient;
    selected: boolean;
    onSelect: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onSelect}
            className={`flex w-full items-center justify-between gap-3 rounded-lg border p-3 text-left transition-colors ${
                selected
                    ? 'border-primary bg-primary/5'
                    : 'hover:border-primary/50 hover:bg-muted/30'
            }`}
            aria-selected={selected}
        >
            <span className="min-w-0">
                <span className="block truncate text-sm font-medium">
                    {patient.name}
                </span>
                <span className="text-muted-foreground mt-1 block text-xs">
                    {patient.medical_record_number} ·{' '}
                    {formatDate(patient.birth_date)} ·{' '}
                    {patient.gender === 'male' ? 'Laki-laki' : 'Perempuan'}
                </span>
                {(patient.masked_national_id_number ||
                    patient.masked_phone) && (
                    <span className="text-muted-foreground mt-1 block text-xs">
                        {[
                            patient.masked_national_id_number,
                            patient.masked_phone,
                        ]
                            .filter(Boolean)
                            .join(' · ')}
                    </span>
                )}
            </span>
            {selected ? (
                <Check className="text-primary size-5 shrink-0" />
            ) : (
                <span className="text-primary shrink-0 text-xs font-medium">
                    Pilih
                </span>
            )}
        </button>
    );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <dt className="text-muted-foreground text-xs">{label}</dt>
            <dd className="mt-1 font-medium">{value}</dd>
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

const selectClassName =
    'border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 h-9 w-full rounded-md border px-3 text-sm outline-none focus-visible:ring-[3px]';

RegistrationCreate.layout = {
    breadcrumbs: [
        { title: 'Hari Ini', href: dashboard() },
        { title: 'Daftar Pasien', href: createRegistration() },
    ],
};
