<?php

namespace App;

enum StockMovementType: string
{
    case Adjustment = 'adjustment';
    case Dispense = 'dispense';

    public function label(): string
    {
        return match ($this) {
            self::Adjustment => 'Penyesuaian',
            self::Dispense => 'Penyerahan resep',
        };
    }
}
