import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { index } from '@/routes/registrations';

type TicketProps = {
    clinic: {
        name: string;
        address: string | null;
        phone: string | null;
        timezone: string;
    };
    ticket: {
        registration_number: string;
        date: string;
        registered_at: string;
        queue_number: string;
        patient_name: string;
        medical_record_number: string;
        service_unit: string;
        practitioner: string;
        status: string;
        status_label: string;
    };
};

export default function RegistrationTicket({ clinic, ticket }: TicketProps) {
    return (
        <>
            <Head title={`Antrean ${ticket.queue_number}`} />
            <div className="mx-auto grid w-full max-w-xl gap-4 p-4 sm:p-6 print:p-0">
                <div className="flex flex-wrap justify-between gap-2 print:hidden">
                    <Button asChild variant="outline">
                        <Link href={index({ query: { date: ticket.date } })}>
                            <ArrowLeft /> Pendaftaran
                        </Link>
                    </Button>
                    <Button onClick={() => window.print()}>
                        <Printer /> Cetak Tiket
                    </Button>
                </div>
                <article className="print-document bg-card rounded-xl border p-6 text-center print:rounded-none print:border-0 print:bg-white print:text-black">
                    <h1 className="text-xl font-semibold">{clinic.name}</h1>
                    <p className="mt-1 text-xs">{clinic.address}</p>
                    <p className="text-xs">{clinic.phone}</p>
                    <p className="mt-6 border-t pt-5 text-sm font-medium">
                        TIKET ANTREAN
                    </p>
                    <p className="my-4 font-mono text-6xl font-bold break-words">
                        {ticket.queue_number}
                    </p>
                    <p className="font-medium">{ticket.service_unit}</p>
                    <p className="mt-1 text-sm">{ticket.practitioner}</p>
                    <dl className="mt-6 grid gap-3 border-y py-5 text-left text-sm">
                        <div>
                            <dt className="text-xs opacity-70">Pasien</dt>
                            <dd className="font-medium break-words">
                                {ticket.patient_name}
                            </dd>
                        </div>
                        <div>
                            <dt className="text-xs opacity-70">Nomor RM</dt>
                            <dd>{ticket.medical_record_number}</dd>
                        </div>
                        <div>
                            <dt className="text-xs opacity-70">Registrasi</dt>
                            <dd>{ticket.registration_number}</dd>
                        </div>
                        <div>
                            <dt className="text-xs opacity-70">Waktu daftar</dt>
                            <dd>
                                {new Intl.DateTimeFormat('id-ID', {
                                    dateStyle: 'long',
                                    timeStyle: 'short',
                                    timeZone: clinic.timezone,
                                }).format(new Date(ticket.registered_at))}
                            </dd>
                        </div>
                    </dl>
                    {['cancelled', 'completed'].includes(ticket.status) ? (
                        <p className="mt-5 rounded-md border p-3 text-sm font-semibold">
                            {ticket.status_label.toUpperCase()} — tiket ini
                            sudah tidak aktif.
                        </p>
                    ) : (
                        <p className="mt-5 text-xs leading-relaxed">
                            Silakan menunggu panggilan petugas untuk pemeriksaan
                            awal. Urutan pelayanan dapat disesuaikan dengan
                            kebutuhan klinis pasien.
                        </p>
                    )}
                    <p className="mt-3 text-xs opacity-70">
                        Tiket ini bukan bukti pembayaran.
                    </p>
                </article>
            </div>
        </>
    );
}
