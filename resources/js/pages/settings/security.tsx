import { Form, Head } from '@inertiajs/react';
import { useRef } from 'react';
import { update } from '@/actions/App/Http/Controllers/Settings/SecurityController';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { edit } from '@/routes/security';

type Props = {
    passwordRules: string;
};

export default function Security(props: Props) {
    const passwordInput = useRef<HTMLInputElement>(null);
    const currentPasswordInput = useRef<HTMLInputElement>(null);

    return (
        <>
            <Head title="Keamanan" />

            <h1 className="sr-only">Keamanan</h1>

            <div className="space-y-5">
                <Heading
                    variant="small"
                    title="Ubah kata sandi"
                    description="Gunakan kata sandi yang kuat dan berbeda dari akun lainnya."
                />

                <Form
                    {...update.form()}
                    options={{
                        preserveScroll: true,
                    }}
                    resetOnError={[
                        'password',
                        'password_confirmation',
                        'current_password',
                    ]}
                    resetOnSuccess
                    onError={(errors) => {
                        if (errors.password) {
                            passwordInput.current?.focus();
                        }

                        if (errors.current_password) {
                            currentPasswordInput.current?.focus();
                        }
                    }}
                    className="space-y-5"
                >
                    {({ errors, processing, recentlySuccessful, isDirty }) => (
                        <>
                            <div className="grid gap-2">
                                <Label htmlFor="current_password">
                                    Kata sandi saat ini
                                </Label>

                                <PasswordInput
                                    id="current_password"
                                    ref={currentPasswordInput}
                                    name="current_password"
                                    required
                                    autoComplete="current-password"
                                    placeholder="Kata sandi saat ini"
                                />

                                <InputError message={errors.current_password} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="password">
                                    Kata sandi baru
                                </Label>

                                <PasswordInput
                                    id="password"
                                    ref={passwordInput}
                                    name="password"
                                    required
                                    autoComplete="new-password"
                                    placeholder="Kata sandi baru"
                                    passwordrules={props.passwordRules}
                                />

                                <InputError message={errors.password} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="password_confirmation">
                                    Konfirmasi kata sandi baru
                                </Label>

                                <PasswordInput
                                    id="password_confirmation"
                                    name="password_confirmation"
                                    required
                                    autoComplete="new-password"
                                    placeholder="Ulangi kata sandi baru"
                                    passwordrules={props.passwordRules}
                                />

                                <InputError
                                    message={errors.password_confirmation}
                                />
                            </div>

                            <div className="flex flex-wrap items-center gap-3 border-t pt-4">
                                <Button
                                    disabled={processing || !isDirty}
                                    data-test="update-password-button"
                                >
                                    {processing
                                        ? 'Menyimpan...'
                                        : 'Simpan kata sandi'}
                                </Button>
                                <span
                                    role="status"
                                    className="text-muted-foreground text-sm"
                                >
                                    {recentlySuccessful && !isDirty
                                        ? 'Kata sandi berhasil diperbarui.'
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

Security.layout = {
    breadcrumbs: [
        {
            title: 'Keamanan',
            href: edit(),
        },
    ],
};
