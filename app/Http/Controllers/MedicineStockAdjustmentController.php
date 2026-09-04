<?php

namespace App\Http\Controllers;

use App\Actions\AdjustMedicineStock;
use App\Http\Requests\AdjustMedicineStockRequest;
use App\Models\Medicine;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;

class MedicineStockAdjustmentController extends Controller
{
    public function __invoke(AdjustMedicineStockRequest $request, Medicine $medicine, AdjustMedicineStock $adjust): RedirectResponse
    {
        $adjust->execute(
            $medicine,
            $request->quantityChange(),
            $request->reason(),
            (int) $request->user()->id,
        );
        Inertia::flash('toast', ['type' => 'success', 'message' => 'Stok obat berhasil disesuaikan dan dicatat.']);

        return to_route('pharmacy.index', ['mode' => 'stock']);
    }
}
