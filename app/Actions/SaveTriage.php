<?php

namespace App\Actions;

use App\EncounterStatus;
use App\Models\Encounter;
use App\Models\Practitioner;
use App\Models\Triage;
use App\Support\Tenancy\CurrentClinic;
use App\TriageStatus;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class SaveTriage
{
    private const SNAPSHOT_FIELDS = [
        'chief_complaint', 'systolic_bp', 'diastolic_bp', 'heart_rate',
        'respiratory_rate', 'temperature', 'spo2', 'weight', 'height',
        'pain_scale', 'notes', 'status', 'completed_at',
    ];

    public function __construct(
        private readonly CurrentClinic $currentClinic,
        private readonly TransitionEncounter $transitionEncounter,
    ) {}

    /** @param array<string, mixed> $attributes */
    public function execute(Encounter $encounter, array $attributes, bool $complete, int $userId): Triage
    {
        return DB::transaction(function () use ($encounter, $attributes, $complete, $userId): Triage {
            $lockedEncounter = Encounter::query()
                ->whereKey($encounter->id)
                ->where('clinic_id', $this->currentClinic->id())
                ->lockForUpdate()
                ->firstOrFail();

            if ($lockedEncounter->status !== EncounterStatus::WaitingTriage) {
                throw ValidationException::withMessages([
                    'intent' => 'Pemeriksaan awal hanya dapat diubah saat pasien masih berada di antrean pemeriksaan awal.',
                ]);
            }

            $triage = Triage::query()
                ->where('encounter_id', $lockedEncounter->id)
                ->lockForUpdate()
                ->first();
            $beforeValues = $triage?->only(self::SNAPSHOT_FIELDS);

            if ($triage?->status === TriageStatus::Completed) {
                throw ValidationException::withMessages([
                    'intent' => 'Pemeriksaan awal yang sudah selesai tidak dapat diubah.',
                ]);
            }

            $practitionerId = Practitioner::query()
                ->where('clinic_id', $this->currentClinic->id())
                ->where('staff_profile_id', $this->currentClinic->membership()->staff_profile_id)
                ->value('id');

            if ($triage === null) {
                $triage = new Triage([
                    'encounter_id' => $lockedEncounter->id,
                    'created_by' => $userId,
                ]);
                $triage->clinic_id = $lockedEncounter->clinic_id;
            }

            $triage->fill([
                ...$attributes,
                'practitioner_id' => $practitionerId,
                'status' => $complete ? TriageStatus::Completed : TriageStatus::Draft,
                'completed_at' => $complete ? now() : null,
                'updated_by' => $userId,
            ])->save();

            $audit = $triage->audits()->make([
                'encounter_id' => $lockedEncounter->id,
                'action' => $complete ? 'completed' : 'draft_saved',
                'before_values' => $beforeValues,
                'after_values' => $triage->only(self::SNAPSHOT_FIELDS),
                'actor_id' => $userId,
            ]);
            $audit->clinic_id = $lockedEncounter->clinic_id;
            $audit->save();

            if ($complete) {
                $this->transitionEncounter->execute(
                    $lockedEncounter,
                    EncounterStatus::WaitingDoctor,
                    $userId,
                    'Pemeriksaan awal selesai',
                );
            }

            return $triage;
        }, attempts: 3);
    }
}
