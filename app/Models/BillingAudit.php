<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use App\Models\Concerns\HasUuid;
use Database\Factories\BillingAuditFactory;
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
 * @property int|null $payment_id
 * @property string $action
 * @property array<string, mixed>|null $before_values
 * @property array<string, mixed>|null $after_values
 * @property int|null $actor_id
 */
#[Fillable([
    'invoice_id', 'payment_id', 'action', 'before_values', 'after_values', 'actor_id',
])]
class BillingAudit extends Model
{
    /** @use HasFactory<BillingAuditFactory> */
    use BelongsToTenant, HasFactory, HasUuid;

    /** @return BelongsTo<Invoice, $this> */
    public function invoice(): BelongsTo
    {
        return $this->belongsTo(Invoice::class);
    }

    /** @return BelongsTo<Payment, $this> */
    public function payment(): BelongsTo
    {
        return $this->belongsTo(Payment::class);
    }

    /** @return BelongsTo<User, $this> */
    public function actor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'actor_id');
    }

    protected function casts(): array
    {
        return [
            'before_values' => 'array',
            'after_values' => 'array',
        ];
    }
}
