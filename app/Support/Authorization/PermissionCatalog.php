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
            'patient.view' => ['name' => 'Melihat pasien', 'group' => 'Patient'],
            'patient.create' => ['name' => 'Membuat pasien', 'group' => 'Patient'],
            'patient.update' => ['name' => 'Memperbarui pasien', 'group' => 'Patient'],
            'encounter.view' => ['name' => 'Melihat kunjungan', 'group' => 'Encounter'],
            'encounter.create' => ['name' => 'Membuat kunjungan', 'group' => 'Encounter'],
            'encounter.update' => ['name' => 'Memperbarui kunjungan', 'group' => 'Encounter'],
            'encounter.cancel' => ['name' => 'Membatalkan kunjungan', 'group' => 'Encounter'],
            'triage.view' => ['name' => 'Melihat triase', 'group' => 'Triage'],
            'triage.create' => ['name' => 'Membuat triase', 'group' => 'Triage'],
            'triage.update' => ['name' => 'Memperbarui triase', 'group' => 'Triage'],
            'triage.complete' => ['name' => 'Menyelesaikan triase', 'group' => 'Triage'],
            'medical_record.view' => ['name' => 'Melihat rekam medis', 'group' => 'Clinical Record'],
            'medical_record.create' => ['name' => 'Membuat rekam medis', 'group' => 'Clinical Record'],
            'medical_record.update' => ['name' => 'Memperbarui rekam medis', 'group' => 'Clinical Record'],
            'medical_record.finalize' => ['name' => 'Finalisasi rekam medis', 'group' => 'Clinical Record'],
            'medical_record.amend' => ['name' => 'Membuat amendemen rekam medis', 'group' => 'Clinical Record'],
            'prescription.view' => ['name' => 'Melihat resep', 'group' => 'Prescription'],
            'prescription.create' => ['name' => 'Membuat resep', 'group' => 'Prescription'],
            'prescription.update' => ['name' => 'Memperbarui resep', 'group' => 'Prescription'],
            'prescription.cancel' => ['name' => 'Membatalkan resep', 'group' => 'Prescription'],
            'pharmacy.view' => ['name' => 'Melihat farmasi', 'group' => 'Pharmacy'],
            'pharmacy.process' => ['name' => 'Memproses farmasi', 'group' => 'Pharmacy'],
            'pharmacy.dispense' => ['name' => 'Menyerahkan obat', 'group' => 'Pharmacy'],
            'billing.view' => ['name' => 'Melihat tagihan', 'group' => 'Billing'],
            'billing.manage' => ['name' => 'Mengelola tagihan', 'group' => 'Billing'],
            'payment.receive' => ['name' => 'Menerima pembayaran', 'group' => 'Billing'],
            'payment.void' => ['name' => 'Membatalkan pembayaran', 'group' => 'Billing'],
            'report.view' => ['name' => 'Melihat laporan', 'group' => 'Report'],
            'report.export' => ['name' => 'Mengekspor laporan', 'group' => 'Report'],
            'clinic.manage' => ['name' => 'Mengelola klinik', 'group' => 'Settings'],
            'users.manage' => ['name' => 'Mengelola pengguna', 'group' => 'Settings'],
            'roles.manage' => ['name' => 'Mengelola peran dan izin', 'group' => 'Settings'],
            'master_data.manage' => ['name' => 'Mengelola master data', 'group' => 'Settings'],
            'integration.manage' => ['name' => 'Mengelola integrasi', 'group' => 'Settings'],
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
                'description' => 'Akses administrasi penuh untuk tenant dan klinik.',
                'permissions' => array_keys(self::permissions()),
            ],
            SystemRole::FrontOffice->value => [
                'name' => SystemRole::FrontOffice->label(),
                'description' => 'Pendaftaran pasien dan pengelolaan alur kunjungan.',
                'permissions' => [
                    'patient.view', 'patient.create', 'patient.update',
                    'encounter.view', 'encounter.create', 'encounter.update', 'encounter.cancel',
                ],
            ],
            SystemRole::Nurse->value => [
                'name' => SystemRole::Nurse->label(),
                'description' => 'Triase dan dokumentasi keperawatan.',
                'permissions' => [
                    'patient.view', 'patient.update', 'encounter.view', 'encounter.update',
                    'triage.view', 'triage.create', 'triage.update', 'triage.complete',
                    'medical_record.view', 'medical_record.create', 'medical_record.update',
                ],
            ],
            SystemRole::Doctor->value => [
                'name' => SystemRole::Doctor->label(),
                'description' => 'Pemeriksaan, rekam medis, dan resep.',
                'permissions' => [
                    'patient.view', 'encounter.view', 'encounter.update', 'triage.view',
                    'medical_record.view', 'medical_record.create', 'medical_record.update',
                    'medical_record.finalize', 'medical_record.amend',
                    'prescription.view', 'prescription.create', 'prescription.update', 'prescription.cancel',
                ],
            ],
            SystemRole::Pharmacy->value => [
                'name' => SystemRole::Pharmacy->label(),
                'description' => 'Pemrosesan resep dan penyerahan obat.',
                'permissions' => [
                    'patient.view', 'encounter.view', 'prescription.view',
                    'pharmacy.view', 'pharmacy.process', 'pharmacy.dispense',
                ],
            ],
            SystemRole::Cashier->value => [
                'name' => SystemRole::Cashier->label(),
                'description' => 'Tagihan dan penerimaan pembayaran.',
                'permissions' => [
                    'patient.view', 'encounter.view', 'billing.view', 'billing.manage',
                    'payment.receive', 'payment.void', 'report.view',
                ],
            ],
        ];
    }
}
