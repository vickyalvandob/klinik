<?php

use App\Models\ClinicWorkflowSetting;
use App\SystemRole;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

test('an owner can update the clinic profile while workflow settings are retired', function () {
    Storage::fake('public');
    ['user' => $owner, 'clinic' => $clinic] = createClinicUser();

    $this->actingAs($owner)->put(route('clinics.update', $clinic), [
        'name' => 'Klinik Sentosa Utama',
        'legal_name' => 'PT Sentosa Utama',
        'facility_type' => 'primary_clinic',
        'facility_identifier' => 'KSU-01',
        'address' => 'Jl. Mawar No. 9',
        'province_code' => '32',
        'city_code' => '3273',
        'district_code' => '3273010',
        'village_code' => '3273010001',
        'phone' => '022-7654321',
        'email' => 'admin@sentosa.test',
        'timezone' => 'Asia/Jakarta',
        'satusehat_organization_id' => 'ORG-123',
        'logo' => UploadedFile::fake()->image('logo.png', 120, 120),
    ])->assertRedirect(route('clinics.show', $clinic));

    $clinic->refresh();
    expect($clinic->name)->toBe('Klinik Sentosa Utama')
        ->and($clinic->logo_path)->not->toBeNull();
    Storage::disk('public')->assertExists($clinic->logo_path);

    $this->actingAs($owner)->get('/workflow')->assertNotFound();
    $this->actingAs($owner)->put('/workflow', ['require_triage' => false])->assertNotFound();
    expect(ClinicWorkflowSetting::withoutGlobalScopes()->where('clinic_id', $clinic->id)->exists())->toBeFalse();

});

test('a practitioner cannot change clinic or workflow settings', function () {
    ['user' => $doctor, 'clinic' => $clinic] = createClinicUser(SystemRole::Doctor);

    $this->actingAs($doctor)->get(route('clinics.edit', $clinic))->assertForbidden();

    $this->actingAs($doctor)->get('/workflow')->assertNotFound();
});
