<?php

use App\Models\Clinic;
use App\Models\ClinicService;
use App\Models\Medicine;
use App\Models\ServiceUnit;
use App\Models\StaffProfile;
use App\SystemRole;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Testing\AssertableInertia as Assert;

test('master lists only include displayed columns and leave the form closed', function (string $resource, string $hidden) {
    $context = createClinicWorkflow();
    ClinicService::factory()->for($context['serviceUnit'])->create();
    Medicine::factory()->for($context['clinic'])->create();

    $this->actingAs($context['user'])->get(route('master-data.index', $resource))
        ->assertInertia(fn (Assert $page) => $page->component('master-data/index')
            ->has('resources', 5)->has('records.data', 1)->where('form', null)
            ->missing('definition.fields')->missing('records.data.0.values')
            ->missing('records.data.0.columns.'.$hidden)
            ->where('filters.per_page', 15));
})->with([
    'staff' => ['staff', 'email'],
    'practitioners' => ['practitioners', 'practice_license_number'],
    'units' => ['service-units', 'description'],
    'services' => ['services', 'description'],
    'medicines' => ['medicines', 'purchase_price'],
]);

test('opening the create form skips list queries and only loads the required clinic options', function () {
    $context = createClinicWorkflow();
    ServiceUnit::factory()->for($context['clinic'])->create(['is_active' => false]);
    $siblingClinic = Clinic::factory()->for($context['tenant'])->create();
    ServiceUnit::factory()->for($siblingClinic)->create();
    $this->actingAs($context['user'])->get(route('master-data.index', 'services'));
    DB::enableQueryLog();

    $this->actingAs($context['user'])->withHeaders([
        'X-Inertia' => 'true',
        'X-Inertia-Version' => Inertia::getVersion(),
        'X-Inertia-Partial-Component' => 'master-data/index',
        'X-Inertia-Partial-Data' => 'form',
    ])->get(route('master-data.index', ['resource' => 'services', 'create' => 1]))
        ->assertOk()->assertJsonMissingPath('props.records')->assertJsonMissingPath('props.definition')
        ->assertJsonPath('props.form.record', null)
        ->assertJsonPath('props.form.fields.0.options', [(string) $context['serviceUnit']->id => $context['serviceUnit']->name]);

    $queries = collect(DB::getQueryLog())->pluck('query');
    DB::disableQueryLog();
    expect($queries->filter(fn (string $sql): bool => str_contains($sql, 'from "clinic_services"')))->toBeEmpty();
});

test('partial list filtering skips form options even when an edit is present in the url', function () {
    $context = createClinicWorkflow();
    $service = ClinicService::factory()->for($context['serviceUnit'])->create(['name' => 'Konsultasi']);
    $this->actingAs($context['user'])->get(route('master-data.index', 'services'));
    DB::enableQueryLog();

    $this->actingAs($context['user'])->withHeaders([
        'X-Inertia' => 'true',
        'X-Inertia-Version' => Inertia::getVersion(),
        'X-Inertia-Partial-Component' => 'master-data/index',
        'X-Inertia-Partial-Data' => 'records,filters',
    ])->get(route('master-data.index', ['resource' => 'services', 'edit' => $service->uuid, 'search' => 'Konsultasi']))
        ->assertOk()->assertJsonMissingPath('props.form')
        ->assertJsonPath('props.records.data.0.columns.service_unit', $context['serviceUnit']->name);

    $queries = collect(DB::getQueryLog())->pluck('query');
    DB::disableQueryLog();
    expect($queries->filter(fn (string $sql): bool => str_contains($sql, 'from "service_units"')))->toHaveCount(1);
});

test('editing retains the selected inactive relation and all form values', function () {
    $context = createClinicWorkflow();
    $staff = $context['practitioner']->staffProfile()->withoutGlobalScopes()->firstOrFail();
    $staff->update(['is_active' => false]);
    $context['practitioner']->update(['schedule_notes' => 'Senin pagi']);
    StaffProfile::factory()->for($context['clinic'])->create(['is_active' => false]);

    $this->actingAs($context['user'])->get(route('master-data.index', ['resource' => 'practitioners', 'edit' => $context['practitioner']->uuid]))
        ->assertInertia(fn (Assert $page) => $page
            ->where('form.record.values.schedule_notes', 'Senin pagi')
            ->where('form.record.values.staff_profile_id', $staff->id)
            ->where('form.fields.0.options', [(string) $staff->id => $staff->name]));
});

test('master data searching and pagination stay within the current clinic', function () {
    ['user' => $owner, 'clinic' => $clinic, 'tenant' => $tenant] = createClinicUser();
    Medicine::factory()->count(16)->for($clinic)->create(['name' => 'Obat pencarian', 'is_active' => true]);
    $newest = Medicine::withoutGlobalScopes()->latest('id')->firstOrFail();
    Medicine::factory()->for($clinic)->create(['name' => 'Obat nonaktif', 'is_active' => false]);
    $sibling = Clinic::factory()->for($tenant)->create();
    Medicine::factory()->for($sibling)->create(['name' => 'Obat pencarian']);
    Medicine::factory()->create(['name' => 'Obat pencarian']);

    $this->actingAs($owner)->get(route('master-data.index', ['resource' => 'medicines', 'search' => ' Obat ', 'status' => 'active', 'per_page' => 15]))
        ->assertInertia(fn (Assert $page) => $page->where('records.total', 16)->has('records.data', 15)
            ->where('records.data.0.uuid', $newest->uuid)->where('filters.search', 'Obat'));

    $this->get(route('master-data.index', ['resource' => 'medicines', 'search' => 'Obat', 'status' => 'active', 'page' => 2, 'per_page' => 15]))
        ->assertInertia(fn (Assert $page) => $page->has('records.data', 1)->where('records.current_page', 2));

    $this->get(route('master-data.index', ['resource' => 'medicines', 'search' => 'Obat', 'status' => 'inactive', 'per_page' => 30]))
        ->assertInertia(fn (Assert $page) => $page->has('records.data', 1)->where('records.data.0.columns.name', 'Obat nonaktif'));
});

