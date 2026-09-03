<?php

namespace App\Http\Middleware;

use App\Models\Clinic;
use App\Models\ClinicMembership;
use App\Models\ClinicRole;
use App\Models\Scopes\TenantScope;
use App\Models\Tenant;
use App\Support\Tenancy\CurrentClinic;
use App\Support\Tenancy\CurrentTenant;
use App\TenantStatus;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Context;
use Symfony\Component\HttpFoundation\Response;

class ResolveClinicContext
{
    public function __construct(
        private readonly CurrentTenant $currentTenant,
        private readonly CurrentClinic $currentClinic,
    ) {}

    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        abort_if($user === null, 401);

        $memberships = ClinicMembership::withoutGlobalScope(TenantScope::class)
            ->where('user_id', $user->id)
            ->where('is_active', true)
            ->orderBy('id')
            ->get();

        if ($memberships->isEmpty()) {
            if ($user->is_platform_admin) {
                return redirect()->route('platform.index');
            }

            abort(403, 'Akun belum memiliki akses ke klinik aktif.');
        }

        $selectedClinicId = $request->session()->get('current_clinic_id');
        $membership = $selectedClinicId === null
            ? $memberships->first()
            : $memberships->firstWhere('clinic_id', (int) $selectedClinicId);

        if ($membership === null) {
            $request->session()->forget('current_clinic_id');
            abort(404);
        }

        $tenant = Tenant::query()
            ->whereKey($membership->tenant_id)
            ->where('status', TenantStatus::Active->value)
            ->first();

        abort_if($tenant === null, 403, 'Tenant tidak aktif.');
        $this->currentTenant->set($tenant);

        $clinic = Clinic::withoutGlobalScope(TenantScope::class)
            ->whereKey($membership->clinic_id)
            ->where('tenant_id', $tenant->id)
            ->where('is_active', true)
            ->first();

        abort_if($clinic === null, 403, 'Klinik tidak aktif atau membership tidak valid.');

        $membership->load(['role.permissions', 'permissions']);
        $membership->setRelation('clinicRole', ClinicRole::query()
            ->where('clinic_id', $clinic->id)
            ->where('role_id', $membership->role_id)
            ->with('permissions')
            ->first());
        $this->currentClinic->set($clinic, $membership);
        $request->session()->put('current_clinic_id', $clinic->id);

        Context::addHidden('tenant_id', $tenant->id);
        Context::addHidden('clinic_id', $clinic->id);

        return $next($request);
    }
}
