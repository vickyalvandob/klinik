<?php

namespace App\Support;

use App\Models\ClinicMembership;
use App\Models\User;
use App\Support\Authorization\PermissionCatalog;
use App\SystemRole;

final class DemoAccounts
{
    public const PASSWORD = 'password';

    /** @return array<string, array{number: string, name: string, email: string, position: string, role: SystemRole}> */
    public static function staff(): array
    {
        return [
            'owner' => ['number' => 'STF-001', 'name' => 'Vicky Pratama', 'email' => 'owner@klinik.test', 'position' => 'Pemilik Klinik', 'role' => SystemRole::OwnerAdmin],
            'front_office' => ['number' => 'STF-002', 'name' => 'Nadia Putri', 'email' => 'frontoffice@klinik.test', 'position' => 'Petugas Pendaftaran', 'role' => SystemRole::FrontOffice],
            'nurse' => ['number' => 'STF-003', 'name' => 'Siti Rahma, A.Md.Kep.', 'email' => 'perawat@klinik.test', 'position' => 'Perawat', 'role' => SystemRole::Nurse],
            'doctor' => ['number' => 'STF-004', 'name' => 'dr. Andi Wijaya', 'email' => 'dokter@klinik.test', 'position' => 'Dokter Umum', 'role' => SystemRole::Doctor],
            'pharmacy' => ['number' => 'STF-005', 'name' => 'apt. Rina Lestari, S.Farm.', 'email' => 'farmasi@klinik.test', 'position' => 'Apoteker', 'role' => SystemRole::Pharmacy],
            'cashier' => ['number' => 'STF-006', 'name' => 'Dimas Saputra', 'email' => 'kasir@klinik.test', 'position' => 'Kasir', 'role' => SystemRole::Cashier],
        ];
    }

    /** @return list<array{label: string, name: string, email: string, password: string, description: string}> */
    public static function loginOptions(): array
    {
        if (! app()->isLocal()) {
            return [];
        }

        $definitions = self::staff();
        $users = User::query()->where('is_active', true)
            ->whereIn('email', [...array_column($definitions, 'email'), 'platform@klinik.test'])
            ->get(['id', 'name', 'email', 'is_platform_admin'])->keyBy('email');
        $memberships = ClinicMembership::withoutGlobalScopes()
            ->whereIn('user_id', $users->modelKeys())->where('is_active', true)
            ->whereHas('clinic', fn ($query) => $query->withoutGlobalScopes()
                ->where('facility_identifier', 'KSS-001')->where('is_active', true)
                ->whereHas('tenant', fn ($query) => $query->where('slug', 'klinik-sehat-sentosa')->where('status', 'active')))
            ->with('role:id,code')->get()->keyBy('user_id');
        $options = [];

        foreach ($definitions as $definition) {
            $user = $users->get($definition['email']);
            if ($user === null || $user->is_platform_admin
                || $memberships->get($user->id)?->role->code !== $definition['role']->value) {
                continue;
            }

            $options[] = [
                'label' => $definition['role']->label(), 'name' => $user->name,
                'email' => $user->email, 'password' => self::PASSWORD,
                'description' => PermissionCatalog::roles()[$definition['role']->value]['description'],
            ];
        }

        $platform = $users->get('platform@klinik.test');
        if ($platform?->is_platform_admin) {
            $options[] = [
                'label' => 'Admin Platform', 'name' => $platform->name,
                'email' => $platform->email, 'password' => self::PASSWORD,
                'description' => 'Mengelola tenant pada area platform yang terpisah dari pelayanan klinik.',
            ];
        }

        return $options;
    }
}
