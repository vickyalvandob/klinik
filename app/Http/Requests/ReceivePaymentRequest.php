<?php

namespace App\Http\Requests;

use App\PaymentMethod;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ReceivePaymentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'amount' => ['required_without:payments', Rule::prohibitedIf($this->has('payments')), 'integer', 'min:1'],
            'method' => ['required_without:payments', Rule::prohibitedIf($this->has('payments')), Rule::enum(PaymentMethod::class)],
            'reference_number' => ['nullable', 'string', 'max:100'],
            'notes' => ['nullable', 'string', 'max:1000'],
            'payment_token' => ['required_with:payments', 'uuid'],
            'payments' => ['sometimes', 'array', 'list', 'min:1', 'max:5'],
            'payments.*' => ['array:amount,method,reference_number,notes'],
            'payments.*.amount' => ['required', 'integer', 'min:1', 'max:1000000000000'],
            'payments.*.method' => ['required', Rule::enum(PaymentMethod::class)],
            'payments.*.reference_number' => ['nullable', 'string', 'max:100'],
            'payments.*.notes' => ['nullable', 'string', 'max:1000'],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'amount.required' => 'Nominal pembayaran wajib diisi.',
            'amount.integer' => 'Nominal pembayaran harus berupa Rupiah tanpa desimal.',
            'amount.min' => 'Nominal pembayaran minimal Rp1.',
            'method.required' => 'Pilih metode pembayaran.',
            'method.enum' => 'Metode pembayaran tidak valid.',
            'payments.*.amount.min' => 'Nominal pembayaran minimal Rp1.',
            'payments.*.amount.required' => 'Nominal pembayaran wajib diisi.',
            'payments.*.method.required' => 'Pilih metode pembayaran.',
            'payments.*.method.enum' => 'Metode pembayaran tidak valid.',
        ];
    }
}
