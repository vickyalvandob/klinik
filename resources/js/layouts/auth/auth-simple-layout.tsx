import { Link, usePage } from '@inertiajs/react';
import AppLogoIcon from '@/components/app-logo-icon';
import { home } from '@/routes';
import type { AuthLayoutProps } from '@/types';

export default function AuthSimpleLayout({
    children,
    title,
    description,
}: AuthLayoutProps) {
    const { name } = usePage().props;

    return (
        <div className="bg-muted/30 flex min-h-svh flex-col items-center justify-center p-4 sm:p-6 md:p-10">
            <div className="w-full max-w-sm">
                <div className="bg-card flex flex-col gap-8 rounded-xl border p-6 shadow-sm sm:p-8">
                    <div className="flex flex-col items-center gap-4">
                        <Link
                            href={home()}
                            className="flex flex-col items-center gap-2 font-medium"
                        >
                            <div className="bg-primary text-primary-foreground mb-1 flex size-11 items-center justify-center rounded-xl">
                                <AppLogoIcon className="size-6 fill-current" />
                            </div>
                            <span className="text-base font-semibold">
                                {name}
                            </span>
                        </Link>

                        <div className="space-y-2 text-center">
                            <h1 className="text-xl font-semibold">{title}</h1>
                            <p className="text-muted-foreground text-center text-sm">
                                {description}
                            </p>
                        </div>
                    </div>
                    {children}
                </div>
            </div>
        </div>
    );
}
