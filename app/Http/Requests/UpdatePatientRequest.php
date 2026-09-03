<?php

namespace App\Http\Requests;

class UpdatePatientRequest extends PatientRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        $patient = $this->patient();

        return $patient !== null && $this->user()?->can('update', $patient) === true;
    }
}
