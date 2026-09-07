import { router } from '@inertiajs/react';
import { useEffect } from 'react';
import { toast } from 'sonner';

export function OperationalFeedback() {
    useEffect(() => {
        const removeValidationError = router.on('error', (event) => {
            toast.error(
                String(
                    Object.values(event.detail.errors)[0] ??
                        'Periksa kembali isian yang ditandai.',
                ),
                { id: 'validation-error' },
            );
        });
        const removeNetworkError = router.on('networkError', (event) => {
            event.preventDefault();
            toast.error('Koneksi terputus. Data belum berhasil diperbarui.', {
                id: 'request-error',
                description:
                    'Isian tetap tersedia. Periksa status terakhir sebelum mengirim ulang.',
                duration: 8000,
            });
        });
        const removeHttpException = router.on('httpException', (event) => {
            event.preventDefault();
            const status = event.detail.response.status;
            toast.error(
                status === 419
                    ? 'Sesi berakhir. Muat ulang halaman untuk melanjutkan.'
                    : status === 403
                      ? 'Akses tidak tersedia untuk akun ini.'
                      : status === 404
                        ? 'Data atau halaman tidak ditemukan.'
                        : 'Permintaan belum berhasil. Silakan coba kembali.',
                { id: 'request-error', duration: 8000 },
            );
        });
        return () => {
            removeValidationError();
            removeNetworkError();
            removeHttpException();
        };
    }, []);

    return null;
}
