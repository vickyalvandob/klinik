<?php

namespace App\Services;

use App\EncounterStatus;
use App\InvoiceStatus;
use App\Models\Diagnosis;
use App\Models\Encounter;
use App\Models\EncounterProcedure;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\Prescription;
use App\Models\User;
use App\PaymentMethod;
use App\PaymentStatus;
use App\PrescriptionStatus;
use App\Support\Tenancy\CurrentClinic;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;
use stdClass;

class ClinicReport
{
    /** @var array<string, Collection<int, stdClass>> */
    private array $paymentGroups = [];

    /** @var array<string, Collection<int, stdClass>> */
    private array $invoiceGroups = [];

    /** @var array<string, list<array{label: string, count: int, amount: int|null, balance?: int, key?: string}>> */
    private array $reportRows = [];

    public function __construct(private readonly CurrentClinic $currentClinic) {}

    /** @return list<string> */
    public function sections(User $user): array
    {
        return array_keys(array_filter([
            'visits' => $user->hasClinicPermission('encounter.view'),
            'revenue' => $user->hasClinicPermission('billing.view'),
            'billing' => $user->hasClinicPermission('billing.view'),
            'services' => $user->hasClinicPermission('billing.view') || $user->hasClinicPermission('medical_record.view'),
            'diagnoses' => $user->hasClinicPermission('medical_record.view'),
            'doctors' => $user->hasClinicPermission('encounter.view'),
            'pharmacy' => $user->hasClinicPermission('pharmacy.view'),
        ]));
    }

    /** @return array<string, mixed> */
    public function summary(string $section, string $from, string $to): array
    {
        if ($section === 'revenue') {
            $payments = $this->groupedPayments($from, $to);
            $received = $payments->where('status', PaymentStatus::Received->value);
            $voided = $payments->where('status', PaymentStatus::Voided->value);

            return [
                'revenue' => (int) $received->sum('amount'),
                'payment_count' => (int) $received->sum('total'),
                'voided_payments' => (int) $voided->sum('amount'),
                'voided_count' => (int) $voided->sum('total'),
                'comparison' => $this->comparison($section, $from, $to),
            ];
        }

        if ($section === 'billing') {
            $invoices = $this->groupedInvoices($from, $to);
            $active = $invoices->where('label', '!=', InvoiceStatus::Voided->value);

            return [
                'invoiced' => (int) $active->sum('amount'),
                'paid' => (int) $active->sum('paid'),
                'outstanding' => (int) $active->sum('balance'),
                'invoice_count' => (int) $active->sum('total'),
                'outstanding_count' => (int) $active->sum('outstanding_count'),
                'voided_count' => (int) $invoices->where('label', InvoiceStatus::Voided->value)->sum('total'),
            ];
        }

        if ($section === 'visits' || $section === 'doctors') {
            $query = $this->encounters($from, $to);
            if ($section === 'doctors') {
                $query->where('status', '!=', EncounterStatus::Cancelled->value);
            }
            $counts = $query->toBase()->selectRaw('COUNT(*) as visits, COUNT(DISTINCT patient_id) as patients, COUNT(DISTINCT practitioner_id) as doctors')
                ->selectRaw('SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as completed', [EncounterStatus::Completed->value])
                ->selectRaw('SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as cancelled', [EncounterStatus::Cancelled->value])
                ->first();

            return [
                'visits' => (int) ($counts->visits ?? 0),
                'patients' => (int) ($counts->patients ?? 0),
                'doctors' => (int) ($counts->doctors ?? 0),
                'completed' => (int) ($counts->completed ?? 0),
                'cancelled' => (int) ($counts->cancelled ?? 0),
                ...($section === 'visits' ? ['comparison' => $this->comparison($section, $from, $to)] : []),
            ];
        }

        if ($section === 'services' || $section === 'diagnoses') {
            $query = $section === 'services' ? $this->procedures($from, $to) : $this->diagnoses($from, $to);
            $totals = $query->toBase()->selectRaw('COUNT(*) as total, COUNT(DISTINCT encounter_id) as encounters')
                ->when($section === 'services', fn ($query) => $query->selectRaw('SUM(price_snapshot) as amount'))
                ->when($section === 'diagnoses', fn ($query) => $query->selectRaw('SUM(CASE WHEN type = ? THEN 1 ELSE 0 END) as primary_count', ['primary']))
                ->first();

            return [
                'total' => (int) ($totals->total ?? 0),
                'encounters' => (int) ($totals->encounters ?? 0),
                ...($section === 'services' ? ['amount' => (int) ($totals->amount ?? 0)] : ['primary_count' => (int) ($totals->primary_count ?? 0)]),
            ];
        }

        $rows = collect($this->rows($section, $from, $to));

        return [
            'total' => (int) $rows->sum('count'),
            'dispensed' => (int) $rows->where('key', PrescriptionStatus::Dispensed->value)->sum('count'),
            'pending' => (int) $rows->whereIn('key', [PrescriptionStatus::Prescribed->value, PrescriptionStatus::Processing->value])->sum('count'),
            'cancelled' => (int) $rows->where('key', PrescriptionStatus::Cancelled->value)->sum('count'),
        ];
    }

