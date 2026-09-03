<?php

use App\Models\ClinicService;
use App\Models\Medicine;
use App\Models\Practitioner;
use App\Models\ServiceUnit;
use App\Models\StaffProfile;
use App\SystemRole;
use Inertia\Testing\AssertableInertia as Assert;

test('an owner can configure all operational master data', function () {
    ['user' => $owner, 'clinic' => $clinic] = createClinicUser();

    $this->actingAs($owner)->post(route('master-data.store', 'staff'), [
        'employee_number' => 'STF-100',
        'name' => 'dr. Ayu Lestari',
        'email' => 'ayu@example.test',
        'phone' => '08123456789',
        'position' => 'Dokter',
        'employment_type' => 'permanent',
        'joined_on' => '2026-01-02',
    ])->assertRedirect();

    $staff = StaffProfile::withoutGlobalScopes()->where('clinic_id', $clinic->id)->where('employee_number', 'STF-100')->firstOrFail();

    $this->actingAs($owner)->post(route('master-data.store', 'practitioners'), [
        'staff_profile_id' => $staff->id,
        'profession' => 'doctor',
        'specialization' => 'Dokter umum',
        'license_number' => 'STR-100',
        'practice_license_number' => 'SIP-100',
        'schedule_notes' => 'Senin-Jumat',
    ])->assertRedirect();

    $this->actingAs($owner)->post(route('master-data.store', 'service-units'), [
        'code' => 'pu',
        'name' => 'Poli Umum',
        'type' => 'outpatient',
        'queue_prefix' => 'a',
        'description' => 'Pelayanan umum',
    ])->assertRedirect();

    $unit = ServiceUnit::withoutGlobalScopes()->where('clinic_id', $clinic->id)->where('code', 'PU')->firstOrFail();

    $this->actingAs($owner)->post(route('master-data.store', 'services'), [
        'service_unit_id' => $unit->id,
        'code' => 'kons-umum',
        'name' => 'Konsultasi Umum',
        'description' => 'Konsultasi dokter umum',
        'price' => 75000,
        'duration_minutes' => 20,
    ])->assertRedirect();

    $this->actingAs($owner)->post(route('master-data.store', 'medicines'), [
        'code' => 'obt-100',
        'name' => 'Paracetamol',
        'generic_name' => 'Paracetamol',
        'category' => 'Analgesik',
        'dosage_form' => 'Tablet',
        'strength' => '500 mg',
        'unit' => 'tablet',
        'purchase_price' => 500,
        'selling_price' => 1000,
        'minimum_stock' => 20,
    ])->assertRedirect();

    expect(Practitioner::withoutGlobalScopes()->where('clinic_id', $clinic->id)->count())->toBe(1)
        ->and(ClinicService::withoutGlobalScopes()->where('clinic_id', $clinic->id)->where('code', 'KONS-UMUM')->exists())->toBeTrue()
        ->and(Medicine::withoutGlobalScopes()->where('clinic_id', $clinic->id)->where('code', 'OBT-100')->exists())->toBeTrue();

    $this->actingAs($owner)->patch(route('master-data.toggle', ['resource' => 'staff', 'record' => $staff->uuid]))
        ->assertSessionHasErrors('status');

    expect($staff->refresh()->is_active)->toBeTrue();

    $this->actingAs($owner)->get(route('master-data.index', ['resource' => 'medicines', 'search' => 'Paracetamol']))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('master-data/index')
            ->where('resource', 'medicines')
            ->has('records.data', 1)
            ->where('records.data.0.columns.name', 'Paracetamol')
        );
});

test('master data validation rejects relations from another tenant', function () {
    ['user' => $owner] = createClinicUser();
    ['clinic' => $foreignClinic] = createClinicUser();
    $foreignUnit = ServiceUnit::factory()->create([
        'tenant_id' => $foreignClinic->tenant_id,
        'clinic_id' => $foreignClinic->id,
    ]);

    $this->actingAs($owner)->post(route('master-data.store', 'services'), [
        'service_unit_id' => $foreignUnit->id,
        'code' => 'CROSS',
        'name' => 'Cross Tenant',
        'price' => 1000,
        'duration_minutes' => 15,
    ])->assertSessionHasErrors('service_unit_id');

    expect(ClinicService::withoutGlobalScopes()->where('code', 'CROSS')->exists())->toBeFalse();
});

test('users without master data permission cannot browse or mutate it', function () {
    ['user' => $doctor] = createClinicUser(SystemRole::Doctor);

    $this->actingAs($doctor)->get(route('master-data.index', 'medicines'))->assertForbidden();
    $this->actingAs($doctor)->post(route('master-data.store', 'medicines'), [])->assertForbidden();
});
