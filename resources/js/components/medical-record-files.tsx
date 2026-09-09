import { Form, router } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { Paperclip, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { store, show } from '@/routes/medical-record-files';

export type ClinicalFile = {
    uuid: string;
    original_name: string;
    size: number;
    created_at: string;
};
export function MedicalRecordFiles({
    recordId,
    files,
    canUpload,
}: {
    recordId: string;
    files?: ClinicalFile[];
    canUpload: boolean;
}) {
    const [loading, setLoading] = useState(files === undefined);
    const loadFiles = () => {
        router.reload({
            only: ['files'],
            onStart: () => setLoading(true),
            onFinish: () => setLoading(false),
        });
    };
    useEffect(() => {
        if (files === undefined) loadFiles();
    }, [files]);

    return (
        <section className="bg-card grid gap-4 rounded-xl border p-4 md:p-5">
            <div>
                <h2 className="flex items-center gap-2 font-semibold">
                    <Paperclip className="size-4" /> Lampiran rekam medis
                </h2>
                <p className="text-muted-foreground mt-1 text-xs">
                    PDF, JPG, atau PNG, maksimal 5 MB. Hanya petugas dengan
                    akses RME yang dapat mengunduh.
                </p>
            </div>
            {loading && files === undefined ? (
                <div className="grid animate-pulse gap-2" role="status">
                    <span className="sr-only">Memuat lampiran</span>
                    <div className="bg-muted h-12 rounded-lg" />
                </div>
            ) : files === undefined ? (
                <div className="grid justify-items-start gap-2 text-sm" role="alert">
                    <p>Lampiran belum berhasil dimuat.</p>
                    <Button variant="outline" size="sm" onClick={loadFiles}>Coba lagi</Button>
                </div>
            ) : files.length === 0 && (
                <p className="text-muted-foreground text-sm">
                    Belum ada lampiran.
                </p>
            )}
            {files?.map((file) => (
                <a
                    key={file.uuid}
                    href={show.url(file.uuid)}
                    className="hover:bg-accent flex items-center gap-3 rounded-lg border p-3 text-sm"
                >
                    <Download className="size-4 shrink-0" />
                    <span className="min-w-0 flex-1 break-words">
                        {file.original_name}
                    </span>
                    <span className="text-muted-foreground text-xs">
                        {Math.ceil(file.size / 1024)} KB
                    </span>
                </a>
            ))}
            {canUpload && (
                <Form
                    {...store.form(recordId)}
                    options={{ only: ['files'], preserveScroll: true }}
                    resetOnSuccess
                    className="grid gap-3"
                >
                    {({ errors, processing }) => (
                        <>
                            <Input
                                type="file"
                                name="file"
                                accept=".pdf,.jpg,.jpeg,.png"
                                aria-label="Pilih lampiran rekam medis"
                                required
                            />
                            {errors.file && (
                                <p
                                    role="alert"
                                    className="text-destructive text-sm"
                                >
                                    {errors.file}
                                </p>
                            )}
                            <Button
                                type="submit"
                                variant="outline"
                                disabled={processing}
                                className="justify-self-start"
                            >
                                {processing ? 'Mengunggah…' : 'Unggah lampiran'}
                            </Button>
                        </>
                    )}
                </Form>
            )}
        </section>
    );
}
