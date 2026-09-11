<?php

namespace App\Support;

use Illuminate\Support\Str;

class AuditLogCatalog
{
    /** @return array<string, string> */
    public static function actions(string $source): array
    {
        return match ($source) {
            'access' => [
                'view' => 'Membuka rekam medis',
                'history_view' => 'Membaca riwayat rekam medis',
                'file_download' => 'Mengunduh lampiran RME',
            ],
            'clinical' => [
                'draft_saved' => 'Menyimpan draf rekam medis',
                'finalized' => 'Menyelesaikan pemeriksaan',
                'amended' => 'Mengamendemen rekam medis',
            ],
            'triage' => [
                'draft_saved' => 'Menyimpan draf pemeriksaan awal',
                'completed' => 'Menyelesaikan pemeriksaan awal',
            ],
            'billing' => [
                'invoice_created' => 'Menerbitkan tagihan',
                'payment_received' => 'Menerima pembayaran',
                'payment_voided' => 'Membatalkan pembayaran',
                'invoice_voided' => 'Membatalkan tagihan',
            ],
            'pharmacy' => [
                'processing_started' => 'Memulai penyiapan obat',
                'dispensed' => 'Menyerahkan obat',
                'cancelled' => 'Membatalkan resep',
            ],
            default => [
                'registrations.store' => 'Mendaftarkan kunjungan',
                'patients.store' => 'Menambahkan pasien',
                'patients.update' => 'Memperbarui data pasien',
                'encounters.cancellations.store' => 'Membatalkan kunjungan',
                'queues.calls.store' => 'Memanggil antrean',
                'triages.update' => 'Menyimpan pemeriksaan awal',
                'consultations.store' => 'Memulai pemeriksaan dokter',
                'medical-records.update' => 'Menyimpan rekam medis',
                'medical-records.amendments.store' => 'Mengamendemen rekam medis',
                'medical-record-files.store' => 'Mengunggah lampiran RME',
                'pharmacy.processing.store' => 'Memulai penyiapan obat',
                'pharmacy.dispensing.store' => 'Menyerahkan obat',
                'pharmacy.cancellations.store' => 'Membatalkan resep',
                'pharmacy.stock.adjustments.store' => 'Menyesuaikan stok obat',
                'billing.payments.store' => 'Mencatat pembayaran',
                'billing.payments.void' => 'Membatalkan pembayaran',
                'billing.void' => 'Membatalkan tagihan',
                'reports.export' => 'Mengunduh laporan',
                'clinic-users.store' => 'Menambahkan pengguna klinik',
                'clinic-users.update' => 'Memperbarui pengguna klinik',
                'clinic-roles.update' => 'Mengubah hak akses peran',
                'clinic-settings.update' => 'Memperbarui pengaturan klinik',
                'master-data.store' => 'Menambahkan data master',
                'master-data.update' => 'Memperbarui data master',
                'onboarding.update' => 'Menyimpan pengaturan awal klinik',
                'current-clinic.update' => 'Mengganti klinik aktif',
            ],
        };
    }

    public static function label(string $source, string $action): string
    {
        return self::actions($source)[$action] ?? Str::headline(str_replace('.', ' ', $action));
    }
}
