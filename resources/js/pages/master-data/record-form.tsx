import { router, useForm } from '@inertiajs/react';
import { Save, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { FormField } from '@/components/form-field';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import { Spinner } from '@/components/ui/spinner';
import { store, update } from '@/routes/master-data';
import type { Field, ListQuery, MasterForm } from './types';

const secondaryGroups: Record<string, { title: string; keys: string[] }> = {
    staff: {
        title: 'Kepegawaian',
        keys: ['position', 'employment_type', 'joined_on'],
    },
    practitioners: {
        title: 'Perizinan & jadwal',
        keys: ['license_number', 'practice_license_number', 'schedule_notes'],
    },
    'service-units': {
        title: 'Antrean & keterangan',
        keys: ['queue_prefix', 'description'],
    },
    services: { title: 'Tarif & durasi', keys: ['price', 'duration_minutes'] },
    medicines: {
        title: 'Harga & batas stok',
        keys: ['purchase_price', 'selling_price', 'minimum_stock'],
    },
};

export function RecordForm({
    resource,
    singular,
    initial,
    query,
    onClose,
}: {
    resource: string;
    singular: string;
    initial: MasterForm;
    query: ListQuery;
    onClose: () => void;
}) {
    const form = useForm<Record<string, string>>(
        Object.fromEntries(
            initial.fields.map((field) => [
                field.key,
                String(initial.record?.values[field.key] ?? ''),
            ]),
        ),
    );
    const [pendingNavigation, setPendingNavigation] = useState<
        (() => void) | null
    >(null);
    const allowNavigation = useRef(false);
    const group = secondaryGroups[resource];
    const groups = [
        {
            title: 'Informasi utama',
            fields: initial.fields.filter(
                (field) => !group?.keys.includes(field.key),
            ),
        },
        {
            title: group?.title,
            fields: initial.fields.filter((field) =>
                group?.keys.includes(field.key),
            ),
        },
    ];
    const requestClose = () => {
        if (form.processing || pendingNavigation !== null) return;
        if (form.isDirty) setPendingNavigation(() => onClose);
        else onClose();
    };

    useEffect(() => {
        if (!form.isDirty) return;
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
            if (!allowNavigation.current) event.preventDefault();
        };
        window.addEventListener('beforeunload', beforeUnload);
        return () => {
            removeBefore();
            window.removeEventListener('beforeunload', beforeUnload);
        };
    }, [form.isDirty, form.processing]);

    return (
        <>
            <Sheet
                open
                onOpenChange={(open) => {
                    if (!open) requestClose();
                }}
            >
                <SheetContent
                    className="w-full gap-0 sm:max-w-xl [&>button]:hidden"
                    onInteractOutside={(event) => {
                        if (pendingNavigation !== null || form.processing)
                            event.preventDefault();
                    }}
                    onEscapeKeyDown={(event) => {
                        if (pendingNavigation !== null || form.processing)
                            event.preventDefault();
                    }}
                >
                    <SheetHeader className="border-b p-5 pr-14">
                        <SheetTitle>
                            {initial.record ? 'Edit' : 'Tambah'} {singular}
                        </SheetTitle>
                        <SheetDescription>
                            Lengkapi informasi berikut. Kolom bertanda * wajib
                            diisi.
                        </SheetDescription>
                        <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="absolute top-3 right-3"
                            disabled={form.processing}
                            onClick={requestClose}
                            aria-label="Tutup formulir"
                        >
                            <X />
                        </Button>
                    </SheetHeader>
                    <form
                        className="flex min-h-0 flex-1 flex-col"
                        onSubmit={(event) => {
                            event.preventDefault();
                            if (form.processing) return;
                            form.submit(
                                initial.record
                                    ? update(
                                          {
                                              resource,
                                              record: initial.record.uuid,
                                          },
                                          { query },
                                      )
                                    : store(resource, { query }),
                                {
                                    only: ['records', 'filters', 'form'],
                                    preserveScroll: true,
                                    onSuccess: () => {
                                        allowNavigation.current = true;
                                        form.setDefaults();
                                    },
                                    onError: (errors) => {
                                        requestAnimationFrame(() =>
                                            document
                                                .getElementById(
                                                    'master-' +
                                                        Object.keys(errors)[0],
                                                )
                                                ?.focus(),
                                        );
                                    },
                                },
                            );
                        }}
                    >
                        <fieldset
                            disabled={form.processing}
                            className="min-h-0 flex-1 space-y-6 overflow-y-auto p-5"
                        >
                            {Object.keys(form.errors).length > 0 && (
                                <p
                                    role="alert"
                                    className="bg-destructive/5 text-destructive border-destructive/20 rounded-lg border p-3 text-sm"
                                >
                                    Data belum tersimpan. Periksa kolom yang
                                    ditandai di bawah.
                                </p>
                            )}
                            {groups
                                .filter((section) => section.fields.length > 0)
                                .map((section) => (
                                    <section
                                        key={section.title}
                                        className="space-y-4"
                                    >
                                        <h3 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                                            {section.title}
                                        </h3>
                                        <div className="grid gap-4 sm:grid-cols-2">
                                            {section.fields.map((field) => (
                                                <DynamicField
                                                    key={field.key}
                                                    field={field}
                                                    value={form.data[field.key]}
                                                    error={
                                                        form.errors[field.key]
                                                    }
                                                    onChange={(value) =>
                                                        form.setData(
                                                            field.key,
                                                            value,
                                                        )
                                                    }
                                                />
                                            ))}
                                        </div>
                                    </section>
                                ))}
                        </fieldset>
                        <div className="bg-background space-y-3 border-t p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
                            <p
                                aria-live="polite"
                                className="text-muted-foreground text-xs"
                            >
                                {form.processing
                                    ? 'Menyimpan data…'
                                    : form.isDirty
                                      ? 'Ada perubahan yang belum disimpan.'
                                      : initial.record?.is_active === false
                                        ? 'Data ini berstatus nonaktif.'
                                        : 'Perubahan berlaku untuk klinik aktif.'}
                            </p>
                            <div className="flex justify-end gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    disabled={form.processing}
                                    onClick={requestClose}
                                >
                                    Batal
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={form.processing}
                                >
                                    {form.processing ? <Spinner /> : <Save />}
                                    {initial.record
                                        ? 'Simpan perubahan'
                                        : 'Tambah ' + singular}
                                </Button>
                            </div>
                        </div>
                    </form>
                </SheetContent>
            </Sheet>
            <AlertDialog
                open={pendingNavigation !== null}
                onOpenChange={(open) => {
                    if (!open) setPendingNavigation(null);
                }}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Buang perubahan?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Isian yang belum disimpan akan hilang. Anda dapat
                            kembali untuk melanjutkan pengisian.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Lanjutkan mengisi</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => {
                                allowNavigation.current = true;
                                pendingNavigation?.();
                                setPendingNavigation(null);
                            }}
                        >
                            Buang perubahan
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}

