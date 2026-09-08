import { useForm } from '@inertiajs/react';
import { Ban, CheckCircle2, PackageCheck } from 'lucide-react';
import { useState } from 'react';
import InputError from '@/components/input-error';
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { store as cancelPrescription } from '@/routes/pharmacy/cancellations';
import { store as dispensePrescription } from '@/routes/pharmacy/dispensing';
import { store as processPrescription } from '@/routes/pharmacy/processing';
import type { PharmacyPrescription } from '@/types';

export function PrescriptionActions({
    prescription,
    can,
    insufficientStock,
}: {
    prescription: PharmacyPrescription;
    can: { process: boolean; dispense: boolean; cancel: boolean };
    insufficientStock: boolean;
}) {
    const [confirmation, setConfirmation] = useState<
        'dispense' | 'cancel' | null
    >(null);
    const form = useForm({ reason: '' });
    const active =
        prescription.status === 'prescribed' ||
        prescription.status === 'processing';

    function submit(action: 'process' | 'dispense' | 'cancel') {
        const route =
            action === 'process'
                ? processPrescription
                : action === 'dispense'
                  ? dispensePrescription
                  : cancelPrescription;
        form.submit(route(prescription.uuid), {
            preserveScroll: true,
            onSuccess: () => {
                setConfirmation(null);
                form.reset();
            },
        });
    }

    return (
        <>
            <section className="bg-card rounded-xl border p-4">
                <h2 className="text-sm font-semibold">
                    {active ? 'Tindakan apotek' : 'Pelayanan selesai'}
                </h2>
                <p className="text-muted-foreground mt-2 text-xs leading-relaxed">
                    {prescription.status === 'prescribed'
                        ? 'Periksa resep dan aturan pakai, lalu mulai siapkan obat.'
                        : prescription.status === 'processing'
                          ? 'Cocokkan pasien, obat, jumlah, dan aturan pakai sebelum penyerahan.'
                          : prescription.status === 'dispensed'
                            ? 'Obat telah diserahkan. Resep tersimpan sebagai riwayat pelayanan.'
                            : 'Resep telah dibatalkan. Alasan dan riwayat proses tetap tersimpan.'}
                </p>
                <div className="mt-4 grid gap-3">
                    {can.process && (
                        <Button
                            disabled={form.processing}
                            onClick={() => submit('process')}
                        >
                            <PackageCheck />
                            {form.processing
                                ? 'Memproses…'
                                : 'Mulai siapkan obat'}
                        </Button>
                    )}
                    {can.dispense && (
                        <Button
                            disabled={form.processing || insufficientStock}
                            onClick={() => {
                                form.clearErrors();
                                setConfirmation('dispense');
                            }}
                        >
                            <CheckCircle2 />
                            Konfirmasi penyerahan
                        </Button>
                    )}
                    {active && insufficientStock && (
                        <p
                            className="text-destructive text-xs leading-relaxed"
                            role="status"
                        >
                            Stok belum mencukupi untuk seluruh resep. Perbarui
                            stok setelah persediaan tersedia.
                        </p>
                    )}
                    {!confirmation &&
                        Object.entries(form.errors).map(([key, error]) => (
                            <InputError key={key} message={error} />
                        ))}
                    {active && !can.process && !can.dispense && (
                        <p className="text-muted-foreground text-xs">
                            Akun Anda tidak memiliki tindakan utama untuk resep
                            ini.
                        </p>
                    )}
                    {can.cancel && (
                        <Button
                            variant="ghost"
                            className="text-muted-foreground justify-start px-0"
                            disabled={form.processing}
                            onClick={() => {
                                form.clearErrors();
                                setConfirmation('cancel');
                            }}
                        >
                            <Ban className="size-3.5" />
                            Batalkan resep
                        </Button>
                    )}
                </div>
            </section>
            <AlertDialog
                open={confirmation !== null}
                onOpenChange={(open) => {
                    if (!open && !form.processing) setConfirmation(null);
                }}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {confirmation === 'cancel'
                                ? 'Batalkan resep?'
                                : 'Konfirmasi penyerahan obat'}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {confirmation === 'cancel'
                                ? 'Resep akan dibatalkan dan kunjungan diteruskan ke tahap berikutnya. Riwayat tetap tersimpan.'
                                : 'Pastikan seluruh obat sudah sesuai resep dan diterima oleh pasien. Stok akan berkurang setelah dikonfirmasi.'}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="bg-muted/40 rounded-lg border p-3">
                        <p className="text-sm font-semibold break-words">
                            {prescription.patient.name}
                        </p>
                        <p className="text-muted-foreground mt-1 text-xs break-words">
                            {prescription.patient.medical_record_number} ·{' '}
                            {prescription.encounter.registration_number}
                        </p>
                        <p className="mt-2 text-xs">
                            {prescription.items.length} item obat
                        </p>
                    </div>
                    <form
                        onSubmit={(event) => {
                            event.preventDefault();
                            if (confirmation) submit(confirmation);
                        }}
                        className="grid gap-4"
                    >
                        {confirmation === 'cancel' && (
                            <div className="grid gap-2">
                                <Label htmlFor="cancel-reason">
                                    Alasan pembatalan
                                </Label>
                                <textarea
                                    className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 min-h-24 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:outline-none disabled:opacity-50"
                                    id="cancel-reason"
                                    required
                                    minLength={10}
                                    maxLength={2000}
                                    rows={3}
                                    disabled={form.processing}
                                    value={form.data.reason}
                                    onChange={(event) =>
                                        form.setData(
                                            'reason',
                                            event.target.value,
                                        )
                                    }
                                    aria-invalid={!!form.errors.reason}
                                    placeholder="Jelaskan alasan pembatalan, minimal 10 karakter"
                                />
                            </div>
                        )}
                        <div role="alert">
                            {Object.entries(form.errors).map(([key, error]) => (
                                <InputError key={key} message={error} />
                            ))}
                        </div>
                        <AlertDialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                disabled={form.processing}
                                onClick={() => setConfirmation(null)}
                            >
                                Kembali
                            </Button>
                            <Button
                                type="submit"
                                variant={
                                    confirmation === 'cancel'
                                        ? 'destructive'
                                        : 'default'
                                }
                                disabled={
                                    form.processing ||
                                    (confirmation === 'dispense' &&
                                        insufficientStock)
                                }
                            >
                                {form.processing
                                    ? 'Memproses…'
                                    : confirmation === 'cancel'
                                      ? 'Ya, batalkan resep'
                                      : 'Ya, obat sudah diserahkan'}
                            </Button>
                        </AlertDialogFooter>
                    </form>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
