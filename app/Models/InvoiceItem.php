<?php

namespace App\Models;

use App\InvoiceItemType;
use App\Models\Concerns\BelongsToTenant;
use App\Models\Concerns\HasUuid;
use Database\Factories\InvoiceItemFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property string $uuid
 * @property int $tenant_id
 * @property int $clinic_id
 * @property int $invoice_id
 * @property InvoiceItemType $item_type
 * @property string|null $source_uuid
 * @property string|null $code_snapshot
 * @property string $description_snapshot
 * @property string $quantity
 * @property string|null $unit
 * @property int $unit_price
 * @property int $line_total
 */
#[Fillable([
    'invoice_id', 'item_type', 'source_uuid', 'code_snapshot',
    'description_snapshot', 'quantity', 'unit', 'unit_price', 'line_total',
])]
class InvoiceItem extends Model
{
    /** @use HasFactory<InvoiceItemFactory> */
    use BelongsToTenant, HasFactory, HasUuid;

    /** @return BelongsTo<Invoice, $this> */
    public function invoice(): BelongsTo
    {
        return $this->belongsTo(Invoice::class);
    }

    protected function casts(): array
    {
        return [
            'item_type' => InvoiceItemType::class,
            'quantity' => 'decimal:2',
            'unit_price' => 'integer',
            'line_total' => 'integer',
        ];
    }
}
