<?php

use App\Http\Middleware\EnsureClinicOnboardingComplete;
use App\Http\Middleware\EnsureClinicPermission;
use App\Http\Middleware\EnsurePlatformAdmin;
use App\Http\Middleware\EnsureUserIsActive;
use App\Http\Middleware\HandleAppearance;
use App\Http\Middleware\HandleInertiaRequests;
use App\Http\Middleware\ResolveClinicContext;
use Illuminate\Contracts\Auth\Middleware\AuthenticatesRequests;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets;
use Illuminate\Http\Request;
use Illuminate\Routing\Middleware\SubstituteBindings;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->encryptCookies(except: ['appearance', 'sidebar_state']);

        $middleware->web(append: [
            HandleAppearance::class,
            HandleInertiaRequests::class,
            AddLinkHeadersForPreloadedAssets::class,
        ]);

        $middleware->alias([
            'active' => EnsureUserIsActive::class,
            'clinic.context' => ResolveClinicContext::class,
            'clinic.onboarded' => EnsureClinicOnboardingComplete::class,
            'clinic.permission' => EnsureClinicPermission::class,
            'platform' => EnsurePlatformAdmin::class,
        ]);

        $middleware->appendToPriorityList(AuthenticatesRequests::class, EnsureUserIsActive::class);
        $middleware->appendToPriorityList(EnsureUserIsActive::class, ResolveClinicContext::class);
        $middleware->prependToPriorityList(SubstituteBindings::class, ResolveClinicContext::class);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );
    })->create();
