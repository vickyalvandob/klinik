import { Head, Link, router, useForm } from '@inertiajs/react';
import {
    AlertTriangle,
    ArrowLeft,
    ArrowRight,
    CheckCircle2,
    ClipboardCheck,
    HeartPulse,
    Save,
    Stethoscope,
    UserRound,
} from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { FormField } from '@/components/form-field';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogCancel,
    AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { dashboard } from '@/routes';
import { show as showPatient } from '@/routes/patients';
import { index, update } from '@/routes/triages';
import type { TriageEncounter } from '@/types';

const vitalFields = [
    {
        id: 'systolic_bp',
        label: 'Sistolik',
        unit: 'mmHg',
        min: 40,
        max: 300,
        step: '1',
    },
    {
        id: 'diastolic_bp',
        label: 'Diastolik',
        unit: 'mmHg',
        min: 20,
        max: 200,
        step: '1',
    },
    {
        id: 'heart_rate',
        label: 'Nadi',
        unit: 'x/menit',
        min: 20,
        max: 250,
        step: '1',
    },
    {
        id: 'respiratory_rate',
        label: 'Frekuensi napas',
        unit: 'x/menit',
        min: 5,
        max: 80,
        step: '1',
    },
    {
        id: 'temperature',
        label: 'Suhu',
        unit: '°C',
        min: 30,
        max: 45,
        step: '0.1',
    },
    {
        id: 'spo2',
        label: 'Saturasi oksigen',
        unit: '%',
        min: 1,
        max: 100,
        step: '1',
    },
    {
        id: 'weight',
        label: 'Berat badan',
        unit: 'kg',
        min: 0.5,
        max: 500,
        step: '0.01',
    },
    {
        id: 'height',
        label: 'Tinggi badan',
        unit: 'cm',
        min: 20,
        max: 250,
        step: '0.01',
    },
] as const;
type VitalId = (typeof vitalFields)[number]['id'];
type TriageForm = Record<
    VitalId | 'chief_complaint' | 'notes' | 'pain_scale',
    string
>;

