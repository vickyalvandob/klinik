<?php

namespace App\Support\Tenancy;

use App\Models\Clinic;
use App\Models\ClinicMembership;
use LogicException;

final class CurrentClinic
{
    private ?Clinic $clinic = null;

    private ?ClinicMembership $membership = null;

    public function set(Clinic $clinic, ClinicMembership $membership): void
    {
        $this->clinic = $clinic;
        $this->membership = $membership;
    }

    public function get(): Clinic
    {
        return $this->clinic
            ?? throw new LogicException('Clinic context has not been resolved.');
    }

    public function membership(): ClinicMembership
    {
        return $this->membership
            ?? throw new LogicException('Clinic membership has not been resolved.');
    }

    public function id(): int
    {
        return $this->get()->id;
    }

    public function isResolved(): bool
    {
        return $this->clinic !== null && $this->membership !== null;
    }

    public function clear(): void
    {
        $this->clinic = null;
        $this->membership = null;
    }
}
