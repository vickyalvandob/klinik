import { Link, usePage } from '@inertiajs/react';
import { Keyboard, Plus, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { accountNavigation, appNavigation } from '@/lib/app-navigation';
import { create as createRegistration } from '@/routes/registrations';

export function OperationalShortcuts() {
    const { auth, currentClinic, currentMembership } = usePage().props;
    const permissions = currentMembership?.permissions ?? [];
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const items = [
        ...(permissions.includes('encounter.create')
            ? [
                  {
                      title: 'Daftar Pasien',
                      href: createRegistration(),
                      icon: Plus,
                  },
              ]
            : []),
        ...appNavigation(
            currentClinic,
            permissions,
            auth.user?.is_platform_admin,
        ).flatMap((group) => group.items),
        ...accountNavigation,
    ].filter((item) =>
        item.title
            .toLocaleLowerCase('id-ID')
            .includes(query.toLocaleLowerCase('id-ID')),
    );

    useEffect(() => {
        function onKeyDown(event: KeyboardEvent) {
            if (
                (event.ctrlKey || event.metaKey) &&
                event.key.toLowerCase() === 'k'
            ) {
                event.preventDefault();
                setOpen((value) => !value);
                setQuery('');
            }
        }
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, []);

    return (
        <>
            <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                    setQuery('');
                    setOpen(true);
                }}
                aria-label="Cari menu (Ctrl+K)"
                aria-keyshortcuts="Control+k Meta+k"
            >
                <Keyboard />
                <span className="hidden sm:inline">Cari menu</span>
                <kbd className="text-muted-foreground hidden text-xs lg:inline">
                    Ctrl K
                </kbd>
            </Button>
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Cari menu</DialogTitle>
                        <DialogDescription>
                            Cari menu, lalu pilih untuk membukanya.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="relative">
                        <Search className="text-muted-foreground absolute top-2.5 left-3 size-4" />
                        <Input
                            autoFocus
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            placeholder="Cari menu..."
                            aria-label="Cari pintasan"
                            className="pl-9"
                        />
                    </div>
                    <nav
                        aria-label="Semua menu yang tersedia"
                        className="grid max-h-[55vh] gap-1 overflow-y-auto"
                    >
                        {items.map((item) => (
                            <Button
                                key={item.title}
                                asChild
                                variant="ghost"
                                className="justify-start"
                            >
                                <Link
                                    href={item.href}
                                    onSuccess={() => setOpen(false)}
                                >
                                    {item.icon && <item.icon />}
                                    {item.title}
                                </Link>
                            </Button>
                        ))}
                        {items.length === 0 && (
                            <p
                                className="text-muted-foreground py-6 text-center text-sm"
                                role="status"
                            >
                                Menu tidak ditemukan. Coba kata lain.
                            </p>
                        )}
                    </nav>
                </DialogContent>
            </Dialog>
        </>
    );
}
