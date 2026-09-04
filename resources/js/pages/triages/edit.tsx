import { Form, Head, Link } from '@inertiajs/react';
import {
    Activity,
    AlertTriangle,
    ArrowLeft,
    CheckCircle2,
    ClipboardCheck,
    HeartPulse,
    Save,
    UserRound,
} from 'lucide-react';
import { FormField } from '@/components/form-field';
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { dashboard } from '@/routes';
import { show as showPatient } from '@/routes/patients';
import { index, update } from '@/routes/triages';
import type { TriageEncounter } from '@/types';

export default function TriageEdit({
    encounter,
    can,
}: {
    encounter: TriageEncounter;
    can: { save: boolean; complete: boolean };
}) {
    const readOnly = !can.save;

    return (
        <>
            <Head title={`Pemeriksaan awal ${encounter.patient.name}`} />
            <div className="flex flex-1 flex-col gap-5 p-4 md:p-6">
                <PageHeader
                    eyebrow={`Antrean ${encounter.queue_number}`}
                    title={encounter.patient.name}
                    description={`${encounter.patient.medical_record_number} · ${formatDate(encounter.patient.birth_date)} · ${encounter.service_unit}`}
                    actions={
                        <Button asChild variant="ghost">
                            <Link href={index()}>
                                <ArrowLeft /> Kembali ke antrean
                            </Link>
                        </Button>
                    }
                />

                {encounter.patient.allergies.length > 0 && (
                    <section className="rounded-xl border border-amber-300 bg-amber-50/60 p-4 dark:border-amber-900 dark:bg-amber-950/20">
                        <div className="flex items-start gap-3">
                            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-700 dark:text-amber-400" />
                            <div>
                                <h2 className="text-sm font-semibold">
                                    Alergi aktif
                                </h2>
                                <div className="mt-2 flex flex-wrap gap-2">
                                    {encounter.patient.allergies.map(
                                        (allergy) => (
                                            <Badge
                                                key={allergy.substance}
                                                variant="outline"
                                            >
                                                {allergy.substance}
                                                {allergy.reaction
                                                    ? ` — ${allergy.reaction}`
                                                    : ''}
                                            </Badge>
                                        ),
                                    )}
                                </div>
                            </div>
                        </div>
                    </section>
                )}

                {readOnly && encounter.triage?.status === 'completed' && (
                    <div className="flex items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/20 dark:text-emerald-300">
                        <CheckCircle2 className="size-4" />
                        Pemeriksaan awal sudah selesai dan tidak dapat diubah.
                    </div>
                )}

                <Form
                    {...update.form(encounter.uuid)}
                    options={{ preserveScroll: true }}
                    className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_20rem]"
                >
                    {({ errors, processing }) => (
                        <>
                            <fieldset
                                disabled={readOnly || processing}
                                className="grid gap-5"
                            >
                                <section className="bg-card rounded-xl border">
                                    <SectionHeader
                                        icon={ClipboardCheck}
                                        title="Keluhan dan catatan"
                                        description="Ringkas informasi awal yang relevan untuk dokter."
                                    />
                                    <div className="grid gap-4 p-4 md:p-5">
                                        <FormField
                                            id="chief_complaint"
                                            label="Keluhan utama"
                                            error={errors.chief_complaint}
                                        >
                                            <textarea
                                                id="chief_complaint"
                                                name="chief_complaint"
                                                defaultValue={
                                                    encounter.triage
                                                        ?.chief_complaint ??
                                                    encounter.chief_complaint
                                                }
                                                rows={3}
                                                maxLength={2000}
                                                className={textareaClassName}
                                            />
                                        </FormField>
                                        <FormField
                                            id="notes"
                                            label="Catatan"
                                            error={errors.notes}
                                        >
                                            <textarea
                                                id="notes"
                                                name="notes"
                                                defaultValue={
                                                    encounter.triage?.notes ??
                                                    ''
                                                }
                                                rows={4}
                                                maxLength={5000}
                                                className={textareaClassName}
                                                placeholder="Catatan tambahan, kondisi umum, atau informasi penting lain"
                                            />
                                        </FormField>
                                    </div>
                                </section>

                                <section className="bg-card rounded-xl border">
                                    <SectionHeader
                                        icon={HeartPulse}
                                        title="Tanda vital"
                                        description="Isi yang diukur. Kolom yang tidak diperlukan boleh dikosongkan."
                                    />
                                    <div className="grid gap-4 p-4 sm:grid-cols-2 md:p-5 lg:grid-cols-3">
                                        <VitalField
                                            id="systolic_bp"
                                            label="Sistolik"
                                            unit="mmHg"
                                            defaultValue={
                                                encounter.triage?.systolic_bp
                                            }
                                            error={errors.systolic_bp}
                                            min={40}
                                            max={300}
                                        />
                                        <VitalField
                                            id="diastolic_bp"
                                            label="Diastolik"
                                            unit="mmHg"
                                            defaultValue={
                                                encounter.triage?.diastolic_bp
                                            }
                                            error={errors.diastolic_bp}
                                            min={20}
                                            max={200}
                                        />
                                        <VitalField
                                            id="heart_rate"
                                            label="Nadi"
                                            unit="x/menit"
                                            defaultValue={
                                                encounter.triage?.heart_rate
                                            }
                                            error={errors.heart_rate}
                                            min={20}
                                            max={250}
                                        />
                                        <VitalField
                                            id="respiratory_rate"
                                            label="Respirasi"
                                            unit="x/menit"
                                            defaultValue={
                                                encounter.triage
                                                    ?.respiratory_rate
                                            }
                                            error={errors.respiratory_rate}
                                            min={5}
                                            max={80}
                                        />
                                        <VitalField
                                            id="temperature"
                                            label="Suhu"
                                            unit="°C"
                                            defaultValue={
                                                encounter.triage?.temperature
                                            }
                                            error={errors.temperature}
                                            min={30}
                                            max={45}
                                            step="0.1"
                                        />
                                        <VitalField
                                            id="spo2"
                                            label="SpO2"
                                            unit="%"
                                            defaultValue={
                                                encounter.triage?.spo2
                                            }
                                            error={errors.spo2}
                                            min={1}
                                            max={100}
                                        />
                                        <VitalField
                                            id="weight"
                                            label="Berat badan"
                                            unit="kg"
                                            defaultValue={
                                                encounter.triage?.weight
                                            }
                                            error={errors.weight}
                                            min={0.5}
                                            max={500}
                                            step="0.01"
                                        />
                                        <VitalField
                                            id="height"
                                            label="Tinggi badan"
                                            unit="cm"
                                            defaultValue={
                                                encounter.triage?.height
                                            }
                                            error={errors.height}
                                            min={20}
                                            max={250}
                                            step="0.01"
                                        />
                                        <VitalField
                                            id="pain_scale"
                                            label="Skala nyeri"
                                            unit="0–10"
                                            defaultValue={
                                                encounter.triage?.pain_scale
                                            }
                                            error={errors.pain_scale}
                                            min={0}
                                            max={10}
                                        />
                                    </div>
                                </section>
                            </fieldset>

                            <aside className="grid gap-4 xl:sticky xl:top-4">
                                <section className="bg-card rounded-xl border p-4">
                                    <h2 className="font-semibold">
                                        Konteks kunjungan
                                    </h2>
                                    <dl className="mt-4 grid gap-4 text-sm">
                                        <ContextItem
                                            label="Dokter"
                                            value={encounter.practitioner}
                                        />
                                        <ContextItem
                                            label="Unit"
                                            value={encounter.service_unit}
                                        />
                                        <ContextItem
                                            label="Keluhan pendaftaran"
                                            value={encounter.chief_complaint}
                                        />
                                    </dl>
                                    <Button
                                        asChild
                                        variant="outline"
                                        className="mt-4 w-full"
                                    >
                                        <Link
                                            href={showPatient(
                                                encounter.patient.uuid,
                                            )}
                                        >
                                            <UserRound /> Profil pasien
                                        </Link>
                                    </Button>
                                </section>

                                {errors.intent && (
                                    <p
                                        className="text-destructive border-destructive/30 rounded-lg border p-3 text-xs"
                                        role="alert"
                                    >
                                        {errors.intent}
                                    </p>
                                )}

                                {!readOnly && (
                                    <div className="grid gap-2">
                                        {can.save && (
                                            <Button
                                                type="submit"
                                                name="intent"
                                                value="draft"
                                                variant="outline"
                                                disabled={processing}
                                            >
                                                {processing ? (
                                                    <Spinner />
                                                ) : (
                                                    <Save />
                                                )}
                                                Simpan Draft
                                            </Button>
                                        )}
                                        {can.complete && (
                                            <Button
                                                type="submit"
                                                name="intent"
                                                value="complete"
                                                disabled={processing}
                                            >
                                                {processing ? (
                                                    <Spinner />
                                                ) : (
                                                    <CheckCircle2 />
                                                )}
                                                Selesai & Kirim ke Dokter
                                            </Button>
                                        )}
                                    </div>
                                )}
                            </aside>
                        </>
                    )}
                </Form>
            </div>
        </>
    );
}

