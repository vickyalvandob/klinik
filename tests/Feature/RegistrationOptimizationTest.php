<?php

use App\EncounterStatus;
use App\Models\Encounter;
use App\Models\Patient;
use App\Models\Permission;
use App\SystemRole;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Testing\AssertableInertia as Assert;

test('registration worklist provides the inline form with only current clinic options', function () {
    $context = createClinicWorkflow(SystemRole::FrontOffice);
    $context['practitioner']->forceFill(['specialization' => null])->save();
    createClinicWorkflow(SystemRole::FrontOffice);

    $this->actingAs($context['user'])->withSession(['current_clinic_id' => $context['clinic']->id])
        ->get(route('registrations.index', ['patient' => $context['patient']->uuid]))
        ->assertInertia(fn (Assert $page) => $page
            ->component('registrations/index')
            ->where('registration.initialPatient.uuid', $context['patient']->uuid)
            ->missing('registration.initialPatient.national_id_number')
            ->missing('registration.initialPatient.phone')
            ->has('registration.serviceUnits', 1)
            ->where('registration.serviceUnits.0.uuid', $context['serviceUnit']->uuid)
            ->has('registration.practitioners', 1)
            ->where('registration.practitioners.0.uuid', $context['practitioner']->uuid)
            ->where('registration.practitioners.0.specialization', null)
            ->where('registration.canCreatePatient', true));
});

test('inactive registration destinations are excluded from the inline form', function (string $inactive) {
    $context = createClinicWorkflow(SystemRole::FrontOffice);
    $model = match ($inactive) {
        'unit' => $context['serviceUnit'],
        'doctor' => $context['practitioner'],
        'staff' => $context['practitioner']->staffProfile()->withoutGlobalScopes()->firstOrFail(),
    };
    $model->forceFill(['is_active' => false])->save();

    $this->actingAs($context['user'])->get(route('registrations.index'))
        ->assertInertia(fn (Assert $page) => $page
            ->has('registration.serviceUnits', $inactive === 'unit' ? 0 : 1)
            ->has('registration.practitioners', $inactive === 'unit' ? 1 : 0));
})->with(['unit', 'doctor', 'staff']);

test('read only registration access never exposes the creation form', function () {
    $context = createClinicWorkflow(SystemRole::Cashier);
    $context['membership']->permissions()->sync(Permission::query()
        ->whereIn('key', ['encounter.view', 'registration.view'])->pluck('id'));

    $this->actingAs($context['user'])->get(route('registrations.index'))
        ->assertInertia(fn (Assert $page) => $page->where('can.create', false)
            ->where('registration', null)
            ->reloadOnly('registration', fn (Assert $reload) => $reload->where('registration', null)));
});

test('registration preselection does not reveal a foreign tenant patient', function (string $route, string $path) {
    $context = createClinicWorkflow(SystemRole::FrontOffice);
    $foreign = createClinicWorkflow(SystemRole::FrontOffice);

    $this->actingAs($context['user'])->withSession(['current_clinic_id' => $context['clinic']->id])
        ->get(route($route, ['patient' => $foreign['patient']->uuid]))
        ->assertInertia(fn (Assert $page) => $page->where($path, null));
})->with([
    'inline' => ['registrations.index', 'registration.initialPatient'],
    'standalone' => ['registrations.create', 'initialPatient'],
]);

test('worklist partial reloads skip unused form options and summary queries', function () {
    $context = createClinicWorkflow(SystemRole::FrontOffice);
    $this->actingAs($context['user'])->get(route('registrations.index'));
    DB::enableQueryLog();

    try {
        $this->get(route('registrations.index'), [
            'X-Inertia' => 'true',
            'X-Inertia-Version' => Inertia::getVersion(),
            'X-Inertia-Partial-Component' => 'registrations/index',
            'X-Inertia-Partial-Data' => 'encounters,filters',
        ])->assertJsonPath('props.encounters.total', 0)
            ->assertJsonMissingPath('props.registration')
            ->assertJsonMissingPath('props.serviceUnits')
            ->assertJsonMissingPath('props.summary');

        $queries = collect(DB::getQueryLog())->pluck('query')->implode("\n");
        expect($queries)->not->toContain('service_units', 'practitioners', 'patients', 'group by');
    } finally {
        DB::disableQueryLog();
        DB::flushQueryLog();
    }
});

test('registration pagination keeps query count bounded as rows increase', function () {
    $this->freezeTime();
    $context = createClinicWorkflow(SystemRole::FrontOffice);
    for ($index = 0; $index < 16; $index++) {
        registerPatient($this, $context)->assertSessionHasNoErrors();
        Encounter::withoutGlobalScopes()->latest('id')->firstOrFail()
            ->forceFill(['status' => EncounterStatus::Completed])->save();
    }
    $this->get(route('registrations.index'));
    $headers = ['X-Inertia' => 'true', 'X-Inertia-Version' => Inertia::getVersion(), 'X-Inertia-Partial-Component' => 'registrations/index', 'X-Inertia-Partial-Data' => 'encounters,filters'];
    DB::enableQueryLog();

    try {
        $this->get(route('registrations.index', ['page' => 1]), $headers)
            ->assertJsonCount(15, 'props.encounters.data')->assertJsonPath('props.encounters.total', 16);
        $fullPageQueries = count(DB::getQueryLog());
        DB::flushQueryLog();
        $this->get(route('registrations.index', ['page' => 2]), $headers)
            ->assertJsonCount(1, 'props.encounters.data')->assertJsonPath('props.encounters.total', 16);
        expect($fullPageQueries)->toBe(count(DB::getQueryLog()));
    } finally {
        DB::disableQueryLog();
        DB::flushQueryLog();
    }
});

test('patient lookup stays bounded and returns only masked registration identities', function () {
    $context = createClinicWorkflow(SystemRole::FrontOffice);
    Patient::factory()->count(10)->create([
        'tenant_id' => $context['tenant']->id, 'name' => 'Lookup Pasien',
        'national_id_number' => null, 'phone' => '081234567890',
    ]);
    $foreign = createClinicWorkflow(SystemRole::FrontOffice);
    $foreign['patient']->forceFill(['name' => 'Lookup Asing'])->save();

    $this->actingAs($context['user'])->withSession(['current_clinic_id' => $context['clinic']->id])
        ->getJson(route('registrations.patients', ['search' => 'Lookup']))
        ->assertJsonCount(8, 'patients')
        ->assertJsonPath('patients.0.name', 'Lookup Pasien')
        ->assertJsonMissingPath('patients.0.phone')
        ->assertJsonMissingPath('patients.0.national_id_number')
        ->assertJsonMissingPath('patients.0.address')
        ->assertJsonPath('patients.0.masked_phone', '081••••••890');
});
