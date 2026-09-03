<?php

namespace App\Services;

use App\Models\Patient;
use App\Models\Tenant;
use App\Support\Tenancy\CurrentTenant;

class PatientMedicalRecordNumberGenerator
{
    public function __construct(private readonly CurrentTenant $currentTenant) {}

    /** @return array{sequence: int, number: string} */
    public function generate(): array
    {
        Tenant::query()
            ->whereKey($this->currentTenant->id())
            ->lockForUpdate()
            ->firstOrFail();

        $sequence = ((int) Patient::query()->max('medical_record_sequence')) + 1;

        return [
            'sequence' => $sequence,
            'number' => 'RM'.str_pad((string) $sequence, 6, '0', STR_PAD_LEFT),
        ];
    }
}
