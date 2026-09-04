<?php

namespace App\Http\Controllers;

use App\Models\Medicine;
use App\Models\MedicineStock;
use App\Models\Prescription;
use App\Models\User;
use App\PrescriptionStatus;
use App\Support\Tenancy\CurrentClinic;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class PharmacyController extends Controller
{
    public function __construct(private readonly CurrentClinic $currentClinic) {}

    public function index(Request $request): Response
    {
        Gate::authorize('viewAny', Prescription::class);

        $mode = match ($request->string('mode')->toString()) {
            'processing' => 'processing',
            'history' => 'history',
            'stock' => 'stock',
            default => 'new',
        };
        $search = $request->string('search')->trim()->toString();
        $prescriptions = null;
        $stocks = null;

        if ($mode === 'stock') {
            $stocks = Medicine::query()
                ->where('clinic_id', $this->currentClinic->id())
                ->with('stock:id,medicine_id,quantity,last_movement_at')
                ->when($search !== '', fn (Builder $query) => $query->where(function (Builder $query) use ($search): void {
                    $query->where('name', 'like', "%{$search}%")
                        ->orWhere('code', 'like', "%{$search}%")
                        ->orWhere('generic_name', 'like', "%{$search}%");
                }))
                ->orderBy('name')
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
                });
        } else {
            $statuses = match ($mode) {
                'processing' => [PrescriptionStatus::Processing->value],
                'history' => [PrescriptionStatus::Dispensed->value, PrescriptionStatus::Cancelled->value],
                default => [PrescriptionStatus::Prescribed->value],
            };
            $prescriptions = Prescription::query()
                ->where('clinic_id', $this->currentClinic->id())
                ->whereIn('status', $statuses)
                ->with([
                    'patient:id,uuid,medical_record_number,name',
                    'practitioner:id,staff_profile_id',
                    'practitioner.staffProfile:id,name',
                    'encounter:id,uuid,registration_number',
                ])
                ->withCount('items')
                ->when($search !== '', fn (Builder $query) => $query->where(function (Builder $query) use ($search): void {
                    $query->whereHas('patient', fn (Builder $patient) => $patient
                        ->where('name', 'like', "%{$search}%")
                        ->orWhere('medical_record_number', 'like', "%{$search}%"))
                        ->orWhereHas('encounter', fn (Builder $encounter) => $encounter
                            ->where('registration_number', 'like', "%{$search}%"));
                }))
                ->orderByDesc('prescribed_at')
                ->orderByDesc('id')
                ->paginate(20)
                ->withQueryString()
                ->through(fn (Prescription $prescription): array => [
                    'uuid' => $prescription->uuid,
                    'status' => $prescription->status->value,
                    'status_label' => $prescription->status->label(),
                    'prescribed_at' => $prescription->prescribed_at?->toIso8601String(),
                    'processing_started_at' => $prescription->processing_started_at?->toIso8601String(),
                    'dispensed_at' => $prescription->dispensed_at?->toIso8601String(),
                    'items_count' => $prescription->items_count,
                    'patient' => [
                        'name' => $prescription->patient->name,
                        'medical_record_number' => $prescription->patient->medical_record_number,
                    ],
                    'doctor' => $prescription->practitioner->staffProfile->name,
                    'registration_number' => $prescription->encounter->registration_number,
                ]);
        }

        $summaryQuery = fn (): Builder => Prescription::query()->where('clinic_id', $this->currentClinic->id());

        return Inertia::render('pharmacy/index', [
            'mode' => $mode,
            'search' => $search,
            'prescriptions' => $prescriptions,
            'stocks' => $stocks,
            'summary' => [
                'new' => $summaryQuery()->where('status', PrescriptionStatus::Prescribed->value)->count(),
                'processing' => $summaryQuery()->where('status', PrescriptionStatus::Processing->value)->count(),
                'low_stock' => Medicine::query()
                    ->where('clinic_id', $this->currentClinic->id())
                    ->where('is_active', true)
                    ->where(function (Builder $query): void {
                        $query->whereDoesntHave('stock')
                            ->orWhereHas('stock', fn (Builder $stock) => $stock
                                ->whereColumn('medicine_stocks.quantity', '<=', 'medicines.minimum_stock'));
                    })->count(),
            ],
        ]);
    }

    public function show(Prescription $prescription): Response
    {
        Gate::authorize('view', $prescription);

        $prescription->load([
            'patient:id,uuid,medical_record_number,name,birth_date,gender',
            'practitioner:id,staff_profile_id,specialization',
            'practitioner.staffProfile:id,name',
            'encounter:id,uuid,registration_number,status',
            'items.medicine.stock:id,medicine_id,quantity',
            'audits' => fn ($query) => $query->with('actor:id,name')->oldest(),
        ]);

        return Inertia::render('pharmacy/show', [
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
                'items' => $prescription->items->map(function ($item): array {
                    $medicine = $item->getRelation('medicine');
                    $stock = $medicine instanceof Medicine ? $medicine->getRelation('stock') : null;

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
