import { Head, router, usePoll } from '@inertiajs/react';
import {
    Building2,
    Maximize,
    Megaphone,
    Minimize,
    Volume2,
    VolumeX,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

type Call = {
    id: number;
    number: string;
    destination: string;
    called_at: string;
};
type Board = {
    clinic_name: string;
    timezone: string;
    date: string;
    updated_at: string;
    calls: Call[];
    units: {
        uuid: string;
        name: string;
        waiting_count: number;
        next: string[];
    }[];
};

export default function QueueDisplay({ board }: { board: Board }) {
    const [sound, setSound] = useState(false);
    const [fullscreen, setFullscreen] = useState(false);
    const [now, setNow] = useState(board.updated_at);
    const [failure, setFailure] = useState<string | null>(null);
    const seen = useRef(board.calls.at(-1)?.id ?? 0);
    const { stop } = usePoll(
        3000,
        { only: ['board'], onSuccess: () => setFailure(null) },
        { keepAlive: true, mode: 'rest' },
    );
    const current = board.calls.at(-1);
    const stale =
        new Date(now).getTime() - new Date(board.updated_at).getTime() > 15000;

    useEffect(() => {
        const timer = window.setInterval(
            () => setNow(new Date().toISOString()),
            1000,
        );
        const changed = () =>
            setFullscreen(Boolean(document.fullscreenElement));
        document.addEventListener('fullscreenchange', changed);
        return () => {
            window.clearInterval(timer);
            document.removeEventListener('fullscreenchange', changed);
        };
    }, []);

    useEffect(() => {
        const network = router.on('networkError', (event) => {
            event.preventDefault();
            setFailure('Koneksi terputus. Menghubungkan kembali…');
        });
        const http = router.on('httpException', (event) => {
            event.preventDefault();
            if ([403, 404].includes(event.detail.response.status)) {
                stop();
                setFailure(
                    'Layar tidak aktif. Buka kembali Layar Antrean dari menu petugas.',
                );
            } else setFailure('Pembaruan tertunda. Menghubungkan kembali…');
        });
        return () => {
            network();
            http();
        };
    }, [stop]);

    useEffect(() => {
        if (!sound) return;
        const fresh = board.calls.filter((call) => call.id > seen.current);
        for (const call of fresh) {
            seen.current = call.id;
            if (Date.now() - new Date(call.called_at).getTime() > 60000)
                continue;
            const speech = new SpeechSynthesisUtterance(
                'Nomor antrean ' +
                    call.number.replace(/([A-Za-z]+)/g, '$1 ') +
                    '. Silakan menuju ' +
                    call.destination.replace('·', ', '),
            );
            speech.lang = 'id-ID';
            speech.rate = 0.85;
            speech.onerror = (event) => {
                if (!['interrupted', 'canceled'].includes(event.error))
                    toast.error(
                        'Suara belum tersedia. Periksa pengaturan audio perangkat.',
                        { id: 'queue-audio' },
                    );
            };
            window.speechSynthesis.speak(speech);
        }
    }, [board.calls, sound]);

    useEffect(
        () => () => {
            if ('speechSynthesis' in window) window.speechSynthesis.cancel();
        },
        [],
    );

    const toggleSound = () => {
        if (!('speechSynthesis' in window)) {
            toast.error('Perangkat ini belum mendukung suara antrean.');
            return;
        }
        window.speechSynthesis.cancel();
        seen.current = board.calls.at(-1)?.id ?? 0;
        if (!sound) {
            const speech = new SpeechSynthesisUtterance('Suara antrean aktif.');
            speech.lang = 'id-ID';
            window.speechSynthesis.speak(speech);
        }
        setSound(!sound);
    };
    const toggleFullscreen = async () => {
        try {
            if (document.fullscreenElement) await document.exitFullscreen();
            else await document.documentElement.requestFullscreen();
        } catch {
            toast.error('Layar penuh tidak tersedia pada perangkat ini.');
        }
    };

    return (
        <>
            <Head title="Layar Antrean">
                <meta name="robots" content="noindex, nofollow" />
            </Head>
            <main className="bg-muted/25 text-foreground flex min-h-dvh flex-col">
                <header className="bg-background flex flex-wrap items-center justify-between gap-4 border-b px-5 py-4 sm:px-8 lg:px-12">
                    <div className="flex min-w-0 items-center gap-3">
                        <span className="bg-primary/10 text-primary grid size-11 shrink-0 place-items-center rounded-xl">
                            <Building2 />
                        </span>
                        <div className="min-w-0">
                            <h1 className="text-lg font-semibold break-words sm:text-xl">
                                {board.clinic_name}
                            </h1>
                            <p className="text-muted-foreground mt-0.5 text-xs">
                                Informasi antrean pasien
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={toggleSound}
                            aria-pressed={sound}
                        >
                            {sound ? <Volume2 /> : <VolumeX />}
                            {sound ? 'Suara Aktif' : 'Aktifkan Suara'}
                        </Button>
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={toggleFullscreen}
                            aria-label={
                                fullscreen
                                    ? 'Keluar layar penuh'
                                    : 'Layar penuh'
                            }
                        >
                            {fullscreen ? <Minimize /> : <Maximize />}
                        </Button>
                    </div>
                </header>
                <div className="mx-auto grid w-full max-w-[1800px] flex-1 items-start gap-5 p-5 sm:gap-6 sm:p-8 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] lg:p-12">
                    <section
                        className="bg-background border-primary/20 grid min-w-0 gap-4 rounded-2xl border px-4 py-10 text-center sm:py-14 lg:sticky lg:top-8 lg:py-20"
                        aria-live="polite"
                        aria-atomic="true"
                    >
                        <p className="text-primary flex items-center justify-center gap-2 text-sm font-medium">
                            <Megaphone className="size-5" /> Panggilan Terakhir
                        </p>
                        <p className="text-primary font-mono text-[clamp(4rem,10vw,10rem)] leading-tight font-semibold tracking-tight tabular-nums">
                            {current?.number ?? '—'}
                        </p>
                        <div className="mx-auto w-full max-w-sm border-t pt-5">
                            <p className="text-muted-foreground text-sm">
                                {current ? 'Silakan menuju' : 'Selamat datang'}
                            </p>
                            <p className="mt-2 text-xl font-semibold text-balance sm:text-2xl">
                                {current?.destination ??
                                    'Menunggu panggilan antrean'}
                            </p>
                        </div>
                        <p className="text-muted-foreground mt-4 text-sm">
                            Siapkan nomor antrean Anda.
                        </p>
                    </section>
                    <section className="grid min-w-0 gap-4">
                        <div className="flex items-center justify-between gap-3">
                            <h2 className="text-lg font-semibold">
                                Antrean Berikutnya
                            </h2>
                            <span className="text-muted-foreground text-xs">
                                {board.units.reduce(
                                    (sum, unit) => sum + unit.waiting_count,
                                    0,
                                )}{' '}
                                menunggu
                            </span>
                        </div>
                        {board.units.length === 0 && (
                            <div className="bg-background text-muted-foreground rounded-xl border p-8 text-center text-sm">
                                Layanan belum tersedia.
                            </div>
                        )}
                        {board.units.map((unit) => (
                            <article
                                key={unit.uuid}
                                className="bg-background min-w-0 rounded-xl border p-5 sm:p-6"
                            >
                                <div className="flex items-center justify-between gap-3">
                                    <h3 className="font-semibold break-words sm:text-lg">
                                        {unit.name}
                                    </h3>
                                    <span className="text-muted-foreground shrink-0 text-xs">
                                        {unit.waiting_count} menunggu
                                    </span>
                                </div>
                                <div className="mt-4 flex min-h-12 flex-wrap items-center gap-2">
                                    {unit.next.length ? (
                                        unit.next.map((number) => (
                                            <span
                                                key={number}
                                                className="bg-muted/50 rounded-lg border px-3 py-2 font-mono text-lg font-semibold sm:text-xl"
                                            >
                                                {number}
                                            </span>
                                        ))
                                    ) : (
                                        <p className="text-muted-foreground text-sm">
                                            Belum ada antrean berikutnya
                                        </p>
                                    )}
                                </div>
                            </article>
                        ))}
                    </section>
                </div>
                <footer className="bg-background flex flex-wrap items-center justify-between gap-3 border-t px-5 py-4 text-xs sm:px-8 lg:px-12">
                    <p
                        role="status"
                        className={
                            failure || stale
                                ? 'text-amber-700 dark:text-amber-400'
                                : 'text-muted-foreground'
                        }
                    >
                        {failure ??
                            (stale
                                ? 'Pembaruan tertunda. Menghubungkan kembali…'
                                : 'Antrean diperbarui otomatis')}
                    </p>
                    <time className="text-muted-foreground tabular-nums">
                        {new Intl.DateTimeFormat('id-ID', {
                            dateStyle: 'long',
                            timeStyle: 'short',
                            timeZone: board.timezone,
                        }).format(new Date(now))}
                    </time>
                </footer>
            </main>
        </>
    );
}
