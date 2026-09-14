import { Form, Head, usePage } from '@inertiajs/react';
import { update } from '@/actions/App/Http/Controllers/Settings/ProfileController';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { edit } from '@/routes/profile';

export default function Profile() {
    const { auth, currentClinic, currentMembership } = usePage().props;
    const user = auth.user;

    if (!user) {
        return null;
    }

    return (
        <>
            <Head title="Profil Saya" />
            <div className="space-y-6">
                <Heading
                    variant="small"
                    title="Profil Saya"
                    description="Nama dan email yang digunakan untuk akun Anda."
                />
                {currentClinic && currentMembership && (
                    <dl className="bg-muted/30 grid gap-3 rounded-lg border p-3 text-sm sm:grid-cols-2">
                        <div className="min-w-0 space-y-1">
                            <dt className="text-muted-foreground text-xs">
                                Klinik aktif
                            </dt>
                            <dd className="font-medium break-words">
                                {currentClinic.name}
                            </dd>
                        </div>
                        <div className="min-w-0 space-y-1">
                            <dt className="text-muted-foreground text-xs">
                                Peran Anda
                            </dt>
                            <dd className="font-medium break-words">
                                {currentMembership.role.name}
                            </dd>
                        </div>
                    </dl>
                )}
                <Form
                    {...update.form()}
                    options={{ preserveScroll: true }}
                    setDefaultsOnSuccess
                    className="space-y-5"
                >
                    {({
                        processing,
                        errors,
                        isDirty,
                        recentlySuccessful,
                        resetAndClearErrors,
                    }) => (
                        <>
                            <div className="grid gap-2">
                                <Label htmlFor="name">Nama lengkap</Label>
                                <Input
                                    id="name"
                                    defaultValue={user.name}
                                    name="name"
                                    required
                                    maxLength={255}
                                    autoComplete="name"
                                    aria-invalid={!!errors.name}
                                    aria-describedby={
                                        errors.name ? 'name-error' : undefined
                                    }
                                />
                                <InputError
                                    id="name-error"
                                    message={errors.name}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    defaultValue={user.email}
                                    name="email"
                                    required
                                    maxLength={255}
                                    autoComplete="username"
                                    aria-invalid={!!errors.email}
                                    aria-describedby={
                                        errors.email
                                            ? 'email-error'
                                            : 'email-help'
                                    }
                                />
                                <p
                                    id="email-help"
                                    className="text-muted-foreground text-xs"
                                >
                                    Gunakan email ini saat masuk ke aplikasi.
                                </p>
                                <InputError
                                    id="email-error"
                                    message={errors.email}
                                />
                            </div>
                            <div className="flex flex-wrap items-center gap-3 border-t pt-4">
                                <Button
                                    disabled={processing || !isDirty}
                                    data-test="update-profile-button"
                                >
                                    {processing
                                        ? 'Menyimpan...'
                                        : 'Simpan perubahan'}
                                </Button>
                                {isDirty && (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        disabled={processing}
                                        onClick={() => resetAndClearErrors()}
                                    >
                                        Batal
                                    </Button>
                                )}
                                <span
                                    role="status"
                                    className="text-muted-foreground text-sm"
                                >
                                    {recentlySuccessful && !isDirty
                                        ? 'Perubahan tersimpan.'
                                        : ''}
                                </span>
                            </div>
                        </>
                    )}
                </Form>
            </div>
        </>
    );
}

Profile.layout = {
    breadcrumbs: [{ title: 'Profil Saya', href: edit() }],
};
