<?php

namespace App\Models\Concerns;

use LogicException;

trait IsAppendOnly
{
    protected static function bootIsAppendOnly(): void
    {
        static::updating(function (): never {
            throw new LogicException('Catatan audit tidak dapat diubah.');
        });
        static::deleting(function (): never {
            throw new LogicException('Catatan audit tidak dapat dihapus.');
        });
    }
}
