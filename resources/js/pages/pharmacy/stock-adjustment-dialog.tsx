import { useForm } from '@inertiajs/react';
import type { FormEvent } from 'react';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatQuantity } from '@/lib/pharmacy';
import { store } from '@/routes/pharmacy/stock/adjustments';
import type { MedicineStockItem } from '@/types';

export function StockAdjustmentDialog({
    medicine,
    onClose,
}: {
    medicine: MedicineStockItem;
    onClose: () => void;
}) {
    const form = useForm({ quantity_change: '', reason: '' });
    const change = Number(form.data.quantity_change);
    const after = Math.round((Number(medicine.quantity) + change) * 100) / 100;
    const validChange =
        form.data.quantity_change !== '' &&
        Number.isFinite(change) &&
        change !== 0;

    function submit(event: FormEvent) {
        event.preventDefault();
        form.submit(store(medicine.uuid), {
            preserveScroll: true,
            onSuccess: onClose,
        });
    }

    return (
        <AlertDialog
            open
            onOpenChange={(open) => {
                if (!open && !form.processing) onClose();
            }}
        >
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Sesuaikan stok</AlertDialogTitle>
                    <AlertDialogDescription>
                        {medicine.name} {medicine.strength} · {medicine.code}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <form onSubmit={submit} className="grid gap-5">
                    <div className="bg-muted/40 grid grid-cols-2 gap-4 rounded-lg border p-3 text-sm">
                        <div>
                            <p className="text-muted-foreground text-xs">
                                Stok saat ini
                            </p>
                            <p className="mt-1 font-semibold">
                                {formatQuantity(medicine.quantity)}{' '}
                                {medicine.unit}
                            </p>
                        </div>
                        <div>
                            <p className="text-muted-foreground text-xs">
                                Perkiraan stok akhir
                            </p>
                            <p
                                className={`mt-1 font-semibold ${validChange && after < 0 ? 'text-destructive' : ''}`}
                                aria-live="polite"
                            >
                                {validChange
                                    ? `${formatQuantity(after)} ${medicine.unit}`
                                    : '—'}
                            </p>
                        </div>
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="quantity-change">
                            Perubahan jumlah
                        </Label>
                        <Input
                            id="quantity-change"
                            autoFocus
                            type="number"
                            step="0.01"
                            min="-999999999"
                            max="999999999"
                            required
                            value={form.data.quantity_change}
                            onChange={(event) =>
                                form.setData(
                                    'quantity_change',
                                    event.target.value,
                                )
                            }
                            disabled={form.processing}
                            aria-invalid={!!form.errors.quantity_change}
                            aria-describedby="quantity-hint quantity-error"
                            placeholder="Contoh: 20 atau -5"
                        />
                        <p
                            id="quantity-hint"
                            className="text-muted-foreground text-xs"
                        >
                            Angka positif menambah stok; angka negatif
                            mengurangi stok.
                        </p>
                        <InputError
                            id="quantity-error"
                            message={form.errors.quantity_change}
                        />
                        {validChange && after < 0 && (
                            <p
                                className="text-destructive text-xs"
                                role="alert"
                            >
                                Pengurangan melebihi stok yang tersedia.
                            </p>
                        )}
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="stock-reason">Alasan penyesuaian</Label>
                        <textarea
                            className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 min-h-24 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:outline-none disabled:opacity-50"
                            id="stock-reason"
                            required
                            minLength={5}
                            maxLength={2000}
                            rows={3}
                            value={form.data.reason}
                            onChange={(event) =>
                                form.setData('reason', event.target.value)
                            }
                            disabled={form.processing}
                            aria-invalid={!!form.errors.reason}
                            aria-describedby="stock-reason-error"
                            placeholder="Contoh: penerimaan obat dari pemasok"
                        />
                        <InputError
                            id="stock-reason-error"
                            message={form.errors.reason}
                        />
                    </div>
                    <p className="text-muted-foreground text-xs">
                        Stok akhir dihitung kembali saat disimpan. Setiap
                        perubahan dicatat dalam riwayat stok.
                    </p>
                    <AlertDialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            disabled={form.processing}
                            onClick={onClose}
                        >
                            Kembali
                        </Button>
                        <Button
                            type="submit"
                            disabled={
                                form.processing || !validChange || after < 0
                            }
                        >
                            {form.processing
                                ? 'Menyimpan…'
                                : 'Simpan penyesuaian'}
                        </Button>
                    </AlertDialogFooter>
                </form>
            </AlertDialogContent>
        </AlertDialog>
    );
}
