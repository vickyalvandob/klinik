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
        $practitioner = $this->currentPractitioner->find();

        if ($practitioner === null || $practitioner->id !== $encounter->practitioner_id) {
            throw ValidationException::withMessages([
                'encounter' => 'Kunjungan hanya dapat dimulai oleh dokter yang ditugaskan.',
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
