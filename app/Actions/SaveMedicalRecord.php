<?php

namespace App\Actions;

use App\DiagnosisType;
use App\EncounterStatus;
use App\MedicalRecordStatus;
use App\Models\ClinicService;
use App\Models\ClinicWorkflowSetting;
use App\Models\DiagnosisCatalog;
use App\Models\Encounter;
use App\Models\MedicalRecord;
use App\Models\Medicine;
use App\Models\Prescription;
use App\PrescriptionStatus;
use App\Support\CurrentPractitioner;
use App\Support\Tenancy\CurrentClinic;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class SaveMedicalRecord
{
    private const SOAP_FIELDS = [
        'subjective', 'objective', 'assessment', 'plan', 'additional_notes',
    ];

    public function __construct(
        private readonly CurrentClinic $currentClinic,
        private readonly CurrentPractitioner $currentPractitioner,
        private readonly TransitionEncounter $transitionEncounter,
    ) {}

    /** @param array<string, mixed> $attributes */
    public function execute(Encounter $encounter, array $attributes, bool $finalize, int $userId): MedicalRecord
    {
        return DB::transaction(function () use ($encounter, $attributes, $finalize, $userId): MedicalRecord {
            $lockedEncounter = Encounter::query()
                ->whereKey($encounter->id)
                ->where('clinic_id', $this->currentClinic->id())
                ->lockForUpdate()
                ->firstOrFail();
            $practitioner = $this->currentPractitioner->find();

            if ($lockedEncounter->status !== EncounterStatus::InConsultation) {
                throw ValidationException::withMessages([
                    'intent' => 'Rekam medis hanya dapat disimpan saat pemeriksaan sedang berlangsung.',
                ]);
            }

            if ($practitioner === null || $practitioner->id !== $lockedEncounter->practitioner_id) {
                throw ValidationException::withMessages([
                    'intent' => 'Rekam medis hanya dapat diisi oleh dokter yang ditugaskan.',
                ]);
            }

            $medicalRecord = MedicalRecord::query()
                ->where('encounter_id', $lockedEncounter->id)
                ->lockForUpdate()
                ->first();
            $beforeValues = $medicalRecord === null ? null : $this->snapshot($medicalRecord);

            if ($medicalRecord !== null && $medicalRecord->status !== MedicalRecordStatus::Draft) {
                throw ValidationException::withMessages([
                    'intent' => 'Rekam medis final tidak dapat diedit. Gunakan Tambahkan Koreksi.',
                ]);
            }

            $diagnosisRows = $this->diagnosisRows($attributes['diagnoses'] ?? [], $finalize);
            $procedureRows = $this->procedureRows($attributes['procedures'] ?? []);
            $prescriptionRows = $this->prescriptionRows($attributes['prescription_items'] ?? []);

            if ($finalize) {
                $this->validateRequiredSoap($attributes);
            }

            if ($medicalRecord === null) {
                $medicalRecord = new MedicalRecord([
                    'encounter_id' => $lockedEncounter->id,
                    'patient_id' => $lockedEncounter->patient_id,
                    'practitioner_id' => $practitioner->id,
                    'created_by' => $userId,
                ]);
                $medicalRecord->clinic_id = $lockedEncounter->clinic_id;
            }

            $medicalRecord->fill([
                ...collect($attributes)->only(self::SOAP_FIELDS)->all(),
                'status' => $finalize ? MedicalRecordStatus::Final : MedicalRecordStatus::Draft,
                'finalized_at' => $finalize ? now() : null,
                'finalized_by' => $finalize ? $userId : null,
                'updated_by' => $userId,
            ])->save();

            $medicalRecord->diagnoses()->delete();
            foreach ($diagnosisRows as $row) {
                $diagnosis = $medicalRecord->diagnoses()->make([
                    ...$row,
                    'encounter_id' => $lockedEncounter->id,
                    'created_by' => $userId,
                ]);
                $diagnosis->forceFill(['clinic_id' => $lockedEncounter->clinic_id]);
                $diagnosis->save();
            }

            $medicalRecord->procedures()->delete();
            foreach ($procedureRows as $row) {
                $procedure = $medicalRecord->procedures()->make([
                    ...$row,
                    'encounter_id' => $lockedEncounter->id,
                    'practitioner_id' => $practitioner->id,
                    'performed_at' => $finalize ? now() : null,
                    'created_by' => $userId,
                ]);
                $procedure->forceFill(['clinic_id' => $lockedEncounter->clinic_id]);
                $procedure->save();
            }

            $prescription = $this->syncPrescription(
                $medicalRecord,
                $lockedEncounter,
                $prescriptionRows,
                (string) ($attributes['prescription_notes'] ?? ''),
                $finalize,
                $userId,
            );

            $medicalRecord->refresh()->load(['diagnoses', 'procedures', 'prescription.items']);
            $audit = $medicalRecord->audits()->make([
                'encounter_id' => $lockedEncounter->id,
                'action' => $finalize ? 'finalized' : 'draft_saved',
                'before_values' => $beforeValues,
                'after_values' => $this->snapshot($medicalRecord),
                'actor_id' => $userId,
            ]);
            $audit->forceFill(['clinic_id' => $lockedEncounter->clinic_id]);
            $audit->save();

            if ($finalize) {
                $this->transitionEncounter->execute(
                    $lockedEncounter,
                    $this->nextEncounterStatus($prescription),
                    $userId,
                    'Rekam medis difinalisasi',
                );
            }

            return $medicalRecord;
        }, attempts: 3);
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function diagnosisRows(mixed $rows, bool $finalize): array
    {
        $rows = is_array($rows) ? $rows : [];
        $primaryCount = collect($rows)->where('type', DiagnosisType::Primary->value)->count();
        $settings = ClinicWorkflowSetting::query()
            ->where('clinic_id', $this->currentClinic->id())
            ->firstOrNew();
        $requiresPrimaryDiagnosis = $settings->exists
            ? $settings->require_primary_diagnosis
            : true;

        if ($primaryCount > 1 || ($finalize && $requiresPrimaryDiagnosis && $primaryCount !== 1)) {
            throw ValidationException::withMessages([
                'diagnoses' => $primaryCount > 1
                    ? 'Hanya satu diagnosis utama yang diperbolehkan.'
                    : 'Pilih satu diagnosis utama sebelum finalisasi.',
            ]);
        }

        return collect($rows)->map(function (mixed $row): array {
            $row = is_array($row) ? $row : [];
            $catalog = DiagnosisCatalog::query()
                ->where('uuid', $row['catalog_id'] ?? null)
                ->where('is_active', true)
                ->first();

            if ($catalog === null) {
                throw ValidationException::withMessages(['diagnoses' => 'Salah satu diagnosis tidak valid.']);
            }

            return [
                'diagnosis_catalog_id' => $catalog->id,
                'code_system' => $catalog->code_system,
                'code' => $catalog->code,
                'display' => $catalog->display,
                'diagnosis_type' => DiagnosisType::from((string) ($row['type'] ?? 'secondary')),
                'clinical_status' => 'active',
                'notes' => filled($row['notes'] ?? null) ? trim((string) $row['notes']) : null,
            ];
        })->values()->all();
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function procedureRows(mixed $rows): array
    {
        return collect(is_array($rows) ? $rows : [])->map(function (mixed $row): array {
            $row = is_array($row) ? $row : [];
            $service = ClinicService::query()
                ->where('clinic_id', $this->currentClinic->id())
                ->where('uuid', $row['service_id'] ?? null)
                ->where('is_active', true)
                ->first();

            if ($service === null) {
                throw ValidationException::withMessages(['procedures' => 'Salah satu tindakan tidak valid.']);
            }

            return [
                'clinic_service_id' => $service->id,
                'code_system' => 'LOCAL',
                'code' => $service->code,
                'name_snapshot' => $service->name,
                'price_snapshot' => (int) round((float) $service->price),
                'notes' => filled($row['notes'] ?? null) ? trim((string) $row['notes']) : null,
            ];
        })->values()->all();
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function prescriptionRows(mixed $rows): array
    {
        return collect(is_array($rows) ? $rows : [])->map(function (mixed $row): array {
            $row = is_array($row) ? $row : [];
            $medicine = Medicine::query()
                ->where('clinic_id', $this->currentClinic->id())
                ->where('uuid', $row['medicine_id'] ?? null)
                ->where('is_active', true)
                ->first();

            if ($medicine === null) {
                throw ValidationException::withMessages(['prescription_items' => 'Salah satu obat tidak valid.']);
            }

            return [
                'medicine_id' => $medicine->id,
                'medicine_name_snapshot' => $medicine->name,
                'strength_snapshot' => $medicine->strength,
                'dosage_form_snapshot' => $medicine->dosage_form,
                'quantity' => (float) ($row['quantity'] ?? 0),
                'unit' => $medicine->unit,
                'dose_text' => $this->nullableText($row['dose_text'] ?? null),
                'frequency_text' => $this->nullableText($row['frequency_text'] ?? null),
                'route_text' => null,
                'timing_text' => $this->nullableText($row['timing_text'] ?? null),
                'duration_text' => $this->nullableText($row['duration_text'] ?? null),
                'instruction' => trim((string) ($row['instruction'] ?? '')),
                'notes' => $this->nullableText($row['notes'] ?? null),
            ];
        })->values()->all();
    }

    /** @param array<int, array<string, mixed>> $rows */
    private function syncPrescription(
        MedicalRecord $medicalRecord,
        Encounter $encounter,
        array $rows,
        string $notes,
        bool $finalize,
        int $userId,
    ): ?Prescription {
        $prescription = Prescription::query()
            ->where('encounter_id', $encounter->id)
            ->lockForUpdate()
            ->first();

        if ($rows === [] && blank($notes)) {
            $prescription?->delete();

            return null;
        }

        if ($prescription === null) {
            $prescription = new Prescription([
                'encounter_id' => $encounter->id,
                'medical_record_id' => $medicalRecord->id,
                'patient_id' => $encounter->patient_id,
                'practitioner_id' => $encounter->practitioner_id,
                'created_by' => $userId,
            ]);
            $prescription->forceFill(['clinic_id' => $encounter->clinic_id]);
        }

        $prescription->fill([
            'status' => $finalize ? PrescriptionStatus::Prescribed : PrescriptionStatus::Draft,
            'prescribed_at' => $finalize ? now() : null,
            'notes' => filled($notes) ? trim($notes) : null,
        ])->save();
        $prescription->items()->delete();

        foreach ($rows as $row) {
            $item = $prescription->items()->make($row);
            $item->forceFill(['clinic_id' => $encounter->clinic_id]);
            $item->save();
        }

        return $prescription->load('items');
    }

    /** @param array<string, mixed> $attributes */
    private function validateRequiredSoap(array $attributes): void
    {
        $missing = collect(['subjective', 'assessment', 'plan'])
            ->first(fn (string $field): bool => blank($attributes[$field] ?? null));

        if ($missing !== null) {
            throw ValidationException::withMessages([
                $missing => 'Bagian ini wajib diisi sebelum finalisasi.',
            ]);
        }
    }

    private function nextEncounterStatus(?Prescription $prescription): EncounterStatus
    {
        $settings = ClinicWorkflowSetting::query()
            ->where('clinic_id', $this->currentClinic->id())
            ->firstOrNew();
        $pharmacyEnabled = $settings->exists ? $settings->pharmacy_enabled : true;
        $billingEnabled = $settings->exists ? $settings->billing_enabled : true;

        if ($pharmacyEnabled && $prescription?->items->isNotEmpty()) {
            return EncounterStatus::WaitingPharmacy;
        }

        if ($billingEnabled) {
            return EncounterStatus::WaitingPayment;
        }

        return EncounterStatus::Completed;
    }

    /** @return array<string, mixed> */
    private function snapshot(MedicalRecord $medicalRecord): array
    {
        $medicalRecord->loadMissing(['diagnoses', 'procedures', 'prescription.items']);

        return [
            ...$medicalRecord->only([...self::SOAP_FIELDS, 'status', 'finalized_at']),
            'diagnoses' => $medicalRecord->diagnoses->map->only([
                'code_system', 'code', 'display', 'diagnosis_type', 'notes',
            ])->values()->all(),
            'procedures' => $medicalRecord->procedures->map->only([
                'code', 'name_snapshot', 'price_snapshot', 'notes',
            ])->values()->all(),
            'prescription' => $medicalRecord->prescription === null ? null : [
                'status' => $medicalRecord->prescription->status,
                'notes' => $medicalRecord->prescription->notes,
                'items' => $medicalRecord->prescription->items->map->only([
                    'medicine_name_snapshot', 'strength_snapshot', 'quantity',
                    'unit', 'instruction',
                ])->values()->all(),
            ],
        ];
    }

    private function nullableText(mixed $value): ?string
    {
        return filled($value) ? trim((string) $value) : null;
    }
}
