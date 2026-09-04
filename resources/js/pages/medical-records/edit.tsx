import { Head, Link, router, useForm } from '@inertiajs/react';
import {
    AlertTriangle,
    ArrowLeft,
    CheckCircle2,
    ClipboardPlus,
    LockKeyhole,
    Pill,
    Plus,
    Save,
    Search,
    Stethoscope,
    Trash2,
} from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { FormField } from '@/components/form-field';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { show as clinicalCatalog } from '@/routes/clinical-catalog';
import { store as startConsultation } from '@/routes/consultations';
import { index as doctorQueue } from '@/routes/doctor-queue';
import { store as storeAmendment } from '@/routes/medical-record-amendments';
import { update } from '@/routes/medical-records';
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
    can,
}: {
    encounter: ClinicalEncounter;
    previousEncounters: PreviousEncounter[];
    can: { start: boolean; save: boolean; finalize: boolean; amend: boolean };
}) {
    const record = encounter.medical_record;
    const locked = record?.status === 'final' || record?.status === 'amended';
    const form = useForm<ClinicalFormData>({
        intent: 'draft',
        subjective: record?.subjective ?? '',
        objective: record?.objective ?? '',
        assessment: record?.assessment ?? '',
        plan: record?.plan ?? '',
        additional_notes: record?.additional_notes ?? '',
        diagnoses: record?.diagnoses.filter((item) => item.catalog_id) ?? [],
        procedures: record?.procedures.filter((item) => item.service_id) ?? [],
        prescription_notes: record?.prescription?.notes ?? '',
        prescription_items:
            record?.prescription?.items.filter((item) => item.medicine_id) ?? [],
    });

    const submit = (intent: 'draft' | 'finalize') => {
        if (
            intent === 'finalize' &&
            !window.confirm(
                'Finalisasi akan mengunci rekam medis. Pastikan seluruh data sudah benar.',
            )
        ) {
            return;
        }

        form.transform((data) => ({ ...data, intent }));
        form.put(update.url(encounter.uuid), {
            preserveScroll: intent === 'draft',
        });
    };

    return (
        <>
            <Head title={`Pemeriksaan ${encounter.patient.name}`} />
            <div className="flex flex-1 flex-col gap-5 pb-24">
                <PatientHeader encounter={encounter} locked={locked} />

                <div className="grid items-start gap-5 px-4 md:px-6 xl:grid-cols-[minmax(0,1fr)_21rem]">
                    <main className="grid min-w-0 gap-5">
                        {can.start && (
                            <section className="border-primary/30 bg-primary/5 rounded-xl border p-4">
                                <h2 className="font-semibold">Pasien siap diperiksa</h2>
                                <p className="text-muted-foreground mt-1 text-sm">
                                    Mulai pemeriksaan untuk membuka form rekam medis.
                                </p>
                                <Button
                                    className="mt-4"
                                    onClick={() => router.post(startConsultation.url(encounter.uuid))}
                                >
                                    <Stethoscope /> Mulai Pemeriksaan
                                </Button>
                            </section>
                        )}

                        <TriageSection encounter={encounter} />

                        <Section
                            number="1"
                            title="SOAP"
                            description="Catat hasil pemeriksaan dalam satu alur. Subjective, assessment, dan plan wajib saat finalisasi."
                        >
                            <div className="grid gap-4 lg:grid-cols-2">
                                <TextAreaField
                                    id="subjective"
                                    label="Subjective"
                                    value={form.data.subjective}
                                    onChange={(value) => form.setData('subjective', value)}
                                    error={form.errors.subjective}
                                    disabled={!can.save || locked}
                                    placeholder="Keluhan, riwayat penyakit, dan informasi dari pasien"
                                />
                                <TextAreaField
                                    id="objective"
                                    label="Objective"
                                    value={form.data.objective}
                                    onChange={(value) => form.setData('objective', value)}
                                    error={form.errors.objective}
                                    disabled={!can.save || locked}
                                    placeholder="Temuan pemeriksaan fisik dan objektif"
                                />
                                <TextAreaField
                                    id="assessment"
                                    label="Assessment"
                                    value={form.data.assessment}
                                    onChange={(value) => form.setData('assessment', value)}
                                    error={form.errors.assessment}
                                    disabled={!can.save || locked}
                                    placeholder="Penilaian klinis dokter"
                                />
                                <TextAreaField
                                    id="plan"
                                    label="Plan"
                                    value={form.data.plan}
                                    onChange={(value) => form.setData('plan', value)}
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
                                    render={(item) => `${item.code} — ${item.display}`}
                                    onSelect={(item) => {
                                        const hasPrimary = form.data.diagnoses.some(
                                            (diagnosis) => diagnosis.type === 'primary',
                                        );
                                        form.setData('diagnoses', [
                                            ...form.data.diagnoses,
                                            {
                                                catalog_id: item.uuid,
                                                code_system: item.code_system,
                                                code: item.code,
                                                display: item.display,
                                                type: hasPrimary ? 'secondary' : 'primary',
                                                notes: null,
                                            },
                                        ]);
                                    }}
                                    exclude={form.data.diagnoses.map((item) => item.catalog_id)}
                                />
                            )}
                            <InputErrorText error={form.errors.diagnoses} />
                            <div className="grid gap-2">
                                {form.data.diagnoses.length === 0 ? (
                                    <EmptyText text="Belum ada diagnosis." />
                                ) : (
                                    form.data.diagnoses.map((diagnosis, index) => (
                                        <div key={`${diagnosis.catalog_id}-${index}`} className="bg-muted/20 grid gap-3 rounded-lg border p-3 sm:grid-cols-[minmax(0,1fr)_9rem_auto] sm:items-center">
                                            <div>
                                                <p className="text-sm font-medium">
                                                    {diagnosis.code} — {diagnosis.display}
                                                </p>
                                                <p className="text-muted-foreground mt-1 text-xs">
                                                    {diagnosis.code_system}
                                                </p>
                                            </div>
                                            <select
                                                aria-label={`Jenis diagnosis ${diagnosis.display}`}
                                                value={diagnosis.type}
                                                disabled={!can.save || locked}
                                                className={selectClassName}
                                                onChange={(event) => {
                                                    const next = [...form.data.diagnoses];
                                                    const type = event.target.value as DiagnosisRow['type'];
                                                    if (type === 'primary') {
                                                        next.forEach((item) => (item.type = 'secondary'));
                                                    }
                                                    next[index] = { ...next[index], type };
                                                    form.setData('diagnoses', next);
                                                }}
                                            >
                                                <option value="primary">Utama</option>
                                                <option value="secondary">Sekunder</option>
                                            </select>
                                            {!locked && can.save && (
                                                <RemoveButton
                                                    label={`Hapus ${diagnosis.display}`}
                                                    onClick={() => form.setData('diagnoses', form.data.diagnoses.filter((_, rowIndex) => rowIndex !== index))}
                                                />
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        </Section>

                        <Section
                            number="3"
                            title="Tindakan"
                            description="Nama dan tarif disalin dari master saat disimpan agar histori tetap konsisten."
                        >
                            {!locked && can.save && (
                                <CatalogPicker<ServiceOption>
                                    resource="services"
                                    placeholder="Cari tindakan atau layanan..."
                                    render={(item) => `${item.code} — ${item.name} · ${rupiah(item.price)}`}
                                    onSelect={(item) =>
                                        form.setData('procedures', [
                                            ...form.data.procedures,
                                            { service_id: item.uuid, code: item.code, name: item.name, price: Number(item.price), notes: null },
                                        ])
                                    }
                                    exclude={form.data.procedures.map((item) => item.service_id)}
                                />
                            )}
                            <InputErrorText error={form.errors.procedures} />
                            <div className="grid gap-2">
                                {form.data.procedures.length === 0 ? (
                                    <EmptyText text="Belum ada tindakan." />
                                ) : (
                                    form.data.procedures.map((procedure, index) => (
                                        <div key={`${procedure.service_id}-${index}`} className="bg-muted/20 flex items-center justify-between gap-3 rounded-lg border p-3">
                                            <div>
                                                <p className="text-sm font-medium">{procedure.name}</p>
                                                <p className="text-muted-foreground mt-1 text-xs">{procedure.code} · {rupiah(procedure.price)}</p>
                                            </div>
                                            {!locked && can.save && (
                                                <RemoveButton
                                                    label={`Hapus ${procedure.name}`}
                                                    onClick={() => form.setData('procedures', form.data.procedures.filter((_, rowIndex) => rowIndex !== index))}
                                                />
                                            )}
                                        </div>
                                    ))
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
                                    render={(item) => `${item.name}${item.strength ? ` ${item.strength}` : ''} · ${item.dosage_form}`}
                                    onSelect={(item) =>
                                        form.setData('prescription_items', [
                                            ...form.data.prescription_items,
                                            {
                                                medicine_id: item.uuid,
                                                name: item.name,
                                                strength: item.strength,
                                                dosage_form: item.dosage_form,
                                                quantity: 1,
                                                unit: item.unit,
                                                dose_text: '',
                                                frequency_text: '',
                                                timing_text: '',
                                                duration_text: '',
                                                instruction: '',
                                                notes: null,
                                            },
                                        ])
                                    }
                                    exclude={form.data.prescription_items.map((item) => item.medicine_id)}
                                />
                            )}
                            <InputErrorText error={form.errors.prescription_items} />
                            <div className="grid gap-3">
                                {form.data.prescription_items.length === 0 ? (
                                    <EmptyText text="Belum ada obat dalam resep." />
                                ) : (
                                    form.data.prescription_items.map((item, index) => (
                                        <PrescriptionItemEditor
                                            key={`${item.medicine_id}-${index}`}
                                            item={item}
                                            index={index}
                                            disabled={!can.save || locked}
                                            errors={form.errors}
                                            onChange={(changes) => {
                                                const next = [...form.data.prescription_items];
                                                next[index] = { ...next[index], ...changes };
                                                form.setData('prescription_items', next);
                                            }}
                                            onRemove={() => form.setData('prescription_items', form.data.prescription_items.filter((_, rowIndex) => rowIndex !== index))}
                                        />
                                    ))
                                )}
                            </div>
                            <TextAreaField
                                id="prescription_notes"
                                label="Catatan resep"
                                value={form.data.prescription_notes}
                                onChange={(value) => form.setData('prescription_notes', value)}
                                disabled={!can.save || locked}
                                error={form.errors.prescription_notes}
                                rows={2}
                                placeholder="Catatan untuk petugas farmasi (opsional)"
                            />
                        </Section>

                        <Section number="5" title="Catatan Tambahan" description="Informasi klinis lain yang belum tercakup pada bagian di atas.">
                            <TextAreaField
                                id="additional_notes"
                                label="Catatan"
                                value={form.data.additional_notes}
                                onChange={(value) => form.setData('additional_notes', value)}
                                disabled={!can.save || locked}
                                error={form.errors.additional_notes}
                                rows={3}
                            />
                        </Section>

                        {record && locked && (
                            <AmendmentSection
                                record={record}
                                canAmend={can.amend}
                            />
                        )}
                    </main>

                    <ContextPanel encounter={encounter} previousEncounters={previousEncounters} />
                </div>

                {can.save && !locked && (
                    <div className="bg-background/95 fixed right-0 bottom-0 left-0 z-30 border-t px-4 py-3 backdrop-blur md:px-6 lg:left-[var(--sidebar-width)]">
                        <div className="ml-auto flex max-w-7xl flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                            <Button variant="outline" onClick={() => submit('draft')} disabled={form.processing}>
                                {form.processing ? <Spinner /> : <Save />} Simpan Draft
                            </Button>
                            <Button onClick={() => submit('finalize')} disabled={form.processing || !can.finalize}>
                                <LockKeyhole /> Finalisasi RME
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}

function PatientHeader({ encounter, locked }: { encounter: ClinicalEncounter; locked: boolean }) {
    return (
        <header className="bg-background/95 sticky top-0 z-20 border-b px-4 py-3 backdrop-blur md:px-6">
            <div className="mx-auto flex max-w-7xl flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                    <Button asChild variant="ghost" size="icon">
                        <Link href={doctorQueue()} aria-label="Kembali ke antrean dokter"><ArrowLeft /></Link>
                    </Button>
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                            <h1 className="truncate text-lg font-semibold">{encounter.patient.name}</h1>
                            {locked && (
                                <span className="border-emerald-300 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 rounded-full border dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300">
                                    <LockKeyhole className="mr-1 inline size-3" /> {encounter.medical_record?.status_label}
                                </span>
                            )}
                        </div>
                        <p className="text-muted-foreground mt-1 text-xs">
                            {encounter.patient.medical_record_number} · {age(encounter.patient.birth_date)} tahun · {encounter.patient.gender === 'male' ? 'Laki-laki' : 'Perempuan'} · Antrean {encounter.queue_number}
                        </p>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                    {encounter.patient.allergies.length > 0 ? (
                        <span className="border-red-300 bg-red-50 px-3 py-1.5 font-semibold text-red-700 rounded-lg border dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
                            <AlertTriangle className="mr-1 inline size-3.5" /> Alergi: {encounter.patient.allergies.map((item) => item.substance).join(', ')}
                        </span>
                    ) : (
                        <span className="text-muted-foreground rounded-lg border px-3 py-1.5">Tidak ada alergi aktif</span>
                    )}
                    <span className="rounded-lg border px-3 py-1.5">{encounter.practitioner.name}</span>
                </div>
            </div>
        </header>
    );
}

function TriageSection({ encounter }: { encounter: ClinicalEncounter }) {
    const triage = encounter.triage;
    const vitals = triage
        ? [
              ['TD', triage.systolic_bp && triage.diastolic_bp ? `${triage.systolic_bp}/${triage.diastolic_bp} mmHg` : null],
              ['Nadi', triage.heart_rate ? `${triage.heart_rate} x/menit` : null],
              ['Suhu', triage.temperature ? `${triage.temperature} °C` : null],
              ['Respirasi', triage.respiratory_rate ? `${triage.respiratory_rate} x/menit` : null],
              ['SpO₂', triage.spo2 ? `${triage.spo2}%` : null],
              ['BB / TB', triage.weight || triage.height ? `${triage.weight ?? '-'} kg / ${triage.height ?? '-'} cm` : null],
              ['Nyeri', triage.pain_scale !== null ? `${triage.pain_scale}/10` : null],
          ]
        : [];

    return (
        <section className="bg-card rounded-xl border">
            <div className="border-b p-4"><h2 className="font-semibold">Pemeriksaan Awal</h2></div>
            <div className="p-4">
                {!triage ? (
                    <p className="text-muted-foreground text-sm">Triase tidak digunakan atau belum tersedia.</p>
                ) : (
                    <div className="grid gap-4">
                        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                            {vitals.filter(([, value]) => value).map(([label, value]) => (
                                <div key={label} className="bg-muted/30 rounded-lg border p-3">
                                    <p className="text-muted-foreground text-xs">{label}</p>
                                    <p className="mt-1 text-sm font-semibold">{value}</p>
                                </div>
                            ))}
                        </div>
                        {(triage.chief_complaint || triage.notes) && (
                            <p className="text-sm">{triage.chief_complaint ?? triage.notes}</p>
                        )}
                    </div>
                )}
            </div>
        </section>
    );
}

function Section({ number, title, description, icon, children }: { number: string; title: string; description: string; icon?: ReactNode; children: ReactNode }) {
    return (
        <section className="bg-card rounded-xl border">
            <div className="flex gap-3 border-b p-4 md:p-5">
                <span className="bg-primary/10 text-primary grid size-8 shrink-0 place-items-center rounded-lg text-xs font-semibold">{icon ?? number}</span>
                <div><h2 className="font-semibold">{title}</h2><p className="text-muted-foreground mt-1 text-xs">{description}</p></div>
            </div>
            <div className="grid gap-4 p-4 md:p-5">{children}</div>
        </section>
    );
}

function TextAreaField({ id, label, value, onChange, error, disabled, placeholder, rows = 5 }: { id: string; label: string; value: string; onChange: (value: string) => void; error?: string; disabled: boolean; placeholder?: string; rows?: number }) {
    return (
        <FormField id={id} label={label} error={error}>
            <textarea id={id} value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled} placeholder={placeholder} rows={rows} className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 disabled:bg-muted/30 w-full resize-y rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed" />
        </FormField>
    );
}

function CatalogPicker<T extends { uuid: string }>({ resource, placeholder, render, onSelect, exclude }: { resource: 'diagnoses' | 'services' | 'medicines'; placeholder: string; render: (item: T) => string; onSelect: (item: T) => void; exclude: string[] }) {
    const [query, setQuery] = useState('');
    const [items, setItems] = useState<T[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (query.trim().length < 2) {
            setItems([]);
            setError(null);
            return;
        }
        const controller = new AbortController();
        const timer = window.setTimeout(async () => {
            setLoading(true);
            setError(null);
            try {
                const response = await fetch(clinicalCatalog.url(resource, { query: { search: query.trim() } }), { headers: { Accept: 'application/json' }, signal: controller.signal });
                if (!response.ok) throw new Error('Pencarian gagal. Coba lagi.');
                const data = (await response.json()) as { items: T[] };
                setItems(data.items.filter((item) => !exclude.includes(item.uuid)));
            } catch (reason) {
                if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : 'Pencarian gagal.');
            } finally {
                if (!controller.signal.aborted) setLoading(false);
            }
        }, 250);
        return () => { window.clearTimeout(timer); controller.abort(); };
    }, [exclude, query, resource]);

    return (
        <div className="grid gap-2">
            <div className="relative">
                <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={placeholder} className="pl-9" />
                {loading && <Spinner className="absolute top-1/2 right-3 -translate-y-1/2" />}
            </div>
            {error && <p className="text-destructive text-xs" role="alert">{error}</p>}
            {items.length > 0 && (
                <div className="bg-popover max-h-56 overflow-y-auto rounded-lg border p-1">
                    {items.map((item) => (
                        <button key={item.uuid} type="button" onClick={() => { onSelect(item); setQuery(''); setItems([]); }} className="hover:bg-muted flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm">
                            <Plus className="text-primary size-4 shrink-0" /> {render(item)}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

function PrescriptionItemEditor({ item, index, disabled, errors, onChange, onRemove }: { item: PrescriptionRow; index: number; disabled: boolean; errors: Partial<Record<string, string>>; onChange: (changes: Partial<PrescriptionRow>) => void; onRemove: () => void }) {
    return (
        <div className="bg-muted/20 grid gap-4 rounded-lg border p-4">
            <div className="flex items-start justify-between gap-3">
                <div><p className="text-sm font-semibold">{item.name} {item.strength}</p><p className="text-muted-foreground mt-1 text-xs">{item.dosage_form} · satuan {item.unit}</p></div>
                {!disabled && <RemoveButton label={`Hapus ${item.name}`} onClick={onRemove} />}
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <FormField id={`quantity-${index}`} label="Jumlah" error={errors[`prescription_items.${index}.quantity`]} required>
                    <Input id={`quantity-${index}`} type="number" min="0.01" step="0.01" value={item.quantity} disabled={disabled} onChange={(event) => onChange({ quantity: event.target.value })} />
                </FormField>
                <FormField id={`dose-${index}`} label="Dosis"><Input id={`dose-${index}`} value={item.dose_text ?? ''} disabled={disabled} placeholder="1 tablet" onChange={(event) => onChange({ dose_text: event.target.value })} /></FormField>
                <FormField id={`frequency-${index}`} label="Frekuensi"><Input id={`frequency-${index}`} value={item.frequency_text ?? ''} disabled={disabled} placeholder="3 kali sehari" onChange={(event) => onChange({ frequency_text: event.target.value })} /></FormField>
                <FormField id={`timing-${index}`} label="Waktu"><Input id={`timing-${index}`} value={item.timing_text ?? ''} disabled={disabled} placeholder="Sesudah makan" onChange={(event) => onChange({ timing_text: event.target.value })} /></FormField>
            </div>
            <FormField id={`instruction-${index}`} label="Aturan pakai" error={errors[`prescription_items.${index}.instruction`]} required>
                <Input id={`instruction-${index}`} value={item.instruction} disabled={disabled} placeholder="Minum 1 tablet 3 kali sehari sesudah makan" onChange={(event) => onChange({ instruction: event.target.value })} />
            </FormField>
        </div>
    );
}

function ContextPanel({ encounter, previousEncounters }: { encounter: ClinicalEncounter; previousEncounters: PreviousEncounter[] }) {
    return (
        <aside className="grid gap-4 xl:sticky xl:top-24">
            <section className="bg-card rounded-xl border p-4">
                <h2 className="text-sm font-semibold">Kunjungan Saat Ini</h2>
                <dl className="mt-3 grid gap-3 text-xs">
                    <Info label="Nomor" value={encounter.registration_number} />
                    <Info label="Unit" value={encounter.service_unit} />
                    <Info label="Status" value={encounter.status_label} />
                    <Info label="Keluhan" value={encounter.chief_complaint} />
                </dl>
                <Button asChild variant="outline" size="sm" className="mt-4 w-full"><Link href={showPatient(encounter.patient.uuid)}>Buka Profil Pasien</Link></Button>
            </section>
            <section className="bg-card rounded-xl border p-4">
                <h2 className="text-sm font-semibold">Riwayat Terakhir</h2>
                {previousEncounters.length === 0 ? <p className="text-muted-foreground mt-3 text-xs">Belum ada RME final sebelumnya.</p> : (
                    <div className="mt-3 grid gap-3">
                        {previousEncounters.map((previous) => (
                            <article key={`${previous.date}-${previous.doctor}`} className="border-l-primary border-l-2 pl-3">
                                <p className="text-xs font-semibold">{formatDate(previous.date)} · {previous.doctor}</p>
                                <p className="mt-1 text-xs">{previous.diagnoses.map((item) => `${item.code} ${item.display}`).join(', ') || previous.assessment || 'Tanpa ringkasan diagnosis'}</p>
                            </article>
                        ))}
                    </div>
                )}
            </section>
        </aside>
    );
}

function AmendmentSection({ record, canAmend }: { record: NonNullable<ClinicalEncounter['medical_record']>; canAmend: boolean }) {
    const form = useForm({ reason: '', content: '' });

    return (
        <Section number="+" title="Koreksi Rekam Medis" description="Koreksi ditambahkan sebagai catatan baru; isi rekam medis original tetap terkunci.">
            {record.amendments.map((item) => (
                <article key={item.uuid} className="bg-muted/20 rounded-lg border p-4">
                    <div className="flex flex-wrap justify-between gap-2"><p className="text-sm font-semibold">{item.reason}</p><p className="text-muted-foreground text-xs">{item.created_by} · {formatDateTime(item.created_at)}</p></div>
                    <p className="mt-2 whitespace-pre-wrap text-sm">{item.content}</p>
                </article>
            ))}
            {canAmend && (
                <form onSubmit={(event) => { event.preventDefault(); form.post(storeAmendment.url(record.uuid), { preserveScroll: true, onSuccess: () => form.reset() }); }} className="grid gap-4 rounded-lg border p-4">
                    <FormField id="amendment-reason" label="Alasan koreksi" error={form.errors.reason} required><Input id="amendment-reason" value={form.data.reason} onChange={(event) => form.setData('reason', event.target.value)} /></FormField>
                    <TextAreaField id="amendment-content" label="Isi koreksi" value={form.data.content} onChange={(value) => form.setData('content', value)} error={form.errors.content} disabled={false} rows={3} />
                    <Button type="submit" className="justify-self-end" disabled={form.processing}><ClipboardPlus /> Tambahkan Koreksi</Button>
                </form>
            )}
        </Section>
    );
}

function RemoveButton({ label, onClick }: { label: string; onClick: () => void }) {
    return <Button type="button" variant="ghost" size="icon" aria-label={label} onClick={onClick}><Trash2 /></Button>;
}

function EmptyText({ text }: { text: string }) { return <p className="text-muted-foreground rounded-lg border border-dashed p-4 text-center text-xs">{text}</p>; }
function InputErrorText({ error }: { error?: string }) { return error ? <p className="text-destructive text-xs" role="alert">{error}</p> : null; }
function Info({ label, value }: { label: string; value: string }) { return <div><dt className="text-muted-foreground">{label}</dt><dd className="mt-1 font-medium">{value}</dd></div>; }
function age(value: string) { const birth = new Date(`${value}T00:00:00`); const now = new Date(); let result = now.getFullYear() - birth.getFullYear(); if (now < new Date(now.getFullYear(), birth.getMonth(), birth.getDate())) result--; return result; }
function rupiah(value: string | number) { return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(value)); }
function formatDate(value: string) { return new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(`${value}T00:00:00`)); }
function formatDateTime(value: string) { return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)); }

const selectClassName = 'border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 disabled:bg-muted/30 h-9 w-full rounded-md border px-3 text-sm outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed';
