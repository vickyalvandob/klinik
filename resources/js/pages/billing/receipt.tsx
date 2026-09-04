import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { show as showInvoice } from '@/routes/billing';

type ReceiptProps = {
    clinic: { name: string; address: string | null; phone: string | null };
    invoice: {
        uuid: string;
        invoice_number: string;
        total_amount: number;
        paid_amount: number;
        balance_due: number;
        patient: { name: string; medical_record_number: string };
        registration_number: string;
        items: Array<{
            description: string;
            quantity: string;
            unit: string | null;
            unit_price: number;
            line_total: number;
        }>;
    };
    payment: {
        payment_number: string;
        amount: number;
        method_label: string;
        reference_number: string | null;
        status: 'received' | 'voided';
        status_label: string;
        received_at: string;
        received_by: string;
        void_reason: string | null;
    };
};

export default function BillingReceipt({
    clinic,
    invoice,
    payment,
}: ReceiptProps) {
    return (
        <>
            <Head title={`Struk ${payment.payment_number}`} />
            <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
                <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
                    <Button asChild variant="outline">
                        <Link href={showInvoice(invoice.uuid)}>
                            <ArrowLeft /> Kembali ke Tagihan
                        </Link>
                    </Button>
                    <Button type="button" onClick={() => window.print()}>
                        <Printer /> Cetak Struk
                    </Button>
                </div>

                <article className="billing-receipt bg-card mx-auto w-full max-w-2xl rounded-xl border p-5 text-sm md:p-8 print:max-w-none print:rounded-none print:border-0 print:bg-white print:p-0 print:text-black">
                    <header className="border-b pb-5 text-center">
                        <h1 className="text-xl font-semibold">{clinic.name}</h1>
                        {clinic.address && (
                            <p className="mt-1 text-xs">{clinic.address}</p>
                        )}
                        {clinic.phone && (
                            <p className="text-xs">{clinic.phone}</p>
                        )}
                        <p className="mt-4 font-semibold">STRUK PEMBAYARAN</p>
                    </header>

                    <dl className="grid gap-2 border-b py-5 sm:grid-cols-2">
                        <ReceiptInfo
                            label="No. pembayaran"
                            value={payment.payment_number}
                        />
                        <ReceiptInfo
                            label="No. invoice"
                            value={invoice.invoice_number}
                        />
                        <ReceiptInfo
                            label="Pasien"
                            value={invoice.patient.name}
                        />
                        <ReceiptInfo
                            label="Nomor RM"
                            value={invoice.patient.medical_record_number}
                        />
                        <ReceiptInfo
                            label="Registrasi"
                            value={invoice.registration_number}
                        />
                        <ReceiptInfo
                            label="Waktu bayar"
                            value={formatDateTime(payment.received_at)}
                        />
                    </dl>

                    <div className="divide-y border-b py-2">
                        {invoice.items.map((item, indexValue) => (
                            <div
                                key={`${item.description}-${indexValue}`}
                                className="grid grid-cols-[minmax(0,1fr)_auto] gap-4 py-3"
                            >
                                <div>
                                    <p className="font-medium">
                                        {item.description}
                                    </p>
                                    <p className="text-xs opacity-70">
                                        {formatQuantity(item.quantity)}{' '}
                                        {item.unit ?? ''} ×{' '}
                                        {formatCurrency(item.unit_price)}
                                    </p>
                                </div>
                                <p className="font-medium">
                                    {formatCurrency(item.line_total)}
                                </p>
                            </div>
                        ))}
                    </div>

                    <dl className="grid gap-2 border-b py-5">
                        <ReceiptAmount
                            label="Total tagihan"
                            value={invoice.total_amount}
                        />
                        <ReceiptAmount
                            label="Pembayaran ini"
                            value={payment.amount}
                            emphasized
                        />
                        <ReceiptAmount
                            label="Total sudah dibayar"
                            value={invoice.paid_amount}
                        />
                        <ReceiptAmount
                            label="Sisa tagihan"
                            value={invoice.balance_due}
                        />
                    </dl>

                    <dl className="grid gap-2 py-5 sm:grid-cols-2">
                        <ReceiptInfo
                            label="Metode"
                            value={payment.method_label}
                        />
                        <ReceiptInfo
                            label="Kasir"
                            value={payment.received_by}
                        />
                        {payment.reference_number && (
                            <ReceiptInfo
                                label="Referensi"
                                value={payment.reference_number}
                            />
                        )}
                        <ReceiptInfo
                            label="Status"
                            value={payment.status_label}
                        />
                    </dl>

                    {payment.status === 'voided' && (
                        <div className="border-destructive rounded-lg border p-3 text-center print:border-black">
                            <p className="font-semibold">
                                PEMBAYARAN DIBATALKAN
                            </p>
                            {payment.void_reason && (
                                <p className="mt-1 text-xs">
                                    {payment.void_reason}
                                </p>
                            )}
                        </div>
                    )}

                    <footer className="mt-6 text-center text-xs opacity-70">
                        Simpan struk ini sebagai bukti pembayaran.
                    </footer>
                </article>
            </div>
        </>
    );
}

function ReceiptInfo({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <dt className="text-xs opacity-70">{label}</dt>
            <dd className="mt-0.5 font-medium">{value}</dd>
        </div>
    );
}

function ReceiptAmount({
    label,
    value,
    emphasized = false,
}: {
    label: string;
    value: number;
    emphasized?: boolean;
}) {
    return (
        <div className="flex items-center justify-between gap-4">
            <dt className={emphasized ? 'font-semibold' : ''}>{label}</dt>
            <dd
                className={emphasized ? 'text-lg font-semibold' : 'font-medium'}
            >
                {formatCurrency(value)}
            </dd>
        </div>
    );
}

function formatCurrency(value: number) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0,
    }).format(value);
}

function formatQuantity(value: string) {
    return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 }).format(
        Number(value),
    );
}

function formatDateTime(value: string) {
    return new Intl.DateTimeFormat('id-ID', {
        dateStyle: 'long',
        timeStyle: 'short',
    }).format(new Date(value));
}