    /** @return array{from: string, to: string, value: int, days: int, ongoing: bool} */
    private function comparison(string $section, string $from, string $to): array
    {
        $timezone = $this->currentClinic->get()->timezone;
        $start = CarbonImmutable::parse($from, $timezone);
        $days = (int) $start->diffInDays(CarbonImmutable::parse($to, $timezone)) + 1;
        $previousFrom = $start->subDays($days)->toDateString();
        $previousTo = $start->subDay()->toDateString();
        $value = $section === 'revenue'
            ? (int) $this->groupedPayments($previousFrom, $previousTo)->where('status', PaymentStatus::Received->value)->sum('amount')
            : $this->encounters($previousFrom, $previousTo)->count();

        return [
            'from' => $previousFrom, 'to' => $previousTo, 'value' => $value, 'days' => $days,
            'ongoing' => $to >= CarbonImmutable::now($timezone)->toDateString(),
        ];
    }

    /** @return Builder<EncounterProcedure> */
    private function procedures(string $from, string $to): Builder
    {
        return EncounterProcedure::query()->where('clinic_id', $this->currentClinic->id())
            ->whereIn('encounter_id', $this->encounters($from, $to)->where('status', '!=', EncounterStatus::Cancelled->value)->select('id'))
            ->whereHas('medicalRecord', fn (Builder $query) => $query->whereIn('status', ['final', 'amended']));
    }

    /** @return Builder<Diagnosis> */
    private function diagnoses(string $from, string $to): Builder
    {
        return Diagnosis::query()->where('clinic_id', $this->currentClinic->id())
            ->whereIn('encounter_id', $this->encounters($from, $to)->where('status', '!=', EncounterStatus::Cancelled->value)->select('id'))
            ->whereHas('medicalRecord', fn (Builder $query) => $query->whereIn('status', ['final', 'amended']));
    }

