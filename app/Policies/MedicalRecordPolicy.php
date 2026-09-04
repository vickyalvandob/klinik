<?php

namespace App\Policies;

use App\EncounterStatus;
use App\MedicalRecordStatus;
use App\Models\Encounter;
use App\Models\MedicalRecord;
use App\Models\User;
use App\Support\CurrentPractitioner;
use App\Support\Tenancy\CurrentClinic;
use App\Support\Tenancy\CurrentTenant;

class MedicalRecordPolicy
{
    public function __construct(
        private readonly CurrentTenant $currentTenant,
        private readonly CurrentClinic $currentClinic,
        private readonly CurrentPractitioner $currentPractitioner,
    ) {}

    public function viewAny(User $user): bool
    {
        return $this->matchesCurrentContext($user)
            && $user->hasClinicPermission('medical_record.view');
    }

    public function view(User $user, MedicalRecord $medicalRecord): bool
    {
        return $this->viewAny($user)
            && $medicalRecord->tenant_id === $this->currentTenant->id()
            && $medicalRecord->clinic_id === $this->currentClinic->id();
    }

    public function viewEncounter(User $user, Encounter $encounter): bool
    {
        return $this->viewAny($user)
            && $encounter->tenant_id === $this->currentTenant->id()
            && $encounter->clinic_id === $this->currentClinic->id();
    }

    public function start(User $user, Encounter $encounter): bool
    {
        return $this->viewEncounter($user, $encounter)
            && $user->hasClinicPermission('medical_record.create')
            && $encounter->status === EncounterStatus::WaitingDoctor
            && $this->isAssignedPractitioner($encounter);
    }

    public function save(User $user, Encounter $encounter): bool
    {
        return $this->viewEncounter($user, $encounter)
            && ($user->hasClinicPermission('medical_record.create')
                || $user->hasClinicPermission('medical_record.update'))
            && $encounter->status === EncounterStatus::InConsultation
            && ! $encounter->medicalRecord()->whereIn('status', [
                MedicalRecordStatus::Final->value,
                MedicalRecordStatus::Amended->value,
            ])->exists()
            && $this->isAssignedPractitioner($encounter);
    }

    public function finalize(User $user, Encounter $encounter): bool
    {
        return $this->save($user, $encounter)
            && $user->hasClinicPermission('medical_record.finalize');
    }

    public function amend(User $user, MedicalRecord $medicalRecord): bool
    {
        return $this->view($user, $medicalRecord)
            && $user->hasClinicPermission('medical_record.amend')
            && in_array($medicalRecord->status, [MedicalRecordStatus::Final, MedicalRecordStatus::Amended], true)
            && $this->currentPractitioner->find() !== null;
    }

    private function isAssignedPractitioner(Encounter $encounter): bool
    {
        return $this->currentPractitioner->find()?->id === $encounter->practitioner_id;
    }

    private function matchesCurrentContext(User $user): bool
    {
        return $this->currentTenant->isResolved()
            && $this->currentClinic->isResolved()
            && $this->currentClinic->membership()->user_id === $user->id
            && $this->currentClinic->membership()->is_active;
    }
}