function DynamicField({
    field,
    value,
    error,
    onChange,
}: {
    field: Field;
    value: string;
    error?: string;
    onChange: (value: string) => void;
}) {
    const id = 'master-' + field.key;
    const fullWidth =
        field.type === 'textarea' ||
        ['name', 'staff_profile_id', 'service_unit_id'].includes(field.key);
    const emptyOptions =
        field.type === 'select' &&
        Object.keys(field.options ?? {}).length === 0;
    const common = {
        id,
        name: field.key,
        value,
        required: field.required,
        'aria-invalid': !!error,
        'aria-describedby': error ? id + '-error' : undefined,
        onChange: (
            event: ChangeEvent<
                HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
            >,
        ) => onChange(event.target.value),
    };
    return (
        <FormField
            id={id}
            label={field.label}
            required={field.required}
            error={error}
            className={fullWidth ? 'sm:col-span-2' : undefined}
        >
            {field.type === 'textarea' ? (
                <textarea
                    {...common}
                    rows={3}
                    className="border-input bg-background focus-visible:ring-ring min-h-24 w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2 disabled:opacity-50"
                />
            ) : field.type === 'select' ? (
                <select
                    {...common}
                    className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 h-10 w-full min-w-0 rounded-md border px-3 text-sm outline-none focus-visible:ring-2 disabled:opacity-50"
                >
                    <option value="">Pilih {field.label.toLowerCase()}</option>
                    {Object.entries(field.options ?? {}).map(
                        ([option, label]) => (
                            <option key={option} value={option}>
                                {label}
                            </option>
                        ),
                    )}
                </select>
            ) : (
                <Input
                    {...common}
                    type={field.key === 'phone' ? 'tel' : field.type}
                    placeholder={field.placeholder}
                    min={field.min}
                    step={field.step}
                    inputMode={
                        field.type === 'number'
                            ? field.step === 1
                                ? 'numeric'
                                : 'decimal'
                            : undefined
                    }
                    className="h-10"
                />
            )}
            {emptyOptions && (
                <p className="text-muted-foreground text-xs">
                    {field.key === 'staff_profile_id'
                        ? 'Belum ada staf aktif yang tersedia. Tambahkan staf atau periksa penugasan praktisi terlebih dahulu.'
                        : 'Belum ada unit layanan aktif. Tambahkan atau aktifkan unit layanan terlebih dahulu.'}
                </p>
            )}
        </FormField>
    );
}
