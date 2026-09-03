<?php

namespace App\Http\Controllers\Platform;

use App\Http\Controllers\Controller;
use App\Models\Clinic;
use App\Models\Scopes\TenantScope;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    /**
     * Handle the incoming request.
     */
    public function __invoke(): Response
    {
        Gate::authorize('viewAny', Tenant::class);

        return Inertia::render('platform/dashboard', [
            'summary' => [
                'tenants' => Tenant::query()->count(),
                'active_clinics' => Clinic::withoutGlobalScope(TenantScope::class)
                    ->where('is_active', true)
                    ->count(),
                'active_users' => User::query()->where('is_active', true)->count(),
            ],
            'tenants' => Tenant::query()
                ->select(['id', 'uuid', 'name', 'slug', 'status', 'trial_ends_at', 'created_at'])
                ->latest('id')
                ->limit(10)
                ->get()
                ->map(fn (Tenant $tenant): array => [
                    'uuid' => $tenant->uuid,
                    'name' => $tenant->name,
                    'slug' => $tenant->slug,
                    'status' => $tenant->status->value,
                    'trial_ends_at' => $tenant->trial_ends_at?->toIso8601String(),
                ]),
        ]);
    }
}
