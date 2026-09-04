<?php

namespace App\Http\Requests;

use App\Models\MedicalRecord;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class StoreMedicalRecordAmendmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        $medicalRecord = $this->route('medicalRecord');

        return $medicalRecord instanceof MedicalRecord
            && $this->user()?->can('amend', $medicalRecord) === true;
    }

    /** @return array<string, ValidationRule|array<mixed>|string> */
    public function rules(): array
    {
        return [
            'reason' => ['required', 'string', 'min:5', 'max:2000'],
            'content' => ['required', 'string', 'min:5', 'max:20000'],
        ];
    }

    /** @return array{reason: string, content: string} */
    public function amendmentData(): array
    {
        return [
            'reason' => $this->string('reason')->trim()->toString(),
            'content' => $this->string('content')->trim()->toString(),
        ];
    }
}
