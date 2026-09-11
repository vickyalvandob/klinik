import { router } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export function useAccessChangeGuard(dirty: boolean, processing: boolean) {
    const allowed = useRef(false);
    const [pending, setPending] = useState<(() => void) | null>(null);

    useEffect(() => {
        if (!dirty) return;
        const remove = router.on('before', (event) => {
            const visit = event.detail.visit;
            if (allowed.current || processing || visit.method !== 'get') return;
            event.preventDefault();
            setPending(() => () => router.visit(visit.url, visit));
        });
        const beforeUnload = (event: BeforeUnloadEvent) =>
            event.preventDefault();
        window.addEventListener('beforeunload', beforeUnload);
        return () => {
            remove();
            window.removeEventListener('beforeunload', beforeUnload);
        };
    }, [dirty, processing]);

    function proceed(action: () => void) {
        if (processing) return;
        if (dirty) setPending(() => action);
        else action();
    }

    function allow(action: () => void) {
        allowed.current = true;
        action();
        queueMicrotask(() => {
            allowed.current = false;
        });
    }

    const dialog = (
        <AlertDialog
            open={pending !== null}
            onOpenChange={(open) => !open && setPending(null)}
        >
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>
                        Buang perubahan yang belum disimpan?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                        Perubahan Anda belum tersimpan. Kembali untuk
                        melanjutkan pengaturan atau buang perubahan untuk
                        keluar.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Kembali mengedit</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={() => {
                            if (pending) allow(pending);
                            setPending(null);
                        }}
                    >
                        Buang perubahan
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );

    return { proceed, allow, dialog };
}
