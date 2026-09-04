<?php

use App\Models\Clinic;
use App\Models\ClinicMembership;
use App\Models\ClinicService;
use App\Models\ClinicWorkflowSetting;
use App\Models\Practitioner;
use App\Models\Role;
use App\Models\ServiceUnit;
use App\Models\StaffProfile;
use App\Models\User;
use App\SystemRole;
use Inertia\Testing\AssertableInertia as Assert;

test('an incomplete clinic is directed to the six-step onboarding', function () {
    ['user' => $user, 'clinic' => $clinic] = createClinicUser();
    $clinic->forceFill(['onboarding_step' => 1, 'onboarding_completed_at' => null])->save();

    $this->actingAs($user)->get(route('dashboard'))
        ->assertRedirect(route('onboarding.show'));

    $this->actingAs($user)->get(route('onboarding.show'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('onboarding/show')
            ->where('step', 1)
            ->has('roles', 5)
        );
});

test('an owner can complete onboarding and make a new clinic operational', function () {
    ['user' => $owner, 'clinic' => $clinic] = createClinicUser();
    $clinic->forceFill(['onboarding_step' => 1, 'onboarding_completed_at' => null])->save();
    $frontOfficeRole = Role::query()->where('code', SystemRole::FrontOffice->value)->firstOrFail();

    $this->actingAs($owner)->put(route('onboarding.clinic'), [
        'name' => 'Klinik Harapan Baru',
        'legal_name' => 'PT Harapan Baru Medika',
        'facility_type' => 'primary_clinic',
        'facility_identifier' => 'KHB-001',
        'address' => 'Jl. Sehat No. 10, Bandung',
        'phone' => '022-1234567',
        'email' => 'halo@harapan.test',
        'timezone' => 'Asia/Jakarta',
    ])->assertRedirect(route('onboarding.show'));

    $this->actingAs($owner)->put(route('onboarding.doctor'), [
        'employee_number' => 'DOC-001',
        'name' => 'dr. Rani Putri',
        'email' => 'rani@harapan.test',
        'phone' => '08123456789',
        'specialization' => 'Dokter umum',
        'license_number' => 'STR-123456',
        'practice_license_number' => 'SIP-123456',
    ])->assertRedirect(route('onboarding.show'));

    $this->actingAs($owner)->put(route('onboarding.users'), [
        'skip' => false,
        'name' => 'Petugas Pendaftaran',
        'email' => 'frontoffice@harapan.test',
        'password' => 'password',
        'password_confirmation' => 'password',
        'role_id' => $frontOfficeRole->id,
    ])->assertRedirect(route('onboarding.show'));

    $this->actingAs($owner)->put(route('onboarding.services'), [
        'unit_code' => 'PU',
        'unit_name' => 'Poli Umum',
        'queue_prefix' => 'A',
        'service_code' => 'KONS-UMUM',
        'service_name' => 'Konsultasi Dokter Umum',
        'price' => 75000,
        'duration_minutes' => 20,
    ])->assertRedirect(route('onboarding.show'));

    $this->actingAs($owner)->put(route('onboarding.workflow'), [
        'opening_time' => '08:00',
        'closing_time' => '18:00',
        'default_visit_duration_minutes' => 20,
        'require_triage' => true,
        'allow_walk_in' => true,
        'pharmacy_enabled' => true,
        'billing_enabled' => true,
        'require_primary_diagnosis' => true,
        'require_final_medical_record' => true,
        'allow_partial_payment' => false,
        'auto_send_prescription_to_pharmacy' => true,
    ])->assertRedirect(route('onboarding.show'));

    $this->actingAs($owner)->post(route('onboarding.complete'))
        ->assertRedirect(route('dashboard'));

    $operationalClinic = Clinic::withoutGlobalScopes()->findOrFail($clinic->id);

    expect($operationalClinic->name)->toBe('Klinik Harapan Baru')
        ->and($operationalClinic->onboarding_step)->toBe(6)
        ->and($operationalClinic->onboarding_completed_at)->not->toBeNull()
        ->and(StaffProfile::withoutGlobalScopes()->where('clinic_id', $clinic->id)->count())->toBe(1)
        ->and(Practitioner::withoutGlobalScopes()->where('clinic_id', $clinic->id)->count())->toBe(1)
        ->and(ServiceUnit::withoutGlobalScopes()->where('clinic_id', $clinic->id)->count())->toBe(1)
        ->and(ClinicService::withoutGlobalScopes()->where('clinic_id', $clinic->id)->count())->toBe(1)
        ->and(ClinicWorkflowSetting::withoutGlobalScopes()->where('clinic_id', $clinic->id)->exists())->toBeTrue()
        ->and(ClinicMembership::withoutGlobalScopes()->where('clinic_id', $clinic->id)->count())->toBe(2)
        ->and(User::query()->where('email', 'frontoffice@harapan.test')->exists())->toBeTrue();

    $this->actingAs($owner)->get(route('dashboard'))->assertOk();
});

test('onboarding steps cannot be skipped through direct requests', function () {
    ['user' => $owner, 'clinic' => $clinic] = createClinicUser();
    $clinic->forceFill(['onboarding_step' => 1, 'onboarding_completed_at' => null])->save();

    $this->actingAs($owner)->put(route('onboarding.doctor'), [
        'name' => 'dr. Bypass',
        'license_number' => 'STR-BYPASS',
    ])->assertConflict();

    expect(StaffProfile::withoutGlobalScopes()->where('clinic_id', $clinic->id)->exists())->toBeFalse();
});

test('users without clinic management permission cannot run onboarding', function () {
    ['user' => $doctor, 'clinic' => $clinic] = createClinicUser(SystemRole::Doctor);
    $clinic->forceFill(['onboarding_step' => 1, 'onboarding_completed_at' => null])->save();

    $this->actingAs($doctor)->get(route('onboarding.show'))->assertForbidden();
});
