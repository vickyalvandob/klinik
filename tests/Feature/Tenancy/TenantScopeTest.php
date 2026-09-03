<?php

use App\Models\Clinic;
use App\Models\Tenant;
use App\Support\Tenancy\CurrentTenant;

test('tenant-owned queries fail closed without a resolved tenant', function () {
    $tenant = Tenant::factory()->create();
    Clinic::factory()->for($tenant)->create();

    expect(Clinic::query()->count())->toBe(0);
});

test('tenant-owned queries return only rows from the resolved tenant', function () {
    $tenantA = Tenant::factory()->create();
    $tenantB = Tenant::factory()->create();
    $tenantAClinic = Clinic::factory()->for($tenantA)->create();
    Clinic::factory()->for($tenantB)->create();

    app(CurrentTenant::class)->set($tenantA);

    $clinics = Clinic::query()->get();

    expect($clinics)->toHaveCount(1)
        ->and($clinics->first()->uuid)->toBe($tenantAClinic->uuid);
});

test('resolved tenant overrides a tenant id assigned during model creation', function () {
    $tenantA = Tenant::factory()->create();
    $tenantB = Tenant::factory()->create();
    app(CurrentTenant::class)->set($tenantA);

    $clinic = Clinic::factory()->for($tenantB)->create();

    expect($clinic->tenant_id)->toBe($tenantA->id);
});
