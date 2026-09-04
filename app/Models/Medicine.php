<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use App\Models\Concerns\HasUuid;
use Database\Factories\MedicineFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

/**
 * @property int $id
 * @property string $uuid
 * @property int $tenant_id
 * @property int $clinic_id
 * @property string $code
 * @property string $name
 * @property string|null $generic_name
 * @property string|null $category
 * @property string $dosage_form
 * @property string|null $strength
 * @property string $unit
 * @property string $purchase_price
 * @property string $selling_price
 * @property int $minimum_stock
 * @property bool $is_active
 */
#[Fillable([
    'code', 'name', 'generic_name', 'category', 'dosage_form', 'strength',
    'unit', 'purchase_price', 'selling_price', 'minimum_stock', 'is_active',
])]
class Medicine extends Model
{
    /** @use HasFactory<MedicineFactory> */
    use BelongsToTenant, HasFactory, HasUuid;

    /** @return BelongsTo<Clinic, $this> */
    public function clinic(): BelongsTo
    {
        return $this->belongsTo(Clinic::class);
    }

    /** @return HasOne<MedicineStock, $this> */
    public function stock(): HasOne
    {
        return $this->hasOne(MedicineStock::class);
    }

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'purchase_price' => 'decimal:2',
            'selling_price' => 'decimal:2',
            'minimum_stock' => 'integer',
            'is_active' => 'boolean',
        ];
    }
}
