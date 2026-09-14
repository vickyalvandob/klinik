export type Row = {
    label: string;
    count: number;
    amount: number | null;
    balance?: number;
    key?: string;
};
export type Period = { from: string; to: string };
export type ReportSection =
    | 'visits'
    | 'revenue'
    | 'billing'
    | 'services'
    | 'diagnoses'
    | 'doctors'
    | 'pharmacy';
export const reports: Record<
    ReportSection,
    {
        title: string;
        description: string;
        label: string;
        count: string;
        amount?: string;
        note: string;
    }
> = {
    revenue: {
        title: 'Penerimaan',
        description: 'Uang yang diterima dari pembayaran pasien.',
        label: 'Metode pembayaran',
        count: 'Pembayaran',
        amount: 'Uang diterima',
        note: 'Mengikuti tanggal pembayaran diterima. Pembayaran yang dibatalkan tidak dihitung. Satu tagihan dapat dibayar beberapa kali atau dengan beberapa metode, sehingga jumlah pembayaran bukan jumlah pasien.',
    },
    billing: {
        title: 'Tagihan & piutang',
        description: 'Tagihan yang terbit pada periode ini dan jumlah yang belum dilunasi.',
        label: 'Status tagihan',
        count: 'Tagihan',
        amount: 'Total tagihan',
        note: 'Berdasarkan tanggal tagihan diterbitkan. Status dan sisa tagihan menunjukkan kondisi saat ini, bukan saldo pada akhir periode. Nilai tagihan dibatalkan ditampilkan sebagai riwayat.',
    },
    visits: {
        title: 'Kunjungan',
        description: 'Jumlah kunjungan, pasien yang datang, dan penyelesaian pelayanan.',
        label: 'Tanggal kunjungan',
        count: 'Kunjungan',
        note: 'Berdasarkan tanggal kunjungan. Jumlah mencakup kunjungan yang selesai, masih berjalan, dan dibatalkan.',
    },
    services: {
        title: 'Layanan & tindakan',
        description: 'Tindakan yang paling sering tercatat dan nilai tarifnya.',
        label: 'Layanan / tindakan',
        count: 'Kali dilakukan',
        amount: 'Nilai tarif',
        note: 'Berdasarkan tanggal kunjungan dan catatan medis final. Nilai layanan adalah tarif tindakan yang tercatat, bukan penerimaan kas. Maksimal 100 kelompok teratas.',
    },
    diagnoses: {
        title: 'Diagnosis',
        description: 'Diagnosis utama dan tambahan dalam catatan medis yang telah diselesaikan.',
        label: 'Kode & diagnosis',
        count: 'Kali tercatat',
        note: 'Berdasarkan tanggal kunjungan dan diagnosis dalam catatan medis final. Kunjungan yang dibatalkan tidak dihitung. Maksimal 100 kelompok teratas, tanpa identitas pasien.',
    },
    doctors: {
        title: 'Dokter',
        description: 'Pembagian kunjungan dan jumlah pelayanan yang telah selesai.',
        label: 'Dokter',
        count: 'Kunjungan',
        note: 'Berdasarkan tanggal kunjungan. Kunjungan yang dibatalkan tidak dihitung. Maksimal 100 dokter.',
    },
    pharmacy: {
        title: 'Farmasi',
        description: 'Resep yang sudah diserahkan dan yang masih perlu disiapkan.',
        label: 'Status resep',
        count: 'Resep',
        note: 'Berdasarkan tanggal kunjungan. Status resep menunjukkan kondisi saat ini. Resep draf dan kunjungan yang dibatalkan tidak dihitung.',
    },
};

export type ReportSummary = Partial<Record<
    'revenue' | 'payment_count' | 'voided_payments' | 'voided_count' |
    'invoiced' | 'paid' | 'outstanding' | 'invoice_count' | 'outstanding_count' |
    'visits' | 'patients' | 'doctors' | 'completed' | 'cancelled' |
    'total' | 'encounters' | 'amount' | 'primary_count' | 'dispensed' | 'pending',
    number
>> & {
    comparison?: { from: string; to: string; value: number; days: number; ongoing: boolean };
};
export const rowUnits: Record<ReportSection, string> = {
    revenue: 'metode pembayaran', billing: 'status tagihan', visits: 'hari dengan kunjungan',
    services: 'layanan', diagnoses: 'diagnosis', doctors: 'dokter', pharmacy: 'status resep',
};
export function reportTotal(section: ReportSection, summary: ReportSummary): number {
    if (section === 'revenue') return summary.payment_count ?? 0;
    if (section === 'billing') return (summary.invoice_count ?? 0) + (summary.voided_count ?? 0);
    if (section === 'visits' || section === 'doctors') return summary.visits ?? 0;
    return summary.total ?? 0;
}
