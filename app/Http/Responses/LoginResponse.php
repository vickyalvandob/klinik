<?php

namespace App\Http\Responses;

use Laravel\Fortify\Contracts\LoginResponse as LoginResponseContract;
use Symfony\Component\HttpFoundation\Response;

final class LoginResponse implements LoginResponseContract
{
    public function toResponse($request): Response
    {
        if ($request->wantsJson()) {
            return response()->json(['two_factor' => false]);
        }

        $destination = $request->user()->is_platform_admin
            ? route('platform.index', absolute: false)
            : route('dashboard', absolute: false);

        return redirect()->intended($destination);
    }
}
