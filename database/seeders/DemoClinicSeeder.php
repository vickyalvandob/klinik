<?php

namespace Database\Seeders;

use App\Actions\EnsureClinicRoles;
use App\EncounterStatus;
use App\Models\Clinic;
use App\Models\ClinicMembership;
use App\Models\ClinicService;
use App\Models\ClinicWorkflowSetting;
use App\Models\DailySequence;
use App\Models\DiagnosisCatalog;
use App\Models\Encounter;
use App\Models\EncounterStatusHistory;
use App\Models\Medicine;
use App\Models\MedicineStock;
use App\Models\Patient;
use App\Models\PatientAllergy;
use App\Models\Practitioner;
use App\Models\QueueEntry;
use App\Models\Role;
use App\Models\ServiceUnit;
use App\Models\StaffProfile;
use App\Models\Tenant;
use App\Models\Triage;
use App\Models\TriageAudit;
use App\Models\User;
use App\QueueStatus;
use App\Support\Tenancy\CurrentClinic;
use App\Support\Tenancy\CurrentTenant;
use App\SystemRole;
use App\TenantStatus;
use App\TriageStatus;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DemoClinicSeeder extends Seeder
{
    public function run(): void
    {
        if (! app()->environment(['local', 'testing'])) {
            return;
        }

        $this->call(AuthorizationSeeder::class);

        foreach ([
            ['code' => 'J00', 'display' => 'Acute nasopharyngitis (common cold)', 'search_terms' => 'pilek common cold nasofaringitis'],
            ['code' => 'J02.9', 'display' => 'Acute pharyngitis, unspecified', 'search_terms' => 'faringitis radang tenggorokan'],
            ['code' => 'R50.9', 'display' => 'Fever, unspecified', 'search_terms' => 'demam fever'],
            ['code' => 'R51.9', 'display' => 'Headache, unspecified', 'search_terms' => 'sakit kepala pusing headache'],
            ['code' => 'I10', 'display' => 'Essential (primary) hypertension', 'search_terms' => 'hipertensi tekanan darah tinggi'],
            ['code' => 'E11.9', 'display' => 'Type 2 diabetes mellitus without complications', 'search_terms' => 'diabetes melitus gula darah'],
        ] as $definition) {
            DiagnosisCatalog::query()->updateOrCreate(
                ['code_system' => 'ICD-10', 'code' => $definition['code']],
                [...$definition, 'code_system' => 'ICD-10', 'is_active' => true],
            );
        }

        $tenant = Tenant::query()->updateOrCreate(
            ['slug' => 'klinik-sehat-sentosa'],
            [
                'name' => 'Klinik Sehat Sentosa',
                'status' => TenantStatus::Active,
                'trial_ends_at' => now()->addDays(30),
            ],
        );
        app(CurrentTenant::class)->set($tenant);

        $clinic = Clinic::query()->firstOrNew(['facility_identifier' => 'KSS-001']);
        $clinic->fill([
            'name' => 'Klinik Sehat Sentosa',
            'legal_name' => 'PT Sehat Sentosa Medika',
            'facility_type' => 'primary_clinic',
            'facility_identifier' => 'KSS-001',
            'address' => 'Jl. Melati No. 25, Bandung, Jawa Barat',
            'province_code' => '32',
            'city_code' => '3273',
            'district_code' => '3273010',
            'village_code' => '3273010001',
            'phone' => '022-555-0101',
            'email' => 'halo@klinik.test',
            'timezone' => 'Asia/Jakarta',
            'is_active' => true,
        ]);
        $clinic->save();
        $clinic->forceFill([
            'onboarding_step' => 6,
            'onboarding_completed_at' => now(),
        ])->save();
        app(CurrentClinic::class)->clear();
        app(EnsureClinicRoles::class)->execute($clinic);

        $staffDefinitions = [
            'owner' => ['number' => 'STF-001', 'name' => 'Vicky Pratama', 'email' => 'owner@klinik.test', 'position' => 'Pemilik Klinik'],
            'front_office' => ['number' => 'STF-002', 'name' => 'Nadia Putri', 'email' => 'frontoffice@klinik.test', 'position' => 'Front Office'],
            'nurse' => ['number' => 'STF-003', 'name' => 'Siti Rahma', 'email' => 'perawat@klinik.test', 'position' => 'Perawat'],
            'doctor' => ['number' => 'STF-004', 'name' => 'dr. Andi Wijaya', 'email' => 'dokter@klinik.test', 'position' => 'Dokter Umum'],
            'pharmacy' => ['number' => 'STF-005', 'name' => 'Rina Lestari, S.Farm.', 'email' => 'farmasi@klinik.test', 'position' => 'Petugas Farmasi'],
            'cashier' => ['number' => 'STF-006', 'name' => 'Dimas Saputra', 'email' => 'kasir@klinik.test', 'position' => 'Kasir'],
        ];

        /** @var array<string, StaffProfile> $staff */
        $staff = [];
        foreach ($staffDefinitions as $key => $definition) {
            $profile = StaffProfile::query()->firstOrNew([
                'clinic_id' => $clinic->id,
                'employee_number' => $definition['number'],
            ]);
            $profile->fill([
                'name' => $definition['name'],
                'email' => $definition['email'],
                'phone' => '0812'.str_pad((string) (count($staff) + 1), 8, '0', STR_PAD_LEFT),
                'position' => $definition['position'],
                'employment_type' => 'permanent',
                'joined_on' => now()->subYear()->toDateString(),
                'is_active' => true,
            ]);
            $profile->clinic_id = $clinic->id;
            $profile->save();
            $staff[$key] = $profile;
        }

        $practitioner = Practitioner::query()->firstOrNew([
            'clinic_id' => $clinic->id,
            'staff_profile_id' => $staff['doctor']->id,
        ]);
        $practitioner->fill([
            'profession' => 'doctor',
            'specialization' => 'Dokter umum',
            'license_number' => 'STR-TEST-0001',
            'practice_license_number' => 'SIP-TEST-0001',
            'schedule_notes' => 'Senin-Sabtu, 08.00-14.00',
            'is_active' => true,
        ]);
        $practitioner->clinic_id = $clinic->id;
        $practitioner->save();

        $accountDefinitions = [
            ['staff' => 'owner', 'role' => SystemRole::OwnerAdmin],
            ['staff' => 'front_office', 'role' => SystemRole::FrontOffice],
            ['staff' => 'nurse', 'role' => SystemRole::Nurse],
            ['staff' => 'doctor', 'role' => SystemRole::Doctor],
            ['staff' => 'pharmacy', 'role' => SystemRole::Pharmacy],
            ['staff' => 'cashier', 'role' => SystemRole::Cashier],
        ];

        foreach ($accountDefinitions as $definition) {
            $profile = $staff[$definition['staff']];
            $user = User::query()->firstOrNew(['email' => $profile->email]);
            $user->fill(['name' => $profile->name, 'password' => Hash::make('password')]);
            $user->forceFill([
                'email_verified_at' => now(),
                'is_active' => true,
                'is_platform_admin' => false,
            ])->save();
            $role = Role::query()->where('code', $definition['role']->value)->firstOrFail();
            $membership = ClinicMembership::query()->firstOrNew([
                'clinic_id' => $clinic->id,
                'user_id' => $user->id,
            ]);
            $membership->fill([
                'staff_profile_id' => $profile->id,
                'role_id' => $role->id,
                'is_active' => true,
            ]);
            $membership->clinic_id = $clinic->id;
            $membership->save();
        }

        $platformAdmin = User::query()->firstOrNew(['email' => 'platform@klinik.test']);
        $platformAdmin->fill(['name' => 'Platform Admin Demo', 'password' => Hash::make('password')]);
        $platformAdmin->forceFill([
            'email_verified_at' => now(),
            'is_active' => true,
            'is_platform_admin' => true,
        ])->save();

        foreach ([
            ['code' => 'PU', 'name' => 'Poli Umum', 'type' => 'outpatient', 'queue_prefix' => 'A'],
            ['code' => 'LAB', 'name' => 'Laboratorium', 'type' => 'laboratory', 'queue_prefix' => 'L'],
            ['code' => 'FAR', 'name' => 'Farmasi', 'type' => 'pharmacy', 'queue_prefix' => 'F'],
        ] as $definition) {
            $unit = ServiceUnit::query()->firstOrNew(['clinic_id' => $clinic->id, 'code' => $definition['code']]);
            $unit->fill([...$definition, 'is_active' => true]);
            $unit->clinic_id = $clinic->id;
            $unit->save();
        }

        $generalUnit = ServiceUnit::query()->where('clinic_id', $clinic->id)->where('code', 'PU')->firstOrFail();
        foreach ([
            ['code' => 'KONS-UMUM', 'name' => 'Konsultasi Dokter Umum', 'price' => 75000, 'duration_minutes' => 20],
            ['code' => 'TINDAKAN-LUKA', 'name' => 'Perawatan Luka Ringan', 'price' => 50000, 'duration_minutes' => 20],
            ['code' => 'SURAT-SEHAT', 'name' => 'Pemeriksaan Surat Keterangan Sehat', 'price' => 60000, 'duration_minutes' => 15],
        ] as $definition) {
            $service = ClinicService::query()->firstOrNew(['clinic_id' => $clinic->id, 'code' => $definition['code']]);
            $service->fill([...$definition, 'service_unit_id' => $generalUnit->id, 'is_active' => true]);
            $service->clinic_id = $clinic->id;
            $service->save();
        }

        foreach ([
            ['code' => 'OBT-001', 'name' => 'Paracetamol', 'generic_name' => 'Paracetamol', 'category' => 'Analgesik', 'dosage_form' => 'Tablet', 'strength' => '500 mg', 'unit' => 'tablet', 'purchase_price' => 400, 'selling_price' => 1000, 'minimum_stock' => 50],
            ['code' => 'OBT-002', 'name' => 'Amoxicillin', 'generic_name' => 'Amoxicillin', 'category' => 'Antibiotik', 'dosage_form' => 'Kapsul', 'strength' => '500 mg', 'unit' => 'kapsul', 'purchase_price' => 800, 'selling_price' => 1800, 'minimum_stock' => 30],
            ['code' => 'OBT-003', 'name' => 'Antasida DOEN', 'generic_name' => 'Aluminium hydroxide + Magnesium hydroxide', 'category' => 'Antasida', 'dosage_form' => 'Tablet kunyah', 'strength' => null, 'unit' => 'tablet', 'purchase_price' => 300, 'selling_price' => 800, 'minimum_stock' => 40],
        ] as $definition) {
            $medicine = Medicine::query()->firstOrNew(['clinic_id' => $clinic->id, 'code' => $definition['code']]);
            $medicine->fill([...$definition, 'is_active' => true]);
            $medicine->clinic_id = $clinic->id;
            $medicine->save();
        }

        $workflow = ClinicWorkflowSetting::query()->firstOrNew(['clinic_id' => $clinic->id]);
        $workflow->fill([
            'opening_time' => '08:00',
            'closing_time' => '20:00',
            'default_visit_duration_minutes' => 20,
            'require_triage' => true,
            'allow_walk_in' => true,
            'pharmacy_enabled' => true,
            'billing_enabled' => true,
            'require_primary_diagnosis' => true,
            'require_final_medical_record' => true,
            'allow_partial_payment' => false,
            'auto_send_prescription_to_pharmacy' => true,
        ]);
        $workflow->clinic_id = $clinic->id;
        $workflow->save();

        $owner = User::query()->where('email', 'owner@klinik.test')->firstOrFail();
        $frontOffice = User::query()->where('email', 'frontoffice@klinik.test')->firstOrFail();
        $nurse = User::query()->where('email', 'perawat@klinik.test')->firstOrFail();
        $ownerMembership = ClinicMembership::query()
            ->where('clinic_id', $clinic->id)
            ->where('user_id', $owner->id)
            ->firstOrFail();
        app(CurrentClinic::class)->set($clinic, $ownerMembership);

        Medicine::query()->where('clinic_id', $clinic->id)->each(function (Medicine $medicine) use ($clinic): void {
            $stock = MedicineStock::query()->firstOrNew(['medicine_id' => $medicine->id]);

            if (! $stock->exists) {
                $stock->fill(['quantity' => 100, 'last_movement_at' => now()]);
                $stock->clinic_id = $clinic->id;
                $stock->save();
            }
        });

        $patientDefinitions = [
            [
                'medical_record_sequence' => 1,
                'medical_record_number' => 'RM000001',
                'national_id_number' => '3273011503900001',
                'name' => 'Budi Santoso',
                'birth_date' => '1990-03-15',
                'gender' => 'male',
                'phone' => '081234567801',
                'address' => 'Bandung',
            ],
            [
                'medical_record_sequence' => 2,
                'medical_record_number' => 'RM000002',
                'national_id_number' => '3273014511920002',
                'name' => 'Siti Aminah',
                'birth_date' => '1992-11-05',
                'gender' => 'female',
                'phone' => '081234567802',
                'address' => 'Bandung',
            ],
        ];

        foreach ($patientDefinitions as $definition) {
            $patient = Patient::query()->firstOrNew([
                'medical_record_number' => $definition['medical_record_number'],
            ]);
            $patient->fill([
                ...$definition,
                'created_by' => $frontOffice->id,
            ])->save();
        }

        $budi = Patient::query()->where('medical_record_number', 'RM000001')->firstOrFail();
        $allergy = PatientAllergy::query()->firstOrNew([
            'patient_id' => $budi->id,
            'substance' => 'Penisilin',
        ]);
        $allergy->fill([
            'reaction' => 'Ruam',
            'severity' => 'moderate',
            'status' => 'active',
            'noted_by' => $frontOffice->id,
            'noted_at' => now(),
        ])->save();

        $siti = Patient::query()->where('medical_record_number', 'RM000002')->firstOrFail();
        $today = now($clinic->timezone);
        $encounterDefinitions = [
            [
                'patient' => $budi,
                'sequence' => 1,
                'queue' => 'A001',
                'status' => EncounterStatus::WaitingTriage,
                'chief_complaint' => 'Demam dan batuk sejak dua hari.',
            ],
            [
                'patient' => $siti,
                'sequence' => 2,
                'queue' => 'A002',
                'status' => EncounterStatus::WaitingDoctor,
                'chief_complaint' => 'Pusing sejak pagi.',
            ],
        ];

        foreach ($encounterDefinitions as $definition) {
            $registrationNumber = sprintf('REG-%s-%04d', $today->format('Ymd'), $definition['sequence']);
            $encounter = Encounter::query()->firstOrNew([
                'clinic_id' => $clinic->id,
                'registration_number' => $registrationNumber,
            ]);
            $encounter->fill([
                'patient_id' => $definition['patient']->id,
                'service_unit_id' => $generalUnit->id,
                'practitioner_id' => $practitioner->id,
                'encounter_date' => $today->toDateString(),
                'registration_sequence' => $definition['sequence'],
                'registration_type' => 'walk_in',
                'chief_complaint' => $definition['chief_complaint'],
                'status' => $definition['status'],
                'registered_at' => $today->copy()->setTime(8, 0)->addMinutes(($definition['sequence'] - 1) * 10),
                'registered_by' => $frontOffice->id,
            ]);
            $encounter->clinic_id = $clinic->id;
            $encounter->save();

            $queue = QueueEntry::query()->firstOrNew(['encounter_id' => $encounter->id]);
            $queue->fill([
                'service_unit_id' => $generalUnit->id,
                'practitioner_id' => $practitioner->id,
                'queue_date' => $today->toDateString(),
                'queue_sequence' => $definition['sequence'],
                'queue_number' => $definition['queue'],
                'status' => QueueStatus::Waiting,
            ]);
            $queue->clinic_id = $clinic->id;
            $queue->save();

            $history = EncounterStatusHistory::query()->firstOrNew([
                'encounter_id' => $encounter->id,
                'to_status' => $definition['status']->value,
            ]);
            $history->fill([
                'from_status' => null,
                'reason' => 'Data demo pendaftaran',
                'changed_by' => $frontOffice->id,
            ]);
            $history->clinic_id = $clinic->id;
            $history->save();
        }

        foreach (['encounter-registration', "queue:{$generalUnit->id}"] as $scope) {
            $dailySequence = DailySequence::query()
                ->where('clinic_id', $clinic->id)
                ->whereDate('sequence_date', $today->toDateString())
                ->where('scope', $scope)
                ->first() ?? new DailySequence([
                    'sequence_date' => $today->toDateString(),
                    'scope' => $scope,
                ]);
            $dailySequence->fill(['last_number' => 2]);
            $dailySequence->clinic_id = $clinic->id;
            $dailySequence->save();
        }

        $completedEncounter = Encounter::query()
            ->where('patient_id', $siti->id)
            ->whereDate('encounter_date', $today->toDateString())
            ->firstOrFail();
        $triage = Triage::query()->firstOrNew(['encounter_id' => $completedEncounter->id]);
        $triage->fill([
            'chief_complaint' => $completedEncounter->chief_complaint,
            'systolic_bp' => 110,
            'diastolic_bp' => 70,
            'heart_rate' => 76,
            'respiratory_rate' => 18,
            'temperature' => 36.8,
            'spo2' => 99,
            'weight' => 55.5,
            'height' => 158,
            'pain_scale' => 3,
            'notes' => 'Kondisi umum stabil.',
            'status' => TriageStatus::Completed,
            'completed_at' => $today->copy()->setTime(8, 20),
            'created_by' => $nurse->id,
            'updated_by' => $nurse->id,
        ]);
        $triage->clinic_id = $clinic->id;
        $triage->save();

        $audit = TriageAudit::query()->firstOrNew([
            'triage_id' => $triage->id,
            'action' => 'completed',
        ]);
        $audit->fill([
            'encounter_id' => $completedEncounter->id,
            'before_values' => null,
            'after_values' => $triage->only([
                'chief_complaint', 'systolic_bp', 'diastolic_bp', 'heart_rate',
                'respiratory_rate', 'temperature', 'spo2', 'weight', 'height',
                'pain_scale', 'notes', 'status', 'completed_at',
            ]),
            'actor_id' => $nurse->id,
        ]);
        $audit->clinic_id = $clinic->id;
        $audit->save();
    }
}
