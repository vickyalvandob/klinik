<?php

use App\Models\Clinic;
use App\Models\ClinicMembership;
use App\Models\Scopes\TenantScope;
use App\Models\Tenant;
use App\Models\User;
use App\SystemRole;
use Laravel\Fortify\Features;

beforeEach(function () {
    $this->skipUnlessFortifyHas(Features::registration());
});

test('registration screen can be rendered', function () {
    $response = $this->get(route('register'));

    $response->assertOk();
});

test('new users can register', function () {
    $response = $this->post(route('register.store'), [
        'name' => 'Test User',
        'email' => 'test@example.com',
        'password' => 'password',
        'password_confirmation' => 'password',
    ]);

    $this->assertAuthenticated();
    $response->assertRedirect(route('dashboard', absolute: false));

    $user = User::query()->where('email', 'test@example.com')->firstOrFail();
    $membership = ClinicMembership::withoutGlobalScopes()
        ->where('user_id', $user->id)
        ->firstOrFail();
    $clinic = Clinic::withoutGlobalScope(TenantScope::class)->findOrFail($membership->clinic_id);

    expect($membership->tenant_id)->toBe($clinic->tenant_id)
        ->and($membership->role->code)->toBe(SystemRole::OwnerAdmin->value)
        ->and($clinic->name)->toBe('Klinik Test User')
        ->and(Tenant::query()->whereKey($membership->tenant_id)->exists())->toBeTrue();
});

test('registration ignores tenant and platform privileges submitted by the browser', function () {
    $foreignTenant = Tenant::factory()->create();

    $this->post(route('register.store'), [
        'name' => 'Untrusted Input',
        'email' => 'untrusted@example.com',
        'password' => 'password',
        'password_confirmation' => 'password',
        'tenant_id' => $foreignTenant->id,
        'is_platform_admin' => true,
    ])->assertRedirect(route('dashboard', absolute: false));

    $user = User::query()->where('email', 'untrusted@example.com')->firstOrFail();
    $membership = ClinicMembership::withoutGlobalScopes()
        ->where('user_id', $user->id)
        ->firstOrFail();

    expect($membership->tenant_id)->not->toBe($foreignTenant->id)
        ->and($user->is_platform_admin)->toBeFalse();
});
