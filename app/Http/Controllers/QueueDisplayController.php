<?php

namespace App\Http\Controllers;

use App\Models\Clinic;
use App\Models\Scopes\TenantScope;
use App\Services\QueueBoard;
use App\TenantStatus;
use Illuminate\Database\Eloquent\Builder;
use Inertia\Inertia;
use Inertia\Response;

class QueueDisplayController extends Controller
{
    public function __invoke(string $clinicUuid, QueueBoard $board): Response
    {
        $clinic = Clinic::query()->withoutGlobalScope(TenantScope::class)
            ->where('uuid', $clinicUuid)->where('is_active', true)
            ->whereNotNull('onboarding_completed_at')
            ->whereHas('tenant', fn (Builder $query) => $query->where('status', TenantStatus::Active))
            ->firstOrFail();

        return Inertia::render('queues/display', [
            'board' => fn (): array => $board->snapshot($clinic),
        ]);
    }
}
