import { Head, Link, router, useForm } from '@inertiajs/react';
import {
    AlertTriangle,
    ArrowLeft,
    ClipboardPlus,
    CheckCircle2,
    FileText,
    History,
    LockKeyhole,
    Pill,
    Plus,
    Save,
    Search,
    Stethoscope,
    Trash2,
} from 'lucide-react';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { FormField } from '@/components/form-field';
import {
    MedicalRecordFiles,
    type ClinicalFile,
} from '@/components/medical-record-files';
import { Button } from '@/components/ui/button';
import {
    AlertDialog,
    AlertDialogTrigger,
    AlertDialogContent,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogCancel,
    AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { show as clinicalCatalog } from '@/routes/clinical-catalog';
import { store as startConsultation } from '@/routes/consultations';
import { index as doctorQueue } from '@/routes/doctor-queue';
import { store as storeAmendment } from '@/routes/medical-record-amendments';
import { edit as editMedicalRecord, update } from '@/routes/medical-records';
import { cn } from '@/lib/utils';
import { show as showPatient } from '@/routes/patients';
import type {
    ClinicalEncounter,
    DiagnosisOption,
    DiagnosisRow,
    MedicineOption,
    PrescriptionRow,
    PreviousEncounter,
    ProcedureRow,
    ServiceOption,
} from '@/types';
type ClinicalFormData = {
    intent: 'draft' | 'finalize';
    subjective: string;
    objective: string;
    assessment: string;
    plan: string;
    additional_notes: string;
    diagnoses: DiagnosisRow[];
    procedures: ProcedureRow[];
    prescription_notes: string;
    prescription_items: PrescriptionRow[];
};
export default function MedicalRecordEdit({
    encounter,
    previousEncounters,
    files,
    can,
}: {
    encounter: ClinicalEncounter;
    previousEncounters?: PreviousEncounter[];
    files: ClinicalFile[];
    can: {
        start: boolean;
        save: boolean;
        finalize: boolean;
        amend: boolean;
        view_patient: boolean;
    };
}) {
    const record = encounter.medical_record;
    const locked = record?.status === 'final' || record?.status === 'amended';
    const [confirmFinalization, setConfirmFinalization] = useState(false);
    const [section, setSection] = useState<
        'clinical' | 'orders' | 'additional'
    >('clinical');
    const [savingIntent, setSavingIntent] = useState<'draft' | 'finalize'>(
        'draft',
    );
    const allowNavigation = useRef(false);
    const [pendingNavigation, setPendingNavigation] = useState<
        (() => void) | null
    >(null);
    const form = useForm<ClinicalFormData>({
        intent: 'draft',
        subjective: record?.subjective ?? '',
        objective: record?.objective ?? '',
        assessment: record?.assessment ?? '',
        plan: record?.plan ?? '',
        additional_notes: record?.additional_notes ?? '',
        diagnoses:
            record?.diagnoses.filter(
                (item) => locked || !can.save || item.catalog_id,
            ) ?? [],
        procedures:
            record?.procedures.filter(
                (item) => locked || !can.save || item.service_id,
            ) ?? [],
        prescription_notes: record?.prescription?.notes ?? '',
        prescription_items:
            record?.prescription?.items.filter(
                (item) => locked || !can.save || item.medicine_id,
            ) ?? [],
    });
    const dirty = form.isDirty && can.save && !locked;
    const requirements = [
        {
            label: 'Keluhan dan riwayat',
            done: Boolean(form.data.subjective.trim()),
            field: 'subjective',
        },
        {
            label: 'Penilaian klinis',
            done: Boolean(form.data.assessment.trim()),
            field: 'assessment',
        },
        {
            label: 'Rencana perawatan',
            done: Boolean(form.data.plan.trim()),
            field: 'plan',
        },
        {
            label: 'Satu diagnosis utama',
            done:
                form.data.diagnoses.filter((item) => item.type === 'primary')
                    .length === 1,
            field: 'diagnoses',
        },
        {
            label: 'Jumlah dan aturan pakai obat',
            done: form.data.prescription_items.every(
                (item) =>
                    Number(item.quantity) > 0 &&
                    Boolean(item.instruction.trim()),
            ),
            field: 'prescription_items',
        },
    ];
    const ready = requirements.every((item) => item.done);
    const focusField = (field: string) => {
        setSection(
            field.startsWith('prescription') || field.startsWith('procedures')
                ? 'orders'
                : field === 'additional_notes'
                  ? 'additional'
                  : 'clinical',
        );
        requestAnimationFrame(() => {
            const target =
                document.getElementById(field) ??
                document.getElementById(field.split('.')[0]);
            target?.scrollIntoView({ block: 'center' });
            target?.focus();
        });
    };
    useEffect(() => {
        if (!dirty) return;
        const removeBefore = router.on('before', (event) => {
            const visit = event.detail.visit;
            if (
                allowNavigation.current ||
                form.processing ||
                visit.method !== 'get' ||
                (visit.url.pathname === window.location.pathname &&
                    visit.only.length > 0)
            )
                return;
            event.preventDefault();
            setPendingNavigation(() => () => router.visit(visit.url, visit));
        });
        const beforeUnload = (event: BeforeUnloadEvent) => {
            if (!allowNavigation.current) event.preventDefault();
        };
        window.addEventListener('beforeunload', beforeUnload);
        return () => {
            removeBefore();
            window.removeEventListener('beforeunload', beforeUnload);
        };
    }, [dirty, form.processing]);
    const submit = (intent: 'draft' | 'finalize') => {
        if (form.processing || !can.save || locked) return;
        setSavingIntent(intent);
        form.transform((data) => ({ ...data, intent }));
        form.put(update.url(encounter.uuid), {
            preserveScroll: intent === 'draft',
            onSuccess: () => {
                form.setDefaults();
                setConfirmFinalization(false);
            },
            onError: (errors) => {
                setConfirmFinalization(false);
                focusField(Object.keys(errors)[0]);
            },
        });
    };
    return (
        <>
            <Head title={`Pemeriksaan ${encounter.patient.name}`} />
            <div className="flex min-w-0 flex-1 flex-col gap-5">
                <PatientHeader encounter={encounter} locked={locked} />
                <div className="mx-auto grid w-full max-w-7xl flex-1 items-start gap-5 px-4 md:px-6 xl:grid-cols-[minmax(0,1fr)_19rem]">
                    <main className="min-w-0">
                        <fieldset
                            disabled={form.processing}
                            className="grid min-w-0 gap-5"
                        >
                            {can.start && (
                                <section className="border-primary/30 bg-primary/5 rounded-xl border p-4">
                                    <h2 className="font-semibold">
                                        Pasien siap diperiksa
                                    </h2>
                                    <p className="text-muted-foreground mt-1 text-sm">
                                        Mulai pemeriksaan untuk membuka form
                                        rekam medis.
                                    </p>
                                    <Button
                                        className="mt-4"
                                        onClick={() =>
                                            router.post(
                                                startConsultation.url(
                                                    encounter.uuid,
                                                ),
                                            )
                                        }
                                    >
                                        <Stethoscope /> Mulai Pemeriksaan
                                    </Button>
                                </section>
                            )}
                            <details className="bg-card rounded-xl border xl:hidden">
                                <summary className="cursor-pointer px-4 py-3 text-sm font-medium">
                                    Hasil pemeriksaan awal
                                </summary>
                                <TriageSection encounter={encounter} />
                            </details>
                            <nav
                                className="bg-muted/30 flex gap-1 rounded-lg border p-1"
                                aria-label="Bagian rekam medis"
                            >
                                {(
                                    [
                                        {
                                            value: 'clinical',
                                            label: 'Pemeriksaan',
                                            icon: Stethoscope,
                                        },
                                        {
                                            value: 'orders',
                                            label: 'Tindakan & resep',
                                            icon: Pill,
                                        },
                                        {
                                            value: 'additional',
                                            label: 'Catatan & berkas',
                                            icon: FileText,
                                        },
                                    ] as const
                                ).map(({ value, label, icon: Icon }) => (
                                    <Button
                                        key={value}
                                        variant="ghost"
                                        size="sm"
                                        aria-pressed={section === value}
                                        className={cn(
                                            'h-auto min-h-10 min-w-0 flex-1 flex-col gap-1 px-2 text-xs whitespace-normal sm:flex-row sm:text-sm',
                                            section === value &&
                                                'bg-background text-primary border',
                                        )}
                                        onClick={() => setSection(value)}
                                    >
                                        <Icon className="size-4 shrink-0" />
                                        {label}
                                    </Button>
                                ))}
                            </nav>
                            {Object.keys(form.errors).length > 0 && (
                                <div
                                    role="alert"
                                    className="border-destructive/30 bg-destructive/5 rounded-lg border p-3 text-sm"
                                >
                                    <p className="font-medium">
                                        Periksa kembali data yang ditandai.
                                    </p>
                                    <div className="mt-2 flex flex-wrap gap-2">
                                        {Object.entries(form.errors).map(
                                            ([field, error]) => (
                                                <button
                                                    key={field}
                                                    type="button"
                                                    className="text-destructive text-left text-xs underline underline-offset-4"
                                                    onClick={() =>
                                                        focusField(field)
                                                    }
                                                >
                                                    {error}
                                                </button>
                                            ),
                                        )}
                                    </div>
                                </div>
                            )}
                            <div
                                hidden={section !== 'clinical'}
                                className="space-y-5"
                            >
                                <Section
                                    number="1"
                                    title="Catatan pemeriksaan"
                                    description="Lengkapi keluhan, penilaian, dan rencana sebelum finalisasi. Temuan objektif dapat ditambahkan sesuai pemeriksaan."
                                >
                                    {can.save &&
                                        !locked &&
                                        !form.data.subjective && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="justify-self-start"
                                                onClick={() =>
                                                    form.setData(
                                                        'subjective',
                                                        encounter.triage
                                                            ?.chief_complaint ||
                                                            encounter.chief_complaint,
                                                    )
                                                }
                                            >
                                                Gunakan keluhan pemeriksaan awal
                                            </Button>
                                        )}
                                    <div className="grid gap-5 lg:grid-cols-2">
                                        <TextAreaField
                                            id="subjective"
                                            label="Keluhan & riwayat (S)"
                                            required
                                            value={form.data.subjective}
                                            onChange={(value) =>
                                                form.setData(
                                                    'subjective',
                                                    value,
                                                )
                                            }
                                            error={form.errors.subjective}
                                            disabled={!can.save || locked}
                                            placeholder="Keluhan, riwayat penyakit, dan informasi dari pasien"
                                        />
                                        <TextAreaField
                                            id="objective"
                                            label="Temuan objektif (O)"
                                            value={form.data.objective}
                                            onChange={(value) =>
                                                form.setData('objective', value)
                                            }
                                            error={form.errors.objective}
                                            disabled={!can.save || locked}
                                            placeholder="Temuan pemeriksaan fisik dan objektif"
                                        />
                                        <TextAreaField
                                            id="assessment"
                                            label="Penilaian klinis (A)"
                                            required
                                            value={form.data.assessment}
                                            onChange={(value) =>
                                                form.setData(
                                                    'assessment',
                                                    value,
                                                )
                                            }
                                            error={form.errors.assessment}
                                            disabled={!can.save || locked}
                                            placeholder="Penilaian klinis dokter"
                                        />
                                        <TextAreaField
                                            id="plan"
                                            label="Rencana perawatan (P)"
                                            required
                                            value={form.data.plan}
                                            onChange={(value) =>
                                                form.setData('plan', value)
                                            }
                                            error={form.errors.plan}
                                            disabled={!can.save || locked}
                                            placeholder="Rencana terapi, edukasi, kontrol, atau rujukan"
                                        />
                                    </div>
                                </Section>
                                <Section
                                    number="2"
                                    title="Diagnosis"
                                    description="Pilih satu diagnosis utama dan tambahkan diagnosis sekunder bila diperlukan."
                                >
                                    {!locked && can.save && (
                                        <CatalogPicker<DiagnosisOption>
                                            resource="diagnoses"
                                            placeholder="Cari kode atau nama diagnosis..."
                                            render={(item) =>
                                                `${item.code} — ${item.display}`
                                            }
                                            onSelect={(item) => {
                                                const hasPrimary =
                                                    form.data.diagnoses.some(
                                                        (diagnosis) =>
                                                            diagnosis.type ===
                                                            'primary',
                                                    );
                                                form.setData('diagnoses', [
                                                    ...form.data.diagnoses,
                                                    {
                                                        catalog_id: item.uuid,
                                                        code_system:
                                                            item.code_system,
                                                        code: item.code,
                                                        display: item.display,
                                                        type: hasPrimary
                                                            ? 'secondary'
                                                            : 'primary',
                                                        notes: null,
                                                    },
                                                ]);
                                            }}
                                            exclude={form.data.diagnoses.map(
                                                (item) => item.catalog_id,
                                            )}
                                        />
                                    )}
                                    <InputErrorText
                                        error={form.errors.diagnoses}
                                    />
                                    <div className="grid gap-2">
                                        {form.data.diagnoses.length === 0 ? (
                                            <EmptyText text="Belum ada diagnosis." />
                                        ) : (
                                            form.data.diagnoses.map(
                                                (diagnosis, index) => (
                                                    <div
                                                        key={`${diagnosis.catalog_id}-${index}`}
                                                        className="bg-muted/20 grid gap-3 rounded-lg border p-3 sm:grid-cols-[minmax(0,1fr)_9rem_auto] sm:items-center"
                                                    >
                                                        <div>
                                                            <p className="text-sm font-medium">
                                                                {diagnosis.code}{' '}
                                                                —{' '}
                                                                {
                                                                    diagnosis.display
                                                                }
                                                            </p>
                                                            <p className="text-muted-foreground mt-1 text-xs">
                                                                {
                                                                    diagnosis.code_system
                                                                }
                                                            </p>
                                                        </div>
                                                        <select
                                                            aria-label={`Jenis diagnosis ${diagnosis.display}`}
                                                            value={
                                                                diagnosis.type
                                                            }
                                                            disabled={
                                                                !can.save ||
                                                                locked
                                                            }
                                                            className={
                                                                selectClassName
                                                            }
                                                            onChange={(
                                                                event,
                                                            ) => {
                                                                const next = [
                                                                    ...form.data
                                                                        .diagnoses,
                                                                ];
                                                                const type =
                                                                    event.target
                                                                        .value as DiagnosisRow['type'];
                                                                if (
                                                                    type ===
                                                                    'primary'
                                                                ) {
                                                                    for (
                                                                        let i = 0;
                                                                        i <
                                                                        next.length;
                                                                        i++
                                                                    )
                                                                        next[
                                                                            i
                                                                        ] = {
                                                                            ...next[
                                                                                i
                                                                            ],
                                                                            type: 'secondary',
                                                                        };
                                                                }
                                                                next[index] = {
                                                                    ...next[
                                                                        index
                                                                    ],
                                                                    type,
                                                                };
                                                                form.setData(
                                                                    'diagnoses',
                                                                    next,
                                                                );
                                                            }}
                                                        >
                                                            <option value="primary">
                                                                Utama
                                                            </option>
                                                            <option value="secondary">
                                                                Sekunder
                                                            </option>
                                                        </select>
                                                        {!locked &&
                                                            can.save && (
                                                                <RemoveButton
                                                                    label={`Hapus ${diagnosis.display}`}
                                                                    onClick={() =>
                                                                        form.setData(
                                                                            'diagnoses',
                                                                            form.data.diagnoses.filter(
                                                                                (
                                                                                    _,
                                                                                    rowIndex,
                                                                                ) =>
                                                                                    rowIndex !==
                                                                                    index,
                                                                            ),
                                                                        )
                                                                    }
                                                                />
                                                            )}
                                                    </div>
                                                ),
                                            )
                                        )}
                                    </div>
                                </Section>
                            </div>
                            <div
                                hidden={section !== 'orders'}
                                className="space-y-5"
                            >
                                <Section
                                    number="3"
                                    title="Tindakan"
                                    description="Tambahkan tindakan yang dilakukan pada kunjungan ini, bila ada."
                                >
                                    {!locked && can.save && (
                                        <CatalogPicker<ServiceOption>
                                            resource="services"
                                            placeholder="Cari tindakan atau layanan..."
                                            render={(item) =>
                                                `${item.code} — ${item.name} · ${rupiah(item.price)}`
                                            }
                                            onSelect={(item) =>
                                                form.setData('procedures', [
                                                    ...form.data.procedures,
                                                    {
                                                        service_id: item.uuid,
                                                        code: item.code,
                                                        name: item.name,
                                                        price: Number(
                                                            item.price,
                                                        ),
                                                        notes: null,
                                                    },
                                                ])
                                            }
                                            exclude={form.data.procedures.map(
                                                (item) => item.service_id,
                                            )}
                                        />
                                    )}
                                    <InputErrorText
                                        error={form.errors.procedures}
                                    />
                                    <div className="grid gap-2">
                                        {form.data.procedures.length === 0 ? (
                                            <EmptyText text="Belum ada tindakan." />
                                        ) : (
                                            form.data.procedures.map(
                                                (procedure, index) => (
                                                    <div
                                                        key={`${procedure.service_id}-${index}`}
                                                        className="bg-muted/20 flex items-center justify-between gap-3 rounded-lg border p-3"
                                                    >
                                                        <div>
                                                            <p className="text-sm font-medium">
                                                                {procedure.name}
                                                            </p>
                                                            <p className="text-muted-foreground mt-1 text-xs">
                                                                {procedure.code}{' '}
                                                                ·{' '}
                                                                {rupiah(
                                                                    procedure.price,
                                                                )}
                                                            </p>
                                                        </div>
                                                        {!locked &&
                                                            can.save && (
                                                                <RemoveButton
                                                                    label={`Hapus ${procedure.name}`}
                                                                    onClick={() =>
                                                                        form.setData(
                                                                            'procedures',
                                                                            form.data.procedures.filter(
                                                                                (
                                                                                    _,
                                                                                    rowIndex,
                                                                                ) =>
                                                                                    rowIndex !==
                                                                                    index,
                                                                            ),
                                                                        )
                                                                    }
                                                                />
                                                            )}
                                                    </div>
                                                ),
                                            )
                                        )}
                                    </div>
                                </Section>
                                <Section
                                    number="4"
                                    title="Resep"
                                    description="Pilih obat dan tulis aturan pakai yang mudah dipahami pasien."
                                    icon={<Pill className="size-4" />}
                                >
                                    {!locked && can.save && (
                                        <CatalogPicker<MedicineOption>
                                            resource="medicines"
                                            placeholder="Cari nama atau kode obat..."
                                            render={(item) =>
                                                `${item.name}${item.strength ? ` ${item.strength}` : ''} · ${item.dosage_form}`
                                            }
                                            onSelect={(item) =>
                                                form.setData(
                                                    'prescription_items',
                                                    [
                                                        ...form.data
                                                            .prescription_items,
                                                        {
                                                            medicine_id:
                                                                item.uuid,
                                                            name: item.name,
                                                            strength:
                                                                item.strength,
                                                            dosage_form:
                                                                item.dosage_form,
                                                            quantity: 1,
                                                            unit: item.unit,
                                                            dose_text: '',
                                                            frequency_text: '',
                                                            timing_text: '',
                                                            duration_text: '',
                                                            instruction: '',
                                                            notes: null,
                                                        },
                                                    ],
                                                )
                                            }
                                            exclude={form.data.prescription_items.map(
                                                (item) => item.medicine_id,
                                            )}
                                        />
                                    )}
                                    <InputErrorText
                                        error={form.errors.prescription_items}
                                    />
                                    <div className="grid gap-3">
                                        {form.data.prescription_items.length ===
                                        0 ? (
                                            <EmptyText text="Belum ada obat dalam resep." />
                                        ) : (
                                            form.data.prescription_items.map(
                                                (item, index) => (
                                                    <PrescriptionItemEditor
                                                        key={`${item.medicine_id}-${index}`}
                                                        item={item}
                                                        index={index}
                                                        disabled={
                                                            !can.save || locked
                                                        }
                                                        errors={form.errors}
                                                        onChange={(changes) => {
                                                            const next = [
                                                                ...form.data
                                                                    .prescription_items,
                                                            ];
                                                            next[index] = {
                                                                ...next[index],
                                                                ...changes,
                                                            };
                                                            form.setData(
                                                                'prescription_items',
                                                                next,
                                                            );
                                                        }}
                                                        onRemove={() =>
                                                            form.setData(
                                                                'prescription_items',
                                                                form.data.prescription_items.filter(
                                                                    (
                                                                        _,
                                                                        rowIndex,
                                                                    ) =>
                                                                        rowIndex !==
                                                                        index,
                                                                ),
                                                            )
                                                        }
                                                    />
                                                ),
                                            )
                                        )}
                                    </div>
                                    <TextAreaField
                                        id="prescription_notes"
                                        label="Catatan resep"
                                        value={form.data.prescription_notes}
                                        onChange={(value) =>
                                            form.setData(
                                                'prescription_notes',
                                                value,
                                            )
                                        }
                                        disabled={!can.save || locked}
                                        error={form.errors.prescription_notes}
                                        rows={2}
                                        placeholder="Catatan untuk petugas farmasi (opsional)"
                                    />
                                </Section>
                            </div>
                            <div
                                hidden={section !== 'additional'}
                                className="space-y-5"
                            >
                                <Section
                                    number="5"
                                    title="Catatan Tambahan"
                                    description="Informasi klinis lain yang belum tercakup pada bagian di atas."
                                >
                                    <TextAreaField
                                        id="additional_notes"
                                        label="Catatan"
                                        value={form.data.additional_notes}
                                        onChange={(value) =>
                                            form.setData(
                                                'additional_notes',
                                                value,
                                            )
                                        }
                                        disabled={!can.save || locked}
                                        error={form.errors.additional_notes}
                                        rows={3}
                                    />
                                </Section>
                                {record && (
                                    <MedicalRecordFiles
                                        recordId={record.uuid}
                                        files={files}
                                        canUpload={can.save || can.amend}
                                    />
                                )}
                                {record && locked && (
                                    <AmendmentSection
                                        record={record}
                                        canAmend={can.amend}
                                    />
                                )}
                            </div>
                        </fieldset>
                    </main>
                    <ContextPanel
                        encounter={encounter}
                        previousEncounters={previousEncounters}
                        canViewPatient={can.view_patient}
                    />
                </div>
                {can.save && !locked && (
                    <div className="bg-background/95 sticky bottom-0 z-30 mt-auto border-t px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur md:px-6">
                        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
                            <p
                                className="text-muted-foreground flex w-full items-center gap-2 text-xs sm:w-auto"
                                role="status"
                            >
                                {form.processing ? (
                                    <>
                                        <Spinner />
                                        {savingIntent === 'draft'
                                            ? 'Menyimpan draft...'
                                            : 'Memfinalisasi...'}
                                    </>
                                ) : dirty ? (
                                    <>
                                        <span className="size-1.5 rounded-full bg-amber-500" />
                                        Perubahan belum disimpan
                                    </>
                                ) : record ? (
                                    <>
                                        <CheckCircle2 className="size-3.5 text-emerald-600" />
                                        Tersimpan{' '}
                                        {formatDateTime(record.updated_at)}
                                    </>
                                ) : (
                                    'Belum ada draft tersimpan'
                                )}
                            </p>
                            <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto">
                                <Button
                                    variant="outline"
                                    onClick={() => submit('draft')}
                                    disabled={form.processing}
                                >
                                    {form.processing ? <Spinner /> : <Save />}{' '}
                                    Simpan Draft
                                </Button>
                                <AlertDialog
                                    open={confirmFinalization}
                                    onOpenChange={(open) => {
                                        if (!form.processing)
                                            setConfirmFinalization(open);
                                    }}
                                >
                                    <AlertDialogTrigger asChild>
                                        <Button
                                            disabled={
                                                form.processing || !can.finalize
                                            }
                                        >
                                            <LockKeyhole /> Finalisasi RME
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <span className="bg-primary/10 text-primary mb-2 grid size-11 place-items-center rounded-xl">
                                                <LockKeyhole className="size-5" />
                                            </span>
                                            <AlertDialogTitle>
                                                Finalisasi rekam medis?
                                            </AlertDialogTitle>
                                            <AlertDialogDescription>
                                                Rekam medis{' '}
                                                {encounter.patient.name} akan
                                                dikunci dan pasien diteruskan ke
                                                layanan berikutnya. Perubahan
                                                setelah ini dicatat melalui
                                                koreksi rekam medis.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <div className="bg-muted/20 grid gap-2 rounded-lg border p-4">
                                            {requirements.map((item) => (
                                                <div
                                                    key={item.field}
                                                    className="flex items-center gap-2 text-sm"
                                                >
                                                    {item.done ? (
                                                        <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
                                                    ) : (
                                                        <AlertTriangle className="size-4 shrink-0 text-amber-600" />
                                                    )}
                                                    <span className="flex-1">
                                                        {item.label}
                                                    </span>
                                                    {!item.done && (
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => {
                                                                setConfirmFinalization(
                                                                    false,
                                                                );
                                                                focusField(
                                                                    item.field,
                                                                );
                                                            }}
                                                        >
                                                            Lengkapi
                                                        </Button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                        <p className="text-muted-foreground text-sm">
                                            {form.data.diagnoses.length}{' '}
                                            diagnosis /{' '}
                                            {form.data.procedures.length}{' '}
                                            tindakan /{' '}
                                            {
                                                form.data.prescription_items
                                                    .length
                                            }{' '}
                                            obat. Pasien diteruskan ke{' '}
                                            {form.data.prescription_items.length
                                                ? 'farmasi'
                                                : 'pembayaran'}
                                            .
                                        </p>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel
                                                disabled={form.processing}
                                            >
                                                Periksa Kembali
                                            </AlertDialogCancel>
                                            <AlertDialogAction
                                                disabled={
                                                    form.processing || !ready
                                                }
                                                onClick={(event) => {
                                                    event.preventDefault();
                                                    submit('finalize');
                                                }}
                                            >
                                                {form.processing ? (
                                                    <Spinner />
                                                ) : (
                                                    <LockKeyhole />
                                                )}{' '}
                                                Ya, Finalisasi
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </div>
                        </div>
                    </div>
                )}
            </div>
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
                            Simpan draft sebelum meninggalkan halaman agar
                            pengisian rekam medis tidak hilang.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Tetap mengisi</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => {
                                allowNavigation.current = true;
                                pendingNavigation?.();
                                setPendingNavigation(null);
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
function PatientHeader({
    encounter,
    locked,
}: {
    encounter: ClinicalEncounter;
    locked: boolean;
}) {
    return (
        <header className="bg-background border-b px-4 py-4 md:px-6">
            <div className="mx-auto flex max-w-7xl flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                    <Button asChild variant="ghost" size="icon">
                        <Link
                            href={doctorQueue({
                                query: {
                                    mode: locked
                                        ? 'history'
                                        : encounter.status === 'in_consultation'
                                          ? 'active'
                                          : 'queue',
                                },
                            })}
                            aria-label="Kembali ke antrean dokter"
                        >
                            <ArrowLeft />
                        </Link>
                    </Button>
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                            <h1 className="text-lg font-semibold break-words">
                                {encounter.patient.name}
                            </h1>
                            {locked && (
                                <span className="rounded-full border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300">
                                    <LockKeyhole className="mr-1 inline size-3" />{' '}
                                    {encounter.medical_record?.status_label}
                                </span>
                            )}
                        </div>
                        <p className="text-muted-foreground mt-1 text-xs">
                            {encounter.patient.medical_record_number} ·{' '}
                            {age(encounter.patient.birth_date)} tahun ·{' '}
                            {encounter.patient.gender === 'male'
                                ? 'Laki-laki'
                                : 'Perempuan'}{' '}
                            · Antrean {encounter.queue_number}
                        </p>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                    {encounter.patient.allergies.length > 0 ? (
                        <span className="rounded-lg border border-red-300 bg-red-50 px-3 py-1.5 font-semibold text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
                            <AlertTriangle className="mr-1 inline size-3.5" />{' '}
                            Alergi:{' '}
                            {encounter.patient.allergies
                                .map((item) => item.substance)
                                .join(', ')}
                        </span>
                    ) : (
                        <span className="text-muted-foreground rounded-lg border px-3 py-1.5">
                            Belum ada alergi aktif tercatat
                        </span>
                    )}
                    <span className="rounded-lg border px-3 py-1.5">
                        {encounter.practitioner.name}
                    </span>
                </div>
            </div>
        </header>
    );
}
function TriageSection({ encounter }: { encounter: ClinicalEncounter }) {
    const triage = encounter.triage;
    const vitals = triage
        ? [
              [
                  'TD',
                  triage.systolic_bp && triage.diastolic_bp
                      ? `${triage.systolic_bp}/${triage.diastolic_bp} mmHg`
                      : null,
              ],
              [
                  'Nadi',
                  triage.heart_rate ? `${triage.heart_rate} x/menit` : null,
              ],
              ['Suhu', triage.temperature ? `${triage.temperature} °C` : null],
              [
                  'Respirasi',
                  triage.respiratory_rate
                      ? `${triage.respiratory_rate} x/menit`
                      : null,
              ],
              ['SpO₂', triage.spo2 ? `${triage.spo2}%` : null],
              [
                  'BB / TB',
                  triage.weight || triage.height
                      ? `${triage.weight ?? '-'} kg / ${triage.height ?? '-'} cm`
                      : null,
              ],
              [
                  'Nyeri',
                  triage.pain_scale !== null ? `${triage.pain_scale}/10` : null,
              ],
          ]
        : [];
    return (
        <section className="bg-card rounded-xl border">
            <div className="border-b p-4">
                <h2 className="font-semibold">Pemeriksaan Awal</h2>
            </div>
            <div className="p-4">
                {!triage ? (
                    <p className="text-muted-foreground text-sm">
                        Triase tidak digunakan atau belum tersedia.
                    </p>
                ) : (
                    <div className="grid gap-4">
                        <div className="grid grid-cols-2 gap-2">
                            {vitals
                                .filter(([, value]) => value)
                                .map(([label, value]) => (
                                    <div
                                        key={label}
                                        className="bg-muted/30 rounded-lg border p-3"
                                    >
                                        <p className="text-muted-foreground text-xs">
                                            {label}
                                        </p>
                                        <p className="mt-1 text-sm font-semibold">
                                            {value}
                                        </p>
                                    </div>
                                ))}
                        </div>
                        {(triage.chief_complaint || triage.notes) && (
                            <p className="text-sm">
                                {triage.chief_complaint}
                                {triage.notes && (
                                    <span className="text-muted-foreground mt-2 block">
                                        {triage.notes}
                                    </span>
                                )}
                            </p>
                        )}
                    </div>
                )}
            </div>
        </section>
    );
}
function Section({
    number,
    title,
    description,
    icon,
    children,
}: {
    number: string;
    title: string;
    description: string;
    icon?: ReactNode;
    children: ReactNode;
}) {
    return (
        <section
            id={
                number === '2'
                    ? 'diagnoses'
                    : number === '3'
                      ? 'procedures'
                      : number === '4'
                        ? 'prescription_items'
                        : undefined
            }
            tabIndex={-1}
            className="bg-card rounded-xl border"
        >
            <div className="flex gap-3 border-b p-4 md:p-5">
                <span className="bg-primary/10 text-primary grid size-8 shrink-0 place-items-center rounded-lg text-xs font-semibold">
                    {icon ?? number}
                </span>
                <div>
                    <h2 className="font-semibold">{title}</h2>
                    <p className="text-muted-foreground mt-1 text-xs">
                        {description}
                    </p>
                </div>
            </div>
            <div className="grid gap-4 p-4 md:p-5">{children}</div>
        </section>
    );
}
function TextAreaField({
    id,
    label,
    value,
    onChange,
    error,
    disabled,
    placeholder,
    rows = 5,
    required = false,
}: {
    id: string;
    label: string;
    value: string;
    onChange: (value: string) => void;
    error?: string;
    disabled: boolean;
    placeholder?: string;
    rows?: number;
    required?: boolean;
}) {
    return (
        <FormField id={id} label={label} error={error} required={required}>
            <textarea
                id={id}
                value={value}
                onChange={(event) => onChange(event.target.value)}
                readOnly={disabled}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? `${id}-error` : undefined}
                placeholder={disabled ? undefined : placeholder}
                rows={rows}
                className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 disabled:bg-muted/30 w-full resize-y rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed"
            />
        </FormField>
    );
}
function CatalogPicker<T extends { uuid: string }>({
    resource,
    placeholder,
    render,
    onSelect,
    exclude,
}: {
    resource: 'diagnoses' | 'services' | 'medicines';
    placeholder: string;
    render: (item: T) => string;
    onSelect: (item: T) => void;
    exclude: string[];
}) {
    const id = useId();
    const [query, setQuery] = useState('');
    const [items, setItems] = useState<T[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [open, setOpen] = useState(false);
    const [active, setActive] = useState(0);
    const visibleItems = items.filter((item) => !exclude.includes(item.uuid));
    const activeIndex = Math.min(active, Math.max(0, visibleItems.length - 1));
    const select = (item: T) => {
        onSelect(item);
        setQuery('');
        setItems([]);
        setOpen(false);
    };
    useEffect(() => {
        setItems([]);
        setError(null);
        setActive(0);
        if (query.trim().length < 2) {
            setLoading(false);
            return;
        }
        const controller = new AbortController();
        setLoading(true);
        const timer = window.setTimeout(async () => {
            try {
                const response = await fetch(
                    clinicalCatalog.url(resource, {
                        query: { search: query.trim() },
                    }),
                    {
                        headers: { Accept: 'application/json' },
                        signal: controller.signal,
                    },
                );
                if (!response.ok)
                    throw new Error(
                        'Pencarian gagal. Ubah kata kunci untuk mencoba kembali.',
                    );
                const data = (await response.json()) as { items: T[] };
                if (!controller.signal.aborted) setItems(data.items);
            } catch (reason) {
                if (!controller.signal.aborted)
                    setError(
                        reason instanceof Error
                            ? reason.message
                            : 'Pencarian gagal.',
                    );
            } finally {
                if (!controller.signal.aborted) setLoading(false);
            }
        }, 300);
        return () => {
            window.clearTimeout(timer);
            controller.abort();
        };
    }, [query, resource]);
    useEffect(() => {
        if (open)
            document
                .getElementById(`${id}-${activeIndex}`)
                ?.scrollIntoView({ block: 'nearest' });
    }, [activeIndex, id, open]);
    return (
        <div
            className="relative grid gap-2"
            onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget))
                    setOpen(false);
            }}
        >
            <div className="relative">
                <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                <Input
                    role="combobox"
                    aria-label={placeholder}
                    aria-expanded={open && query.trim().length >= 2}
                    aria-controls={`${id}-results`}
                    aria-autocomplete="list"
                    aria-activedescendant={
                        open && visibleItems.length
                            ? `${id}-${activeIndex}`
                            : undefined
                    }
                    value={query}
                    onFocus={() => setOpen(true)}
                    onChange={(event) => {
                        setQuery(event.target.value);
                        setOpen(true);
                    }}
                    placeholder={placeholder}
                    className="pr-9 pl-9"
                    onKeyDown={(event) => {
                        if (event.key === 'Escape') {
                            event.preventDefault();
                            setOpen(false);
                        } else if (
                            event.key === 'ArrowDown' ||
                            event.key === 'ArrowUp'
                        ) {
                            event.preventDefault();
                            setOpen(true);
                            setActive(
                                Math.max(
                                    0,
                                    Math.min(
                                        visibleItems.length - 1,
                                        activeIndex +
                                            (event.key === 'ArrowDown'
                                                ? 1
                                                : -1),
                                    ),
                                ),
                            );
                        } else if (event.key === 'Enter' && open) {
                            event.preventDefault();
                            if (visibleItems[activeIndex])
                                select(visibleItems[activeIndex]);
                        }
                    }}
                />
                {loading && (
                    <Spinner className="absolute top-1/2 right-3 -translate-y-1/2" />
                )}
            </div>
            {open && query.trim().length >= 2 && (
                <div className="bg-popover absolute top-full z-20 mt-1 w-full rounded-lg border p-1">
                    <div
                        id={`${id}-results`}
                        role="listbox"
                        aria-label="Hasil pencarian"
                        className="max-h-56 overflow-y-auto"
                    >
                        {visibleItems.map((item, index) => (
                            <button
                                key={item.uuid}
                                id={`${id}-${index}`}
                                role="option"
                                aria-selected={activeIndex === index}
                                type="button"
                                onMouseDown={(event) => event.preventDefault()}
                                onClick={() => select(item)}
                                className={cn(
                                    'hover:bg-muted focus-visible:ring-ring flex w-full items-start gap-2 rounded-md px-3 py-2.5 text-left text-sm focus-visible:ring-2 focus-visible:outline-none',
                                    activeIndex === index && 'bg-muted',
                                )}
                            >
                                <Plus className="text-primary mt-0.5 size-4 shrink-0" />
                                <span className="min-w-0 break-words">
                                    {render(item)}
                                </span>
                            </button>
                        ))}
                    </div>
                    {(loading || error || visibleItems.length === 0) && (
                        <p
                            className={cn(
                                'text-muted-foreground p-3 text-xs',
                                error && 'text-destructive',
                            )}
                            role={error ? 'alert' : 'status'}
                        >
                            {loading
                                ? 'Mencari...'
                                : error ||
                                  'Tidak ada hasil baru. Coba kata kunci lain.'}
                        </p>
                    )}
                </div>
            )}
            {!query && (
                <p className="text-muted-foreground text-xs">
                    Ketik minimal 2 karakter untuk mencari.
                </p>
            )}
        </div>
    );
}
function PrescriptionItemEditor({
    item,
    index,
    disabled,
    errors,
    onChange,
    onRemove,
}: {
    item: PrescriptionRow;
    index: number;
    disabled: boolean;
    errors: Partial<Record<string, string>>;
    onChange: (changes: Partial<PrescriptionRow>) => void;
    onRemove: () => void;
}) {
    return (
        <div className="bg-muted/20 grid gap-4 rounded-lg border p-4">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="text-sm font-semibold">
                        {item.name} {item.strength}
                    </p>
                    <p className="text-muted-foreground mt-1 text-xs">
                        {item.dosage_form} · satuan {item.unit}
                    </p>
                </div>
                {!disabled && (
                    <RemoveButton
                        label={`Hapus ${item.name}`}
                        onClick={onRemove}
                    />
                )}
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <FormField
                    id={`prescription_items.${index}.quantity`}
                    label="Jumlah"
                    error={errors[`prescription_items.${index}.quantity`]}
                    required
                >
                    <Input
                        id={`prescription_items.${index}.quantity`}
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={item.quantity}
                        disabled={disabled}
                        onChange={(event) =>
                            onChange({ quantity: event.target.value })
                        }
                    />
                </FormField>
                <FormField
                    id={`prescription_items.${index}.dose_text`}
                    label="Dosis"
                >
                    <Input
                        id={`prescription_items.${index}.dose_text`}
                        value={item.dose_text ?? ''}
                        disabled={disabled}
                        placeholder="1 tablet"
                        onChange={(event) =>
                            onChange({ dose_text: event.target.value })
                        }
                    />
                </FormField>
                <FormField
                    id={`prescription_items.${index}.frequency_text`}
                    label="Frekuensi"
                >
                    <Input
                        id={`prescription_items.${index}.frequency_text`}
                        value={item.frequency_text ?? ''}
                        disabled={disabled}
                        placeholder="3 kali sehari"
                        onChange={(event) =>
                            onChange({ frequency_text: event.target.value })
                        }
                    />
                </FormField>
                <FormField
                    id={`prescription_items.${index}.timing_text`}
                    label="Waktu"
                >
                    <Input
                        id={`prescription_items.${index}.timing_text`}
                        value={item.timing_text ?? ''}
                        disabled={disabled}
                        placeholder="Sesudah makan"
                        onChange={(event) =>
                            onChange({ timing_text: event.target.value })
                        }
                    />
                </FormField>
            </div>
            <FormField
                id={`prescription_items.${index}.duration_text`}
                label="Lama pemberian"
                error={errors[`prescription_items.${index}.duration_text`]}
            >
                <Input
                    id={`prescription_items.${index}.duration_text`}
                    value={item.duration_text ?? ''}
                    disabled={disabled}
                    placeholder="Contoh: 5 hari (opsional)"
                    onChange={(event) =>
                        onChange({ duration_text: event.target.value })
                    }
                />
            </FormField>
            <FormField
                id={`prescription_items.${index}.instruction`}
                label="Aturan pakai"
                error={errors[`prescription_items.${index}.instruction`]}
                required
            >
                <Input
                    id={`prescription_items.${index}.instruction`}
                    value={item.instruction}
                    disabled={disabled}
                    placeholder="Minum 1 tablet 3 kali sehari sesudah makan"
                    onChange={(event) =>
                        onChange({ instruction: event.target.value })
                    }
                />
            </FormField>
        </div>
    );
}
function ContextPanel({
    encounter,
    previousEncounters,
    canViewPatient,
}: {
    encounter: ClinicalEncounter;
    previousEncounters?: PreviousEncounter[];
    canViewPatient: boolean;
}) {
    const [historyOpen, setHistoryOpen] = useState(false);
    const [loadingHistory, setLoadingHistory] = useState(false);
    return (
        <aside className="grid min-w-0 gap-4">
            <div className="hidden xl:block">
                <TriageSection encounter={encounter} />
            </div>
            <section className="bg-card rounded-xl border p-4">
                <h2 className="text-sm font-semibold">Kunjungan Saat Ini</h2>
                <dl className="mt-3 grid gap-3 text-xs">
                    <Info label="Nomor" value={encounter.registration_number} />
                    <Info label="Unit" value={encounter.service_unit} />
                    <Info label="Status" value={encounter.status_label} />
                    <Info label="Keluhan" value={encounter.chief_complaint} />
                </dl>
                {canViewPatient && (
                    <Button
                        asChild
                        variant="outline"
                        size="sm"
                        className="mt-4 w-full"
                    >
                        <Link href={showPatient(encounter.patient.uuid)}>
                            Buka Profil Pasien
                        </Link>
                    </Button>
                )}
            </section>
            <section className="bg-card rounded-xl border p-4">
                <div className="flex items-center justify-between gap-2">
                    <h2 className="flex items-center gap-2 text-sm font-semibold">
                        <History className="size-4" /> Riwayat terakhir
                    </h2>
                    <Button
                        variant="ghost"
                        size="sm"
                        disabled={loadingHistory}
                        aria-expanded={historyOpen}
                        onClick={() => {
                            setHistoryOpen(!historyOpen);
                            if (!historyOpen && !previousEncounters)
                                router.reload({
                                    only: ['previousEncounters'],
                                    onStart: () => setLoadingHistory(true),
                                    onFinish: () => setLoadingHistory(false),
                                });
                        }}
                    >
                        {loadingHistory ? (
                            <Spinner />
                        ) : historyOpen ? (
                            'Tutup'
                        ) : (
                            'Lihat'
                        )}
                    </Button>
                </div>
                {historyOpen &&
                    (loadingHistory ? (
                        <div
                            className="mt-4 grid animate-pulse gap-3"
                            role="status"
                        >
                            <span className="sr-only">
                                Memuat riwayat pasien
                            </span>
                            <div className="bg-muted h-12 rounded" />
                            <div className="bg-muted h-12 rounded" />
                        </div>
                    ) : !previousEncounters ? (
                        <p className="text-muted-foreground mt-3 text-xs">
                            Riwayat belum berhasil dimuat. Tutup dan coba
                            kembali.
                        </p>
                    ) : previousEncounters.length === 0 ? (
                        <p className="text-muted-foreground mt-3 text-xs">
                            Belum ada rekam medis final sebelumnya.
                        </p>
                    ) : (
                        <div className="mt-4 grid gap-4">
                            {previousEncounters.map((previous) => (
                                <article
                                    key={previous.uuid}
                                    className="border-primary/30 border-l-2 pl-3"
                                >
                                    <p className="text-xs font-medium">
                                        {formatDate(previous.date)}
                                    </p>
                                    <p className="text-muted-foreground mt-1 text-xs">
                                        {previous.doctor}
                                    </p>
                                    <p className="mt-2 text-sm">
                                        {previous.diagnoses
                                            .map(
                                                (item) =>
                                                    `${item.code} ${item.display}`,
                                            )
                                            .join(', ') ||
                                            previous.assessment ||
                                            'Tanpa ringkasan diagnosis'}
                                    </p>
                                    {previous.plan && (
                                        <p className="text-muted-foreground mt-1 line-clamp-3 text-xs">
                                            {previous.plan}
                                        </p>
                                    )}
                                    <Link
                                        href={editMedicalRecord(previous.uuid)}
                                        className="text-primary mt-2 inline-block text-xs font-medium underline-offset-4 hover:underline"
                                    >
                                        Lihat rekam medis
                                    </Link>
                                </article>
                            ))}
                        </div>
                    ))}
            </section>
        </aside>
    );
}
function AmendmentSection({
    record,
    canAmend,
}: {
    record: NonNullable<ClinicalEncounter['medical_record']>;
    canAmend: boolean;
}) {
    const form = useForm({ reason: '', content: '' });
    return (
        <Section
            number="+"
            title="Koreksi Rekam Medis"
            description="Koreksi ditambahkan sebagai catatan baru; isi rekam medis original tetap terkunci."
        >
            {record.amendments.map((item) => (
                <article
                    key={item.uuid}
                    className="bg-muted/20 rounded-lg border p-4"
                >
                    <div className="flex flex-wrap justify-between gap-2">
                        <p className="text-sm font-semibold">{item.reason}</p>
                        <p className="text-muted-foreground text-xs">
                            {item.created_by} ·{' '}
                            {formatDateTime(item.created_at)}
                        </p>
                    </div>
                    <p className="mt-2 text-sm whitespace-pre-wrap">
                        {item.content}
                    </p>
                </article>
            ))}
            {canAmend && (
                <form
                    onSubmit={(event) => {
                        event.preventDefault();
                        form.post(storeAmendment.url(record.uuid), {
                            preserveScroll: true,
                            onSuccess: () => form.reset(),
                        });
                    }}
                    className="grid gap-4 rounded-lg border p-4"
                >
                    <FormField
                        id="amendment-reason"
                        label="Alasan koreksi"
                        error={form.errors.reason}
                        required
                    >
                        <Input
                            id="amendment-reason"
                            value={form.data.reason}
                            onChange={(event) =>
                                form.setData('reason', event.target.value)
                            }
                        />
                    </FormField>
                    <TextAreaField
                        id="amendment-content"
                        label="Isi koreksi"
                        value={form.data.content}
                        onChange={(value) => form.setData('content', value)}
                        error={form.errors.content}
                        disabled={false}
                        rows={3}
                    />
                    <Button
                        type="submit"
                        className="justify-self-end"
                        disabled={form.processing}
                    >
                        <ClipboardPlus /> Tambahkan Koreksi
                    </Button>
                </form>
            )}
        </Section>
    );
}
function RemoveButton({
    label,
    onClick,
}: {
    label: string;
    onClick: () => void;
}) {
    return (
        <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={label}
            onClick={onClick}
        >
            <Trash2 />
        </Button>
    );
}
function EmptyText({ text }: { text: string }) {
    return (
        <p className="text-muted-foreground rounded-lg border border-dashed p-4 text-center text-xs">
            {text}
        </p>
    );
}
function InputErrorText({ error }: { error?: string }) {
    return error ? (
        <p className="text-destructive text-xs" role="alert">
            {error}
        </p>
    ) : null;
}
function Info({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="mt-1 font-medium">{value}</dd>
        </div>
    );
}
function age(value: string) {
    const birth = new Date(`${value}T00:00:00`);
    const now = new Date();
    let result = now.getFullYear() - birth.getFullYear();
    if (now < new Date(now.getFullYear(), birth.getMonth(), birth.getDate()))
        result--;
    return result;
}
function rupiah(value: string | number) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0,
    }).format(Number(value));
}
function formatDate(value: string) {
    return new Intl.DateTimeFormat('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    }).format(new Date(`${value}T00:00:00`));
}
function formatDateTime(value: string) {
    return new Intl.DateTimeFormat('id-ID', {
        dateStyle: 'medium',
        timeStyle: 'short',
    }).format(new Date(value));
}
const selectClassName =
    'border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 disabled:bg-muted/30 h-9 w-full rounded-md border px-3 text-sm outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed';
