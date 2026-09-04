<?php

namespace App\Support;

use App\Models\Practitioner;
use App\Support\Tenancy\CurrentClinic;

class CurrentPractitioner
{
    public function __construct(private readonly CurrentClinic $currentClinic) {}

    public function find(): ?Practitioner
    {
        $staffProfileId = $this->currentClinic->membership()->staff_profile_id;

        if ($staffProfileId === null) {
            return null;
        }

        return Practitioner::query()
            ->where('clinic_id', $this->currentClinic->id())
            ->where('staff_profile_id', $staffProfileId)
            ->where('is_active', true)
            ->first();
    }
}
