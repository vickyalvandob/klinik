<?php

use Inertia\Testing\AssertableInertia as Assert;

test('home page presents the clinic application', function () {
    $response = $this->get(route('home'));

    $response->assertOk()->assertInertia(fn (Assert $page) => $page
        ->component('welcome')
        ->where('auth.user', null)
    );
});

test('application defaults to the Jakarta operational timezone', function () {
    expect(config('app.timezone'))->toBe('Asia/Jakarta');
});
