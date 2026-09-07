<?php

namespace App\Http\Requests;

use App\Models\Encounter;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class QueueIndexRequest extends FormRequest
{
    public function authorize(): bool
    {
        return ($this->user()?->can('viewAny', Encounter::class) ?? false)
            && $this->user()->hasClinicPermission('queue.view');
    }

    /** @return array<string, array<mixed>> */
    public function rules(): array
    {
        return [
            'service_unit' => ['nullable', 'uuid'],
            'stage' => ['nullable', Rule::in(['triage', 'doctor'])],
            'page' => ['nullable', 'integer', 'min:1'],
        ];
    }
}
