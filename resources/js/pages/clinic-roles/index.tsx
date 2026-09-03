import { Form, Head, Link } from '@inertiajs/react';
import { Check, KeyRound, LockKeyhole, Save, ShieldCheck } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { dashboard } from '@/routes';
import { index, update } from '@/routes/clinic-roles';

type Role = {
    uuid: string;
    code: string;
    name: string;
    description: string | null;
    permission_count: number;
    editable: boolean;
};
type SelectedRole = Role & { permissions: string[] };
type Permission = { key: string; name: string; group: string };

export default function ClinicRolesIndex({
    roles,
    selectedRole,
    permissionGroups,
}: {
    roles: Role[];
    selectedRole: SelectedRole;
    permissionGroups: Record<string, Permission[]>;
}) {
    return (
        <>
            <Head title="Peran & Izin" />
            <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                <PageHeader
                    eyebrow="Pengelolaan akses"
                    title="Peran & Izin"
                    description="Atur izin bawaan setiap peran khusus untuk klinik aktif. Perubahan tidak memengaruhi tenant lain."
                />
                <div className="grid items-start gap-4 lg:grid-cols-[18rem_minmax(0,1fr)]">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base">
                                <ShieldCheck className="text-primary size-4" />{' '}
                                Daftar peran
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-2">
                            {roles.map((role) => (
                                <Button
                                    key={role.uuid}
                                    asChild
                                    variant={
                                        role.uuid === selectedRole.uuid
                                            ? 'secondary'
                                            : 'ghost'
                                    }
                                    className="h-auto justify-start px-3 py-2 text-left"
                                >
                                    <Link
                                        href={index({
                                            query: { role: role.uuid },
                                        })}
                                    >
                                        <span className="min-w-0 flex-1">
                                            <span className="block truncate">
                                                {role.name}
                                            </span>
                                            <span className="text-muted-foreground block text-xs font-normal">
                                                {role.permission_count} izin
                                            </span>
                                        </span>
                                        {role.uuid === selectedRole.uuid && (
                                            <Check className="text-primary size-4" />
                                        )}
                                    </Link>
                                </Button>
                            ))}
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <div className="flex flex-wrap items-start justify-between gap-3">
                                <div>
                                    <CardTitle className="flex items-center gap-2">
                                        <KeyRound className="text-primary size-5" />{' '}
                                        {selectedRole.name}
                                    </CardTitle>
                                    <p className="text-muted-foreground mt-1 max-w-xl text-sm">
                                        {selectedRole.description}
                                    </p>
                                </div>
                                {selectedRole.editable ? (
                                    <Badge variant="outline">
                                        Dapat disesuaikan
                                    </Badge>
                                ) : (
                                    <Badge>
                                        <LockKeyhole /> Terlindungi
                                    </Badge>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent>
                            <Form
                                key={selectedRole.uuid}
                                {...update.form(selectedRole.uuid)}
                                disableWhileProcessing
                            >
                                {({ processing }) => (
                                    <div className="grid gap-6">
                                        <div className="grid gap-5 md:grid-cols-2">
                                            {Object.entries(
                                                permissionGroups,
                                            ).map(([group, permissions]) => (
                                                <fieldset
                                                    key={group}
                                                    className="grid content-start gap-2 rounded-lg border p-4"
                                                >
                                                    <legend className="px-1 text-sm font-semibold">
                                                        {group}
                                                    </legend>
                                                    {permissions.map(
                                                        (permission) => (
                                                            <label
                                                                key={
                                                                    permission.key
                                                                }
                                                                className={`flex items-start gap-3 rounded-md p-2 text-sm ${selectedRole.editable ? 'hover:bg-muted/60 cursor-pointer' : 'opacity-70'}`}
                                                            >
                                                                <input
                                                                    type="checkbox"
                                                                    name="permissions[]"
                                                                    value={
                                                                        permission.key
                                                                    }
                                                                    defaultChecked={selectedRole.permissions.includes(
                                                                        permission.key,
                                                                    )}
                                                                    disabled={
                                                                        !selectedRole.editable
                                                                    }
                                                                    className="accent-primary mt-0.5 size-4"
                                                                />
                                                                <span>
                                                                    {
                                                                        permission.name
                                                                    }
                                                                    <span className="text-muted-foreground block font-mono text-[11px]">
                                                                        {
                                                                            permission.key
                                                                        }
                                                                    </span>
                                                                </span>
                                                            </label>
                                                        ),
                                                    )}
                                                </fieldset>
                                            ))}
                                        </div>
                                        {selectedRole.editable ? (
                                            <div className="flex justify-end">
                                                <Button
                                                    type="submit"
                                                    disabled={processing}
                                                >
                                                    {processing ? (
                                                        <Spinner />
                                                    ) : (
                                                        <Save />
                                                    )}{' '}
                                                    Simpan Izin
                                                </Button>
                                            </div>
                                        ) : (
                                            <p className="bg-muted/50 rounded-lg border p-4 text-sm">
                                                Peran Pemilik / Admin selalu
                                                memiliki seluruh izin agar
                                                klinik tidak kehilangan akses
                                                administrasi.
                                            </p>
                                        )}
                                    </div>
                                )}
                            </Form>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </>
    );
}

ClinicRolesIndex.layout = {
    breadcrumbs: [
        { title: 'Hari Ini', href: dashboard() },
        { title: 'Peran & Izin', href: index() },
    ],
};
