import { Head, Link, router, useForm } from '@inertiajs/react';
import { Check, LockKeyhole, RotateCcw, Save, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { useAccessChangeGuard } from '@/components/access-change-guard';
import { PageHeader } from '@/components/page-header';
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
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import { dashboard } from '@/routes';
import { index, update } from '@/routes/clinic-roles';

type Role = {
    uuid: string;
    code: string;
    name: string;
    description: string | null;
    permission_count: number;
    member_count: number;
    editable: boolean;
};
type SelectedRole = Omit<Role, 'permission_count' | 'member_count'> & {
    permissions: string[];
};

export default function ClinicRolesIndex({
    roles,
    selectedRole,
    permissionGroups,
}: {
    roles: Role[];
    selectedRole: SelectedRole;
    permissionGroups: PermissionGroups;
}) {
    const [loading, setLoading] = useState(false);
    function selectRole(uuid: string) {
        if (uuid === selectedRole.uuid || loading) return;
        router.get(
            index.url({ query: { role: uuid } }),
            {},
            {
                only: ['selectedRole', 'roles'],
                preserveState: true,
                preserveScroll: true,
                onStart: () => setLoading(true),
                onFinish: () => setLoading(false),
            },
        );
    }

    return (
        <>
            <Head title="Peran & Hak Akses" />
            <div className="flex min-w-0 flex-1 flex-col gap-5 p-4 md:p-6">
                <PageHeader
                    eyebrow="Pengelolaan"
                    title="Peran & Hak Akses"
                    description="Tentukan akses setiap peran sesuai tanggung jawab tim di klinik ini."
                />
                <div className="grid min-w-0 items-start gap-4 lg:grid-cols-[15rem_minmax(0,1fr)]">
                    <aside
                        className="bg-card min-w-0 rounded-xl border p-3 lg:sticky lg:top-4"
                        aria-label="Daftar peran"
                    >
                        <div className="mb-3 flex items-center gap-2 px-1 text-sm font-medium">
                            <ShieldCheck className="text-muted-foreground size-4" />
                            Peran tim
                            <span className="text-muted-foreground ml-auto text-xs">
                                {roles.length} peran
                            </span>
                        </div>
                        <select
                            aria-label="Pilih peran"
                            value={selectedRole.uuid}
                            disabled={loading}
                            onChange={(event) => selectRole(event.target.value)}
                            className="border-input bg-background focus-visible:ring-ring h-10 w-full rounded-md border px-3 text-sm focus-visible:ring-2 lg:hidden"
                        >
                            {roles.map((role) => (
                                <option key={role.uuid} value={role.uuid}>
                                    {role.name} · {role.member_count} pengguna
                                    aktif
                                </option>
                            ))}
                        </select>
                        <nav
                            className="hidden gap-1 lg:grid"
                            aria-label="Pilih peran"
                        >
                            {roles.map((role) => (
                                <Button
                                    key={role.uuid}
                                    asChild
                                    variant="ghost"
                                    className={cn(
                                        'h-auto justify-start gap-2 px-3 py-3 text-left',
                                        role.uuid === selectedRole.uuid &&
                                            'bg-muted',
                                    )}
                                >
                                    <Link
                                        href={index({
                                            query: { role: role.uuid },
                                        })}
                                        only={['selectedRole', 'roles']}
                                        preserveState
                                        preserveScroll
                                        aria-current={
                                            role.uuid === selectedRole.uuid
                                                ? 'page'
                                                : undefined
                                        }
                                        onStart={() => setLoading(true)}
                                        onFinish={() => setLoading(false)}
                                    >
                                        <span className="min-w-0 flex-1">
                                            <span className="block truncate">
                                                {role.name}
                                            </span>
                                            <span className="text-muted-foreground mt-1 block text-xs font-normal">
                                                {role.member_count} pengguna ·{' '}
                                                {role.permission_count} izin
                                            </span>
                                        </span>
                                        {!role.editable ? (
                                            <LockKeyhole className="text-muted-foreground size-3.5" />
                                        ) : role.uuid === selectedRole.uuid ? (
                                            <Check className="size-4" />
                                        ) : null}
                                    </Link>
                                </Button>
                            ))}
                        </nav>
                        <p className="text-muted-foreground mt-3 hidden border-t px-1 pt-3 text-xs leading-relaxed lg:block">
                            Izin tambahan per pengguna tetap berlaku di luar
                            izin perannya.
                        </p>
                    </aside>
                    <div
                        className={cn(
                            'min-w-0 transition-opacity',
                            loading && 'pointer-events-none opacity-50',
                        )}
                        aria-busy={loading}
                    >
                        <RoleEditor
                            key={selectedRole.uuid}
                            role={selectedRole}
                            memberCount={
                                roles.find(
                                    (role) => role.uuid === selectedRole.uuid,
                                )?.member_count ?? 0
                            }
                            groups={permissionGroups}
                        />
                    </div>
                </div>
            </div>
        </>
    );
}

function RoleEditor({
    role,
    memberCount,
    groups,
}: {
    role: SelectedRole;
    memberCount: number;
    groups: PermissionGroups;
}) {
    const form = useForm({ permissions: [...role.permissions].sort() });
    const guard = useAccessChangeGuard(form.isDirty, form.processing);
    const [confirming, setConfirming] = useState(false);
    const added = form.data.permissions.filter(
        (key) => !role.permissions.includes(key),
    ).length;
    const removed = role.permissions.filter(
        (key) => !form.data.permissions.includes(key),
    ).length;
    function save() {
        form.put(update.url(role.uuid), {
            preserveScroll: true,
            only: ['selectedRole', 'roles'],
            onSuccess: () => {
                form.setDefaults();
                setConfirming(false);
            },
            onError: () => setConfirming(false),
        });
    }

    return (
        <>
            <form
                onSubmit={(event) => {
                    event.preventDefault();
                    if (form.isDirty && role.editable) setConfirming(true);
                }}
                className="bg-card min-w-0 rounded-xl border"
            >
                <fieldset
                    disabled={form.processing}
                    className="grid min-w-0 gap-4 p-4 sm:p-5"
                >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <h3 className="text-sm font-medium">
                            Hak akses per modul
                        </h3>
                        <span
                            className="text-muted-foreground text-xs"
                            aria-live="polite"
                        >
                            {form.data.permissions.length} hak akses dipilih
                        </span>
                    </div>
                    {!role.editable && (
                        <p className="bg-muted/40 rounded-lg border p-3 text-sm leading-relaxed">
                            Pemilik / Admin selalu memiliki seluruh hak akses
                            untuk menjaga akses pengelolaan klinik.
                        </p>
                    )}
                    <PermissionPicker
                        groups={groups}
                        value={form.data.permissions}
                        onChange={(value) => form.setData('permissions', value)}
                        disabled={!role.editable || form.processing}
                    />
                    {Object.entries(form.errors).map(([key, error]) => (
                        <p
                            key={key}
                            role="alert"
                            className="text-destructive text-sm"
                        >
                            {error}
                        </p>
                    ))}
                </fieldset>
                {role.editable && (
                    <div className="bg-card sticky bottom-0 z-10 flex flex-wrap items-center justify-between gap-3 rounded-b-xl border-t px-4 py-3 sm:px-5">
                        <p
                            role="status"
                            className="text-muted-foreground text-xs"
                        >
                            {form.processing
                                ? 'Menyimpan hak akses…'
                                : form.isDirty
                                  ? `Belum disimpan · +${added} ditambahkan, −${removed} dihapus`
                                  : 'Tidak ada perubahan'}
                        </p>
                        <div className="flex gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={!form.isDirty || form.processing}
                                onClick={() =>
                                    guard.proceed(() => form.reset())
                                }
                            >
                                <RotateCcw />
                                Batalkan
                            </Button>
                            <Button
                                type="submit"
                                size="sm"
                                disabled={!form.isDirty || form.processing}
                            >
                                {form.processing ? <Spinner /> : <Save />}Simpan
                                hak akses
                            </Button>
                        </div>
                    </div>
                )}
            </form>
            <AlertDialog
                open={confirming}
                onOpenChange={(open) => !form.processing && setConfirming(open)}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            Simpan hak akses {role.name}?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            Perubahan berlaku untuk {memberCount} pengguna aktif
                            dengan peran ini di klinik ini. {added} izin
                            ditambahkan dan {removed} izin dihapus. Izin
                            tambahan masing-masing pengguna tetap berlaku.
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
                                save();
                            }}
                        >
                            {form.processing && <Spinner />}Ya, simpan perubahan
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            {guard.dialog}
        </>
    );
}

ClinicRolesIndex.layout = {
    breadcrumbs: [
        { title: 'Ringkasan', href: dashboard() },
        { title: 'Peran & Hak Akses', href: index() },
    ],
};
