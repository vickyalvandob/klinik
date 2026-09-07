<?php

namespace App\Http\Controllers;

use App\Http\Requests\AuditLogRequest;
use App\Models\AuditEvent;
use App\Models\BillingAudit;
use App\Models\MedicalRecordAccessLog;
use App\Models\MedicalRecordAudit;
use App\Models\PrescriptionAudit;
use App\Models\TriageAudit;
use App\Support\Tenancy\CurrentClinic;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Model;
use Inertia\Inertia;
use Inertia\Response;

class AuditLogController extends Controller
{
    public function __invoke(AuditLogRequest $request, CurrentClinic $currentClinic): Response
    {
        $source = $request->string('source', 'activity')->toString();
        $model = match ($source) {
            'access' => MedicalRecordAccessLog::class, 'clinical' => MedicalRecordAudit::class,
            'triage' => TriageAudit::class, 'billing' => BillingAudit::class,
            'pharmacy' => PrescriptionAudit::class, default => AuditEvent::class,
        };
        $timezone = $currentClinic->get()->timezone;
        $rows = $model::query()->where('clinic_id', $currentClinic->id())
            ->when($request->filled('from'), fn ($query) => $query->where('created_at', '>=', CarbonImmutable::parse($request->string('from')->toString(), $timezone)->startOfDay()->utc()))
            ->when($request->filled('to'), fn ($query) => $query->where('created_at', '<', CarbonImmutable::parse($request->string('to')->toString(), $timezone)->addDay()->startOfDay()->utc()))
            ->select(['id', 'uuid', 'actor_id', 'action', 'created_at'])
            ->with('actor:id,name')->latest('id')->paginate(25)->withQueryString()
            ->through(fn (Model $row): array => [
                'uuid' => $row->getAttribute('uuid'), 'action' => $row->getAttribute('action'),
                'actor' => $row->getRelation('actor')->name ?? 'Sistem',
                'created_at' => $row->getAttribute('created_at')->toIso8601String(),
            ]);

        return Inertia::render('audit/index', [
            'logs' => $rows,
            'filters' => ['source' => $source, 'from' => $request->string('from')->toString(), 'to' => $request->string('to')->toString()],
        ]);
    }
}
