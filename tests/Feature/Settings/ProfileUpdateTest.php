<?php

use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

test('profile page is displayed', function () {
    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->get(route('profile.edit'));

    $response->assertOk();
});

test('profile information can be updated', function () {
    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->patch(route('profile.update'), [
            'name' => 'Test User',
            'email' => 'test@example.com',
        ]);

    $response
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('profile.edit'));

    $user->refresh();

    expect($user->name)->toBe('Test User');
    expect($user->email)->toBe('test@example.com');
    expect($user->email_verified_at)->toBeNull();
});

test('email verification status is unchanged when the email address is unchanged', function () {
    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->patch(route('profile.update'), [
            'name' => 'Test User',
            'email' => $user->email,
        ]);

    $response
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('profile.edit'));

    expect($user->refresh()->email_verified_at)->not->toBeNull();
});

test('account deletion is unavailable even with the correct password', function () {
    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->delete(route('profile.edit'), [
            'password' => 'password',
        ]);

    $response->assertMethodNotAllowed();

    $this->assertAuthenticatedAs($user);
    $this->assertModelExists($user);
});

test('account deletion cannot remove an owner or clinic membership', function () {
    $context = createClinicUser();

    $response = $this
        ->actingAs($context['user'])
        ->delete(route('profile.edit'), ['password' => 'password']);

    $response->assertMethodNotAllowed();

    $this->assertModelExists($context['user']);
    $this->assertModelExists($context['membership']);
    $this->assertModelExists($context['clinic']);
});

test('updated profile is shared on the next navigation without a page reload', function () {
    $context = createClinicUser();

    $this->actingAs($context['user'])->patch(route('profile.update'), [
        'name' => 'Nama Baru',
        'email' => 'nama.baru@example.test',
    ])->assertSessionHasNoErrors();

    $this->get(route('appearance.edit'))->assertInertia(fn (Assert $page) => $page
        ->where('auth.user.name', 'Nama Baru')
        ->where('auth.user.email', 'nama.baru@example.test')
        ->where('currentClinic.uuid', $context['clinic']->uuid));
});