export default function TriageEdit({
    encounter,
    can,
    timezone,
}: {
    encounter: TriageEncounter;
    can: { save: boolean; complete: boolean };
    timezone: string;
}) {
    const triage = encounter.triage;
    const readOnly = !can.save || triage?.status === 'completed';
    const form = useForm<TriageForm>({
        chief_complaint:
            triage?.chief_complaint ?? encounter.chief_complaint ?? '',
        systolic_bp: String(triage?.systolic_bp ?? ''),
        diastolic_bp: String(triage?.diastolic_bp ?? ''),
        heart_rate: String(triage?.heart_rate ?? ''),
        respiratory_rate: String(triage?.respiratory_rate ?? ''),
        temperature: String(triage?.temperature ?? ''),
        spo2: String(triage?.spo2 ?? ''),
        weight: String(triage?.weight ?? ''),
        height: String(triage?.height ?? ''),
        pain_scale: String(triage?.pain_scale ?? ''),
        notes: triage?.notes ?? '',
    });
    const formElement = useRef<HTMLFormElement>(null);
    const allowNavigation = useRef(false);
    const [pendingNavigation, setPendingNavigation] = useState<
        (() => void) | null
    >(null);
    const [confirmComplete, setConfirmComplete] = useState(false);
    const [savingIntent, setSavingIntent] = useState<'draft' | 'complete'>(
        'draft',
    );
    const [savedAt, setSavedAt] = useState<string | null>(null);
    const dirty = form.isDirty && !readOnly;
    const timeFormat = new Intl.DateTimeFormat('id-ID', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: timezone,
    });
    const birthDate = new Intl.DateTimeFormat('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    }).format(new Date(encounter.patient.birth_date + 'T00:00:00'));

    useEffect(() => {
        if (!dirty) return;
        const removeBefore = router.on('before', (event) => {
            if (
                allowNavigation.current ||
                form.processing ||
                event.detail.visit.method !== 'get'
            )
                return;
            event.preventDefault();
            const visit = event.detail.visit;
            setPendingNavigation(() => () => router.visit(visit.url, visit));
        });
        const beforeUnload = (event: BeforeUnloadEvent) => {
            if (!form.processing && !allowNavigation.current)
                event.preventDefault();
        };
        window.addEventListener('beforeunload', beforeUnload);
        return () => {
            removeBefore();
            window.removeEventListener('beforeunload', beforeUnload);
        };
    }, [dirty, form.processing]);

    const submit = (intent: 'draft' | 'complete') => {
        if (form.processing || readOnly) return;
        setSavingIntent(intent);
        form.transform((data) => ({ ...data, intent }));
        form.put(update.url(encounter.uuid), {
            preserveScroll: intent === 'draft',
            onSuccess: () => {
                form.setDefaults();
                setSavedAt(new Date().toISOString());
                setConfirmComplete(false);
            },
            onError: (errors) => {
                setConfirmComplete(false);
                const field = Object.keys(errors)[0];
                requestAnimationFrame(() =>
                    document.getElementById(field)?.focus(),
                );
            },
        });
    };

    return (
        <>
            <Head title={'Pemeriksaan awal ' + encounter.patient.name} />
            <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-4 p-4 md:gap-5 md:p-6">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <Button asChild variant="ghost" size="sm" className="-ml-2">
                        <Link
                            href={index({
                                query: {
                                    mode:
                                        triage?.status === 'completed'
                                            ? 'completed'
                                            : 'queue',
                                },
                            })}
                        >
                            <ArrowLeft />
                            Daftar pemeriksaan
                        </Link>
                    </Button>
                    <Badge variant="outline">
                        {triage?.status === 'completed'
                            ? 'Pemeriksaan selesai'
                            : triage?.status === 'draft' || savedAt
                              ? 'Draft tersimpan'
                              : 'Pemeriksaan baru'}
                    </Badge>
                </div>

                <section className="bg-card rounded-xl border">
                    <div className="flex items-start gap-3 p-4 sm:gap-4 sm:p-5">
                        <div className="bg-primary/5 text-primary border-primary/15 flex w-20 shrink-0 flex-col items-center gap-1 rounded-lg border px-2 py-3">
                            <span className="text-[10px]">Antrean</span>
                            <span className="font-mono text-lg font-semibold break-all">
                                {encounter.queue_number}
                            </span>
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-muted-foreground mb-1 text-xs">
                                Pemeriksaan awal
                            </p>
                            <h1 className="text-lg font-semibold break-words sm:text-2xl">
                                {encounter.patient.name}
                            </h1>
                            <p className="text-muted-foreground mt-1 text-xs leading-relaxed sm:text-sm">
                                RM {encounter.patient.medical_record_number} ·{' '}
                                {encounter.patient.gender === 'male'
                                    ? 'Laki-laki'
                                    : 'Perempuan'}{' '}
                                · Lahir {birthDate}
                            </p>
                        </div>
                        <Button
                            asChild
                            variant="outline"
                            size="sm"
                            className="hidden sm:inline-flex"
                        >
                            <Link href={showPatient(encounter.patient.uuid)}>
                                <UserRound />
                                Profil pasien
                            </Link>
                        </Button>
                    </div>
                    <div className="text-muted-foreground flex flex-wrap items-center gap-x-5 gap-y-2 border-t px-4 py-3 text-xs sm:px-5">
                        <span className="text-foreground font-medium">
                            {encounter.service_unit}
                        </span>
                        <span className="flex items-center gap-1.5">
                            <Stethoscope className="size-3.5" />
                            {encounter.practitioner}
                        </span>
                        <span>
                            Daftar{' '}
                            {timeFormat.format(
                                new Date(encounter.registered_at),
                            )}
                        </span>
                    </div>
                    <div
                        className={
                            encounter.patient.allergies.length
                                ? 'flex items-start gap-2.5 rounded-b-xl border-t border-amber-200 bg-amber-50/70 px-4 py-3 text-amber-900 sm:px-5 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200'
                                : 'text-muted-foreground rounded-b-xl border-t px-4 py-3 text-xs sm:px-5'
                        }
                    >
                        {encounter.patient.allergies.length ? (
                            <>
                                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                                <div className="min-w-0 text-sm">
                                    <span className="font-semibold">
                                        Alergi tercatat:{' '}
                                    </span>
                                    {encounter.patient.allergies.map(
                                        (allergy, i) => (
                                            <span
                                                key={i}
                                                className="break-words"
                                            >
                                                {i > 0 && '; '}
                                                {allergy.substance}
                                                {allergy.reaction &&
                                                    ' (' +
                                                        allergy.reaction +
                                                        ')'}
                                                {allergy.severity ===
                                                    'severe' && ' · berat'}
                                            </span>
                                        ),
                                    )}
                                </div>
                            </>
                        ) : (
                            'Belum ada alergi aktif yang tercatat. Konfirmasi kembali kepada pasien.'
                        )}
                    </div>
                </section>

                {readOnly ? (
                    <>
                        <div className="bg-muted/40 flex items-start gap-2 rounded-lg border p-3 text-sm">
                            <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
                            <p>
                                {triage?.status === 'completed'
                                    ? 'Pemeriksaan selesai' +
                                      (triage.completed_at
                                          ? ' pada ' +
                                            timeFormat.format(
                                                new Date(triage.completed_at),
                                            )
                                          : '') +
                                      '. Hasil tersimpan dan tidak dapat diubah.'
                                    : 'Pemeriksaan ini hanya dapat dilihat.'}
                            </p>
                        </div>
                        <Section
                            icon={ClipboardCheck}
                            title="Hasil pemeriksaan"
                            description="Informasi pemeriksaan awal untuk kunjungan ini."
                        >
                            <dl>
                                <ReadValue
                                    label="Keluhan utama"
                                    value={triage?.chief_complaint}
                                />
                            </dl>
                            <dl className="grid grid-cols-2 gap-x-5 gap-y-6 border-y py-5 sm:grid-cols-3">
                                {vitalFields.map((field) => (
                                    <ReadValue
                                        key={field.id}
                                        label={field.label}
                                        value={
                                            triage?.[field.id] != null
                                                ? triage[field.id] +
                                                  ' ' +
                                                  field.unit
                                                : null
                                        }
                                    />
                                ))}
                                <ReadValue
                                    label="Skala nyeri"
                                    value={
                                        triage?.pain_scale != null
                                            ? triage.pain_scale + ' / 10'
                                            : null
                                    }
                                />
                            </dl>
                            <dl>
                                <ReadValue
                                    label="Catatan perawat"
                                    value={triage?.notes}
                                />
                            </dl>
                        </Section>
                    </>
                ) : (
                    <form
                        ref={formElement}
                        onSubmit={(event) => {
                            event.preventDefault();
                            submit('draft');
                        }}
                        className="grid gap-4 md:gap-5"
                    >
                        <fieldset
                            disabled={form.processing}
                            className="grid min-w-0 gap-4 md:gap-5"
                        >
                            <Section
                                icon={ClipboardCheck}
                                title="Keluhan pasien"
                                description="Keluhan dari pendaftaran sudah terisi. Lengkapi bila diperlukan."
                            >
                                <FormField
                                    id="chief_complaint"
                                    label="Keluhan utama"
                                    error={form.errors.chief_complaint}
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
                                        maxLength={2000}
                                        aria-invalid={Boolean(
                                            form.errors.chief_complaint,
                                        )}
                                        aria-describedby={
                                            form.errors.chief_complaint
                                                ? 'chief_complaint-error'
                                                : undefined
                                        }
                                        className={textareaClassName}
                                        placeholder="Keluhan pasien dan sejak kapan dirasakan"
                                    />
                                </FormField>
                            </Section>

                            <Section
                                icon={HeartPulse}
                                title="Hasil pengukuran"
                                description="Isi sesuai hasil ukur. Yang belum diukur boleh dikosongkan."
                            >
                                <div className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-5">
                                    {vitalFields.slice(0, 6).map((field) => (
                                        <VitalField
                                            key={field.id}
                                            field={field}
                                            value={form.data[field.id]}
                                            error={form.errors[field.id]}
                                            onChange={(value) =>
                                                form.setData(field.id, value)
                                            }
                                        />
                                    ))}
                                </div>
                                <div className="grid grid-cols-2 gap-4 border-t pt-5 md:grid-cols-3 md:gap-5">
                                    {vitalFields.slice(6).map((field) => (
                                        <VitalField
                                            key={field.id}
                                            field={field}
                                            value={form.data[field.id]}
                                            error={form.errors[field.id]}
                                            onChange={(value) =>
                                                form.setData(field.id, value)
                                            }
                                        />
                                    ))}
                                    <FormField
                                        id="pain_scale"
                                        label="Skala nyeri"
                                        error={form.errors.pain_scale}
                                        className="col-span-2 md:col-span-1"
                                    >
                                        <select
                                            id="pain_scale"
                                            value={form.data.pain_scale}
                                            onChange={(event) =>
                                                form.setData(
                                                    'pain_scale',
                                                    event.target.value,
                                                )
                                            }
                                            aria-invalid={Boolean(
                                                form.errors.pain_scale,
                                            )}
                                            aria-describedby={
                                                form.errors.pain_scale
                                                    ? 'pain_scale-error'
                                                    : 'pain-help'
                                            }
                                            className="border-input bg-background focus-visible:ring-ring h-11 w-full min-w-0 rounded-md border px-3 text-base focus-visible:ring-2 focus-visible:outline-none md:text-sm"
                                        >
                                            <option value="">
                                                Belum dinilai
                                            </option>
                                            {Array.from(
                                                { length: 11 },
                                                (_, value) => (
                                                    <option
                                                        key={value}
                                                        value={value}
                                                    >
                                                        {value === 0
                                                            ? '0 — Tidak nyeri'
                                                            : value === 10
                                                              ? '10 — Nyeri terberat'
                                                              : value}
                                                    </option>
                                                ),
                                            )}
                                        </select>
                                        <p
                                            id="pain-help"
                                            className="text-muted-foreground text-xs"
                                        >
                                            0 tidak nyeri · 10 nyeri terberat
                                        </p>
                                    </FormField>
                                </div>
                            </Section>

                            <section className="bg-card rounded-xl border p-4 sm:p-5">
                                <FormField
                                    id="notes"
                                    label="Catatan perawat"
                                    description="Opsional. Kondisi umum atau informasi tambahan untuk dokter."
                                    error={form.errors.notes}
                                >
                                    <textarea
                                        id="notes"
                                        value={form.data.notes}
                                        onChange={(event) =>
                                            form.setData(
                                                'notes',
                                                event.target.value,
                                            )
                                        }
                                        rows={2}
                                        maxLength={5000}
                                        aria-invalid={Boolean(
                                            form.errors.notes,
                                        )}
                                        aria-describedby={
                                            form.errors.notes
                                                ? 'notes-error'
                                                : undefined
                                        }
                                        className={textareaClassName}
                                        placeholder="Tambahkan catatan jika diperlukan"
                                    />
                                </FormField>
                            </section>
                        </fieldset>
                        {form.hasErrors && (
                            <div
                                role="alert"
                                className="border-destructive/30 text-destructive rounded-lg border p-3 text-sm"
                            >
                                Data belum disimpan.{' '}
                                {Object.values(form.errors)[0]}
                                <span className="block text-xs">
                                    Periksa isian yang ditandai, lalu simpan
                                    kembali.
                                </span>
                            </div>
                        )}
                        <div className="bg-background sticky bottom-0 z-10 -mx-4 border-t px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:-mx-6 md:px-6">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <p
                                    role="status"
                                    className="text-muted-foreground flex items-center gap-2 text-xs"
                                >
                                    {dirty ? (
                                        <>
                                            <span className="size-1.5 rounded-full bg-amber-500" />
                                            Ada perubahan belum disimpan
                                        </>
                                    ) : savedAt ? (
                                        <>
                                            <CheckCircle2 className="size-3.5 text-emerald-600" />
                                            Draft berhasil disimpan
                                        </>
                                    ) : (
                                        'Simpan draft untuk melanjutkan nanti.'
                                    )}
                                </p>
                                <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-2 sm:flex">
                                    <Button
                                        type="submit"
                                        variant="outline"
                                        disabled={form.processing}
                                        className="h-11"
                                    >
                                        {form.processing &&
                                        savingIntent === 'draft' ? (
                                            <Spinner />
                                        ) : (
                                            <Save />
                                        )}
                                        Simpan draft
                                    </Button>
                                    {can.complete && (
                                        <Button
                                            type="button"
                                            disabled={form.processing}
                                            onClick={() => {
                                                if (
                                                    formElement.current?.reportValidity()
                                                )
                                                    setConfirmComplete(true);
                                            }}
                                            className="h-11"
                                        >
                                            {form.processing &&
                                            savingIntent === 'complete' ? (
                                                <Spinner />
                                            ) : (
                                                <ArrowRight />
                                            )}
                                            Kirim ke dokter
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </form>
                )}
            </div>
            <AlertDialog
                open={confirmComplete}
                onOpenChange={setConfirmComplete}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            Selesaikan pemeriksaan?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            Hasil pemeriksaan {encounter.patient.name} akan
                            disimpan dan pasien diteruskan ke antrean{' '}
                            {encounter.practitioner}. Setelah selesai, hasil
                            tidak dapat diubah.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={form.processing}>
                            Periksa kembali
                        </AlertDialogCancel>
                        <AlertDialogAction
                            disabled={form.processing}
                            onClick={(event) => {
                                event.preventDefault();
                                submit('complete');
                            }}
                        >
                            {form.processing ? <Spinner /> : <CheckCircle2 />}
                            Ya, kirim ke dokter
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            <AlertDialog
                open={pendingNavigation !== null}
                onOpenChange={(open) => {
                    if (!open) setPendingNavigation(null);
                }}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            Perubahan belum disimpan
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            Simpan draft terlebih dahulu agar hasil pemeriksaan
                            tidak hilang saat meninggalkan halaman.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Tetap mengisi</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => {
                                allowNavigation.current = true;
                                pendingNavigation?.();
                            }}
                        >
                            Keluar tanpa menyimpan
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}

function Section({
    icon: Icon,
    title,
    description,
    children,
}: {
    icon: typeof HeartPulse;
    title: string;
    description: string;
    children: ReactNode;
}) {
    return (
        <section className="bg-card min-w-0 rounded-xl border">
            <div className="flex items-start gap-3 border-b px-4 py-4 sm:px-5">
                <Icon className="text-primary mt-0.5 size-5 shrink-0" />
                <div>
                    <h2 className="text-sm font-semibold sm:text-base">
                        {title}
                    </h2>
                    <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                        {description}
                    </p>
                </div>
            </div>
            <div className="grid gap-5 p-4 sm:p-5">{children}</div>
        </section>
    );
}

function VitalField({
    field,
    value,
    error,
    onChange,
}: {
    field: (typeof vitalFields)[number];
    value: string;
    error?: string;
    onChange: (value: string) => void;
}) {
    return (
        <FormField id={field.id} label={field.label} error={error}>
            <div className="relative">
                <Input
                    id={field.id}
                    type="number"
                    min={field.min}
                    max={field.max}
                    step={field.step}
                    value={value}
                    onChange={(event) => onChange(event.target.value)}
                    inputMode={field.step === '1' ? 'numeric' : 'decimal'}
                    aria-invalid={Boolean(error)}
                    aria-describedby={error ? field.id + '-error' : undefined}
                    className="h-11 pr-16 tabular-nums"
                />
                <span className="text-muted-foreground pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs">
                    {field.unit}
                </span>
            </div>
        </FormField>
    );
}

function ReadValue({
    label,
    value,
}: {
    label: string;
    value: string | null | undefined;
}) {
    return (
        <div className="min-w-0">
            <dt className="text-muted-foreground text-xs">{label}</dt>
            <dd className="mt-1.5 text-sm font-medium break-words whitespace-pre-wrap">
                {value || 'Tidak dicatat'}
            </dd>
        </div>
    );
}

const textareaClassName =
    'border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:border-destructive w-full resize-y rounded-md border px-3 py-2.5 text-base outline-none focus-visible:ring-[3px] md:text-sm';
TriageEdit.layout = {
    breadcrumbs: [
        { title: 'Ringkasan', href: dashboard() },
        { title: 'Pemeriksaan Awal', href: index() },
        { title: 'Form pemeriksaan', href: index() },
    ],
};
