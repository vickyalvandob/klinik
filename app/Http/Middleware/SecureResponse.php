<?php

namespace App\Http\Middleware;

use App\Models\AuditEvent;
use App\Support\Tenancy\CurrentClinic;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

class SecureResponse
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $requestId = (string) Str::uuid();
        $request->attributes->set('request_id', $requestId);
        $startedAt = hrtime(true);
        $response = $next($request);
        $response->headers->set('X-Request-ID', $requestId);
        $response->headers->set('X-Content-Type-Options', 'nosniff');
        $response->headers->set('X-Frame-Options', 'SAMEORIGIN');
        $response->headers->set('Referrer-Policy', 'same-origin');
        $response->headers->set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
        if ($request->isSecure() && app()->isProduction()) {
            $response->headers->set('Strict-Transport-Security', 'max-age=31536000');
        }
        if ($request->user() !== null || $request->routeIs('queue-display.show')) {
            $response->headers->set('Cache-Control', 'private, no-store, max-age=0');
        }

        $clinic = app(CurrentClinic::class);
        if ($clinic->isResolved() && $request->user() !== null
            && (! $request->isMethodSafe() || $request->routeIs('reports.export') || $response->getStatusCode() >= 400)) {
            $event = new AuditEvent([
                'actor_id' => $request->user()->id,
                'action' => $request->route()?->getName() ?? 'request',
                'status_code' => $response->getStatusCode(), 'request_id' => $requestId,
            ]);
            $event->forceFill(['clinic_id' => $clinic->id()])->save();
        }

        $duration = (int) ((hrtime(true) - $startedAt) / 1_000_000);
        if ($duration >= config('clinic-security.slow_request_ms', 2000)) {
            Log::warning('clinic.slow_request', [
                'request_id' => $requestId, 'route' => $request->route()?->getName(),
                'duration_ms' => $duration, 'status' => $response->getStatusCode(),
            ]);
        }

        return $response;
    }
}
