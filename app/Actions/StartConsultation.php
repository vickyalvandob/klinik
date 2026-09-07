<?php

namespace App\Actions;

use App\EncounterStatus;
use App\Models\Encounter;
use App\Support\CurrentPractitioner;
use Illuminate\Validation\ValidationException;

class StartConsultation
{
    public function __construct(
        private readonly CurrentPractitioner $currentPractitioner,
        private readonly TransitionEncounter $transitionEncounter,
    ) {}

    public function execute(Encounter $encounter, int $userId): Encounter
    {
        if (! $this->currentPractitioner->canManage($encounter)) {
            throw ValidationException::withMessages([
                'encounter' => 'Kunjungan hanya dapat dimulai oleh dokter yang ditugaskan atau owner klinik.',
            ]);
        }

        return $this->transitionEncounter->execute(
            $encounter,
            EncounterStatus::InConsultation,
            $userId,
            'Pemeriksaan dimulai',
        );
    }
}
