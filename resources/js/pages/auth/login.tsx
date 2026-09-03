import { Form, Head } from '@inertiajs/react';
import { UserRoundCheck } from 'lucide-react';
import { useState } from 'react';
import { FormField } from '@/components/form-field';
import PasswordInput from '@/components/password-input';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { register } from '@/routes';
import { store } from '@/routes/login';
import { request } from '@/routes/password';

type Props = {
    status?: string;
    canResetPassword: boolean;
    demoAccounts: Array<{ label: string; email: string; password: string }>;
};

export default function Login({
    status,
    canResetPassword,
    demoAccounts,
}: Props) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    return (
        <>
            <Head title="Masuk" />

            <Form
                {...store.form()}
                resetOnSuccess={['password']}
                className="flex flex-col gap-6"
            >
                {({ processing, errors }) => (
                    <>
                        <div className="grid gap-6">
                            <FormField
                                id="email"
                                label="Email"
                                error={errors.email}
                                required
                            >
                                <Input
                                    id="email"
                                    type="email"
                                    name="email"
                                    required
                                    autoFocus
                                    tabIndex={1}
                                    autoComplete="email"
                                    placeholder="email@example.com"
                                    value={email}
                                    onChange={(event) =>
                                        setEmail(event.target.value)
                                    }
                                    aria-invalid={Boolean(errors.email)}
                                    aria-describedby={
                                        errors.email ? 'email-error' : undefined
                                    }
                                />
                            </FormField>

                            <FormField
                                id="password"
                                label="Kata sandi"
                                error={errors.password}
                                required
                                labelAction={
                                    canResetPassword ? (
                                        <TextLink
                                            href={request()}
                                            className="text-sm"
                                            tabIndex={5}
                                        >
                                            Lupa kata sandi?
                                        </TextLink>
                                    ) : undefined
                                }
                            >
                                <PasswordInput
                                    id="password"
                                    name="password"
                                    required
                                    tabIndex={2}
                                    autoComplete="current-password"
                                    placeholder="Kata sandi"
                                    value={password}
                                    onChange={(event) =>
                                        setPassword(event.target.value)
                                    }
                                    aria-invalid={Boolean(errors.password)}
                                    aria-describedby={
                                        errors.password
                                            ? 'password-error'
                                            : undefined
                                    }
                                />
                            </FormField>

                            <div className="flex items-center space-x-3">
                                <Checkbox
                                    id="remember"
                                    name="remember"
                                    tabIndex={3}
                                />
                                <label htmlFor="remember" className="text-sm">
                                    Ingat saya
                                </label>
                            </div>

                            <Button
                                type="submit"
                                className="mt-4 w-full"
                                tabIndex={4}
                                disabled={processing}
                                data-test="login-button"
                            >
                                {processing && <Spinner />}
                                Masuk
                            </Button>
                        </div>

                        <div className="text-muted-foreground text-center text-sm">
                            Belum memiliki akun?{' '}
                            <TextLink href={register()} tabIndex={5}>
                                Buat akun
                            </TextLink>
                        </div>

                        {demoAccounts.length > 0 && (
                            <div className="grid gap-2 border-t pt-5">
                                <p className="text-muted-foreground text-center text-xs font-medium uppercase">
                                    Login cepat lokal
                                </p>
                                <div className="grid grid-cols-2 gap-2">
                                    {demoAccounts.map((account) => (
                                        <Button
                                            key={account.email}
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            className="justify-start"
                                            onClick={() => {
                                                setEmail(account.email);
                                                setPassword(account.password);
                                            }}
                                        >
                                            <UserRoundCheck /> {account.label}
                                        </Button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </Form>

            {status && (
                <div className="mb-4 text-center text-sm font-medium text-green-600">
                    {status}
                </div>
            )}
        </>
    );
}

Login.layout = {
    title: 'Masuk ke akun Anda',
    description: 'Gunakan email dan kata sandi untuk melanjutkan.',
};
