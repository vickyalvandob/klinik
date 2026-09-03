<?php

use App\Models\User;

test('guests are redirected from the platform area to login', function () {
    $this->get(route('platform.index'))->assertRedirect(route('login'));
});

test('clinic users cannot access the platform area', function () {
    ['user' => $user] = createClinicUser();

    $this->actingAs($user)->get(route('platform.index'))->assertForbidden();
});

test('platform admins can view tenant metadata and clinic summaries', function () {
    $platformAdmin = User::factory()->platformAdmin()->create();
    ['tenant' => $tenant, 'clinic' => $clinic] = createClinicUser();

    $this->actingAs($platformAdmin)
        ->get(route('platform.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('platform/dashboard')
            ->where('summary.tenants', 1)
            ->where('tenants.0.uuid', $tenant->uuid)
        );

    $this->actingAs($platformAdmin)
        ->get(route('platform.tenants.show', $tenant))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('platform/tenants/show')
            ->where('tenant.uuid', $tenant->uuid)
            ->where('clinics.0.uuid', $clinic->uuid)
            ->missing('medical_records')
        );
});

test('platform admins without clinic memberships are redirected away from tenant operations', function () {
    $platformAdmin = User::factory()->platformAdmin()->create();

    $this->actingAs($platformAdmin)
        ->get(route('dashboard'))
        ->assertRedirect(route('platform.index'));
});

test('promotion command grants platform access only to an existing account', function () {
    $user = User::factory()->create(['email' => 'admin@example.com']);

    $this->artisan('platform:promote-admin', ['email' => 'ADMIN@example.com'])
        ->expectsOutput('admin@example.com sekarang memiliki akses Platform Admin.')
        ->assertSuccessful();

    expect($user->refresh()->is_platform_admin)->toBeTrue();

    $this->artisan('platform:promote-admin', ['email' => 'missing@example.com'])
        ->expectsOutput('Akun tidak ditemukan. Buat akun pengguna terlebih dahulu.')
        ->assertFailed();
});
