<?php

namespace App;

enum InvoiceItemType: string
{
    case Procedure = 'procedure';
    case Medicine = 'medicine';

    public function label(): string
    {
        return match ($this) {
            self::Procedure => 'Tindakan',
            self::Medicine => 'Obat',
        };
    }
}
