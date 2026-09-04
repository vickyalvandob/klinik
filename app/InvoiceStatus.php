<?php

namespace App;

enum InvoiceStatus: string
{
    case Issued = 'issued';
    case PartiallyPaid = 'partially_paid';
    case Paid = 'paid';
    case Voided = 'voided';

    public function label(): string
    {
        return match ($this) {
            self::Issued => 'Belum dibayar',
            self::PartiallyPaid => 'Dibayar sebagian',
            self::Paid => 'Lunas',
            self::Voided => 'Dibatalkan',
        };
    }
}
