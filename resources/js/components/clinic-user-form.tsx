import { useForm } from '@inertiajs/react';
import { Eye, EyeOff, Save, ShieldCheck } from 'lucide-react';
import { useRef, useState } from 'react';
import { useAccessChangeGuard } from '@/components/access-change-guard';
import { FormField } from '@/components/form-field';
import {
    PermissionPicker,
    type PermissionGroups,
} from '@/components/permission-picker';
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
import { operationalNavigation } from '@/lib/operational-navigation';
import { store, update } from '@/routes/clinic-users';

export type ClinicUser = {
    uuid: string;
    user: {
        uuid: string;
        name: string;
        email: string;
        last_login_at: string | null;
    };
    role_id: number;
    role: { code: string; name: string };
    staff_profile_id: number | null;
    staff_name: string | null;
    is_active: boolean;
    permission_count: number;
    permissions?: string[];
    is_self: boolean;
};
export type ClinicUserRole = {
    id: number;
    code: string;
    name: string;
    description: string;
    permissions: string[];
};
export type ClinicUserStaff = { id: number; uuid: string; name: string };
export const accessSelectClassName =
    'border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 h-10 w-full min-w-0 rounded-md border px-3 text-sm outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-60';

export function ClinicUserForm({
    editing,
    roles,
    staff,
    permissions,
    canManageRoles,
    onClose,
    onSaved,
}: {
    editing: ClinicUser | null;
    roles: ClinicUserRole[];
    staff: ClinicUserStaff[];
    permissions: PermissionGroups;
    canManageRoles: boolean;
    onClose: () => void;
    onSaved: () => void;
}) {
    const form = useForm({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
        role_id: editing?.role_id.toString() ?? '',
        staff_profile_id: editing?.staff_profile_id?.toString() ?? '',
        is_active: editing?.is_active ?? true,
        permissions: [...(editing?.permissions ?? [])].sort(),
    });
    const [showPassword, setShowPassword] = useState(false);
    const [confirming, setConfirming] = useState(false);
    const saved = useRef(false);
    const guard = useAccessChangeGuard(form.isDirty, form.processing);
    const selectedRole = roles.find(
        (role) => role.id.toString() === form.data.role_id,
    );
    const effectivePermissions = [
        ...new Set([
            ...(selectedRole?.permissions ?? []),
            ...form.data.permissions,
        ]),
    ];
    const menus = operationalNavigation(effectivePermissions);

    function submit() {
        form.transform((data) => {
            const access = {
                role_id: data.role_id,
                staff_profile_id: data.staff_profile_id || null,
                ...(canManageRoles ? { permissions: data.permissions } : {}),
            };
            return editing
                ? { ...access, is_active: data.is_active }
                : {
                      ...access,
                      name: data.name,
                      email: data.email,
                      password: data.password,
                      password_confirmation: data.password_confirmation,
                  };
        });
        const options = {
            preserveScroll: true,
            only: ['errors'],
            onSuccess: () => {
                form.setDefaults();
                if (editing) {
                    saved.current = true;
                    setConfirming(false);
                } else {
                    guard.allow(onSaved);
                }
            },
            onError: () => {
                setConfirming(false);
                requestAnimationFrame(() =>
                    document
                        .querySelector<HTMLElement>(
                            '[data-access-form] [aria-invalid="true"]',
                        )
                        ?.focus(),
                );
            },
        };
        if (editing) form.put(update.url(editing.uuid), options);
        else form.post(store.url(), options);
    }

    return (
        <>
            <Sheet
                open
                onOpenChange={(open) => {
                    if (!open) guard.proceed(onClose);
                }}
            >
                <SheetContent
                    className="w-full gap-0 sm:max-w-xl"
                    onInteractOutside={(event) => event.preventDefault()}
                >
                    <SheetHeader className="border-b p-5 pr-12">
                        <SheetTitle>
                            {editing
                                ? 'Edit akses pengguna'
                                : 'Tambah pengguna'}
                        </SheetTitle>
                        <SheetDescription>
                            {editing
                                ? 'Sesuaikan peran, profil staf, dan akses di klinik ini.'
                                : 'Buat akun untuk anggota tim. Akun langsung aktif setelah disimpan.'}
                        </SheetDescription>
                    </SheetHeader>
                    <form
                        data-access-form
                        onSubmit={(event) => {
                            event.preventDefault();
                            if (editing) setConfirming(true);
                            else submit();
                        }}
                        className="flex min-h-0 flex-1 flex-col"
                    >
                        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-5">
                            <fieldset
                                disabled={form.processing}
                                className="grid min-w-0 gap-5"
                            >
                                {editing ? (
                                    <div className="bg-muted/40 rounded-lg border p-3">
                                        <p className="font-medium wrap-anywhere">
                                            {editing.user.name}
                                            {editing.is_self && (
                                                <span className="text-muted-foreground ml-2 text-xs">
                                                    Anda
                                                </span>
                                            )}
                                        </p>
                                        <p className="text-muted-foreground mt-1 text-sm wrap-anywhere">
                                            {editing.user.email}
                                        </p>
                                    </div>
                                ) : (
                                    <section className="grid gap-4">
                                        <h3 className="text-sm font-medium">
                                            Identitas akun
                                        </h3>
                                        <FormField
                                            id="name"
                                            label="Nama lengkap"
                                            error={form.errors.name}
                                            required
                                        >
                                            <Input
                                                id="name"
                                                autoComplete="name"
                                                value={form.data.name}
                                                onChange={(event) =>
                                                    form.setData(
                                                        'name',
                                                        event.target.value,
                                                    )
                                                }
                                                required
                                                maxLength={255}
                                                aria-invalid={Boolean(
                                                    form.errors.name,
                                                )}
                                                aria-describedby={
                                                    form.errors.name
                                                        ? 'name-error'
                                                        : undefined
                                                }
                                                placeholder="Nama anggota tim"
                                            />
                                        </FormField>
                                        <FormField
                                            id="email"
                                            label="Email login"
                                            error={form.errors.email}
                                            required
                                        >
                                            <Input
                                                id="email"
                                                type="email"
                                                autoComplete="off"
                                                value={form.data.email}
                                                onChange={(event) =>
                                                    form.setData(
                                                        'email',
                                                        event.target.value,
                                                    )
                                                }
                                                required
                                                maxLength={255}
                                                aria-invalid={Boolean(
                                                    form.errors.email,
                                                )}
                                                aria-describedby={
                                                    form.errors.email
                                                        ? 'email-error'
                                                        : undefined
                                                }
                                                placeholder="nama@klinik.com"
                                            />
                                        </FormField>
                                        <FormField
                                            id="password"
                                            label="Kata sandi"
                                            error={form.errors.password}
                                            required
                                            labelAction={
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="ghost"
                                                    aria-label={
                                                        showPassword
                                                            ? 'Sembunyikan kata sandi'
                                                            : 'Tampilkan kata sandi'
                                                    }
                                                    onClick={() =>
                                                        setShowPassword(
                                                            !showPassword,
                                                        )
                                                    }
                                                >
                                                    {showPassword ? (
                                                        <EyeOff />
                                                    ) : (
                                                        <Eye />
                                                    )}
                                                </Button>
                                            }
                                        >
                                            <Input
                                                id="password"
                                                type={
                                                    showPassword
                                                        ? 'text'
                                                        : 'password'
                                                }
                                                autoComplete="new-password"
                                                value={form.data.password}
                                                onChange={(event) =>
                                                    form.setData(
                                                        'password',
                                                        event.target.value,
                                                    )
                                                }
                                                required
                                                aria-invalid={Boolean(
                                                    form.errors.password,
                                                )}
                                                aria-describedby={
                                                    form.errors.password
                                                        ? 'password-error'
                                                        : undefined
                                                }
                                            />
                                        </FormField>
                                        <FormField
                                            id="password_confirmation"
                                            label="Ulangi kata sandi"
                                            error={
                                                form.errors
                                                    .password_confirmation
                                            }
                                            required
                                        >
                                            <Input
                                                id="password_confirmation"
                                                type={
                                                    showPassword
                                                        ? 'text'
                                                        : 'password'
                                                }
                                                autoComplete="new-password"
                                                value={
                                                    form.data
                                                        .password_confirmation
                                                }
                                                onChange={(event) =>
                                                    form.setData(
                                                        'password_confirmation',
                                                        event.target.value,
                                                    )
                                                }
                                                required
                                                aria-invalid={Boolean(
                                                    form.errors
                                                        .password_confirmation,
                                                )}
                                            />
                                        </FormField>
                                    </section>
                                )}
                                <section className="grid gap-4">
                                    <h3 className="text-sm font-medium">
                                        Peran & profil staf
                                    </h3>
                                    <FormField
                                        id="role_id"
                                        label="Peran"
                                        error={form.errors.role_id}
                                        required
                                    >
                                        <select
                                            id="role_id"
                                            value={form.data.role_id}
                                            onChange={(event) =>
                                                form.setData(
                                                    'role_id',
                                                    event.target.value,
                                                )
                                            }
                                            disabled={
                                                editing?.is_self ||
                                                form.processing
                                            }
                                            className={accessSelectClassName}
                                            required
                                            aria-invalid={Boolean(
                                                form.errors.role_id,
                                            )}
                                        >
                                            <option value="" disabled>
                                                Pilih peran
                                            </option>
                                            {roles.map((role) => (
                                                <option
                                                    key={role.id}
                                                    value={role.id}
                                                >
                                                    {role.name}
                                                </option>
                                            ))}
                                        </select>
                                    </FormField>
                                    {selectedRole && (
                                        <div className="bg-muted/30 grid gap-2 rounded-lg border p-3 text-xs">
                                            <p className="flex items-center gap-2 font-medium">
                                                <ShieldCheck className="size-4" />
                                                {effectivePermissions.length}{' '}
                                                hak akses
                                            </p>
                                            <p className="text-muted-foreground leading-relaxed">
                                                {selectedRole.description}
                                            </p>
                                            <p className="leading-relaxed">
                                                <span className="font-medium">
                                                    Menu operasional:{' '}
                                                </span>
                                                {menus
                                                    .map((menu) => menu.title)
                                                    .join(', ')}
                                                .
                                            </p>
                                        </div>
                                    )}
                                    <FormField
                                        id="staff_profile_id"
                                        label="Profil staf"
                                        error={form.errors.staff_profile_id}
                                        description="Opsional. Hubungkan agar akun dikenali sebagai staf atau tenaga medis terkait."
                                    >
                                        <select
                                            id="staff_profile_id"
                                            value={form.data.staff_profile_id}
                                            onChange={(event) =>
                                                form.setData(
                                                    'staff_profile_id',
                                                    event.target.value,
                                                )
                                            }
                                            className={accessSelectClassName}
                                            aria-invalid={Boolean(
                                                form.errors.staff_profile_id,
                                            )}
                                        >
                                            <option value="">
                                                Tidak dihubungkan
                                            </option>
                                            {staff.map((profile) => (
                                                <option
                                                    key={profile.id}
                                                    value={profile.id}
                                                >
                                                    {profile.name}
                                                </option>
                                            ))}
                                        </select>
                                    </FormField>
                                    {editing && (
                                        <FormField
                                            id="is_active"
                                            label="Status akses klinik"
                                            error={form.errors.is_active}
                                            description={
                                                editing.is_self
                                                    ? 'Peran dan status akun sendiri dilindungi agar Anda tetap dapat mengakses klinik.'
                                                    : 'Pengguna nonaktif tidak dapat mengakses klinik ini.'
                                            }
                                        >
                                            <select
                                                id="is_active"
                                                value={
                                                    form.data.is_active
                                                        ? '1'
                                                        : '0'
                                                }
                                                disabled={
                                                    editing.is_self ||
                                                    form.processing
                                                }
                                                onChange={(event) =>
                                                    form.setData(
                                                        'is_active',
                                                        event.target.value ===
                                                            '1',
                                                    )
                                                }
                                                className={
                                                    accessSelectClassName
                                                }
                                                aria-invalid={Boolean(
                                                    form.errors.is_active,
                                                )}
                                            >
                                                <option value="1">Aktif</option>
                                                <option value="0">
                                                    Nonaktif
                                                </option>
                                            </select>
                                        </FormField>
                                    )}
                                </section>
                                {canManageRoles && (
                                    <section className="grid gap-3 border-t pt-4">
                                        <div className="flex items-center justify-between gap-2">
                                            <h3 className="text-sm font-medium">
                                                Izin tambahan{' '}
                                                <span className="text-muted-foreground">
                                                    (
                                                    {
                                                        form.data.permissions
                                                            .length
                                                    }
                                                    )
                                                </span>
                                            </h3>
                                            {form.data.permissions.length >
                                                0 && (
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() =>
                                                        form.setData(
                                                            'permissions',
                                                            [],
                                                        )
                                                    }
                                                >
                                                    Hapus tambahan
                                                </Button>
                                            )}
                                        </div>
                                        <p className="text-muted-foreground text-xs leading-relaxed">
                                            Tambahkan akses khusus untuk
                                            pengguna ini. Izin dari peran sudah
                                            aktif dan tidak perlu dipilih lagi.
                                        </p>
                                        <PermissionPicker
                                            groups={permissions}
                                            value={form.data.permissions}
                                            onChange={(value) =>
                                                form.setData(
                                                    'permissions',
                                                    value,
                                                )
                                            }
                                            inherited={
                                                selectedRole?.permissions ?? []
                                            }
                                            disabled={form.processing}
                                            compact
                                        />
                                        {Object.entries(form.errors)
                                            .filter(([key]) =>
                                                key.startsWith('permissions'),
                                            )
                                            .map(([key, error]) => (
                                                <p
                                                    key={key}
                                                    role="alert"
                                                    className="text-destructive text-xs"
                                                >
                                                    {error}
                                                </p>
                                            ))}
                                    </section>
                                )}
                            </fieldset>
                        </div>
                        <div className="bg-background grid gap-3 border-t p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
                            <p
                                className="text-muted-foreground text-xs"
                                role="status"
                            >
                                {form.processing
                                    ? 'Menyimpan…'
                                    : form.isDirty
                                      ? 'Ada perubahan yang belum disimpan.'
                                      : 'Lengkapi pengaturan akses pengguna.'}
                            </p>
                            <div className="flex gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    disabled={form.processing}
                                    onClick={() => guard.proceed(onClose)}
                                >
                                    Batal
                                </Button>
                                <Button
                                    type="submit"
                                    className="flex-1"
                                    disabled={
                                        form.processing ||
                                        (Boolean(editing) && !form.isDirty)
                                    }
                                >
                                    {form.processing ? <Spinner /> : <Save />}
                                    {editing ? 'Simpan akses' : 'Buat akun'}
                                </Button>
                            </div>
                        </div>
                    </form>
                </SheetContent>
            </Sheet>
            <AlertDialog
                open={confirming}
                onOpenChange={(open) => !form.processing && setConfirming(open)}
            >
                <AlertDialogContent
                    onCloseAutoFocus={(event) => {
                        if (saved.current) {
                            event.preventDefault();
                            saved.current = false;
                            guard.allow(onSaved);
                        }
                    }}
                >
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {!form.data.is_active
                                ? 'Nonaktifkan akses pengguna?'
                                : 'Simpan perubahan akses?'}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {!form.data.is_active
                                ? `${editing?.user.name} tidak dapat mengakses klinik ini setelah perubahan disimpan.`
                                : `Akses ${editing?.user.name} akan diperbarui sesuai peran ${selectedRole?.name} dan izin tambahan yang dipilih.`}
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
                                submit();
                            }}
                        >
                            {form.processing && <Spinner />}Ya, simpan akses
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            {guard.dialog}
        </>
    );
}
