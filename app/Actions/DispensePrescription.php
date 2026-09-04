<?php

namespace App\Actions;

use App\EncounterStatus;
use App\Models\ClinicWorkflowSetting;
use App\Models\MedicineStock;
use App\Models\Prescription;
use App\Models\PrescriptionItem;
use App\Models\StockMovement;
use App\PrescriptionStatus;
use App\StockMovementType;
use App\Support\Tenancy\CurrentClinic;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class DispensePrescription
{
    public function __construct(
        private readonly CurrentClinic $currentClinic,
        private readonly TransitionEncounter $transitionEncounter,
    ) {}

    public function execute(Prescription $prescription, int $userId): Prescription
    {
        return DB::transaction(function () use ($prescription, $userId): Prescription {
            $lockedPrescription = Prescription::query()
                ->whereKey($prescription->id)
                ->where('clinic_id', $this->currentClinic->id())
                ->lockForUpdate()
                ->firstOrFail();

            if ($lockedPrescription->status !== PrescriptionStatus::Processing) {
                throw ValidationException::withMessages([
                    'status' => 'Resep harus berstatus sedang disiapkan sebelum diserahkan.',
                ]);
            }

            $items = $lockedPrescription->items()->orderBy('medicine_id')->orderBy('id')->get();

            if ($items->isEmpty() || $items->contains(fn (PrescriptionItem $item): bool => $item->medicine_id === null)) {
                throw ValidationException::withMessages([
                    'stock' => 'Resep tidak memiliki item obat aktif yang dapat diserahkan.',
                ]);
            }

            /** @var Collection<int, MedicineStock> $stocks */
            $stocks = MedicineStock::query()
                ->where('clinic_id', $this->currentClinic->id())
                ->whereIn('medicine_id', $items->pluck('medicine_id')->all())
                ->orderBy('medicine_id')
                ->lockForUpdate()
                ->get()
                ->keyBy('medicine_id');

            $requiredByMedicine = $items
                ->groupBy('medicine_id')
                ->map(fn (Collection $rows): float => round($rows->sum(fn (PrescriptionItem $item): float => (float) $item->quantity), 2));

            foreach ($requiredByMedicine as $medicineId => $required) {
                $stock = $stocks->get((int) $medicineId);
                $itemForMedicine = $items->firstWhere('medicine_id', (int) $medicineId);
                $medicineName = $itemForMedicine->medicine_name_snapshot;
                $availableQuantity = $stock instanceof MedicineStock ? $stock->quantity : '0';

                if (! $stock instanceof MedicineStock || (float) $stock->quantity < $required) {
                    throw ValidationException::withMessages([
                        'stock' => "Stok {$medicineName} tidak mencukupi. Tersedia {$availableQuantity}.",
                    ]);
                }
            }

            foreach ($items as $item) {
                $stock = $stocks->get((int) $item->medicine_id);
                assert($stock instanceof MedicineStock);
                $beforeQuantity = (float) $stock->quantity;
                $afterQuantity = round($beforeQuantity - (float) $item->quantity, 2);
                $stock->update(['quantity' => $afterQuantity, 'last_movement_at' => now()]);

                $movement = new StockMovement([
                    'medicine_id' => $item->medicine_id,
                    'prescription_id' => $lockedPrescription->id,
                    'prescription_item_id' => $item->id,
                    'type' => StockMovementType::Dispense,
                    'quantity_change' => -((float) $item->quantity),
                    'quantity_before' => $beforeQuantity,
                    'quantity_after' => $afterQuantity,
                    'reason' => 'Penyerahan resep '.$lockedPrescription->uuid,
                    'actor_id' => $userId,
                ]);
                $movement->forceFill(['clinic_id' => $lockedPrescription->clinic_id]);
                $movement->save();
            }

            $before = $this->snapshot($lockedPrescription);
            $lockedPrescription->update([
                'status' => PrescriptionStatus::Dispensed,
                'dispensed_at' => now(),
                'dispensed_by' => $userId,
            ]);
            $this->audit($lockedPrescription, 'dispensed', $before, $userId);

            $settings = ClinicWorkflowSetting::query()
                ->where('clinic_id', $this->currentClinic->id())
                ->firstOrNew();
            $billingEnabled = $settings->exists ? $settings->billing_enabled : true;
            $this->transitionEncounter->execute(
                $lockedPrescription->encounter,
                $billingEnabled ? EncounterStatus::WaitingPayment : EncounterStatus::Completed,
                $userId,
                'Obat telah diserahkan',
            );

            return $lockedPrescription;
        }, attempts: 3);
    }

    /** @return array<string, mixed> */
    private function snapshot(Prescription $prescription): array
    {
        return $prescription->only([
            'status', 'processing_started_at', 'processing_started_by',
            'dispensed_at', 'dispensed_by', 'cancelled_at', 'cancelled_by',
            'cancellation_reason',
        ]);
    }

    /** @param array<string, mixed> $before */
    private function audit(Prescription $prescription, string $action, array $before, int $userId): void
    {
        $audit = $prescription->audits()->make([
            'action' => $action,
            'before_values' => $before,
            'after_values' => $this->snapshot($prescription),
            'actor_id' => $userId,
        ]);
        $audit->forceFill(['clinic_id' => $prescription->clinic_id]);
        $audit->save();
    }
}
