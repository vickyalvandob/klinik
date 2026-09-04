<?php

test('guests are redirected to the login page', function () {
    $response = $this->get(route('dashboard'));
    $response->assertRedirect(route('login'));
});

test('authenticated users can visit the dashboard', function () {
    ['user' => $user, 'clinic' => $clinic] = createClinicUser();
    $this->actingAs($user);

    $response = $this->get(route('dashboard'));
    $response->assertOk()->assertInertia(fn ($page) => $page
        ->component('today/index')
        ->where('auth.user.id', $user->id)
        ->where('currentClinic.uuid', $clinic->uuid)
    );
});
