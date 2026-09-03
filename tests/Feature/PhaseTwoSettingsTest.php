<?php

use App\Models\ClinicWorkflowSetting;
use App\SystemRole;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

test('an owner can update the clinic profile and workflow settings', function () {
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

    $this->actingAs($owner)->put(route('workflow.update'), [
        'opening_time' => '07:30',
        'closing_time' => '19:00',
        'default_visit_duration_minutes' => 30,
        'require_triage' => true,
        'allow_walk_in' => false,
        'pharmacy_enabled' => true,
        'auto_send_prescription_to_pharmacy' => false,
    ])->assertRedirect();

    $settings = ClinicWorkflowSetting::withoutGlobalScopes()->where('clinic_id', $clinic->id)->firstOrFail();
    expect($settings->opening_time)->toBe('07:30')
        ->and($settings->default_visit_duration_minutes)->toBe(30)
        ->and($settings->allow_walk_in)->toBeFalse()
        ->and($settings->auto_send_prescription_to_pharmacy)->toBeFalse();
});

test('a practitioner cannot change clinic or workflow settings', function () {
    ['user' => $doctor, 'clinic' => $clinic] = createClinicUser(SystemRole::Doctor);

    $this->actingAs($doctor)->get(route('clinics.edit', $clinic))->assertForbidden();

    $this->actingAs($doctor)->get(route('workflow.edit'))->assertForbidden();
});
