<?php

namespace App\Http\Controllers;

use App\Actions\SaveMedicalRecord;
use App\Http\Requests\SaveMedicalRecordRequest;
use App\MedicalRecordStatus;
use App\Models\Diagnosis;
use App\Models\Encounter;
use App\Models\EncounterProcedure;
use App\Models\MedicalRecord;
use App\Models\MedicalRecordAmendment;
use App\Models\PrescriptionItem;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class MedicalRecordController extends Controller
{
    public function edit(Encounter $encounter): Response
    {
        Gate::authorize('viewEncounter', [MedicalRecord::class, $encounter]);

        $encounter->load([
            'patient:id,uuid,medical_record_number,name,birth_date,gender,blood_type',
            'patient.allergies' => fn ($query) => $query
                ->where('status', 'active')
                ->orderBy('substance')
                ->select(['id', 'patient_id', 'substance', 'reaction', 'severity']),
            'serviceUnit:id,uuid,name',
            'practitioner:id,uuid,staff_profile_id,specialization',
            'practitioner.staffProfile:id,name',
            'queueEntry:id,encounter_id,queue_number',
            'triage',
            'medicalRecord.diagnoses.catalog',
            'medicalRecord.procedures.service',
            'medicalRecord.prescription.items.medicine',
            'medicalRecord.amendments' => fn ($query) => $query->with('creator:id,name')->oldest(),
        ]);

        $previousEncounters = Encounter::query()
            ->where('clinic_id', $encounter->clinic_id)
            ->where('patient_id', $encounter->patient_id)
            ->whereKeyNot($encounter->id)
            ->whereHas('medicalRecord', fn ($query) => $query->whereIn('status', [
                MedicalRecordStatus::Final->value,
                MedicalRecordStatus::Amended->value,
            ]))
            ->with([
                'practitioner:id,staff_profile_id',
                'practitioner.staffProfile:id,name',
                'medicalRecord:id,encounter_id,assessment,plan,status,finalized_at',
                'medicalRecord.diagnoses:id,medical_record_id,code,display,diagnosis_type',
            ])
            ->orderByDesc('encounter_date')
            ->orderByDesc('id')
            ->limit(5)
            ->get()
            ->map(fn (Encounter $previous): array => [
                'date' => $previous->encounter_date->toDateString(),
                'doctor' => $previous->practitioner->staffProfile->name,
                'assessment' => $previous->medicalRecord?->assessment,
                'plan' => $previous->medicalRecord?->plan,
                'diagnoses' => $previous->medicalRecord === null ? [] : $previous->medicalRecord->diagnoses
                    ->map(fn (Diagnosis $diagnosis): array => [
                        'code' => $diagnosis->code,
                        'display' => $diagnosis->display,
                        'type' => $diagnosis->diagnosis_type->value,
                    ])->values(),
            ]);

        return Inertia::render('medical-records/edit', [
            'encounter' => $this->encounterData($encounter),
            'previousEncounters' => $previousEncounters,
            'can' => [
                'start' => Gate::allows('start', [MedicalRecord::class, $encounter]),
                'save' => Gate::allows('save', [MedicalRecord::class, $encounter]),
                'finalize' => Gate::allows('finalize', [MedicalRecord::class, $encounter]),
                'amend' => $encounter->medicalRecord !== null
                    && Gate::allows('amend', $encounter->medicalRecord),
            ],
        ]);
    }

    public function update(
        SaveMedicalRecordRequest $request,
        Encounter $encounter,
        SaveMedicalRecord $saveMedicalRecord,
    ): RedirectResponse {
        $saveMedicalRecord->execute(
            $encounter,
            $request->clinicalData(),
            $request->finalizesRecord(),
            (int) $request->user()->id,
        );

        $finalized = $request->finalizesRecord();
        Inertia::flash('toast', [
            'type' => 'success',
            'message' => $finalized
                ? 'Rekam medis difinalisasi dan dikunci.'
                : 'Draft rekam medis berhasil disimpan.',
        ]);

        return $finalized
            ? to_route('doctor-queue.index', ['mode' => 'history'])
            : to_route('medical-records.edit', $encounter);
    }

    /** @return array<string, mixed> */
    private function encounterData(Encounter $encounter): array
    {
        $medicalRecord = $encounter->medicalRecord;

        return [
            'uuid' => $encounter->uuid,
            'registration_number' => $encounter->registration_number,
            'registered_at' => $encounter->registered_at->toIso8601String(),
            'started_at' => $encounter->started_at?->toIso8601String(),
            'chief_complaint' => $encounter->chief_complaint,
            'status' => $encounter->status->value,
            'status_label' => $encounter->status->label(),
            'patient' => [
                'uuid' => $encounter->patient->uuid,
                'medical_record_number' => $encounter->patient->medical_record_number,
                'name' => $encounter->patient->name,
                'birth_date' => $encounter->patient->birth_date->toDateString(),
                'gender' => $encounter->patient->gender,
                'blood_type' => $encounter->patient->blood_type,
                'allergies' => $encounter->patient->allergies->map(fn ($allergy): array => [
                    'substance' => $allergy->substance,
                    'reaction' => $allergy->reaction,
                    'severity' => $allergy->severity,
                ])->values(),
            ],
            'service_unit' => $encounter->serviceUnit->name,
            'practitioner' => [
                'name' => $encounter->practitioner->staffProfile->name,
                'specialization' => $encounter->practitioner->specialization,
            ],
            'queue_number' => $encounter->queueEntry->queue_number,
            'triage' => $encounter->triage === null ? null : $encounter->triage->only([
                'chief_complaint', 'systolic_bp', 'diastolic_bp', 'heart_rate',
                'respiratory_rate', 'temperature', 'spo2', 'weight', 'height',
                'pain_scale', 'notes', 'completed_at',
            ]),
            'medical_record' => $medicalRecord === null ? null : [
                'uuid' => $medicalRecord->uuid,
                'subjective' => $medicalRecord->subjective,
                'objective' => $medicalRecord->objective,
                'assessment' => $medicalRecord->assessment,
                'plan' => $medicalRecord->plan,
                'additional_notes' => $medicalRecord->additional_notes,
                'status' => $medicalRecord->status->value,
                'status_label' => $medicalRecord->status->label(),
                'finalized_at' => $medicalRecord->finalized_at?->toIso8601String(),
                'diagnoses' => $medicalRecord->diagnoses->map(fn (Diagnosis $diagnosis): array => [
                    'catalog_id' => $diagnosis->getRelation('catalog') instanceof \App\Models\DiagnosisCatalog
                        ? $diagnosis->getRelation('catalog')->uuid
                        : '',
                    'code_system' => $diagnosis->code_system,
                    'code' => $diagnosis->code,
                    'display' => $diagnosis->display,
                    'type' => $diagnosis->diagnosis_type->value,
                    'notes' => $diagnosis->notes,
                ])->values(),
                'procedures' => $medicalRecord->procedures->map(fn (EncounterProcedure $procedure): array => [
                    'service_id' => $procedure->getRelation('service') instanceof \App\Models\ClinicService
                        ? $procedure->getRelation('service')->uuid
                        : '',
                    'code' => $procedure->code,
                    'name' => $procedure->name_snapshot,
                    'price' => $procedure->price_snapshot,
                    'notes' => $procedure->notes,
                ])->values(),
                'prescription' => $medicalRecord->prescription === null ? null : [
                    'notes' => $medicalRecord->prescription->notes,
                    'items' => $medicalRecord->prescription->items->map(fn (PrescriptionItem $item): array => [
                        'medicine_id' => $item->getRelation('medicine') instanceof \App\Models\Medicine
                            ? $item->getRelation('medicine')->uuid
                            : '',
                        'name' => $item->medicine_name_snapshot,
                        'strength' => $item->strength_snapshot,
                        'dosage_form' => $item->dosage_form_snapshot,
                        'quantity' => $item->quantity,
                        'unit' => $item->unit,
                        'dose_text' => $item->dose_text,
                        'frequency_text' => $item->frequency_text,
                        'timing_text' => $item->timing_text,
                        'duration_text' => $item->duration_text,
                        'instruction' => $item->instruction,
                        'notes' => $item->notes,
                    ])->values(),
                ],
                'amendments' => $medicalRecord->amendments->map(fn (MedicalRecordAmendment $amendment): array => [
                    'uuid' => $amendment->uuid,
                    'reason' => $amendment->reason,
                    'content' => $amendment->content,
                    'created_at' => $amendment->created_at->toIso8601String(),
                    'created_by' => $amendment->getRelation('creator') instanceof User
                        ? $amendment->getRelation('creator')->name
                        : 'Pengguna tidak aktif',
                ])->values(),
            ],
        ];
    }
}
