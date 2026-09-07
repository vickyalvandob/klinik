<?php

namespace Database\Seeders;

use App\Actions\CreatePatient;
use App\Actions\DispensePrescription;
use App\Actions\EnsureClinicRoles;
use App\Actions\ProcessPrescription;
use App\Actions\ReceivePayment;
use App\Actions\RegisterEncounter;
use App\Actions\SaveMedicalRecord;
use App\Actions\SaveTriage;
use App\Actions\StartConsultation;
use App\Models\Clinic;
use App\Models\ClinicMembership;
use App\Models\ClinicRole;
use App\Models\ClinicService;
use App\Models\DiagnosisCatalog;
use App\Models\Invoice;
use App\Models\Medicine;
use App\Models\MedicineStock;
use App\Models\Patient;
use App\Models\Practitioner;
use App\Models\Role;
use App\Models\ServiceUnit;
use App\Models\StaffProfile;
use App\Models\Tenant;
use App\Models\User;
use App\Support\DemoAccounts;
use App\Support\Tenancy\CurrentClinic;
use App\Support\Tenancy\CurrentTenant;
use App\TenantStatus;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class DemoClinicSeeder extends Seeder
{
    public function run(): void
    {
        if (! app()->environment(['local', 'testing'])) {
            return;
        }

        $currentTenant = app(CurrentTenant::class);
        $currentClinic = app(CurrentClinic::class);
        $previousTenant = $currentTenant->isResolved() ? $currentTenant->get() : null;
        $previousClinic = $currentClinic->isResolved() ? $currentClinic->get() : null;
        $previousMembership = $currentClinic->isResolved() ? $currentClinic->membership() : null;

        try {
            $currentClinic->clear();
            DB::transaction(fn () => $this->seedClinic());
        } finally {
            $currentClinic->clear();
            $currentTenant->clear();
            if ($previousTenant !== null) {
                $currentTenant->set($previousTenant);
            }
            if ($previousClinic !== null && $previousMembership !== null) {
                $currentClinic->set($previousClinic, $previousMembership);
            }
        }
    }

    private function seedClinic(): void
    {
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

        ClinicRole::query()->where('clinic_id', $clinic->id)
            ->with('role.permissions')->get()->each(function (ClinicRole $clinicRole): void {
                $clinicRole->permissions()->sync($clinicRole->role->permissions->modelKeys());
            });

        $staffDefinitions = DemoAccounts::staff();

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

        foreach ($staffDefinitions as $key => $definition) {
            $profile = $staff[$key];
            $user = User::query()->firstOrNew(['email' => $profile->email]);
            $user->fill(['name' => $profile->name, 'password' => Hash::make(DemoAccounts::PASSWORD)]);
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
            $membership->permissions()->sync([]);
        }

        $platformAdmin = User::query()->firstOrNew(['email' => 'platform@klinik.test']);
        $platformAdmin->fill(['name' => 'Platform Admin Demo', 'password' => Hash::make(DemoAccounts::PASSWORD)]);
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

        $owner = User::query()->where('email', 'owner@klinik.test')->firstOrFail();
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

        $this->seedEncounters($clinic, $generalUnit, $practitioner);
    }

    private function seedEncounters(Clinic $clinic, ServiceUnit $unit, Practitioner $practitioner): void
    {
        $definitions = [
            ['name' => 'Budi Santoso', 'birth_date' => '1990-03-15', 'gender' => 'male', 'national_id_number' => '3273011503900001', 'key' => 'budi', 'stage' => 'triage', 'complaint' => 'Demam dan batuk sejak dua hari.'],
            ['name' => 'Siti Aminah', 'birth_date' => '1992-11-05', 'gender' => 'female', 'national_id_number' => '3273014511920002', 'key' => 'siti', 'stage' => 'doctor', 'complaint' => 'Pusing sejak pagi.'],
            ['name' => 'Agus Setiawan', 'birth_date' => '1985-06-21', 'gender' => 'male', 'key' => 'agus', 'stage' => 'consultation', 'complaint' => 'Kontrol tekanan darah.'],
            ['name' => 'Dewi Kartika', 'birth_date' => '1994-08-12', 'gender' => 'female', 'key' => 'dewi', 'stage' => 'pharmacy', 'complaint' => 'Demam dan sakit kepala.'],
            ['name' => 'Hendra Gunawan', 'birth_date' => '1980-02-09', 'gender' => 'male', 'key' => 'hendra', 'stage' => 'billing', 'complaint' => 'Kontrol tekanan darah.'],
            ['name' => 'Maya Puspita', 'birth_date' => '1988-12-03', 'gender' => 'female', 'key' => 'maya', 'stage' => 'partial', 'complaint' => 'Konsultasi sakit kepala.'],
            ['name' => 'Rizky Ramadhan', 'birth_date' => '1997-04-17', 'gender' => 'male', 'key' => 'rizky', 'stage' => 'completed', 'complaint' => 'Demam sejak kemarin.'],
        ];
        $memberships = ClinicMembership::query()->where('clinic_id', $clinic->id)
            ->with(['role', 'staffProfile'])->get()->keyBy('staffProfile.email');
        $accounts = DemoAccounts::staff();
        $frontOffice = $memberships->get($accounts['front_office']['email']);
        $nurse = $memberships->get($accounts['nurse']['email']);
        $doctor = $memberships->get($accounts['doctor']['email']);
        $pharmacy = $memberships->get($accounts['pharmacy']['email']);
        $cashier = $memberships->get($accounts['cashier']['email']);
        $service = ClinicService::query()->where('clinic_id', $clinic->id)->where('code', 'KONS-UMUM')->firstOrFail();
        $medicine = Medicine::query()->where('clinic_id', $clinic->id)->where('code', 'OBT-001')->firstOrFail();
        $today = now($clinic->timezone)->toDateString();

        foreach ($definitions as $index => $definition) {
            app(CurrentClinic::class)->set($clinic, $frontOffice);
            $email = $definition['key'].'.demo@pasien.klinik.test';
            $patient = Patient::query()->where('email', $email)->first();
            if ($patient === null && isset($definition['national_id_number'])) {
                $patient = Patient::query()->where('national_id_number', $definition['national_id_number'])->first();
            }
            if ($patient === null) {
                $patient = app(CreatePatient::class)->execute([
                    'name' => $definition['name'], 'birth_date' => $definition['birth_date'],
                    'gender' => $definition['gender'], 'national_id_number' => $definition['national_id_number'] ?? null,
                    'email' => $email, 'phone' => '081200000'.str_pad((string) ($index + 1), 3, '0', STR_PAD_LEFT),
                    'address' => 'Jl. Melati No. '.($index + 10).', Bandung (data demo)',
                ], $definition['key'] === 'budi' ? [[
                    'substance' => 'Penisilin', 'reaction' => 'Ruam', 'severity' => 'moderate', 'status' => 'active',
                ]] : [], $frontOffice->user_id);
            }

            if ($patient->encounters()->where('clinic_id', $clinic->id)->whereDate('encounter_date', $today)->exists()) {
                continue;
            }

            $encounter = app(RegisterEncounter::class)->execute([
                'patient_id' => $patient->uuid, 'service_unit_id' => $unit->uuid,
                'practitioner_id' => $practitioner->uuid, 'chief_complaint' => $definition['complaint'],
            ], $frontOffice->user_id);
            if ($definition['stage'] === 'triage') {
                continue;
            }

            app(CurrentClinic::class)->set($clinic, $nurse);
            app(SaveTriage::class)->execute($encounter, [
                'chief_complaint' => $definition['complaint'], 'systolic_bp' => 120, 'diastolic_bp' => 80,
                'heart_rate' => 78, 'respiratory_rate' => 18, 'temperature' => 36.8, 'spo2' => 99,
                'weight' => 60, 'height' => 165, 'pain_scale' => 2, 'notes' => 'Contoh pemeriksaan awal untuk simulasi.',
            ], true, $nurse->user_id);
            if ($definition['stage'] === 'doctor') {
                continue;
            }

            app(CurrentClinic::class)->set($clinic, $doctor);
            $encounter = app(StartConsultation::class)->execute($encounter->refresh(), $doctor->user_id);
            $hasPrescription = in_array($definition['stage'], ['pharmacy', 'completed'], true);
            $diagnosisCode = in_array($definition['stage'], ['consultation', 'billing'], true) ? 'I10' : 'R51.9';
            $diagnosis = DiagnosisCatalog::query()->where('code_system', 'ICD-10')->where('code', $diagnosisCode)->firstOrFail();
            $record = app(SaveMedicalRecord::class)->execute($encounter, [
                'subjective' => $definition['complaint'], 'objective' => 'Kondisi umum baik. Pemeriksaan fisik sesuai catatan.',
                'assessment' => $diagnosisCode === 'I10' ? 'Kontrol hipertensi.' : 'Keluhan sakit kepala.',
                'plan' => 'Edukasi, evaluasi keluhan, dan kontrol bila keluhan menetap.',
                'additional_notes' => 'Data fiktif untuk simulasi operasional klinik.',
                'diagnoses' => [['catalog_id' => $diagnosis->uuid, 'type' => 'primary']],
                'procedures' => [['service_id' => $service->uuid]],
                'prescription_items' => $hasPrescription ? [[
                    'medicine_id' => $medicine->uuid, 'quantity' => 6, 'dose_text' => '1 tablet',
                    'frequency_text' => '3 kali sehari', 'duration_text' => '2 hari',
                    'instruction' => 'Contoh aturan pakai untuk simulasi demo.',
                ]] : [],
            ], $definition['stage'] !== 'consultation', $doctor->user_id);
            if (in_array($definition['stage'], ['consultation', 'pharmacy'], true)) {
                continue;
            }

            if ($hasPrescription) {
                app(CurrentClinic::class)->set($clinic, $pharmacy);
                $prescription = $record->prescription()->firstOrFail();
                app(ProcessPrescription::class)->execute($prescription, $pharmacy->user_id);
                app(DispensePrescription::class)->execute($prescription, $pharmacy->user_id);
            }

            if (in_array($definition['stage'], ['partial', 'completed'], true)) {
                app(CurrentClinic::class)->set($clinic, $cashier);
                $invoice = Invoice::query()->where('encounter_id', $encounter->id)->firstOrFail();
                app(ReceivePayment::class)->execute($invoice, [
                    'amount' => $definition['stage'] === 'partial' ? 25000 : $invoice->balance_due,
                    'method' => $definition['stage'] === 'partial' ? 'cash' : 'bank_transfer',
                    'reference_number' => $definition['stage'] === 'completed' ? 'DEMO-'.$invoice->invoice_number : null,
                    'notes' => 'Pembayaran simulasi demo.',
                ], $cashier->user_id);
            }
        }
    }
}
