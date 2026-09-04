<?php

namespace App;

enum PaymentStatus: string
{
    case Received = 'received';
    case Voided = 'voided';

    public function label(): string
    {
        return match ($this) {
            self::Received => 'Diterima',
            self::Voided => 'Dibatalkan',
        };
    }
}