function SectionHeader({
    icon: Icon,
    title,
    description,
}: {
    icon: typeof Activity;
    title: string;
    description: string;
}) {
    return (
        <div className="flex items-start gap-3 border-b p-4 md:p-5">
            <span className="bg-primary/10 text-primary flex size-8 shrink-0 items-center justify-center rounded-lg">
                <Icon className="size-4" />
            </span>
            <div>
                <h2 className="font-semibold">{title}</h2>
                <p className="text-muted-foreground mt-1 text-xs">
                    {description}
                </p>
            </div>
        </div>
    );
}

function VitalField({
    id,
    label,
    unit,
    defaultValue,
    error,
    min,
    max,
    step = '1',
}: {
    id: string;
    label: string;
    unit: string;
    defaultValue: string | number | null | undefined;
    error?: string;
    min: number;
    max: number;
    step?: string;
}) {
    return (
        <FormField
            id={id}
            label={label}
            error={error}
            description={`Rentang ${min}–${max} ${unit}`}
        >
            <div className="relative">
                <Input
                    id={id}
                    name={id}
                    type="number"
                    min={min}
                    max={max}
                    step={step}
                    defaultValue={defaultValue ?? ''}
                    className="pr-20"
                    inputMode="decimal"
                />
                <span className="text-muted-foreground pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs">
                    {unit}
                </span>
            </div>
        </FormField>
    );
}

function ContextItem({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <dt className="text-muted-foreground text-xs">{label}</dt>
            <dd className="mt-1 font-medium break-words">{value}</dd>
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

const textareaClassName =
    'border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 w-full resize-y rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-[3px]';

TriageEdit.layout = {
    breadcrumbs: [
        { title: 'Hari Ini', href: dashboard() },
        { title: 'Pemeriksaan Awal', href: index() },
        { title: 'Form pemeriksaan', href: index() },
    ],
};
