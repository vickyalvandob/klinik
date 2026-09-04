<?php

namespace App;

enum MedicalRecordStatus: string
{
    case Draft = 'draft';
    case Final = 'final';
    case Amended = 'amended';

    public function label(): string
    {
        return match ($this) {
            self::Draft => 'Draft',
            self::Final => 'Final',
            self::Amended => 'Dikoreksi',
        };
    }
}
