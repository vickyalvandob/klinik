import { Link } from '@inertiajs/react';
import type { PropsWithChildren } from 'react';
import { useCurrentUrl } from '@/hooks/use-current-url';
import { accountNavigation } from '@/lib/app-navigation';
import { cn, toUrl } from '@/lib/utils';

export default function SettingsLayout({ children }: PropsWithChildren) {
    const { isCurrentOrParentUrl } = useCurrentUrl();

    return (
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-4 sm:p-6">
            <header className="space-y-1">
                <h1 className="text-xl font-semibold tracking-tight">
                    Pengaturan Akun
                </h1>
                <p className="text-muted-foreground text-sm">
                    Kelola identitas, keamanan, dan tampilan aplikasi.
                </p>
            </header>
            <div className="flex min-w-0 flex-col gap-5 lg:flex-row lg:gap-8">
                <nav
                    aria-label="Pengaturan akun"
                    className="flex shrink-0 gap-1 overflow-x-auto lg:w-44 lg:flex-col lg:self-start"
                >
                    {accountNavigation.map((item) => {
                        const active = isCurrentOrParentUrl(item.href);
                        return (
                            <Link
                                key={toUrl(item.href)}
                                href={item.href}
                                aria-current={active ? 'page' : undefined}
                                className={cn(
                                    'focus-visible:ring-ring flex min-h-10 shrink-0 items-center gap-2 rounded-md px-3 text-sm font-medium whitespace-nowrap transition-colors outline-none focus-visible:ring-2 data-loading:opacity-60',
                                    active
                                        ? 'bg-primary/8 text-primary'
                                        : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                                )}
                            >
                                {item.icon && <item.icon className="size-4" />}
                                {item.title}
                            </Link>
                        );
                    })}
                </nav>
                <section className="bg-background min-w-0 flex-1 rounded-xl border p-4 sm:p-6">
                    {children}
                </section>
            </div>
        </div>
    );
}
