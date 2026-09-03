import { Form, Head, Link } from '@inertiajs/react';
import {
    KeyRound,
    Pencil,
    Plus,
    Save,
    Search,
    UserRoundCog,
    Users,
    X,
} from 'lucide-react';
import { EmptyState } from '@/components/empty-state';
import { FormField } from '@/components/form-field';
import { PageHeader } from '@/components/page-header';
import {
    PaginationLinks,
    type PaginationLink,
} from '@/components/pagination-links';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { index, store, update } from '@/routes/clinic-users';
import { dashboard } from '@/routes';

type Membership = {
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
    permissions: string[];
    is_self: boolean;
};
type Pagination = {
    data: Membership[];
    links: PaginationLink[];
    from: number | null;
    to: number | null;
    total: number;
};
type Role = { id: number; code: string; name: string };
type Staff = { id: number; uuid: string; name: string };
type Permission = { key: string; name: string; group: string };

export default function ClinicUsersIndex({
    memberships,
    editing,
    filters,
    roles,
    staff,
    permissions,
    canManageRoles,
}: {
    memberships: Pagination;
    editing: Membership | null;
    filters: { search: string; status: string };
    roles: Role[];
    staff: Staff[];
    permissions: Record<string, Permission[]>;
    canManageRoles: boolean;
}) {
    const formRoute = editing ? update.form(editing.uuid) : store.form();

    return (
        <>
            <Head title="Pengguna & Akses" />
            <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                <PageHeader
                    eyebrow="Pengelolaan"
                    title="Pengguna & Akses"
                    description="Buat akun login, hubungkan profil staf, dan tentukan aksesnya di klinik aktif."
                    actions={
                        !editing ? (
                            <Button asChild>
                                <Link href={index({ query: { create: 1 } })}>
                                    <Plus /> Tambah Pengguna
                                </Link>
                            </Button>
                        ) : undefined
                    }
                />
                <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_25rem]">
                    <Card className="min-w-0">
                        <CardContent className="grid gap-4 p-4">
                            <Form
                                {...index.form()}
                                className="grid gap-2 sm:grid-cols-[1fr_10rem_auto]"
                            >
                                <div className="relative">
                                    <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                                    <Input
                                        name="search"
                                        defaultValue={filters.search}
                                        className="pl-9"
                                        placeholder="Cari nama atau email..."
                                    />
                                </div>
                                <select
                                    name="status"
                                    defaultValue={filters.status}
                                    className="border-input bg-background h-9 rounded-md border px-3 text-sm"
                                >
                                    <option value="">Semua status</option>
                                    <option value="active">Aktif</option>
                                    <option value="inactive">Nonaktif</option>
                                </select>
                                <Button type="submit" variant="outline">
                                    Terapkan
                                </Button>
                            </Form>
                            {memberships.data.length === 0 ? (
                                <EmptyState
                                    icon={Users}
                                    title="Belum ada pengguna"
                                    description="Tambahkan akun agar tim dapat masuk sesuai perannya."
                                    className="border-0"
                                />
                            ) : (
                                <>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Pengguna</TableHead>
                                                <TableHead>Peran</TableHead>
                                                <TableHead>
                                                    Profil staf
                                                </TableHead>
                                                <TableHead>Status</TableHead>
                                                <TableHead className="text-right">
                                                    Aksi
                                                </TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {memberships.data.map(
                                                (membership) => (
                                                    <TableRow
                                                        key={membership.uuid}
                                                    >
                                                        <TableCell>
                                                            <p className="font-medium">
                                                                {
                                                                    membership
                                                                        .user
                                                                        .name
                                                                }
                                                                {membership.is_self && (
                                                                    <span className="text-primary ml-1 text-xs">
                                                                        (Anda)
                                                                    </span>
                                                                )}
                                                            </p>
                                                            <p className="text-muted-foreground text-xs">
                                                                {
                                                                    membership
                                                                        .user
                                                                        .email
                                                                }
                                                            </p>
                                                        </TableCell>
                                                        <TableCell>
                                                            {
                                                                membership.role
                                                                    .name
                                                            }
                                                            {membership
                                                                .permissions
                                                                .length > 0 && (
                                                                <p className="text-muted-foreground text-xs">
                                                                    +
                                                                    {
                                                                        membership
                                                                            .permissions
                                                                            .length
                                                                    }{' '}
                                                                    izin
                                                                </p>
                                                            )}
                                                        </TableCell>
                                                        <TableCell>
                                                            {membership.staff_name ?? (
                                                                <span className="text-muted-foreground">
                                                                    Belum
                                                                    terhubung
                                                                </span>
                                                            )}
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge
                                                                variant={
                                                                    membership.is_active
                                                                        ? 'default'
                                                                        : 'secondary'
                                                                }
                                                            >
                                                                {membership.is_active
                                                                    ? 'Aktif'
                                                                    : 'Nonaktif'}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <Button
                                                                asChild
                                                                size="sm"
                                                                variant="ghost"
                                                            >
                                                                <Link
                                                                    href={index(
                                                                        {
                                                                            query: {
                                                                                edit: membership.uuid,
                                                                                search:
                                                                                    filters.search ||
                                                                                    undefined,
                                                                                status:
                                                                                    filters.status ||
                                                                                    undefined,
                                                                            },
                                                                        },
                                                                    )}
                                                                >
                                                                    <Pencil />
                                                                    <span className="sr-only">
                                                                        Edit{' '}
                                                                        {
                                                                            membership
                                                                                .user
                                                                                .name
                                                                        }
                                                                    </span>
                                                                </Link>
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                ),
                                            )}
                                        </TableBody>
                                    </Table>
                                    <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
                                        <p className="text-muted-foreground text-xs">
                                            Menampilkan {memberships.from ?? 0}–
                                            {memberships.to ?? 0} dari{' '}
                                            {memberships.total}
                                        </p>
                                        <PaginationLinks
                                            links={memberships.links}
                                        />
                                    </div>
                                </>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <CardTitle className="flex items-center gap-2 text-base">
                                        <UserRoundCog className="text-primary size-4" />{' '}
                                        {editing ? 'Edit Akses' : 'Akun Baru'}
                                    </CardTitle>
                                    <p className="text-muted-foreground mt-1 text-xs">
                                        Akun baru langsung aktif setelah
                                        disimpan.
                                    </p>
                                </div>
                                {editing && (
                                    <Button asChild size="sm" variant="ghost">
                                        <Link href={index()}>
                                            <X />
                                            <span className="sr-only">
                                                Batal edit
                                            </span>
                                        </Link>
                                    </Button>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent>
                            <Form
                                key={editing?.uuid ?? 'create'}
                                {...formRoute}
                                className="grid gap-4"
                                disableWhileProcessing
                            >
                                {({ errors, processing }) => (
                                    <>
                                        {editing ? (
                                            <div className="bg-muted/40 rounded-lg border p-3">
                                                <p className="font-medium">
                                                    {editing.user.name}
                                                </p>
                                                <p className="text-muted-foreground text-xs">
                                                    {editing.user.email}
                                                </p>
                                            </div>
                                        ) : (
                                            <>
                                                <FormField
                                                    id="name"
                                                    label="Nama lengkap"
                                                    error={errors.name}
                                                    required
                                                >
                                                    <Input
                                                        id="name"
                                                        name="name"
                                                    />
                                                </FormField>
                                                <FormField
                                                    id="email"
                                                    label="Email login"
                                                    error={errors.email}
                                                    required
                                                >
                                                    <Input
                                                        id="email"
                                                        name="email"
                                                        type="email"
                                                    />
                                                </FormField>
                                                <FormField
                                                    id="password"
                                                    label="Kata sandi sementara"
                                                    error={errors.password}
                                                    required
                                                >
                                                    <Input
                                                        id="password"
                                                        name="password"
                                                        type="password"
                                                        autoComplete="new-password"
                                                    />
                                                </FormField>
                                                <FormField
                                                    id="password_confirmation"
                                                    label="Konfirmasi kata sandi"
                                                    required
                                                >
                                                    <Input
                                                        id="password_confirmation"
                                                        name="password_confirmation"
                                                        type="password"
                                                        autoComplete="new-password"
                                                    />
                                                </FormField>
                                            </>
                                        )}
                                        <FormField
                                            id="role_id"
                                            label="Peran"
                                            error={errors.role_id}
                                            required
                                        >
                                            <select
                                                id="role_id"
                                                name="role_id"
                                                defaultValue={
                                                    editing?.role_id ?? ''
                                                }
                                                className="border-input bg-background h-9 rounded-md border px-3 text-sm"
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
                                        <FormField
                                            id="staff_profile_id"
                                            label="Profil staf"
                                            error={errors.staff_profile_id}
                                            description="Opsional, satu profil staf hanya dapat terhubung ke satu akun."
                                        >
                                            <select
                                                id="staff_profile_id"
                                                name="staff_profile_id"
                                                defaultValue={
                                                    editing?.staff_profile_id ??
                                                    ''
                                                }
                                                className="border-input bg-background h-9 rounded-md border px-3 text-sm"
                                            >
                                                <option value="">
                                                    Tidak dihubungkan
                                                </option>
                                                {staff.map((profile) => (
                                                    <option
                                                        key={profile.uuid}
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
                                                label="Status akses"
                                                error={errors.is_active}
                                                required
                                            >
                                                <select
                                                    id="is_active"
                                                    name="is_active"
                                                    defaultValue={
                                                        editing.is_active
                                                            ? '1'
                                                            : '0'
                                                    }
                                                    disabled={editing.is_self}
                                                    className="border-input bg-background h-9 rounded-md border px-3 text-sm"
                                                >
                                                    <option value="1">
                                                        Aktif
                                                    </option>
                                                    <option value="0">
                                                        Nonaktif
                                                    </option>
                                                </select>
                                                {editing.is_self && (
                                                    <input
                                                        type="hidden"
                                                        name="is_active"
                                                        value="1"
                                                    />
                                                )}
                                            </FormField>
                                        )}
                                        {canManageRoles && (
                                            <div className="grid gap-3 border-t pt-4">
                                                <div>
                                                    <p className="flex items-center gap-2 text-sm font-medium">
                                                        <KeyRound className="size-4" />{' '}
                                                        Izin tambahan
                                                    </p>
                                                    <p className="text-muted-foreground text-xs">
                                                        Tambahan di luar izin
                                                        bawaan peran. Ubah izin
                                                        bawaan dari menu Peran &
                                                        Izin.
                                                    </p>
                                                </div>
                                                {Object.entries(
                                                    permissions,
                                                ).map(
                                                    ([
                                                        group,
                                                        groupPermissions,
                                                    ]) => (
                                                        <fieldset
                                                            key={group}
                                                            className="grid gap-2"
                                                        >
                                                            <legend className="text-muted-foreground mb-1 text-xs font-medium uppercase">
                                                                {group}
                                                            </legend>
                                                            {groupPermissions.map(
                                                                (
                                                                    permission,
                                                                ) => (
                                                                    <label
                                                                        key={
                                                                            permission.key
                                                                        }
                                                                        className="flex items-start gap-2 text-sm"
                                                                    >
                                                                        <input
                                                                            type="checkbox"
                                                                            name="permissions[]"
                                                                            value={
                                                                                permission.key
                                                                            }
                                                                            defaultChecked={editing?.permissions.includes(
                                                                                permission.key,
                                                                            )}
                                                                            className="accent-primary mt-0.5 size-4"
                                                                        />
                                                                        <span>
                                                                            {
                                                                                permission.name
                                                                            }
                                                                        </span>
                                                                    </label>
                                                                ),
                                                            )}
                                                        </fieldset>
                                                    ),
                                                )}
                                            </div>
                                        )}
                                        <Button
                                            type="submit"
                                            disabled={processing}
                                        >
                                            {processing ? (
                                                <Spinner />
                                            ) : (
                                                <Save />
                                            )}{' '}
                                            {editing
                                                ? 'Simpan Akses'
                                                : 'Buat Akun'}
                                        </Button>
                                    </>
                                )}
                            </Form>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </>
    );
}

ClinicUsersIndex.layout = {
    breadcrumbs: [
        { title: 'Hari Ini', href: dashboard() },
        { title: 'Pengguna & Akses', href: index() },
    ],
};
