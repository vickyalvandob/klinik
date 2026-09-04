<?php

namespace App\Actions;

use App\EncounterStatus;
use App\Models\Clinic;
use App\Models\ClinicWorkflowSetting;
use App\Models\Encounter;
use App\Models\Patient;
use App\Models\Practitioner;
use App\Models\ServiceUnit;
use App\QueueStatus;
use App\Services\DailySequenceNumberGenerator;
use App\Support\Tenancy\CurrentClinic;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class RegisterEncounter
{
    public function __construct(
        private readonly CurrentClinic $currentClinic,
        private readonly DailySequenceNumberGenerator $numberGenerator,
    ) {}

    /**
     * @param  array{patient_id: string, service_unit_id: string, practitioner_id: string, chief_complaint: string}  $attributes
     */
    public function execute(array $attributes, int $userId): Encounter
    {
        return DB::transaction(function () use ($attributes, $userId): Encounter {
            $clinic = Clinic::query()
                ->whereKey($this->currentClinic->id())
                ->lockForUpdate()
                ->firstOrFail();
            $encounterDate = now($clinic->timezone)->startOfDay();

            $patient = Patient::query()
                ->where('uuid', $attributes['patient_id'])
                ->lockForUpdate()
                ->firstOrFail();
            $serviceUnit = ServiceUnit::query()
                ->where('uuid', $attributes['service_unit_id'])
                ->where('clinic_id', $clinic->id)
                ->where('type', 'outpatient')
                ->where('is_active', true)
                ->lockForUpdate()
                ->firstOrFail();
            $practitioner = Practitioner::query()
                ->where('uuid', $attributes['practitioner_id'])
                ->where('clinic_id', $clinic->id)
                ->where('profession', 'doctor')
                ->where('is_active', true)
                ->whereHas('staffProfile', fn ($query) => $query->where('is_active', true))
                ->lockForUpdate()
                ->firstOrFail();
            $workflow = ClinicWorkflowSetting::query()
                ->where('clinic_id', $clinic->id)
                ->lockForUpdate()
                ->firstOrFail();

            if (! $workflow->allow_walk_in) {
                throw ValidationException::withMessages([
                    'patient_id' => 'Pendaftaran langsung sedang dinonaktifkan untuk klinik ini.',
                ]);
            }

            $hasActiveEncounter = Encounter::query()
                ->where('clinic_id', $clinic->id)
                ->where('patient_id', $patient->id)
                ->whereDate('encounter_date', $encounterDate->toDateString())
                ->whereNotIn('status', [
                    EncounterStatus::Completed->value,
                    EncounterStatus::Cancelled->value,
                ])
                ->lockForUpdate()
                ->exists();

            if ($hasActiveEncounter) {
                throw ValidationException::withMessages([
                    'patient_id' => 'Pasien sudah memiliki kunjungan aktif hari ini.',
                ]);
            }

            $registrationSequence = $this->numberGenerator->next('encounter-registration', $encounterDate);
            $queueSequence = $this->numberGenerator->next("queue:{$serviceUnit->id}", $encounterDate);
            $initialStatus = $workflow->require_triage
                ? EncounterStatus::WaitingTriage
                : EncounterStatus::WaitingDoctor;

            $encounter = new Encounter([
                'patient_id' => $patient->id,
                'service_unit_id' => $serviceUnit->id,
                'practitioner_id' => $practitioner->id,
                'encounter_date' => $encounterDate->toDateString(),
                'registration_sequence' => $registrationSequence,
                'registration_number' => sprintf('REG-%s-%04d', $encounterDate->format('Ymd'), $registrationSequence),
                'registration_type' => 'walk_in',
                'chief_complaint' => $attributes['chief_complaint'],
                'status' => $initialStatus,
                'registered_at' => now(),
                'registered_by' => $userId,
            ]);
            $encounter->clinic_id = $clinic->id;
            $encounter->save();

            $queueEntry = $encounter->queueEntry()->make([
                'service_unit_id' => $serviceUnit->id,
                'practitioner_id' => $practitioner->id,
                'queue_date' => $encounterDate->toDateString(),
                'queue_sequence' => $queueSequence,
                'queue_number' => strtoupper($serviceUnit->queue_prefix).str_pad((string) $queueSequence, 3, '0', STR_PAD_LEFT),
                'status' => QueueStatus::Waiting,
            ]);
            $queueEntry->clinic_id = $clinic->id;
            $queueEntry->save();

            $statusHistory = $encounter->statusHistories()->make([
                'from_status' => null,
                'to_status' => $initialStatus,
                'reason' => 'Pendaftaran pasien',
                'changed_by' => $userId,
            ]);
            $statusHistory->clinic_id = $clinic->id;
            $statusHistory->save();

            return $encounter->setRelation('patient', $patient)
                ->setRelation('serviceUnit', $serviceUnit)
                ->setRelation('practitioner', $practitioner)
                ->setRelation('queueEntry', $queueEntry);
        }, attempts: 3);
    }
}
