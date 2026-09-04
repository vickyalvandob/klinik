<?php

namespace App\Services;

use App\Models\DailySequence;
use App\Support\Tenancy\CurrentClinic;
use App\Support\Tenancy\CurrentTenant;
use Carbon\CarbonInterface;

class DailySequenceNumberGenerator
{
    public function __construct(
        private readonly CurrentTenant $currentTenant,
        private readonly CurrentClinic $currentClinic,
    ) {}

    public function next(string $scope, CarbonInterface $date): int
    {
        $sequenceDate = $date->toDateString();

        DailySequence::query()->insertOrIgnore([
            'tenant_id' => $this->currentTenant->id(),
            'clinic_id' => $this->currentClinic->id(),
            'sequence_date' => $sequenceDate,
            'scope' => $scope,
            'last_number' => 0,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $sequence = DailySequence::query()
            ->where('clinic_id', $this->currentClinic->id())
            ->whereDate('sequence_date', $sequenceDate)
            ->where('scope', $scope)
            ->lockForUpdate()
            ->firstOrFail();

        $sequence->increment('last_number');

        return $sequence->last_number;
    }
}
