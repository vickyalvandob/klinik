<?php

namespace App\Support;

use App\Models\Encounter;
use App\Models\Practitioner;
use App\Support\Tenancy\CurrentClinic;
use App\SystemRole;

class CurrentPractitioner
{
    public function __construct(private readonly CurrentClinic $currentClinic) {}

    public function canManage(Encounter $encounter): bool
    {
        $membership = $this->currentClinic->membership();

        if (! $membership->is_active || $encounter->clinic_id !== $this->currentClinic->id()
            || $encounter->tenant_id !== $membership->tenant_id) {
            return false;
        }

        if ($membership->role->code === SystemRole::OwnerAdmin->value) {
            return true;
        }

        $practitioner = $this->find();

        return $practitioner !== null && $practitioner->id === $encounter->practitioner_id;
    }

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