test('edit form access rejects records from another clinic in the same tenant', function () {
    ['user' => $owner, 'tenant' => $tenant] = createClinicUser();
    $sibling = Clinic::factory()->for($tenant)->create();
    $medicine = Medicine::factory()->for($sibling)->create();
    $this->actingAs($owner)->get(route('master-data.index', 'medicines'));

    $this->actingAs($owner)->withHeaders([
        'X-Inertia' => 'true', 'X-Inertia-Version' => Inertia::getVersion(), 'X-Inertia-Partial-Component' => 'master-data/index', 'X-Inertia-Partial-Data' => 'form',
    ])->get(route('master-data.index', ['resource' => 'medicines', 'edit' => $medicine->uuid]))->assertNotFound();
});

test('partial form requests enforce master data authorization', function () {
    ['user' => $doctor] = createClinicUser(SystemRole::Doctor);
    $this->actingAs($doctor)->get(route('master-data.index', 'staff'));

    $this->actingAs($doctor)->withHeaders([
        'X-Inertia' => 'true', 'X-Inertia-Version' => Inertia::getVersion(), 'X-Inertia-Partial-Component' => 'master-data/index', 'X-Inertia-Partial-Data' => 'form',
    ])->get(route('master-data.index', ['resource' => 'staff', 'create' => 1]))->assertForbidden();
});

test('invalid master list filters have readable validation errors', function (array $query, string $field, string $message) {
    ['user' => $owner] = createClinicUser();

    $this->actingAs($owner)->get(route('master-data.index', ['resource' => 'staff', ...$query]))
        ->assertSessionHasErrors([$field => $message]);
})->with([
    'search type' => [['search' => ['invalid']], 'search', 'Masukkan kata pencarian yang valid.'],
    'search length' => [['search' => str_repeat('a', 101)], 'search', 'Pencarian maksimal 100 karakter.'],
    'status' => [['status' => 'archived'], 'status', 'Status data tidak valid.'],
    'page size' => [['per_page' => 10000], 'per_page', 'Pilih 15, 30, atau 50 data per halaman.'],
    'page' => [['page' => 0], 'page', 'Halaman minimal 1.'],
    'record' => [['edit' => 'invalid'], 'edit', 'Data yang dipilih tidak valid.'],
    'create' => [['create' => 'invalid'], 'create', 'Pilihan tambah data tidak valid.'],
]);

test('empty page size uses the default instead of unbounded pagination', function () {
    ['user' => $owner] = createClinicUser();

    $this->actingAs($owner)->get(route('master-data.index', ['resource' => 'staff', 'per_page' => '']))
        ->assertInertia(fn (Assert $page) => $page->where('filters.per_page', 15)->where('records.per_page', 15));
});

test('saving a master record returns to its filtered page and closes the form', function (string $method) {
    ['user' => $owner, 'clinic' => $clinic] = createClinicUser();
    $staff = StaffProfile::factory()->for($clinic)->create(['name' => 'Nama awal']);
    $query = ['search' => 'Staf', 'status' => 'active', 'page' => 2, 'per_page' => 30];
    $parameters = ['resource' => 'staff', ...$query];
    if ($method === 'put') {
        $parameters['record'] = $staff->uuid;
    }

    $this->actingAs($owner)->{$method}(route($method === 'put' ? 'master-data.update' : 'master-data.store', $parameters), [
        'name' => 'Staf diperbarui', 'employment_type' => 'permanent',
    ])->assertSessionHasNoErrors()->assertRedirect(route('master-data.index', ['resource' => 'staff', ...$query]));

    $this->assertDatabaseHas('staff_profiles', ['clinic_id' => $clinic->id, 'name' => 'Staf diperbarui']);
})->with(['post', 'put']);

test('service form permits precise tariffs and whole minute durations accepted by the server', function () {
    $context = createClinicWorkflow();

    $this->actingAs($context['user'])->get(route('master-data.index', ['resource' => 'services', 'create' => 1]))
        ->assertInertia(fn (Assert $page) => $page->where('form.fields.4.step', 0.01)->where('form.fields.5.step', 1));

    $this->post(route('master-data.store', 'services'), [
        'service_unit_id' => $context['serviceUnit']->id, 'code' => 'TARIF-125',
        'name' => 'Konsultasi', 'price' => '75125.50', 'duration_minutes' => 17,
    ])->assertSessionHasNoErrors();

    $this->assertDatabaseHas('clinic_services', ['clinic_id' => $context['clinic']->id, 'price' => '75125.50', 'duration_minutes' => 17]);
});
