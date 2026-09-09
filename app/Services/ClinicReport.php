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

class ClinicReport
{
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
    public function summary(User $user, string $from, string $to): array
    {
        $summary = [];
        if ($user->hasClinicPermission('encounter.view')) {
            $counts = $this->encounters($from, $to)->selectRaw('status, COUNT(*) as total')
                ->groupBy('status')->pluck('total', 'status');
            $summary['visits'] = (int) $counts->sum();
            $summary['completed'] = (int) $counts->get('completed', 0);
            $summary['cancelled'] = (int) $counts->get('cancelled', 0);
        }
        if ($user->hasClinicPermission('billing.view')) {
            $payments = $this->payments($from, $to)->toBase()
                ->selectRaw('status, COUNT(*) as count, SUM(amount) as amount')->groupBy('status')->get()->keyBy('status');
            $summary['revenue'] = (int) ($payments->get(PaymentStatus::Received->value)->amount ?? 0);
            $summary['payment_count'] = (int) ($payments->get(PaymentStatus::Received->value)->count ?? 0);
            $summary['voided_payments'] = (int) ($payments->get(PaymentStatus::Voided->value)->amount ?? 0);
            $summary['voided_count'] = (int) ($payments->get(PaymentStatus::Voided->value)->count ?? 0);
            $invoices = $this->invoices($from, $to)->where('status', '!=', InvoiceStatus::Voided->value)->toBase()
                ->selectRaw('COUNT(*) as count, SUM(total_amount) as amount, SUM(balance_due) as balance')->first();
            $summary['invoiced'] = (int) ($invoices->amount ?? 0);
            $summary['invoice_count'] = (int) ($invoices->count ?? 0);
            $summary['outstanding'] = (int) ($invoices->balance ?? 0);
        }

        return $summary;
    }

    /** @return list<array{label: string, count: int, amount: int|null, balance?: int}> */
    public function rows(string $section, string $from, string $to): array
    {
        $clinicId = $this->currentClinic->id();
        $encounters = $this->encounters($from, $to)->where('status', '!=', EncounterStatus::Cancelled->value);
        $finalRecords = fn (Builder $query) => $query->whereIn('status', ['final', 'amended']);

        $rows = match ($section) {
            'visits' => $this->encounters($from, $to)->selectRaw('encounter_date as label, COUNT(*) as total')
                ->groupBy('encounter_date')->orderBy('encounter_date')->get()->toBase(),
            'revenue' => $this->payments($from, $to)->where('status', PaymentStatus::Received->value)
                ->selectRaw('method as label, COUNT(*) as total, SUM(amount) as amount')
                ->groupBy('method')->orderBy('method')->get()->toBase(),
            'billing' => $this->invoices($from, $to)
                ->selectRaw('status as label, COUNT(*) as total, SUM(total_amount) as amount, SUM(balance_due) as balance')
                ->groupBy('status')->orderBy('status')->get()->toBase(),
            'services' => EncounterProcedure::query()->where('clinic_id', $clinicId)
                ->whereIn('encounter_id', $encounters->select('id'))->whereHas('medicalRecord', $finalRecords)
                ->selectRaw('name_snapshot as label, COUNT(*) as total, SUM(price_snapshot) as amount')
                ->groupBy('name_snapshot')->orderByDesc('total')->orderBy('name_snapshot')->limit(100)->get()->toBase(),
            'diagnoses' => Diagnosis::query()->where('clinic_id', $clinicId)
                ->whereIn('encounter_id', $encounters->select('id'))->whereHas('medicalRecord', $finalRecords)
                ->selectRaw('code, display as label, COUNT(*) as total')->groupBy('code', 'display')
                ->orderByDesc('total')->orderBy('code')->orderBy('display')->limit(100)->get()->toBase(),
            'doctors' => $encounters->selectRaw('practitioner_id, COUNT(*) as total')
                ->with('practitioner.staffProfile:id,name')->groupBy('practitioner_id')
                ->orderByDesc('total')->orderBy('practitioner_id')->limit(100)->get()->toBase(),
            'pharmacy' => Prescription::query()->where('clinic_id', $clinicId)
                ->whereIn('encounter_id', $encounters->select('id'))->where('status', '!=', 'draft')
                ->selectRaw('status as label, COUNT(*) as total')->groupBy('status')->orderBy('status')->get()->toBase(),
            default => collect(),
        };

        $result = [];
        foreach ($rows as $row) {
            $label = match ($section) {
                'doctors' => $row->practitioner->staffProfile->name ?? 'Dokter tidak tersedia',
                'visits' => CarbonImmutable::parse((string) $row->getAttribute('label'))->toDateString(),
                'revenue' => PaymentMethod::from((string) $row->getAttribute('label'))->label(),
                'billing' => InvoiceStatus::from((string) $row->getAttribute('label'))->label(),
                'diagnoses' => $row->getAttribute('code').' - '.$row->getAttribute('label'),
                'pharmacy' => PrescriptionStatus::from((string) $row->getAttribute('label'))->label(),
                default => (string) $row->getAttribute('label'),
            };

            $result[] = ['label' => is_string($label) ? $label : 'Tidak tersedia', 'count' => (int) $row->getAttribute('total'),
                'amount' => $row->getAttribute('amount') === null ? null : (int) $row->getAttribute('amount'),
                ...($section === 'billing' ? ['balance' => (int) $row->getAttribute('balance')] : [])];
        }

        return $result;
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
