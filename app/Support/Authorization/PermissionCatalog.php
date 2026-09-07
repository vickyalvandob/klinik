<?php

namespace App\Support\Authorization;

use App\SystemRole;

final class PermissionCatalog
{
    /**
     * @return array<string, array{name: string, group: string}>
     */
    public static function permissions(): array
    {
        return [
            'patient.view' => ['name' => 'Melihat pasien', 'group' => 'Pasien'],
            'patient.create' => ['name' => 'Membuat pasien', 'group' => 'Pasien'],
            'patient.update' => ['name' => 'Memperbarui pasien', 'group' => 'Pasien'],
            'encounter.view' => ['name' => 'Melihat kunjungan', 'group' => 'Pendaftaran & Antrean'],
            'registration.view' => ['name' => 'Membuka daftar dan riwayat pendaftaran', 'group' => 'Pendaftaran & Antrean'],
            'queue.view' => ['name' => 'Membuka antrean dan monitor', 'group' => 'Pendaftaran & Antrean'],
            'encounter.create' => ['name' => 'Membuat kunjungan', 'group' => 'Pendaftaran & Antrean'],
            'encounter.update' => ['name' => 'Memperbarui kunjungan', 'group' => 'Pendaftaran & Antrean'],
            'encounter.cancel' => ['name' => 'Membatalkan kunjungan', 'group' => 'Pendaftaran & Antrean'],
            'triage.view' => ['name' => 'Melihat triase', 'group' => 'Pemeriksaan Awal'],
            'triage.create' => ['name' => 'Membuat triase', 'group' => 'Pemeriksaan Awal'],
            'triage.update' => ['name' => 'Memperbarui triase', 'group' => 'Pemeriksaan Awal'],
            'triage.complete' => ['name' => 'Menyelesaikan triase', 'group' => 'Pemeriksaan Awal'],
            'medical_record.view' => ['name' => 'Melihat rekam medis', 'group' => 'Rekam Medis'],
            'medical_record.create' => ['name' => 'Membuat rekam medis', 'group' => 'Rekam Medis'],
            'medical_record.update' => ['name' => 'Memperbarui rekam medis', 'group' => 'Rekam Medis'],
            'medical_record.finalize' => ['name' => 'Finalisasi rekam medis', 'group' => 'Rekam Medis'],
            'medical_record.amend' => ['name' => 'Membuat amendemen rekam medis', 'group' => 'Rekam Medis'],
            'prescription.view' => ['name' => 'Melihat resep', 'group' => 'Resep'],
            'prescription.create' => ['name' => 'Membuat resep', 'group' => 'Resep'],
            'prescription.update' => ['name' => 'Memperbarui resep', 'group' => 'Resep'],
            'prescription.cancel' => ['name' => 'Membatalkan resep', 'group' => 'Resep'],
            'pharmacy.view' => ['name' => 'Melihat farmasi', 'group' => 'Apotek'],
            'pharmacy.process' => ['name' => 'Memproses farmasi', 'group' => 'Apotek'],
            'pharmacy.dispense' => ['name' => 'Menyerahkan obat', 'group' => 'Apotek'],
            'billing.view' => ['name' => 'Melihat tagihan', 'group' => 'Kasir'],
            'billing.manage' => ['name' => 'Mengelola tagihan', 'group' => 'Kasir'],
            'payment.receive' => ['name' => 'Menerima pembayaran', 'group' => 'Kasir'],
            'payment.void' => ['name' => 'Membatalkan pembayaran', 'group' => 'Kasir'],
            'report.view' => ['name' => 'Melihat laporan', 'group' => 'Laporan'],
            'report.export' => ['name' => 'Mengekspor laporan', 'group' => 'Laporan'],
            'clinic.manage' => ['name' => 'Mengelola klinik', 'group' => 'Pengaturan'],
            'users.manage' => ['name' => 'Mengelola pengguna', 'group' => 'Pengaturan'],
            'roles.manage' => ['name' => 'Mengelola peran dan izin', 'group' => 'Pengaturan'],
            'master_data.manage' => ['name' => 'Mengelola master data', 'group' => 'Pengaturan'],
            'integration.manage' => ['name' => 'Mengelola integrasi', 'group' => 'Pengaturan'],
            'audit.view' => ['name' => 'Melihat audit', 'group' => 'Audit'],
        ];
    }

    /**
     * @return array<string, array{name: string, description: string, permissions: list<string>}>
     */
    public static function roles(): array
    {
        return [
            SystemRole::OwnerAdmin->value => [
                'name' => SystemRole::OwnerAdmin->label(),
                'description' => 'Mengelola klinik, pengguna, layanan, keuangan, dan pengawasan operasional.',
                'permissions' => array_keys(self::permissions()),
            ],
            SystemRole::FrontOffice->value => [
                'name' => SystemRole::FrontOffice->label(),
                'description' => 'Mengelola data pasien, pendaftaran, nomor antrean, dan pembatalan kunjungan.',
                'permissions' => [
                    'patient.view', 'patient.create', 'patient.update',
                    'encounter.view', 'encounter.create', 'encounter.update', 'encounter.cancel',
                    'registration.view', 'queue.view',
                ],
            ],
            SystemRole::Nurse->value => [
                'name' => SystemRole::Nurse->label(),
                'description' => 'Memanggil antrean, mencatat tanda vital, dan menyelesaikan pemeriksaan awal.',
                'permissions' => [
                    'patient.view', 'encounter.view', 'encounter.update', 'queue.view',
                    'triage.view', 'triage.create', 'triage.update', 'triage.complete',
                ],
            ],
            SystemRole::Doctor->value => [
                'name' => SystemRole::Doctor->label(),
                'description' => 'Pemeriksaan, rekam medis, dan resep.',
                'permissions' => [
                    'patient.view', 'encounter.view', 'encounter.update', 'triage.view',
                    'queue.view',
                    'medical_record.view', 'medical_record.create', 'medical_record.update',
                    'medical_record.finalize', 'medical_record.amend',
                    'prescription.view', 'prescription.create', 'prescription.update', 'prescription.cancel',
                ],
            ],
            SystemRole::Pharmacy->value => [
                'name' => SystemRole::Pharmacy->label(),
                'description' => 'Pemrosesan resep dan penyerahan obat.',
                'permissions' => [
                    'prescription.view',
                    'pharmacy.view', 'pharmacy.process', 'pharmacy.dispense',
                ],
            ],
            SystemRole::Cashier->value => [
                'name' => SystemRole::Cashier->label(),
                'description' => 'Memeriksa tagihan, menerima pembayaran, mencetak kuitansi, dan melihat laporan keuangan.',
                'permissions' => [
                    'billing.view', 'billing.manage',
                    'payment.receive', 'payment.void', 'report.view',
                ],
            ],
        ];
    }
}
