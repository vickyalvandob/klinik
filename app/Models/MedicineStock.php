<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use App\Models\Concerns\HasUuid;
use Database\Factories\MedicineStockFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property string $uuid
 * @property int $tenant_id
 * @property int $clinic_id
 * @property int $medicine_id
 * @property string $quantity
 * @property Carbon|null $last_movement_at
 */
#[Fillable(['medicine_id', 'quantity', 'last_movement_at'])]
class MedicineStock extends Model
{
    /** @use HasFactory<MedicineStockFactory> */
    use BelongsToTenant, HasFactory, HasUuid;

    /** @return BelongsTo<Medicine, $this> */
    public function medicine(): BelongsTo
    {
        return $this->belongsTo(Medicine::class);
    }

    protected function casts(): array
    {
        return [
            'quantity' => 'decimal:2',
            'last_movement_at' => 'datetime',
        ];
    }
}
