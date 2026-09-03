import { Form, Head } from '@inertiajs/react';
import { Clock3, Save, Workflow } from 'lucide-react';
import { FormField } from '@/components/form-field';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { dashboard } from '@/routes';
import { edit, update } from '@/routes/workflow';

type Settings = {
    opening_time: string;
    closing_time: string;
    default_visit_duration_minutes: number;
    require_triage: boolean;
    allow_walk_in: boolean;
    pharmacy_enabled: boolean;
    auto_send_prescription_to_pharmacy: boolean;
};

export default function WorkflowEdit({ settings }: { settings: Settings }) {
    return (
        <>
            <Head title="Alur Layanan" />
            <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                <PageHeader
                    eyebrow="Pengaturan klinik"
                    title="Alur Layanan"
                    description="Atur jam operasional dan tahapan default agar semua petugas mengikuti alur yang sama."
                />
                <Form {...update.form()} disableWhileProcessing>
                    {({ errors, processing }) => (
                        <div className="grid gap-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-base">
                                        <Clock3 className="text-primary size-4" />{' '}
                                        Jam operasional
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="grid gap-4 sm:grid-cols-3">
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
                                            defaultValue={settings.opening_time.slice(
                                                0,
                                                5,
                                            )}
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
                                            defaultValue={settings.closing_time.slice(
                                                0,
                                                5,
                                            )}
                                        />
                                    </FormField>
                                    <FormField
                                        id="default_visit_duration_minutes"
                                        label="Durasi kunjungan"
                                        error={
                                            errors.default_visit_duration_minutes
                                        }
                                        required
                                    >
                                        <Input
                                            id="default_visit_duration_minutes"
                                            name="default_visit_duration_minutes"
                                            type="number"
                                            min={5}
                                            max={480}
                                            step={5}
                                            defaultValue={
                                                settings.default_visit_duration_minutes
                                            }
                                        />
                                    </FormField>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-base">
                                        <Workflow className="text-primary size-4" />{' '}
                                        Tahapan pelayanan
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="grid gap-3 md:grid-cols-2">
                                    <BooleanSetting
                                        name="require_triage"
                                        label="Wajib triase"
                                        description="Pasien melewati pemeriksaan awal sebelum dokter."
                                        checked={settings.require_triage}
                                    />
                                    <BooleanSetting
                                        name="allow_walk_in"
                                        label="Izinkan walk-in"
                                        description="Front Office dapat mendaftarkan pasien tanpa janji."
                                        checked={settings.allow_walk_in}
                                    />
                                    <BooleanSetting
                                        name="pharmacy_enabled"
                                        label="Aktifkan farmasi"
                                        description="Resep dapat diproses oleh petugas farmasi."
                                        checked={settings.pharmacy_enabled}
                                    />
                                    <BooleanSetting
                                        name="auto_send_prescription_to_pharmacy"
                                        label="Kirim resep otomatis"
                                        description="Resep final langsung masuk ke antrean farmasi."
                                        checked={
                                            settings.auto_send_prescription_to_pharmacy
                                        }
                                    />
                                </CardContent>
                            </Card>
                            <div className="flex justify-end">
                                <Button type="submit" disabled={processing}>
                                    {processing ? <Spinner /> : <Save />} Simpan
                                    Alur
                                </Button>
                            </div>
                        </div>
                    )}
                </Form>
            </div>
        </>
    );
}

function BooleanSetting({
    name,
    label,
    description,
    checked,
}: {
    name: string;
    label: string;
    description: string;
    checked: boolean;
}) {
    return (
        <label className="bg-muted/30 flex cursor-pointer items-start gap-3 rounded-lg border p-4">
            <input type="hidden" name={name} value="0" />
            <input
                type="checkbox"
                name={name}
                value="1"
                defaultChecked={checked}
                className="accent-primary mt-1 size-4"
            />
            <span>
                <span className="block text-sm font-medium">{label}</span>
                <span className="text-muted-foreground block text-xs">
                    {description}
                </span>
            </span>
        </label>
    );
}

WorkflowEdit.layout = {
    breadcrumbs: [
        { title: 'Hari Ini', href: dashboard() },
        { title: 'Alur Layanan', href: edit() },
    ],
};
