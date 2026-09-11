import { Head, Link, router, useForm } from '@inertiajs/react';
import { Pencil, Plus, Search, ShieldCheck, Users, X } from 'lucide-react';
import { useState } from 'react';
import {
    ClinicUserForm,
    accessSelectClassName,
    type ClinicUser,
    type ClinicUserRole,
    type ClinicUserStaff,
} from '@/components/clinic-user-form';
import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';
import {
    PaginationLinks,
    type PaginationLink,
} from '@/components/pagination-links';
import type { PermissionGroups } from '@/components/permission-picker';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import { dashboard } from '@/routes';
import { index as rolesIndex } from '@/routes/clinic-roles';
import { index } from '@/routes/clinic-users';

type Filters = { search: string; status: string; role: string };
type Pagination = {
    data: ClinicUser[];
    links: PaginationLink[];
    from: number | null;
    to: number | null;
    total: number;
    current_page: number;
};
const listProps = ['memberships', 'filters'];
const formProps = ['editing', 'formOpen', 'staff', 'permissions', 'roles'];
const loginDateFormat = new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
});

export default function ClinicUsersIndex({
    memberships,
    editing,
    formOpen,
    filters,
    summary,
    roles,
    staff,
    permissions,
    canManageRoles,
}: {
    memberships: Pagination;
    editing: ClinicUser | null;
    formOpen: boolean;
    filters: Filters;
    summary: { total: number; active: number; inactive: number };
    roles: ClinicUserRole[];
    staff: ClinicUserStaff[];
    permissions: PermissionGroups;
    canManageRoles: boolean;
}) {
    const [opening, setOpening] = useState(false);
    const query = { ...filters, page: memberships.current_page };
    const filtered = Boolean(filters.search || filters.status || filters.role);
    function closeForm(saved = false) {
        router.get(
            index.url({ query }),
            {},
            {
                only: saved
                    ? [...listProps, ...formProps, 'summary']
                    : ['editing', 'formOpen'],
                preserveState: true,
                preserveScroll: true,
                replace: true,
            },
        );
    }
    const formVisit = {
        only: formProps,
        preserveState: true,
        preserveScroll: true,
        onStart: () => setOpening(true),
        onFinish: () => setOpening(false),
    };
    function editLink(user: ClinicUser) {
        return (
            <Button asChild variant="ghost" size="sm">
                <Link
                    href={index({ query: { ...query, edit: user.uuid } })}
                    {...formVisit}
                    aria-label={`Edit akses ${user.user.name}`}
                >
                    <Pencil />
                    <span className="hidden xl:inline">Edit akses</span>
                </Link>
            </Button>
        );
    }

    return (
        <>
            <Head title="Pengguna & Akses" />
            <div className="flex min-w-0 flex-1 flex-col gap-5 p-4 md:p-6">
                <PageHeader
                    eyebrow="Pengelolaan"
                    title="Pengguna & Akses"
                    description="Kelola akun tim dan aksesnya di klinik ini."
                    actions={
                        <>
                            {canManageRoles && (
                                <Button asChild variant="outline">
                                    <Link href={rolesIndex()}>
                                        <ShieldCheck />
                                        Peran & Hak Akses
                                    </Link>
                                </Button>
                            )}
                            <Button asChild disabled={opening}>
                                <Link
                                    href={index({
                                        query: { ...query, create: 1 },
                                    })}
                                    {...formVisit}
                                >
                                    {opening ? <Spinner /> : <Plus />}Tambah
                                    pengguna
                                </Link>
                            </Button>
                        </>
                    }
                />
                <div
                    className="bg-card grid grid-cols-3 divide-x rounded-xl border"
                    aria-label="Ringkasan pengguna klinik"
                >
                    {[
                        ['Total pengguna', summary.total],
                        ['Aktif', summary.active],
                        ['Nonaktif', summary.inactive],
                    ].map(([label, count]) => (
                        <div
                            key={label}
                            className="grid gap-1 px-4 py-3 sm:px-5"
                        >
                            <span className="text-muted-foreground text-xs">
                                {label}
                            </span>
                            <span className="text-xl font-semibold tabular-nums">
                                {count}
                            </span>
                        </div>
                    ))}
                </div>
                <section
                    className="bg-card min-w-0 rounded-xl border"
                    aria-label="Daftar pengguna"
                >
                    <UserFilters
                        key={JSON.stringify(filters)}
                        filters={filters}
                        roles={roles}
                    />
                    {memberships.data.length === 0 ? (
                        <EmptyState
                            icon={Users}
                            title={
                                filtered
                                    ? 'Pengguna tidak ditemukan'
                                    : 'Belum ada pengguna'
                            }
                            description={
                                filtered
                                    ? 'Coba nama, email, peran, atau status lain.'
                                    : 'Tambahkan akun agar tim dapat bekerja sesuai perannya.'
                            }
                            className="rounded-none border-0"
                        />
                    ) : (
                        <>
                            <div className="divide-y md:hidden">
                                {memberships.data.map((user) => (
                                    <article
                                        key={user.uuid}
                                        className="grid gap-3 p-4"
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <UserIdentity user={user} />
                                            <UserStatus
                                                active={user.is_active}
                                            />
                                        </div>
                                        <div className="flex items-end justify-between gap-2">
                                            <div className="grid gap-1 text-xs">
                                                <span className="font-medium">
                                                    {user.role.name}
                                                    {user.permission_count >
                                                        0 && (
                                                        <span className="text-muted-foreground font-normal">
                                                            {' '}
                                                            · +
                                                            {
                                                                user.permission_count
                                                            }{' '}
                                                            izin
                                                        </span>
                                                    )}
                                                </span>
                                                <span className="text-muted-foreground">
                                                    {user.staff_name ??
                                                        'Profil staf belum dihubungkan'}
                                                </span>
                                            </div>
                                            {editLink(user)}
                                        </div>
                                    </article>
                                ))}
                            </div>
                            <div className="hidden md:block">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-muted/25">
                                            <TableHead className="pl-5">
                                                Pengguna
                                            </TableHead>
                                            <TableHead>Peran & akses</TableHead>
                                            <TableHead className="hidden lg:table-cell">
                                                Profil staf
                                            </TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead className="hidden 2xl:table-cell">
                                                Login terakhir
                                            </TableHead>
                                            <TableHead className="pr-5 text-right">
                                                <span className="sr-only">
                                                    Aksi
                                                </span>
                                            </TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {memberships.data.map((user) => (
                                            <TableRow key={user.uuid}>
                                                <TableCell className="py-4 pl-5">
                                                    <UserIdentity user={user} />
                                                </TableCell>
                                                <TableCell>
                                                    <p className="text-sm">
                                                        {user.role.name}
                                                    </p>
                                                    <p className="text-muted-foreground mt-1 text-xs">
                                                        {user.permission_count >
                                                        0
                                                            ? `+${user.permission_count} izin tambahan`
                                                            : 'Sesuai peran'}
                                                    </p>
                                                </TableCell>
                                                <TableCell className="hidden lg:table-cell">
                                                    <span
                                                        className={
                                                            user.staff_name
                                                                ? 'text-sm'
                                                                : 'text-muted-foreground text-xs'
                                                        }
                                                    >
                                                        {user.staff_name ??
                                                            'Belum dihubungkan'}
                                                    </span>
                                                </TableCell>
                                                <TableCell>
                                                    <UserStatus
                                                        active={user.is_active}
                                                    />
                                                </TableCell>
                                                <TableCell className="text-muted-foreground hidden text-xs 2xl:table-cell">
                                                    {user.user.last_login_at
                                                        ? loginDateFormat.format(
                                                              new Date(
                                                                  user.user
                                                                      .last_login_at,
                                                              ),
                                                          )
                                                        : 'Belum pernah login'}
                                                </TableCell>
                                                <TableCell className="pr-5 text-right">
                                                    {editLink(user)}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </>
                    )}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 sm:px-5">
                        <p
                            className="text-muted-foreground text-xs"
                            role="status"
                        >
                            {memberships.from ?? 0}–{memberships.to ?? 0} dari{' '}
                            {memberships.total} pengguna
                            {filtered ? ' sesuai filter' : ''}
                        </p>
                        <PaginationLinks
                            links={memberships.links}
                            only={listProps}
                            preserveState
                        />
                    </div>
                </section>
            </div>
            {formOpen && (
                <ClinicUserForm
                    key={editing?.uuid ?? 'create'}
                    editing={editing}
                    roles={roles}
                    staff={staff}
                    permissions={permissions}
                    canManageRoles={canManageRoles}
                    onClose={() => closeForm()}
                    onSaved={() => closeForm(true)}
                />
            )}
        </>
    );
}

function UserFilters({
    filters,
    roles,
}: {
    filters: Filters;
    roles: ClinicUserRole[];
}) {
    const form = useForm(filters);
    const filtered = Boolean(filters.search || filters.status || filters.role);
    return (
        <form
            aria-label="Filter pengguna"
            onSubmit={(event) => {
                event.preventDefault();
                form.get(index.url(), {
                    only: listProps,
                    preserveState: true,
                    preserveScroll: true,
                    replace: true,
                });
            }}
            className="grid gap-2 border-b p-4"
        >
            <fieldset
                disabled={form.processing}
                className="grid min-w-0 gap-2 sm:grid-cols-2 xl:grid-cols-[minmax(12rem,1fr)_12rem_10rem_auto]"
            >
                <div className="relative sm:col-span-2 xl:col-span-1">
                    <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                    <Input
                        type="search"
                        aria-label="Cari nama atau email pengguna"
                        placeholder="Cari nama atau email…"
                        value={form.data.search}
                        onChange={(event) =>
                            form.setData('search', event.target.value)
                        }
                        maxLength={100}
                        className="h-10 pl-9"
                    />
                </div>
                <select
                    aria-label="Filter peran"
                    value={form.data.role}
                    onChange={(event) =>
                        form.setData('role', event.target.value)
                    }
                    className={accessSelectClassName}
                >
                    <option value="">Semua peran</option>
                    {roles.map((role) => (
                        <option key={role.id} value={role.code}>
                            {role.name}
                        </option>
                    ))}
                </select>
                <select
                    aria-label="Filter status pengguna"
                    value={form.data.status}
                    onChange={(event) =>
                        form.setData('status', event.target.value)
                    }
                    className={accessSelectClassName}
                >
                    <option value="">Semua status</option>
                    <option value="active">Aktif</option>
                    <option value="inactive">Nonaktif</option>
                </select>
                <div className="flex gap-2 sm:col-span-2 xl:col-span-1">
                    <Button
                        type="submit"
                        variant="outline"
                        className="h-10 flex-1"
                    >
                        {form.processing ? <Spinner /> : <Search />}Cari
                    </Button>
                    {filtered && (
                        <Button asChild variant="ghost" className="h-10">
                            <Link
                                href={index()}
                                only={listProps}
                                preserveState
                                preserveScroll
                                replace
                                aria-label="Reset filter pengguna"
                            >
                                <X />
                                Reset
                            </Link>
                        </Button>
                    )}
                </div>
            </fieldset>
            {Object.entries(form.errors).map(([key, error]) => (
                <p key={key} role="alert" className="text-destructive text-xs">
                    {error}
                </p>
            ))}
        </form>
    );
}

function UserIdentity({ user }: { user: ClinicUser }) {
    return (
        <div className="flex min-w-0 items-center gap-3">
            <div
                className="bg-muted text-muted-foreground hidden size-9 shrink-0 items-center justify-center rounded-lg text-xs font-medium sm:flex"
                aria-hidden="true"
            >
                {user.user.name
                    .split(' ')
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((part) => part[0])
                    .join('')
                    .toUpperCase()}
            </div>
            <div className="min-w-0">
                <p className="font-medium wrap-anywhere whitespace-normal">
                    {user.user.name}
                    {user.is_self && (
                        <span className="text-muted-foreground ml-1.5 text-xs font-normal">
                            Anda
                        </span>
                    )}
                </p>
                <p className="text-muted-foreground mt-0.5 text-xs wrap-anywhere whitespace-normal">
                    {user.user.email}
                </p>
            </div>
        </div>
    );
}
function UserStatus({ active }: { active: boolean }) {
    return (
        <Badge variant="outline" className="shrink-0 gap-1.5 font-normal">
            <span
                className={`size-1.5 rounded-full ${active ? 'bg-emerald-600 dark:bg-emerald-400' : 'bg-muted-foreground/50'}`}
            />
            {active ? 'Aktif' : 'Nonaktif'}
        </Badge>
    );
}
ClinicUsersIndex.layout = {
    breadcrumbs: [
        { title: 'Ringkasan', href: dashboard() },
        { title: 'Pengguna & Akses', href: index() },
    ],
};
