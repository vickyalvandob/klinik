<?php

use App\Models\Patient;
use App\Models\PatientAllergy;
use App\Models\Tenant;
use App\Models\User;
use App\SystemRole;
use Inertia\Testing\AssertableInertia as Assert;

test('front office can create a patient with a generated medical record number and allergy', function () {
    ['user' => $user, 'tenant' => $tenant] = createClinicUser(SystemRole::FrontOffice);

    $this->actingAs($user)->post(route('patients.store'), [
        'name' => 'Budi Santoso',
        'birth_date' => '1990-05-10',
        'gender' => 'male',
        'national_id_number' => '3273011005900001',
        'phone' => '081234567890',
        'allergies' => [[
            'substance' => 'Penisilin',
            'reaction' => 'Ruam',
            'severity' => 'moderate',
            'status' => 'active',
        ]],
    ])->assertRedirect();

    $patient = Patient::withoutGlobalScopes()->where('tenant_id', $tenant->id)->sole();

    expect($patient->medical_record_number)->toBe('RM000001')
        ->and($patient->medical_record_sequence)->toBe(1)
        ->and($patient->name)->toBe('Budi Santoso')
        ->and(PatientAllergy::withoutGlobalScopes()->where('patient_id', $patient->id)->count())->toBe(1);
});

test('medical record numbers remain unique and sequential per tenant', function () {
    ['user' => $user, 'tenant' => $tenant] = createClinicUser(SystemRole::FrontOffice);

    foreach (['Pasien Pertama', 'Pasien Kedua'] as $index => $name) {
        $this->actingAs($user)->post(route('patients.store'), [
            'name' => $name,
            'birth_date' => '1990-05-10',
            'gender' => 'male',
            'phone' => '08123456789'.($index + 1),
            'duplicate_reviewed' => true,
        ])->assertRedirect();
    }

    expect(Patient::withoutGlobalScopes()
        ->where('tenant_id', $tenant->id)
        ->orderBy('medical_record_sequence')
        ->pluck('medical_record_number')
        ->all())->toBe(['RM000001', 'RM000002']);
});

test('an exact duplicate NIK is rejected even when duplicate review is confirmed', function () {
    ['user' => $user, 'tenant' => $tenant] = createClinicUser(SystemRole::FrontOffice);
    Patient::factory()->create([
        'tenant_id' => $tenant->id,
        'created_by' => $user->id,
        'national_id_number' => '3273011005900001',
    ]);

    $this->actingAs($user)->from(route('patients.create'))->post(route('patients.store'), [
        'name' => 'Pasien Lain',
        'birth_date' => '1991-06-11',
        'gender' => 'female',
        'national_id_number' => '3273011005900001',
        'duplicate_reviewed' => true,
    ])->assertRedirect(route('patients.create'))
        ->assertSessionHasErrors([
            'national_id_number' => 'NIK sudah digunakan oleh pasien lain. Buka data pasien tersebut sebelum melanjutkan.',
        ]);

    expect(Patient::withoutGlobalScopes()->where('tenant_id', $tenant->id)->count())->toBe(1);
});

test('a probable duplicate requires review but may be stored after explicit confirmation', function () {
    ['user' => $user, 'tenant' => $tenant] = createClinicUser(SystemRole::FrontOffice);
    Patient::factory()->create([
        'tenant_id' => $tenant->id,
        'created_by' => $user->id,
        'name' => 'Siti Aminah',
        'birth_date' => '1988-01-02',
        'national_id_number' => null,
        'phone' => '081200001111',
    ]);
    $payload = [
        'name' => 'Siti Aminah',
        'birth_date' => '1988-01-02',
        'gender' => 'female',
        'phone' => '081200001111',
    ];

    $this->actingAs($user)->post(route('patients.store'), $payload)
        ->assertSessionHasErrors([
            'duplicate_reviewed' => 'Kemungkinan pasien sudah terdaftar. Periksa kandidat duplikat atau konfirmasi bahwa pasien memang berbeda.',
        ]);

    $this->actingAs($user)->post(route('patients.store'), [
        ...$payload,
        'duplicate_reviewed' => true,
    ])->assertRedirect();

    expect(Patient::withoutGlobalScopes()->where('tenant_id', $tenant->id)->count())->toBe(2);
});

test('patient search and detail never expose another tenant patient', function () {
    ['user' => $user, 'tenant' => $tenant] = createClinicUser(SystemRole::FrontOffice);
    $visible = Patient::factory()->create([
        'tenant_id' => $tenant->id,
        'created_by' => $user->id,
        'name' => 'Pasien Tenant Aktif',
        'national_id_number' => null,
    ]);
    $foreignTenant = Tenant::factory()->create();
    $foreign = Patient::factory()->create([
        'tenant_id' => $foreignTenant->id,
        'created_by' => User::factory()->create()->id,
        'name' => 'Pasien Rahasia',
        'national_id_number' => null,
    ]);

    $this->actingAs($user)->get(route('patients.index', ['search' => 'Pasien']))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('patients/index')
            ->has('patients.data', 1)
            ->where('patients.data.0.uuid', $visible->uuid));

    $this->actingAs($user)->get(route('patients.show', $foreign))->assertNotFound();
});

test('patients have no normal delete endpoint', function () {
    ['user' => $user, 'tenant' => $tenant] = createClinicUser(SystemRole::OwnerAdmin);
    $patient = Patient::factory()->create([
        'tenant_id' => $tenant->id,
        'created_by' => $user->id,
        'national_id_number' => null,
    ]);

    $this->actingAs($user)->delete("/patients/{$patient->uuid}")->assertMethodNotAllowed();

    $this->assertModelExists($patient);
});
