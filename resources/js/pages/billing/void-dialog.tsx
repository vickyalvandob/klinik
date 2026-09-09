import { useForm } from '@inertiajs/react';
import { Ban, LoaderCircle } from 'lucide-react';
import { useState } from 'react';
import { FormField } from '@/components/form-field';
import {
    AlertDialog,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { voidMethod as voidInvoice } from '@/routes/billing';
import { voidMethod as voidPayment } from '@/routes/billing/payments';

export function BillingVoidDialog({
    uuid,
    type,
    description,
}: {
    uuid: string;
    type: 'invoice' | 'payment';
    description: string;
}) {
    const [open, setOpen] = useState(false);
    const form = useForm({ reason: '' });
    const title =
        type === 'invoice' ? 'Batalkan tagihan' : 'Batalkan pembayaran';
    return (
        <AlertDialog
            open={open}
            onOpenChange={(value) => {
                if (form.processing) return;
                setOpen(value);
                if (!value) {
                    form.reset();
                    form.clearErrors();
                }
            }}
        >
            <AlertDialogTrigger asChild>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                >
                    <Ban className="size-3.5" />
                    {title}
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{title}?</AlertDialogTitle>
                    <AlertDialogDescription>
                        {description}{' '}
                        {type === 'payment'
                            ? 'Sisa tagihan akan dihitung ulang. Tagihan yang sudah lunas dapat kembali perlu dibayar.'
                            : 'Tagihan tidak lagi dapat menerima pembayaran.'}{' '}
                        Riwayat pembatalan tetap tersimpan.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <form
                    className="grid gap-5"
                    onSubmit={(event) => {
                        event.preventDefault();
                        if (form.processing) return;
                        form.post(
                            type === 'invoice'
                                ? voidInvoice.url(uuid)
                                : voidPayment.url(uuid),
                            {
                                preserveScroll: true,
                                onSuccess: () => {
                                    setOpen(false);
                                    form.reset();
                                },
                            },
                        );
                    }}
                >
                    <FormField
                        id={'void-reason-' + uuid}
                        label="Alasan pembatalan"
                        error={form.errors.reason}
                        required
                    >
                        <textarea
                            className="border-input bg-background focus-visible:ring-ring w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:outline-none disabled:opacity-50"
                            id={'void-reason-' + uuid}
                            value={form.data.reason}
                            onChange={(event) =>
                                form.setData('reason', event.target.value)
                            }
                            minLength={10}
                            maxLength={1000}
                            rows={3}
                            required
                            disabled={form.processing}
                            aria-invalid={!!form.errors.reason}
                            aria-describedby={
                                form.errors.reason
                                    ? 'void-reason-' + uuid + '-error'
                                    : undefined
                            }
                            placeholder="Jelaskan alasan pembatalan, minimal 10 karakter."
                        />
                    </FormField>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={form.processing}>
                            Kembali
                        </AlertDialogCancel>
                        <Button
                            type="submit"
                            variant="destructive"
                            disabled={
                                form.processing ||
                                form.data.reason.trim().length < 10
                            }
                        >
                            {form.processing && (
                                <LoaderCircle className="size-4 animate-spin" />
                            )}
                            {form.processing ? 'Membatalkan…' : 'Ya, batalkan'}
                        </Button>
                    </AlertDialogFooter>
                </form>
            </AlertDialogContent>
        </AlertDialog>
    );
}
