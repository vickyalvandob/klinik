<?php

namespace App\Http\Middleware;

use App\Support\Tenancy\CurrentClinic;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureClinicOnboardingComplete
{
    public function __construct(private readonly CurrentClinic $currentClinic) {}

    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        if ($this->currentClinic->get()->hasCompletedOnboarding()) {
            return $next($request);
        }

        if ($request->user()?->hasClinicPermission('clinic.manage') === true) {
            return redirect()->route('onboarding.show');
        }

        abort(403, 'Klinik belum menyelesaikan proses onboarding.');
    }
}
