<?php

namespace App\Http\Requests;

use App\Models\Patient;

class StorePatientRequest extends PatientRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()?->can('create', Patient::class) === true;
    }
}
