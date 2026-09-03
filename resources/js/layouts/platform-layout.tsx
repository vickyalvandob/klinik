import { Link, router, usePage } from '@inertiajs/react';
import { LogOut, ShieldCheck } from 'lucide-react';
import AppLogoIcon from '@/components/app-logo-icon';
import { Button } from '@/components/ui/button';
import { logout } from '@/routes';
import { index as platformIndex } from '@/routes/platform';

export default function PlatformLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { auth, name } = usePage().props;

    return (
        <div className="bg-muted/30 min-h-svh overflow-x-clip">
            <header className="bg-background/95 sticky top-0 z-40 border-b backdrop-blur">
                <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
                    <Link
                        href={platformIndex()}
                        className="flex min-w-0 items-center gap-3"
                    >
                        <span className="bg-primary text-primary-foreground flex size-9 shrink-0 items-center justify-center rounded-lg">
                            <AppLogoIcon className="size-5 fill-current" />
                        </span>
                        <span className="min-w-0">
                            <span className="block truncate text-sm font-semibold">
                                {name}
                            </span>
                            <span className="text-muted-foreground flex items-center gap-1 text-xs">
                                <ShieldCheck className="size-3" /> Platform
                                Admin
                            </span>
                        </span>
                    </Link>

                    <div className="flex items-center gap-2">
                        <span className="text-muted-foreground hidden max-w-48 truncate text-sm sm:block">
                            {auth.user?.name}
                        </span>
                        <Button asChild size="sm" variant="outline">
                            <Link
                                href={logout()}
                                as="button"
                                onClick={() => router.flushAll()}
                            >
                                <LogOut />
                                <span className="hidden sm:inline">Keluar</span>
                            </Link>
                        </Button>
                    </div>
                </div>
            </header>
            <main className="mx-auto flex w-full max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
                {children}
            </main>
        </div>
    );
}

PlatformLayout.layout = null;
