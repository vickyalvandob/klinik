<?php

namespace App\Http\Requests;

use App\Models\Medicine;
use App\Models\Prescription;
use App\Support\Tenancy\CurrentClinic;
use Illuminate\Foundation\Http\FormRequest;

class AdjustMedicineStockRequest extends FormRequest
{
    public function authorize(): bool
    {
        $medicine = $this->route('medicine');

        return $medicine instanceof Medicine
            && $medicine->clinic_id === app(CurrentClinic::class)->id()
            && ($this->user()?->can('adjustStock', Prescription::class) ?? false);
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, array<int, string>>
     */
    public function rules(): array
    {
        return [
            'quantity_change' => ['required', 'numeric', 'not_in:0', 'between:-999999999,999999999'],
            'reason' => ['required', 'string', 'min:5', 'max:2000'],
        ];
    }

    public function quantityChange(): float
    {
        return (float) $this->validated('quantity_change');
    }

    public function reason(): string
    {
        return $this->string('reason')->trim()->toString();
    }

    /** @return array<string, string> */
    public function attributes(): array
    {
        return [
            'quantity_change' => 'perubahan stok',
            'reason' => 'alasan penyesuaian',
        ];
    }
}
