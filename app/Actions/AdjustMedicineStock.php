<?php

namespace App\Actions;

use App\Models\Medicine;
use App\Models\MedicineStock;
use App\Models\StockMovement;
use App\StockMovementType;
use App\Support\Tenancy\CurrentClinic;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class AdjustMedicineStock
{
    public function __construct(private readonly CurrentClinic $currentClinic) {}

    public function execute(Medicine $medicine, float $quantityChange, string $reason, int $userId): MedicineStock
    {
        return DB::transaction(function () use ($medicine, $quantityChange, $reason, $userId): MedicineStock {
            $lockedMedicine = Medicine::query()
                ->whereKey($medicine->id)
                ->where('clinic_id', $this->currentClinic->id())
                ->lockForUpdate()
                ->firstOrFail();
            $stock = MedicineStock::query()
                ->where('medicine_id', $lockedMedicine->id)
                ->lockForUpdate()
                ->first();

            if ($stock === null) {
                $stock = new MedicineStock(['medicine_id' => $lockedMedicine->id, 'quantity' => 0]);
                $stock->forceFill(['clinic_id' => $lockedMedicine->clinic_id]);
                $stock->save();
            }

            $beforeQuantity = (float) $stock->quantity;
            $afterQuantity = round($beforeQuantity + $quantityChange, 2);

            if ($afterQuantity < 0) {
                throw ValidationException::withMessages([
                    'quantity_change' => 'Penyesuaian tidak boleh membuat stok menjadi negatif.',
                ]);
            }

            $stock->update(['quantity' => $afterQuantity, 'last_movement_at' => now()]);
            $movement = new StockMovement([
                'medicine_id' => $lockedMedicine->id,
                'type' => StockMovementType::Adjustment,
                'quantity_change' => $quantityChange,
                'quantity_before' => $beforeQuantity,
                'quantity_after' => $afterQuantity,
                'reason' => $reason,
                'actor_id' => $userId,
            ]);
            $movement->forceFill(['clinic_id' => $lockedMedicine->clinic_id]);
            $movement->save();

            return $stock;
        }, attempts: 3);
    }
}
