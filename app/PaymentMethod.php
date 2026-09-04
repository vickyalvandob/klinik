<?php

namespace App;

enum PaymentMethod: string
{
    case Cash = 'cash';
    case Card = 'card';
    case BankTransfer = 'bank_transfer';
    case Other = 'other';

    public function label(): string
    {
        return match ($this) {
            self::Cash => 'Tunai',
            self::Card => 'Kartu',
            self::BankTransfer => 'Transfer bank',
            self::Other => 'Lainnya',
        };
    }
}
