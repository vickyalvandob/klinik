<?php

namespace Database\Seeders;

use App\Actions\EnsureClinicRoles;
use App\Models\Clinic;
use App\Models\ClinicMembership;
use App\Models\ClinicService;
use App\Models\ClinicWorkflowSetting;
use App\Models\Medicine;
use App\Models\Practitioner;
use App\Models\Role;
use App\Models\ServiceUnit;
use App\Models\StaffProfile;
use App\Models\Tenant;
use App\Models\User;
use App\Support\Tenancy\CurrentClinic;
use App\Support\Tenancy\CurrentTenant;
use App\SystemRole;
use App\TenantStatus;
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
            'auto_send_prescription_to_pharmacy' => true,
        ]);
        $workflow->clinic_id = $clinic->id;
        $workflow->save();
    }
}
