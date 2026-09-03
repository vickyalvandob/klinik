<?php

namespace App\Http\Controllers\Platform;

use App\Http\Controllers\Controller;
use App\Models\Clinic;
use App\Models\Scopes\TenantScope;
use App\Models\Tenant;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class TenantController extends Controller
{
    public function show(Tenant $tenant): Response
    {
        Gate::authorize('view', $tenant);

        $clinics = Clinic::withoutGlobalScope(TenantScope::class)
            ->where('tenant_id', $tenant->id)
            ->orderBy('name')
            ->get(['uuid', 'name', 'facility_type', 'email', 'phone', 'is_active']);

        return Inertia::render('platform/tenants/show', [
            'tenant' => [
                'uuid' => $tenant->uuid,
                'name' => $tenant->name,
                'slug' => $tenant->slug,
                'status' => $tenant->status->value,
                'trial_ends_at' => $tenant->trial_ends_at?->toIso8601String(),
            ],
            'clinics' => $clinics,
        ]);
    }
}
