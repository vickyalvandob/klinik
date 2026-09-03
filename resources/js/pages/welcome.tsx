import { Head, Link, usePage } from '@inertiajs/react';
import {
    ArrowRight,
    ClipboardCheck,
    ShieldCheck,
    Stethoscope,
} from 'lucide-react';
import AppLogoIcon from '@/components/app-logo-icon';
import { Button } from '@/components/ui/button';
import { dashboard, login, register } from '@/routes';

const principles = [
    {
        icon: ClipboardCheck,
        title: 'Satu alur kunjungan',
        description:
            'Pendaftaran, pemeriksaan, farmasi, dan pembayaran berada dalam alur yang jelas.',
    },
    {
        icon: Stethoscope,
        title: 'RME yang praktis',
        description:
            'Workspace dokter dirancang ringkas tanpa mengurangi ketelitian dokumentasi klinis.',
    },
    {
        icon: ShieldCheck,
        title: 'Aman sejak fondasi',
        description:
            'Autentikasi session dan quality gate menjadi bagian sejak awal pengembangan.',
    },
];

export default function Welcome() {
    const { auth, name } = usePage().props;

    return (
        <>
            <Head title="Manajemen klinik modern" />
            <div className="bg-background text-foreground min-h-svh">
                <header className="bg-background/95 border-b">
                    <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
                        <Link
                            href={auth.user ? dashboard() : login()}
                            className="flex items-center gap-3"
                        >
                            <span className="bg-primary text-primary-foreground flex size-9 items-center justify-center rounded-lg">
                                <AppLogoIcon className="size-5 fill-current" />
                            </span>
                            <span className="font-semibold">{name}</span>
                        </Link>

                        <Button asChild size="sm">
                            <Link href={auth.user ? dashboard() : login()}>
                                {auth.user ? 'Buka aplikasi' : 'Masuk'}
                            </Link>
                        </Button>
                    </div>
                </header>

                <main>
                    <section className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-[1.2fr_0.8fr] lg:px-8 lg:py-28">
                        <div>
                            <p className="bg-muted/60 text-primary inline-flex rounded-full border px-3 py-1 text-xs font-medium">
                                Clinic Management & Electronic Medical Record
                            </p>
                            <h1 className="mt-6 max-w-3xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl lg:text-6xl">
                                Operasional klinik yang sederhana, profesional,
                                dan aman.
                            </h1>
                            <p className="text-muted-foreground mt-6 max-w-2xl text-base leading-7 text-pretty sm:text-lg">
                                Fokus pada pasien dan pelayanan. Kompleksitas
                                keamanan, audit, dan skalabilitas ditangani di
                                balik pengalaman kerja yang ringkas.
                            </p>

                            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                                <Button asChild size="lg">
                                    <Link
                                        href={auth.user ? dashboard() : login()}
                                    >
                                        {auth.user
                                            ? 'Lanjutkan ke Hari Ini'
                                            : 'Masuk ke aplikasi'}
                                        <ArrowRight />
                                    </Link>
                                </Button>
                                {!auth.user && (
                                    <Button asChild size="lg" variant="outline">
                                        <Link href={register()}>
                                            Buat akun awal
                                        </Link>
                                    </Button>
                                )}
                            </div>
                        </div>

                        <div className="bg-card rounded-2xl border p-5 shadow-sm sm:p-7">
                            <p className="text-primary text-sm font-medium">
                                Alur kerja utama
                            </p>
                            <ol className="mt-5 grid gap-3">
                                {[
                                    'Pasien datang dan didaftarkan',
                                    'Pemeriksaan awal bila diperlukan',
                                    'Dokter menyelesaikan satu workspace RME',
                                    'Farmasi dan pembayaran diproses',
                                    'Kunjungan selesai dengan riwayat utuh',
                                ].map((step, index) => (
                                    <li
                                        key={step}
                                        className="bg-muted/60 flex items-center gap-3 rounded-lg p-3"
                                    >
                                        <span className="bg-primary text-primary-foreground flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
                                            {index + 1}
                                        </span>
                                        <span className="text-sm font-medium">
                                            {step}
                                        </span>
                                    </li>
                                ))}
                            </ol>
                        </div>
                    </section>

                    <section className="bg-muted/30 border-y">
                        <div className="mx-auto grid max-w-7xl gap-4 px-4 py-12 sm:px-6 md:grid-cols-3 lg:px-8">
                            {principles.map((principle) => (
                                <article
                                    key={principle.title}
                                    className="bg-card rounded-xl border p-5"
                                >
                                    <principle.icon
                                        className="text-primary size-5"
                                        aria-hidden="true"
                                    />
                                    <h2 className="mt-4 font-semibold">
                                        {principle.title}
                                    </h2>
                                    <p className="text-muted-foreground mt-2 text-sm leading-6">
                                        {principle.description}
                                    </p>
                                </article>
                            ))}
                        </div>
                    </section>
                </main>

                <footer className="text-muted-foreground mx-auto flex max-w-7xl flex-col gap-1 px-4 py-8 text-sm sm:px-6 lg:px-8">
                    <span className="text-foreground font-medium">{name}</span>
                    <span>Fondasi aplikasi manajemen klinik dan RME.</span>
                </footer>
            </div>
        </>
    );
}