    /** @return list<array{label: string, count: int, amount: int|null, balance?: int, key?: string}> */
    public function rows(string $section, string $from, string $to): array
    {
        $clinicId = $this->currentClinic->id();
        $key = $clinicId.':'.$section.':'.$from.':'.$to;
        if (isset($this->reportRows[$key])) {
            return $this->reportRows[$key];
        }
        $encounters = $this->encounters($from, $to)->where('status', '!=', EncounterStatus::Cancelled->value);

        $rows = match ($section) {
            'visits' => $this->encounters($from, $to)->selectRaw('encounter_date as label, COUNT(*) as total')
                ->groupBy('encounter_date')->orderBy('encounter_date')->toBase()->get(),
            'revenue' => $this->groupedPayments($from, $to)->where('status', PaymentStatus::Received->value),
            'billing' => $this->groupedInvoices($from, $to),
            'services' => $this->procedures($from, $to)
                ->selectRaw('name_snapshot as label, COUNT(*) as total, SUM(price_snapshot) as amount')
                ->groupBy('name_snapshot')->orderByDesc('total')->orderBy('name_snapshot')->limit(100)->toBase()->get(),
            'diagnoses' => $this->diagnoses($from, $to)
                ->selectRaw('code, display as label, COUNT(*) as total')->groupBy('code', 'display')
                ->orderByDesc('total')->orderBy('code')->orderBy('display')->limit(100)->toBase()->get(),
            'doctors' => $encounters->selectRaw('practitioner_id, COUNT(*) as total')
                ->with('practitioner.staffProfile:id,name')->groupBy('practitioner_id')
                ->orderByDesc('total')->orderBy('practitioner_id')->limit(100)->get()->toBase()
                ->map(fn (Encounter $encounter): stdClass => (object) [
                    'label' => $encounter->practitioner->staffProfile->name ?? 'Dokter tidak tersedia',
                    'total' => (int) $encounter->getAttribute('total'),
                ]),
            'pharmacy' => Prescription::query()->where('clinic_id', $clinicId)
                ->whereIn('encounter_id', $encounters->select('id'))->where('status', '!=', 'draft')
                ->selectRaw('status as label, COUNT(*) as total')->groupBy('status')->orderBy('status')->toBase()->get(),
            default => collect(),
        };

        $result = [];
        foreach ($rows as $row) {
            $label = match ($section) {
                'visits' => CarbonImmutable::parse((string) $row->label)->toDateString(),
                'revenue' => PaymentMethod::from((string) $row->label)->label(),
                'billing' => InvoiceStatus::from((string) $row->label)->label(),
                'diagnoses' => $row->code.' - '.$row->label,
                'pharmacy' => PrescriptionStatus::from((string) $row->label)->label(),
                default => (string) $row->label,
            };

            $result[] = ['label' => $label, 'count' => (int) $row->total,
                'amount' => isset($row->amount) ? (int) $row->amount : null,
                ...(in_array($section, ['revenue', 'billing', 'pharmacy'], true) ? ['key' => (string) $row->label] : []),
                ...($section === 'billing' ? ['balance' => (int) $row->balance] : [])];
        }

        return $this->reportRows[$key] = $result;
    }

    /** @return Collection<int, stdClass> */
    private function groupedPayments(string $from, string $to): Collection
    {
        $key = $this->currentClinic->id().':'.$from.':'.$to;

        return $this->paymentGroups[$key] ??= $this->payments($from, $to)->toBase()
            ->selectRaw('status, method as label, COUNT(*) as total, SUM(amount) as amount')
            ->groupBy('status', 'method')->orderBy('method')->get();
    }

    /** @return Collection<int, stdClass> */
    private function groupedInvoices(string $from, string $to): Collection
    {
        $key = $this->currentClinic->id().':'.$from.':'.$to;

        return $this->invoiceGroups[$key] ??= $this->invoices($from, $to)->toBase()
            ->selectRaw('status as label, COUNT(*) as total, SUM(total_amount) as amount, SUM(paid_amount) as paid, SUM(balance_due) as balance')
            ->selectRaw('SUM(CASE WHEN balance_due > 0 THEN 1 ELSE 0 END) as outstanding_count')
            ->groupBy('status')->orderBy('status')->get();
    }

    /** @return Builder<Encounter> */
    private function encounters(string $from, string $to): Builder
    {
        return Encounter::query()->where('clinic_id', $this->currentClinic->id())
            ->where('encounter_date', '>=', $from)
            ->where('encounter_date', '<', CarbonImmutable::parse($to)->addDay()->toDateString());
    }

    /** @return Builder<Payment> */
    private function payments(string $from, string $to): Builder
    {
        $timezone = $this->currentClinic->get()->timezone;

        return Payment::query()->where('clinic_id', $this->currentClinic->id())
            ->where('received_at', '>=', CarbonImmutable::parse($from, $timezone)->startOfDay()->setTimezone(config('app.timezone')))
            ->where('received_at', '<', CarbonImmutable::parse($to, $timezone)->addDay()->startOfDay()->setTimezone(config('app.timezone')));
    }

    /** @return Builder<Invoice> */
    private function invoices(string $from, string $to): Builder
    {
        $timezone = $this->currentClinic->get()->timezone;

        return Invoice::query()->where('clinic_id', $this->currentClinic->id())
            ->where('issued_at', '>=', CarbonImmutable::parse($from, $timezone)->startOfDay()->setTimezone(config('app.timezone')))
            ->where('issued_at', '<', CarbonImmutable::parse($to, $timezone)->addDay()->startOfDay()->setTimezone(config('app.timezone')));
    }
}
