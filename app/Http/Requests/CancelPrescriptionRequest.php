<?php

namespace App\Http\Requests;

use App\Models\Prescription;
use Illuminate\Foundation\Http\FormRequest;

class CancelPrescriptionRequest extends FormRequest
{
    public function authorize(): bool
    {
        $prescription = $this->route('prescription');

        return $prescription instanceof Prescription
            && ($this->user()?->can('cancel', $prescription) ?? false);
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, array<int, string>>
     */
    public function rules(): array
    {
        return [
            'reason' => ['required', 'string', 'min:10', 'max:2000'],
        ];
    }

    public function reason(): string
    {
        return $this->string('reason')->trim()->toString();
    }

    /** @return array<string, string> */
    public function attributes(): array
    {
        return ['reason' => 'alasan pembatalan'];
    }
}
