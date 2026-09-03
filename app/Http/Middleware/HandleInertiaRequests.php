<?php

namespace App\Http\Middleware;

use App\Support\Tenancy\CurrentClinic;
use App\Support\Tenancy\CurrentTenant;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        $currentTenant = app(CurrentTenant::class);
        $currentClinic = app(CurrentClinic::class);

        return [
            ...parent::share($request),
            'name' => config('app.name'),
            'auth' => [
                'user' => fn (): ?array => $request->user()?->only([
                    'id', 'uuid', 'name', 'email', 'email_verified_at',
                    'is_active', 'is_platform_admin', 'created_at', 'updated_at',
                ]),
            ],
            'currentTenant' => fn (): ?array => $currentTenant->isResolved() ? [
                'uuid' => $currentTenant->get()->uuid,
                'name' => $currentTenant->get()->name,
                'slug' => $currentTenant->get()->slug,
                'status' => $currentTenant->get()->status->value,
            ] : null,
            'currentClinic' => fn (): ?array => $currentClinic->isResolved() ? [
                'uuid' => $currentClinic->get()->uuid,
                'name' => $currentClinic->get()->name,
                'timezone' => $currentClinic->get()->timezone,
            ] : null,
            'currentMembership' => fn (): ?array => $currentClinic->isResolved() ? [
                'role' => [
                    'code' => $currentClinic->membership()->role->code,
                    'name' => $currentClinic->membership()->role->name,
                ],
                'permissions' => $currentClinic->membership()->role->permissions
                    ->merge($currentClinic->membership()->permissions)
                    ->pluck('key')
                    ->unique()
                    ->values()
                    ->all(),
            ] : null,
            'sidebarOpen' => ! $request->hasCookie('sidebar_state') || $request->cookie('sidebar_state') === 'true',
        ];
    }
}
