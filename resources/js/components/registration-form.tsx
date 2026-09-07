import { Link, useForm } from '@inertiajs/react';
import {
    ArrowRight,
    Check,
    Search,
    UserPlus,
    UserRound,
    X,
} from 'lucide-react';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { FormField } from '@/components/form-field';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetTitle,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { create as createPatient } from '@/routes/patients';
import { patients as searchPatients, store } from '@/routes/registrations';
import type { RegistrationPatient } from '@/types';

export type RegistrationFormData = {
    initialPatient: RegistrationPatient | null;
    serviceUnits: Array<{ uuid: string; name: string; queue_prefix: string }>;
    practitioners: Array<{
        uuid: string;
        name: string;
        specialization: string | null;
    }>;
    canCreatePatient: boolean;
};

export function RegistrationForm({
    initialPatient,
    serviceUnits,
    practitioners,
    canCreatePatient,
    panelOpen,
    onPanelOpenChange,
}: RegistrationFormData & {
    panelOpen?: boolean;
    onPanelOpenChange?: (open: boolean) => void;
}) {
    const isDesktop = useSyncExternalStore(
        subscribeDesktop,
        desktopSnapshot,
        () => true,
    );
    const isPanel = panelOpen !== undefined;
    const searchInput = useRef<HTMLInputElement>(null);
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<RegistrationPatient[]>([]);
    const [selectedPatient, setSelectedPatient] = useState(initialPatient);
    const [searching, setSearching] = useState(false);
    const [completedQuery, setCompletedQuery] = useState('');
    const [searchError, setSearchError] = useState<string | null>(null);
    const [searchAttempt, setSearchAttempt] = useState(0);
    const [activeIndex, setActiveIndex] = useState(0);
    const [open, setOpen] = useState(false);
    const [success, setSuccess] = useState<string | null>(null);
    const form = useForm({
        patient_id: initialPatient?.uuid ?? '',
        service_unit_id: serviceUnits.length === 1 ? serviceUnits[0].uuid : '',
        practitioner_id:
            practitioners.length === 1 ? practitioners[0].uuid : '',
        chief_complaint: '',
    });
    const term = query.trim();

    useEffect(() => {
        if (!panelOpen || !isDesktop) return;
        const frame = window.requestAnimationFrame(() =>
            searchInput.current?.focus(),
        );
        return () => window.cancelAnimationFrame(frame);
    }, [panelOpen, isDesktop]);

    useEffect(() => {
        if (term.length < 2 || selectedPatient) return;
        const controller = new AbortController();
        const timer = window.setTimeout(async () => {
            try {
                const response = await fetch(
                    searchPatients.url({ query: { search: term } }),
                    {
                        headers: { Accept: 'application/json' },
                        signal: controller.signal,
                    },
                );
                if (!response.ok) throw new Error('Pencarian belum berhasil.');
                const data = (await response.json()) as {
                    patients: RegistrationPatient[];
                };
                if (!controller.signal.aborted) {
                    setResults(data.patients);
                    setCompletedQuery(term);
                }
            } catch {
                if (!controller.signal.aborted)
                    setSearchError(
                        'Pencarian belum berhasil. Silakan coba lagi.',
                    );
            } finally {
                if (!controller.signal.aborted) setSearching(false);
            }
        }, 300);
        return () => {
            window.clearTimeout(timer);
            controller.abort();
        };
    }, [term, query, selectedPatient, searchAttempt]);

    function selectPatient(patient: RegistrationPatient) {
        setSelectedPatient(patient);
        setResults([]);
        setOpen(false);
        setSearching(false);
        form.setData('patient_id', patient.uuid);
        form.clearErrors('patient_id');
    }

    function changePatient() {
        setSelectedPatient(null);
        setQuery('');
        setResults([]);
        setCompletedQuery('');
        setSearchError(null);
        setSearching(false);
        form.setData('patient_id', '');
        window.requestAnimationFrame(() => searchInput.current?.focus());
    }

    const showResults =
        open &&
        !selectedPatient &&
        results.length > 0 &&
        completedQuery === term;
    const unavailable = serviceUnits.length === 0 || practitioners.length === 0;
    const canSubmit =
        !unavailable &&
        form.data.patient_id !== '' &&
        form.data.service_unit_id !== '' &&
        form.data.practitioner_id !== '' &&
        form.data.chief_complaint.trim().length >= 3;

    const content = (
        <section
            id="registration-form"
            className={cn(
                'bg-card min-w-0 rounded-xl border',
                isPanel && !isDesktop && 'rounded-none border-0',
            )}
            aria-labelledby="registration-heading"
        >
            <div className="flex items-center justify-between gap-3 border-b px-4 py-4">
                <div className="flex items-center gap-3">
                    <div>
                        <h2
                            id="registration-heading"
                            className="text-sm font-semibold"
                        >
                            Pendaftaran baru
                        </h2>
                        <p className="text-muted-foreground mt-0.5 text-xs">
                            Kunjungan hari ini
                        </p>
                    </div>
                </div>
                {isPanel && isDesktop && (
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        disabled={form.processing}
                        aria-label="Tutup form pendaftaran"
                        onClick={() => onPanelOpenChange?.(false)}
                    >
                        <X />
                    </Button>
                )}
            </div>
            <form
                onSubmit={(event) => {
                    event.preventDefault();
                    if (!canSubmit || form.processing) return;
                    const patientName = selectedPatient?.name ?? 'Pasien';
                    form.submit(store(), {
                        preserveScroll: true,
                        onSuccess: () => {
                            form.reset('patient_id', 'chief_complaint');
                            form.clearErrors();
                            changePatient();
                            setSuccess(`${patientName} berhasil didaftarkan.`);
                        },
                    });
                }}
            >
                <fieldset
                    disabled={form.processing}
                    className={cn(
                        'grid min-w-0 gap-5 p-4 disabled:opacity-70',
                        !isPanel &&
                            'md:p-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]',
                    )}
                >
                    <div className="min-w-0">
                        <FormField
                            id="patient-search"
                            label="Pasien"
                            error={form.errors.patient_id}
                            required
                        >
                            {selectedPatient ? (
                                <div className="border-primary/30 bg-primary/5 rounded-lg border p-3">
                                    <div className="flex items-start gap-2">
                                        <UserRound className="text-primary mt-0.5 size-4 shrink-0" />
                                        <div className="min-w-0 flex-1">
                                            <PatientIdentity
                                                patient={selectedPatient}
                                            />
                                        </div>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={changePatient}
                                            aria-label="Ganti pasien"
                                        >
                                            <X className="size-4" /> Ganti
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div
                                    className="relative"
                                    onBlur={(event) => {
                                        if (
                                            !event.currentTarget.contains(
                                                event.relatedTarget,
                                            )
                                        )
                                            setOpen(false);
                                    }}
                                >
                                    <Search className="text-muted-foreground pointer-events-none absolute top-3 left-3 size-4" />
                                    <Input
                                        ref={searchInput}
                                        id="patient-search"
                                        value={query}
                                        maxLength={100}
                                        autoComplete="off"
                                        className="h-10 pl-9"
                                        placeholder="Cari nama, RM, NIK, telepon"
                                        role="combobox"
                                        aria-autocomplete="list"
                                        aria-expanded={showResults}
                                        aria-controls={
                                            showResults
                                                ? 'registration-patient-results'
                                                : undefined
                                        }
                                        aria-activedescendant={
                                            showResults
                                                ? `registration-patient-${results[activeIndex]?.uuid}`
                                                : undefined
                                        }
                                        aria-describedby="patient-search-help"
                                        aria-invalid={Boolean(
                                            form.errors.patient_id,
                                        )}
                                        onFocus={() => setOpen(true)}
                                        onChange={(event) => {
                                            const value = event.target.value;
                                            setQuery(value);
                                            setResults([]);
                                            setCompletedQuery('');
                                            setSearchError(null);
                                            setSearching(
                                                value.trim().length >= 2,
                                            );
                                            setActiveIndex(0);
                                            setOpen(true);
                                            setSuccess(null);
                                        }}
                                        onKeyDown={(event) => {
                                            if (event.key === 'Escape') {
                                                event.preventDefault();
                                                if (open)
                                                    event.stopPropagation();
                                                setOpen(false);
                                            }
                                            if (
                                                event.key === 'ArrowDown' ||
                                                event.key === 'ArrowUp'
                                            ) {
                                                event.preventDefault();
                                                setOpen(true);
                                                if (showResults)
                                                    setActiveIndex(
                                                        (index) =>
                                                            (index +
                                                                (event.key ===
                                                                'ArrowDown'
                                                                    ? 1
                                                                    : results.length -
                                                                      1)) %
                                                            results.length,
                                                    );
                                            }
                                            if (event.key === 'Enter') {
                                                event.preventDefault();
                                                if (
                                                    showResults &&
                                                    results[activeIndex]
                                                )
                                                    selectPatient(
                                                        results[activeIndex],
                                                    );
                                            }
                                        }}
                                    />
                                    {showResults && (
                                        <div
                                            id="registration-patient-results"
                                            role="listbox"
                                            aria-label="Hasil pencarian pasien"
                                            className="bg-card mt-2 max-h-64 overflow-y-auto rounded-lg border p-1"
                                        >
                                            {results.map((patient, index) => (
                                                <button
                                                    key={patient.uuid}
                                                    id={`registration-patient-${patient.uuid}`}
                                                    type="button"
                                                    role="option"
                                                    aria-selected={
                                                        index === activeIndex
                                                    }
                                                    tabIndex={-1}
                                                    onMouseDown={(event) =>
                                                        event.preventDefault()
                                                    }
                                                    onClick={() =>
                                                        selectPatient(patient)
                                                    }
                                                    className={`hover:bg-muted w-full rounded-md p-3 text-left ${index === activeIndex ? 'bg-muted' : ''}`}
                                                >
                                                    <PatientIdentity
                                                        patient={patient}
                                                    />
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </FormField>
                        {!selectedPatient && (
                            <div
                                id="patient-search-help"
                                className="text-muted-foreground mt-2 text-xs"
                                role="status"
                                aria-live="polite"
                            >
                                {searching ? (
                                    <span className="flex items-center gap-2">
                                        <Spinner /> Mencari pasien...
                                    </span>
                                ) : searchError ? (
                                    <span className="text-destructive">
                                        {searchError}{' '}
                                        <button
                                            type="button"
                                            className="underline underline-offset-2"
                                            onClick={() => {
                                                setSearching(true);
                                                setSearchError(null);
                                                setSearchAttempt(
                                                    (value) => value + 1,
                                                );
                                            }}
                                        >
                                            Coba lagi
                                        </button>
                                    </span>
                                ) : completedQuery === term &&
                                  term.length >= 2 &&
                                  results.length === 0 ? (
                                    'Pasien tidak ditemukan. Periksa ejaan atau tambahkan pasien baru.'
                                ) : showResults ? (
                                    `${results.length} pasien ditemukan. Gunakan tombol panah dan Enter untuk memilih.`
                                ) : (
                                    'Ketik minimal 2 karakter.'
                                )}
                            </div>
                        )}
                        {canCreatePatient && !selectedPatient && (
                            <Button
                                asChild
                                variant="link"
                                size="sm"
                                className="mt-2 h-auto px-0 text-xs"
                            >
                                <Link
                                    href={createPatient({
                                        query: { register: 1 },
                                    })}
                                >
                                    <UserPlus /> Tambah pasien baru
                                </Link>
                            </Button>
                        )}
                        {success && (
                            <p
                                role="status"
                                className="mt-3 flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300"
                            >
                                <Check className="size-4 shrink-0" />
                                {success}
                            </p>
                        )}
                    </div>
                    <div
                        className={cn(
                            'grid min-w-0 gap-4',
                            !isPanel && 'sm:grid-cols-2',
                        )}
                    >
                        <FormField
                            id="service_unit_id"
                            label="Unit layanan"
                            error={form.errors.service_unit_id}
                            required
                        >
                            <select
                                id="service_unit_id"
                                value={form.data.service_unit_id}
                                required
                                className={selectClassName}
                                onChange={(event) =>
                                    form.setData(
                                        'service_unit_id',
                                        event.target.value,
                                    )
                                }
                            >
                                <option value="">Pilih unit layanan</option>
                                {serviceUnits.map((unit) => (
                                    <option key={unit.uuid} value={unit.uuid}>
                                        {unit.name}
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
                                required
                                className={selectClassName}
                                onChange={(event) =>
                                    form.setData(
                                        'practitioner_id',
                                        event.target.value,
                                    )
                                }
                            >
                                <option value="">Pilih dokter</option>
                                {practitioners.map((practitioner) => (
                                    <option
                                        key={practitioner.uuid}
                                        value={practitioner.uuid}
                                    >
                                        {practitioner.name}
                                        {practitioner.specialization
                                            ? ` · ${practitioner.specialization}`
                                            : ''}
                                    </option>
                                ))}
                            </select>
                        </FormField>
                        <FormField
                            id="chief_complaint"
                            label="Keluhan utama"
                            error={form.errors.chief_complaint}
                            className={cn(!isPanel && 'sm:col-span-2')}
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
                                rows={2}
                                minLength={3}
                                maxLength={2000}
                                required
                                className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 w-full resize-y rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-[3px]"
                                placeholder="Contoh: demam sejak dua hari"
                            />
                        </FormField>
                    </div>
                </fieldset>
                <div
                    className={cn(
                        'flex flex-col-reverse gap-3 rounded-b-xl border-t p-4',
                        !isPanel &&
                            'sm:flex-row sm:items-center sm:justify-between md:px-5',
                    )}
                >
                    <p
                        className={`text-xs ${unavailable ? 'text-destructive' : 'text-muted-foreground'}`}
                        role={unavailable ? 'alert' : undefined}
                    >
                        {unavailable
                            ? 'Siapkan unit rawat jalan dan dokter aktif sebelum mendaftarkan pasien.'
                            : 'Nomor antrean dibuat otomatis.'}
                    </p>
                    <Button
                        type="submit"
                        disabled={!canSubmit || form.processing}
                        className="h-10 shrink-0"
                    >
                        {form.processing ? <Spinner /> : <ArrowRight />}
                        {form.processing
                            ? 'Mendaftarkan...'
                            : 'Daftarkan pasien'}
                    </Button>
                </div>
            </form>
        </section>
    );

    if (!isPanel) return content;

    if (isDesktop) {
        return (
            <aside
                hidden={!panelOpen}
                className="min-w-0 self-start xl:sticky xl:top-20"
                aria-label="Form pendaftaran"
            >
                {content}
            </aside>
        );
    }

    return (
        <Sheet
            open={panelOpen}
            onOpenChange={(nextOpen) => {
                if (!form.processing) onPanelOpenChange?.(nextOpen);
            }}
        >
            <SheetContent
                className="w-full gap-0 overflow-y-auto p-0 sm:max-w-md"
                onEscapeKeyDown={(event) => {
                    if (showResults) {
                        event.preventDefault();
                        setOpen(false);
                    }
                }}
                onCloseAutoFocus={(event) => {
                    event.preventDefault();
                    document.getElementById('open-registration-form')?.focus();
                }}
            >
                <SheetTitle className="sr-only">Pendaftaran baru</SheetTitle>
                <SheetDescription className="sr-only">
                    Pilih pasien dan tujuan layanan untuk kunjungan hari ini.
                </SheetDescription>
                {content}
            </SheetContent>
        </Sheet>
    );
}

const desktopQuery = '(min-width: 1280px)';

function subscribeDesktop(callback: () => void) {
    const media = window.matchMedia(desktopQuery);
    media.addEventListener('change', callback);
    return () => media.removeEventListener('change', callback);
}

function desktopSnapshot() {
    return window.matchMedia(desktopQuery).matches;
}

function PatientIdentity({ patient }: { patient: RegistrationPatient }) {
    return (
        <>
            <span className="block text-sm font-medium break-words">
                {patient.name}
            </span>
            <span className="text-muted-foreground mt-1 block text-xs break-words">
                {patient.medical_record_number} ·{' '}
                {new Intl.DateTimeFormat('id-ID', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                }).format(new Date(`${patient.birth_date}T12:00:00`))}{' '}
                · {patient.gender === 'male' ? 'L' : 'P'}
            </span>
            {(patient.masked_national_id_number || patient.masked_phone) && (
                <span className="text-muted-foreground mt-1 flex flex-wrap gap-x-2 gap-y-1 text-xs">
                    {[patient.masked_national_id_number, patient.masked_phone]
                        .filter(Boolean)
                        .map((value) => (
                            <span key={value} className="whitespace-nowrap">
                                {value}
                            </span>
                        ))}
                </span>
            )}
        </>
    );
}

const selectClassName =
    'border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 h-10 w-full min-w-0 rounded-md border px-3 text-sm outline-none focus-visible:ring-[3px]';
