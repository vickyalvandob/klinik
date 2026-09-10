<?php

namespace App\Http\Controllers;

use App\Http\Requests\PharmacyIndexRequest;
use App\Models\Medicine;
use App\Models\MedicineStock;
use App\Models\Prescription;
use App\Models\PrescriptionItem;
use App\Models\User;
use App\PrescriptionStatus;
use App\Support\Tenancy\CurrentClinic;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class PharmacyController extends Controller
{
    public function __construct(private readonly CurrentClinic $currentClinic) {}

    public function index(PharmacyIndexRequest $request): Response
    {
        $mode = match ($request->string('mode')->toString()) {
            'processing' => 'processing',
            'history' => 'history',
            'stock' => 'stock',
            default => 'new',
        };
        $search = $request->string('search')->trim()->toString();
        $today = now($this->currentClinic->get()->timezone)->toDateString();
        $date = $mode === 'history' ? ($request->validated('date') ?? $today) : '';
        $stockStatus = $request->string('stock_status', 'all')->toString() ?: 'all';
        $prescriptions = null;
        $stocks = null;

        if ($mode === 'stock') {
            $stocks = fn (): array => Medicine::query()
                ->where('clinic_id', $this->currentClinic->id())
                ->select(['id', 'uuid', 'code', 'name', 'generic_name', 'strength', 'unit', 'minimum_stock', 'is_active'])
                ->with('stock:id,medicine_id,quantity,last_movement_at')
                ->when($stockStatus === 'inactive', fn (Builder $query) => $query->where('is_active', false))
                ->when(in_array($stockStatus, ['low', 'empty'], true), function (Builder $query) use ($stockStatus): void {
                    $query->where('is_active', true)->where(function (Builder $query) use ($stockStatus): void {
                        $query->whereDoesntHave('stock')->orWhereHas('stock', function (Builder $stock) use ($stockStatus): void {
                            if ($stockStatus === 'empty') {
                                $stock->where('quantity', '<=', 0);
                            } else {
                                $stock->whereColumn('medicine_stocks.quantity', '<=', 'medicines.minimum_stock');
                            }
                        });
                    });
                })
                ->when($search !== '', fn (Builder $query) => $query->where(function (Builder $query) use ($search): void {
                    $query->where('name', 'like', "%{$search}%")
                        ->orWhere('code', 'like', "%{$search}%")
                        ->orWhere('generic_name', 'like', "%{$search}%");
                }))
                ->orderBy('name')
                ->orderBy('id')
                ->paginate(20)
                ->withQueryString()
                ->through(function (Medicine $medicine): array {
                    $stock = $medicine->getRelation('stock');

                    return [
                        'uuid' => $medicine->uuid,
                        'code' => $medicine->code,
                        'name' => $medicine->name,
                        'generic_name' => $medicine->generic_name,
                        'strength' => $medicine->strength,
                        'unit' => $medicine->unit,
                        'minimum_stock' => $medicine->minimum_stock,
                        'quantity' => $stock instanceof MedicineStock ? $stock->quantity : '0.00',
                        'last_movement_at' => $stock instanceof MedicineStock
                            ? $stock->last_movement_at?->toIso8601String()
                            : null,
                        'is_active' => $medicine->is_active,
                    ];
                })->toArray();
        } else {
            $statuses = match ($mode) {
                'processing' => [PrescriptionStatus::Processing->value],
                'history' => [PrescriptionStatus::Dispensed->value, PrescriptionStatus::Cancelled->value],
                default => [PrescriptionStatus::Prescribed->value],
            };
            $prescriptions = fn (): array => Prescription::query()
                ->where('clinic_id', $this->currentClinic->id())
                ->select(['id', 'uuid', 'patient_id', 'practitioner_id', 'encounter_id', 'status', 'prescribed_at', 'processing_started_at', 'dispensed_at', 'cancelled_at'])
                ->whereIn('status', $statuses)
                ->with([
                    'patient:id,uuid,medical_record_number,name',
                    'practitioner:id,staff_profile_id',
                    'practitioner.staffProfile:id,name',
                    'encounter:id,uuid,registration_number',
                ])
                ->withCount('items')
                ->when($date !== '', function (Builder $query) use ($date): void {
                    $start = Carbon::parse($date, $this->currentClinic->get()->timezone)->startOfDay();
                    $end = $start->copy()->addDay()->setTimezone(config('app.timezone'));
                    $start->setTimezone(config('app.timezone'));
                    $query->where(function (Builder $query) use ($start, $end): void {
                        $query->where(fn (Builder $query) => $query->where('dispensed_at', '>=', $start)->where('dispensed_at', '<', $end))
                            ->orWhere(fn (Builder $query) => $query->where('cancelled_at', '>=', $start)->where('cancelled_at', '<', $end));
                    });
                })
                ->when($search !== '', fn (Builder $query) => $query->where(function (Builder $query) use ($search): void {
                    $query->whereHas('patient', fn (Builder $patient) => $patient
                        ->where('name', 'like', "%{$search}%")
                        ->orWhere('medical_record_number', 'like', "%{$search}%"))
                        ->orWhereHas('encounter', fn (Builder $encounter) => $encounter
                            ->where('registration_number', 'like', "%{$search}%"));
                }))
                ->when($mode === 'history',
                    fn (Builder $query) => $query->orderByRaw('COALESCE(dispensed_at, cancelled_at) DESC')->orderByDesc('id'),
                    fn (Builder $query) => $query->orderBy('prescribed_at')->orderBy('id'))
                ->paginate(20)
                ->withQueryString()
                ->through(fn (Prescription $prescription): array => [
                    'uuid' => $prescription->uuid,
                    'status' => $prescription->status->value,
                    'status_label' => $prescription->status->label(),
                    'prescribed_at' => $prescription->prescribed_at?->toIso8601String(),
                    'processing_started_at' => $prescription->processing_started_at?->toIso8601String(),
                    'dispensed_at' => $prescription->dispensed_at?->toIso8601String(),
                    'cancelled_at' => $prescription->cancelled_at?->toIso8601String(),
                    'items_count' => $prescription->items_count,
                    'patient' => [
                        'name' => $prescription->patient->name,
                        'medical_record_number' => $prescription->patient->medical_record_number,
                    ],
                    'doctor' => $prescription->practitioner->staffProfile->name,
                    'registration_number' => $prescription->encounter->registration_number,
                ])->toArray();
        }

        return Inertia::render('pharmacy/index', [
            'mode' => $mode,
            'search' => $search,
            'date' => $date,
            'today' => $today,
            'stockStatus' => $stockStatus,
            'timezone' => $this->currentClinic->get()->timezone,
            'can' => ['adjust_stock' => Gate::allows('adjustStock', Prescription::class)],
            'prescriptions' => $prescriptions,
            'stocks' => $stocks,
            'summary' => function (): array {
                $counts = Prescription::query()->where('clinic_id', $this->currentClinic->id())
                    ->whereIn('status', [PrescriptionStatus::Prescribed->value, PrescriptionStatus::Processing->value])
                    ->selectRaw('status, COUNT(*) as total')->groupBy('status')->toBase()->pluck('total', 'status');

                return [
                    'new' => (int) $counts->get(PrescriptionStatus::Prescribed->value, 0),
                    'processing' => (int) $counts->get(PrescriptionStatus::Processing->value, 0),
                    'low_stock' => Medicine::query()
                        ->where('clinic_id', $this->currentClinic->id())
                        ->where('is_active', true)
                        ->where(function (Builder $query): void {
                            $query->whereDoesntHave('stock')
                                ->orWhereHas('stock', fn (Builder $stock) => $stock
                                    ->whereColumn('medicine_stocks.quantity', '<=', 'medicines.minimum_stock'));
                        })->count(),
                ];
            },
        ]);
    }

    public function show(PharmacyIndexRequest $request, Prescription $prescription): Response
    {
        Gate::authorize('view', $prescription);

        $prescription->load([
            'patient:id,uuid,medical_record_number,name,birth_date,gender',
            'practitioner:id,staff_profile_id,specialization',
            'practitioner.staffProfile:id,name',
            'encounter:id,uuid,registration_number,status',
            'items.medicine:id',
            'items.medicine.stock:id,medicine_id,quantity',
            'audits' => fn ($query) => $query->select(['id', 'prescription_id', 'actor_id', 'action', 'created_at'])->with('actor:id,name')->oldest(),
        ]);

        $requiredByMedicine = $prescription->items->groupBy('medicine_id')
            ->map(fn (Collection $items): float => round($items->sum(fn (PrescriptionItem $item): float => (float) $item->quantity), 2));

        return Inertia::render('pharmacy/show', [
            'timezone' => $this->currentClinic->get()->timezone,
            'returnFilters' => [
                ...$request->safe()->only(['search', 'date', 'page']),
                'mode' => $request->validated('mode') ?? match ($prescription->status) {
                    PrescriptionStatus::Processing => 'processing',
                    PrescriptionStatus::Dispensed, PrescriptionStatus::Cancelled => 'history',
                    default => 'new',
                },
            ],
            'prescription' => [
                'uuid' => $prescription->uuid,
                'status' => $prescription->status->value,
                'status_label' => $prescription->status->label(),
                'prescribed_at' => $prescription->prescribed_at?->toIso8601String(),
                'processing_started_at' => $prescription->processing_started_at?->toIso8601String(),
                'dispensed_at' => $prescription->dispensed_at?->toIso8601String(),
                'cancelled_at' => $prescription->cancelled_at?->toIso8601String(),
                'cancellation_reason' => $prescription->cancellation_reason,
                'notes' => $prescription->notes,
                'encounter' => [
                    'registration_number' => $prescription->encounter->registration_number,
                    'status' => $prescription->encounter->status->value,
                ],
                'patient' => [
                    'name' => $prescription->patient->name,
                    'medical_record_number' => $prescription->patient->medical_record_number,
                    'birth_date' => $prescription->patient->birth_date->toDateString(),
                    'gender' => $prescription->patient->gender,
                ],
                'doctor' => [
                    'name' => $prescription->practitioner->staffProfile->name,
                    'specialization' => $prescription->practitioner->specialization,
                ],
                'items' => $prescription->items->map(function ($item) use ($requiredByMedicine): array {
                    $medicine = $item->getRelation('medicine');
                    $stock = $medicine instanceof Medicine ? $medicine->getRelation('stock') : null;
                    $required = $requiredByMedicine->get($item->medicine_id, (float) $item->quantity);

                    return [
                        'uuid' => $item->uuid,
                        'name' => $item->medicine_name_snapshot,
                        'strength' => $item->strength_snapshot,
                        'dosage_form' => $item->dosage_form_snapshot,
                        'quantity' => $item->quantity,
                        'unit' => $item->unit,
                        'instruction' => $item->instruction,
                        'dose_text' => $item->dose_text,
                        'frequency_text' => $item->frequency_text,
                        'timing_text' => $item->timing_text,
                        'duration_text' => $item->duration_text,
                        'stock' => $stock instanceof MedicineStock ? $stock->quantity : '0.00',
                        'required_quantity' => $required,
                        'stock_sufficient' => $medicine instanceof Medicine && $stock instanceof MedicineStock && (float) $stock->quantity >= $required,
                    ];
                })->values(),
                'audits' => $prescription->audits->map(function ($audit): array {
                    $actor = $audit->getRelation('actor');

                    return [
                        'action' => $audit->action,
                        'actor' => $actor instanceof User ? $actor->name : 'Sistem',
                        'created_at' => $audit->created_at->toIso8601String(),
                    ];
                })->values(),
            ],
            'can' => [
                'process' => Gate::allows('process', $prescription),
                'dispense' => Gate::allows('dispense', $prescription),
                'cancel' => Gate::allows('cancel', $prescription),
            ],
        ]);
    }
}
