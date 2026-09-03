<?php

namespace App;

enum SystemRole: string
{
    case OwnerAdmin = 'OWNER_ADMIN';
    case FrontOffice = 'FRONT_OFFICE';
    case Nurse = 'NURSE';
    case Doctor = 'DOCTOR';
    case Pharmacy = 'PHARMACY';
    case Cashier = 'CASHIER';

    public function label(): string
    {
        return match ($this) {
            self::OwnerAdmin => 'Pemilik / Admin',
            self::FrontOffice => 'Front Office',
            self::Nurse => 'Perawat',
            self::Doctor => 'Dokter',
            self::Pharmacy => 'Farmasi',
            self::Cashier => 'Kasir',
        };
    }
}
