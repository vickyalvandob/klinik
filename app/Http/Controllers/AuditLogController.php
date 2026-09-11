<?php

namespace App\Http\Controllers;

use App\Http\Requests\AuditLogRequest;
use App\Models\AuditEvent;
use App\Models\BillingAudit;
use App\Models\MedicalRecordAccessLog;
use App\Models\MedicalRecordAudit;
use App\Models\PrescriptionAudit;
use App\Models\TriageAudit;
use App\Support\AuditLogCatalog;
use App\Support\Tenancy\CurrentClinic;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Pagination\Paginator;
use Illuminate\Support\Str;
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
        $today = CarbonImmutable::now($timezone);
        $filters = [
            'source' => $source,
            'from' => $request->string('from')->toString(),
            'to' => $request->string('to')->toString(),
            'search' => trim($request->string('search')->toString()),
            'action' => $request->string('action')->toString(),
        ];

        return Inertia::render('audit/index', [
            'logs' => function () use ($model, $currentClinic, $source, $filters, $timezone): Paginator {
                $search = $filters['search'];
                $matchingActions = array_keys(array_filter(
                    AuditLogCatalog::actions($source),
                    fn (string $label): bool => Str::contains(Str::lower($label), Str::lower($search)),
                ));

                return $model::query()->where('clinic_id', $currentClinic->id())
                    ->when($filters['from'] !== '', fn ($query) => $query->where('created_at', '>=', CarbonImmutable::parse($filters['from'], $timezone)->startOfDay()->setTimezone(config('app.timezone'))))
                    ->when($filters['to'] !== '', fn ($query) => $query->where('created_at', '<', CarbonImmutable::parse($filters['to'], $timezone)->addDay()->startOfDay()->setTimezone(config('app.timezone'))))
                    ->when($filters['action'] !== '', fn ($query) => $query->where('action', $filters['action']))
                    ->when($search !== '', fn ($query) => $query->where(function ($query) use ($search, $matchingActions): void {
                        $query->whereLike('action', '%'.$search.'%')
                            ->orWhere('uuid', $search)
                            ->orWhereIn('action', $matchingActions)
                            ->orWhereHas('actor', fn ($actor) => $actor->whereLike('name', '%'.$search.'%'));
                        if (Str::contains('sistem', Str::lower($search))) {
                            $query->orWhereNull('actor_id');
                        }
                    }))
                    ->select(['id', 'uuid', 'actor_id', 'action', 'created_at', ...($source === 'activity' ? ['status_code'] : [])])
                    ->with('actor:id,name')->latest('created_at')->latest('id')
                    ->simplePaginate(25)->appends($filters)
                    ->through(fn (Model $row): array => [
                        'uuid' => $row->getAttribute('uuid'),
                        'action' => $row->getAttribute('action'),
                        'label' => AuditLogCatalog::label($source, $row->getAttribute('action')),
                        'actor' => $row->getRelation('actor')->name ?? 'Sistem',
                        'created_at' => $row->getAttribute('created_at')->toIso8601String(),
                        'status_code' => $source === 'activity' ? $row->getAttribute('status_code') : null,
                    ]);
            },
            'filters' => $filters,
            'actions' => fn (): array => collect(AuditLogCatalog::actions($source))
                ->map(fn (string $label, string $value): array => compact('value', 'label'))->values()->all(),
            'today' => $today->toDateString(),
            'periods' => [
                ['label' => 'Hari ini', 'from' => $today->toDateString(), 'to' => $today->toDateString()],
                ['label' => '7 hari terakhir', 'from' => $today->subDays(6)->toDateString(), 'to' => $today->toDateString()],
                ['label' => 'Bulan ini', 'from' => $today->startOfMonth()->toDateString(), 'to' => $today->toDateString()],
            ],
            'timezone' => $timezone,
        ]);
    }
}
