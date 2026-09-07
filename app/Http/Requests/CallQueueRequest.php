<?php

namespace App\Http\Requests;

use App\Models\Encounter;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class CallQueueRequest extends FormRequest
{
    public function authorize(): bool
    {
        return ($this->user()?->can('viewAny', Encounter::class) ?? false)
            && $this->user()->hasClinicPermission('queue.view')
            && $this->user()->hasClinicPermission('encounter.update');
    }

    /** @return array<string, array<mixed>> */
    public function rules(): array
    {
        return [
            'service_unit_id' => ['required', 'uuid'],
            'stage' => ['required', Rule::in(['triage', 'doctor'])],
            'queue_id' => ['nullable', 'required_if:intent,recall', 'uuid'],
            'intent' => ['required', Rule::in(['call', 'recall'])],
            'request_key' => ['required', 'uuid'],
        ];
    }

    /** @return array<string, string> */
    public function attributes(): array
    {
        return ['service_unit_id' => 'unit layanan', 'stage' => 'tahap layanan', 'queue_id' => 'nomor antrean'];
    }
}
