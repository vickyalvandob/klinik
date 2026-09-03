<?php

namespace App\Support\Tenancy;

use App\Models\Tenant;
use LogicException;

final class CurrentTenant
{
    private ?Tenant $tenant = null;

    public function set(Tenant $tenant): void
    {
        $this->tenant = $tenant;
    }

    public function get(): Tenant
    {
        return $this->tenant
            ?? throw new LogicException('Tenant context has not been resolved.');
    }

    public function id(): int
    {
        return $this->get()->id;
    }

    public function isResolved(): bool
    {
        return $this->tenant !== null;
    }

    public function clear(): void
    {
        $this->tenant = null;
    }
}
