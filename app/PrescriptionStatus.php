<?php

namespace App;

enum PrescriptionStatus: string
{
    case Draft = 'draft';
    case Prescribed = 'prescribed';
    case Processing = 'processing';
    case Dispensed = 'dispensed';
    case Cancelled = 'cancelled';

    public function label(): string
    {
        return match ($this) {
            self::Draft => 'Draft',
            self::Prescribed => 'Baru',
            self::Processing => 'Diproses',
            self::Dispensed => 'Selesai',
            self::Cancelled => 'Dibatalkan',
        };
    }
}
