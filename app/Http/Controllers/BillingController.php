<?php

namespace App\Http\Controllers;

use App\InvoiceStatus;
use App\Models\BillingAudit;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\User;
use App\PaymentMethod;
use App\PaymentStatus;
use App\Support\Tenancy\CurrentClinic;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class BillingController extends Controller
{
    public function __construct(private readonly CurrentClinic $currentClinic) {}

    public function index(Request $request): Response
    {
        Gate::authorize('viewAny', Invoice::class);

        $mode = match ($request->string('mode')->toString()) {
            'partial' => 'partial',
            'paid' => 'paid',
            'voided' => 'voided',
            default => 'outstanding',
        };
        $search = $request->string('search')->trim()->toString();
        $reconciliationDate = $this->reconciliationDate($request->string('date')->toString());
        $statuses = match ($mode) {
            'partial' => [InvoiceStatus::PartiallyPaid->value],
            'paid' => [InvoiceStatus::Paid->value],
            'voided' => [InvoiceStatus::Voided->value],
            default => [InvoiceStatus::Issued->value],
        };

        $invoices = Invoice::query()
            ->where('clinic_id', $this->currentClinic->id())
            ->whereIn('status', $statuses)
            ->with([
                'patient:id,medical_record_number,name',
                'encounter:id,registration_number',
            ])
            ->when($search !== '', fn (Builder $query) => $query->where(function (Builder $query) use ($search): void {
                $query->where('invoice_number', 'like', "%{$search}%")
                    ->orWhereHas('patient', fn (Builder $patient) => $patient
                        ->where('name', 'like', "%{$search}%")
                        ->orWhere('medical_record_number', 'like', "%{$search}%"))
                    ->orWhereHas('encounter', fn (Builder $encounter) => $encounter
                        ->where('registration_number', 'like', "%{$search}%"));
            }))
            ->orderByDesc('issued_at')
            ->orderByDesc('id')
            ->paginate(20)
            ->withQueryString()
            ->through(fn (Invoice $invoice): array => [
                'uuid' => $invoice->uuid,
                'invoice_number' => $invoice->invoice_number,
                'status' => $invoice->status->value,
                'status_label' => $invoice->status->label(),
                'total_amount' => $invoice->total_amount,
                'paid_amount' => $invoice->paid_amount,
                'balance_due' => $invoice->balance_due,
                'issued_at' => $invoice->issued_at->toIso8601String(),
                'patient' => [
                    'name' => $invoice->patient->name,
                    'medical_record_number' => $invoice->patient->medical_record_number,
                ],
                'registration_number' => $invoice->encounter->registration_number,
            ]);

        $summaryQuery = fn (): Builder => Invoice::query()->where('clinic_id', $this->currentClinic->id());
        $outstandingStatuses = [InvoiceStatus::Issued->value, InvoiceStatus::PartiallyPaid->value];

        return Inertia::render('billing/index', [
            'mode' => $mode,
            'search' => $search,
            'date' => $reconciliationDate,
            'invoices' => $invoices,
            'summary' => [
                'outstanding_count' => $summaryQuery()->whereIn('status', $outstandingStatuses)->count(),
                'outstanding_amount' => (int) $summaryQuery()->whereIn('status', $outstandingStatuses)->sum('balance_due'),
                'partial_count' => $summaryQuery()->where('status', InvoiceStatus::PartiallyPaid->value)->count(),
                'paid_count' => $summaryQuery()->where('status', InvoiceStatus::Paid->value)->count(),
            ],
            'reconciliation' => $this->reconciliation($reconciliationDate),
        ]);
    }

    public function show(Invoice $invoice): Response
    {
        Gate::authorize('view', $invoice);

        $invoice->load([
            'patient:id,medical_record_number,name,birth_date,gender',
            'encounter:id,registration_number,status,encounter_date',
            'items' => fn ($query) => $query->orderBy('id'),
            'payments' => fn ($query) => $query->with(['receiver:id,name', 'voider:id,name'])->oldest('received_at'),
            'audits' => fn ($query) => $query->with('actor:id,name')->oldest(),
        ]);
        $workflow = $this->currentClinic->get()->workflowSetting()->firstOrNew();

        return Inertia::render('billing/show', [
            'invoice' => [
                'uuid' => $invoice->uuid,
                'invoice_number' => $invoice->invoice_number,
                'status' => $invoice->status->value,
                'status_label' => $invoice->status->label(),
                'subtotal' => $invoice->subtotal,
                'total_amount' => $invoice->total_amount,
                'paid_amount' => $invoice->paid_amount,
                'balance_due' => $invoice->balance_due,
                'issued_at' => $invoice->issued_at->toIso8601String(),
                'voided_at' => $invoice->voided_at?->toIso8601String(),
                'void_reason' => $invoice->void_reason,
                'patient' => [
                    'name' => $invoice->patient->name,
                    'medical_record_number' => $invoice->patient->medical_record_number,
                    'birth_date' => $invoice->patient->birth_date->toDateString(),
                    'gender' => $invoice->patient->gender,
                ],
                'encounter' => [
                    'registration_number' => $invoice->encounter->registration_number,
                    'date' => $invoice->encounter->encounter_date->toDateString(),
                    'status' => $invoice->encounter->status->value,
                ],
                'items' => $invoice->items->map(fn ($item): array => [
                    'uuid' => $item->uuid,
                    'type' => $item->item_type->value,
                    'type_label' => $item->item_type->label(),
                    'code' => $item->code_snapshot,
                    'description' => $item->description_snapshot,
                    'quantity' => $item->quantity,
                    'unit' => $item->unit,
                    'unit_price' => $item->unit_price,
                    'line_total' => $item->line_total,
                ])->values(),
                'payments' => $invoice->payments->map(function (Payment $payment): array {
                    $receiver = $payment->getRelation('receiver');
                    $voider = $payment->getRelation('voider');

                    return [
                        'uuid' => $payment->uuid,
                        'payment_number' => $payment->payment_number,
                        'amount' => $payment->amount,
                        'method' => $payment->method->value,
                        'method_label' => $payment->method->label(),
                        'reference_number' => $payment->reference_number,
                        'notes' => $payment->notes,
                        'status' => $payment->status->value,
                        'status_label' => $payment->status->label(),
                        'received_at' => $payment->received_at->toIso8601String(),
                        'received_by' => $receiver instanceof User ? $receiver->name : 'Sistem',
                        'voided_at' => $payment->voided_at?->toIso8601String(),
                        'voided_by' => $voider instanceof User ? $voider->name : null,
                        'void_reason' => $payment->void_reason,
                        'can_void' => Gate::allows('void', $payment),
                    ];
                })->values(),
                'audits' => $invoice->audits->map(function (BillingAudit $audit): array {
                    $actor = $audit->getRelation('actor');

                    return [
                        'action' => $audit->action,
                        'actor' => $actor instanceof User ? $actor->name : 'Sistem',
                        'created_at' => $audit->created_at->toIso8601String(),
                    ];
                })->values(),
            ],
            'allowPartialPayment' => $workflow->exists ? $workflow->allow_partial_payment : false,
            'paymentMethods' => collect(PaymentMethod::cases())->map(fn (PaymentMethod $method): array => [
                'value' => $method->value,
                'label' => $method->label(),
            ])->values(),
            'can' => [
                'receivePayment' => Gate::allows('receivePayment', $invoice),
                'voidInvoice' => Gate::allows('void', $invoice),
            ],
        ]);
    }

    private function reconciliationDate(string $candidate): string
    {
        if (preg_match('/^(\d{4})-(\d{2})-(\d{2})$/D', $candidate, $matches) === 1
            && checkdate((int) $matches[2], (int) $matches[3], (int) $matches[1])) {
            return $candidate;
        }

        return now($this->currentClinic->get()->timezone)->toDateString();
    }

    /** @return array<string, mixed> */
    private function reconciliation(string $date): array
    {
        $timezone = $this->currentClinic->get()->timezone;
        $start = CarbonImmutable::parse($date, $timezone)->startOfDay()->utc();
        $end = $start->addDay();
        $rows = Payment::query()
            ->where('clinic_id', $this->currentClinic->id())
            ->where('received_at', '>=', $start)
            ->where('received_at', '<', $end)
            ->select(['method', 'status'])
            ->selectRaw('COUNT(*) as aggregate_count, SUM(amount) as aggregate_total')
            ->groupBy(['method', 'status'])
            ->get();
        $receivedTotal = 0;
        $receivedCount = 0;
        $voidedTotal = 0;
        $voidedCount = 0;

        foreach ($rows as $row) {
            $count = (int) $row->getAttribute('aggregate_count');
            $total = (int) $row->getAttribute('aggregate_total');

            if ($row->status === PaymentStatus::Received) {
                $receivedCount += $count;
                $receivedTotal += $total;
            } else {
                $voidedCount += $count;
                $voidedTotal += $total;
            }
        }

        $byMethod = collect(PaymentMethod::cases())->map(function (PaymentMethod $method) use ($rows): array {
            $methodRows = $rows->filter(fn (Payment $row): bool => $row->status === PaymentStatus::Received
                && $row->method === $method);

            return [
                'label' => $method->label(),
                'count' => (int) $methodRows->sum(fn (Payment $row): int => (int) $row->getAttribute('aggregate_count')),
                'amount' => (int) $methodRows->sum(fn (Payment $row): int => (int) $row->getAttribute('aggregate_total')),
            ];
        })->values()->all();

        return [
            'received_count' => $receivedCount,
            'received_amount' => $receivedTotal,
            'voided_count' => $voidedCount,
            'voided_amount' => $voidedTotal,
            'net_amount' => $receivedTotal,
            'by_method' => $byMethod,
        ];
    }
}
