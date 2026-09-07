<?php

use App\EncounterStatus;
use App\Models\Clinic;
use App\Models\Encounter;
use App\Models\Patient;
use App\Models\Role;
use App\Models\ServiceUnit;
use App\Models\Triage;
use App\SystemRole;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Testing\AssertableInertia as Assert;

test('triage search finds patient identity and queue numbers only inside the current clinic', function (string $field) {
    $this->freezeTime();
    $context = createClinicWorkflow();
    $context['patient']->update(['name' => 'Nadia Pemeriksaan', 'medical_record_number' => 'RM-TRIAGE-001']);
    registerPatient($this, $context)->assertSessionHasNoErrors();
    $encounter = Encounter::withoutGlobalScopes()->sole();
    $search = match ($field) {
        'name' => 'Nadia',
        'rm' => 'RM-TRIAGE-001',
        'queue' => $encounter->queueEntry->queue_number,
    };
    $otherPatient = Patient::factory()->create(['tenant_id' => $context['tenant']->id, 'national_id_number' => null]);
    registerPatient($this, [...$context, 'patient' => $otherPatient])->assertSessionHasNoErrors();
    $foreign = createClinicWorkflow();
    $foreign['patient']->update(['name' => 'Nadia Pemeriksaan', 'medical_record_number' => 'RM-TRIAGE-001']);
    $this->withSession(['current_clinic_id' => $foreign['clinic']->id]);
    registerPatient($this, $foreign)->assertSessionHasNoErrors();

    $this->actingAs($context['user'])->withSession(['current_clinic_id' => $context['clinic']->id])
        ->get(route('triages.index', ['search' => $search]))
        ->assertInertia(fn (Assert $page) => $page
            ->has('encounters.data', 1)->where('encounters.data.0.uuid', $encounter->uuid)
            ->where('filters.search', $search)->where('summary.waiting', 2)
            ->has('serviceUnits', 1)->where('serviceUnits.0.uuid', $context['serviceUnit']->uuid));
})->with(['name', 'rm', 'queue']);

test('triage filters preserve the selected unit without excluding unfinished older visits', function () {
    $this->freezeTime();
    $context = createClinicWorkflow();
    registerPatient($this, $context)->assertSessionHasNoErrors();
    $encounter = Encounter::withoutGlobalScopes()->sole();
    $encounter->update(['encounter_date' => now()->subDay()->toDateString(), 'registered_at' => now()->subDay()]);
    $otherUnit = ServiceUnit::factory()->create(['tenant_id' => $context['tenant']->id, 'clinic_id' => $context['clinic']->id]);

    $this->get(route('triages.index', ['service_unit' => $context['serviceUnit']->uuid]))
        ->assertInertia(fn (Assert $page) => $page->has('encounters.data', 1)->where('filters.service_unit', $context['serviceUnit']->uuid));
    $this->get(route('triages.index', ['service_unit' => $otherUnit->uuid]))
        ->assertInertia(fn (Assert $page) => $page->has('encounters.data', 0)->where('summary.waiting', 1));
});

test('triage filters reject units from another clinic in the same tenant', function () {
    $context = createClinicWorkflow(SystemRole::Nurse);
    $otherClinic = Clinic::factory()->create(['tenant_id' => $context['tenant']->id]);
    $unit = ServiceUnit::factory()->create(['tenant_id' => $context['tenant']->id, 'clinic_id' => $otherClinic->id]);

    $this->actingAs($context['user'])->get(route('triages.index', ['service_unit' => $unit->uuid]))
        ->assertSessionHasErrors(['service_unit' => 'Unit layanan tidak tersedia di klinik ini.']);
});

test('triage filters return understandable validation errors', function (array $query, string $field, string $message) {
    $context = createClinicWorkflow(SystemRole::Nurse);

    $this->actingAs($context['user'])->get(route('triages.index', $query))
        ->assertSessionHasErrors([$field => $message]);
})->with([
    'invalid mode' => [['mode' => 'invalid'], 'mode', 'Daftar pemeriksaan tidak valid.'],
    'long search' => [['search' => str_repeat('a', 101)], 'search', 'Pencarian maksimal 100 karakter.'],
    'array search' => [['search' => ['Nadia']], 'search', 'Masukkan nama, nomor RM, atau nomor antrean.'],
    'invalid unit' => [['service_unit' => 'invalid'], 'service_unit', 'Unit layanan tidak valid.'],
]);

test('completed triage list and counter follow the clinic day including midnight boundaries', function () {
    config(['app.timezone' => 'UTC']);
    $this->travelTo(CarbonImmutable::parse('2026-09-07 02:00:00 UTC'));
    $context = createClinicWorkflow();
    $context['clinic']->update(['timezone' => 'Asia/Makassar']);
    $expected = [];
    foreach ([
        ['2026-09-06 15:59:59', false],
        ['2026-09-06 16:00:00', true],
        ['2026-09-07 15:59:59', true],
        ['2026-09-07 16:00:00', false],
    ] as [$completedAt, $inside]) {
        $patient = Patient::factory()->create(['tenant_id' => $context['tenant']->id, 'national_id_number' => null]);
        registerPatient($this, [...$context, 'patient' => $patient])->assertSessionHasNoErrors();
        $encounter = Encounter::withoutGlobalScopes()->latest('id')->firstOrFail();
        $this->put(route('triages.update', $encounter), ['intent' => 'complete'])->assertSessionHasNoErrors();
        $encounter->triage->update(['completed_at' => $completedAt]);
        if ($inside) {
            $expected[] = $encounter->uuid;
        }
    }

    $this->get(route('triages.index', ['mode' => 'completed']))
        ->assertInertia(fn (Assert $page) => $page->where('summary.completed', 2)
            ->where('timezone', 'Asia/Makassar')->has('encounters.data', 2)
            ->where('encounters.data', fn ($rows) => collect($rows)->pluck('uuid')->sort()->values()->all() === collect($expected)->sort()->values()->all()));
});

test('triage partial reloads skip unused summary and unit queries', function () {
    $context = createClinicWorkflow(SystemRole::Nurse);
    $this->actingAs($context['user'])->get(route('triages.index'));
    DB::enableQueryLog();

    try {
        $this->get(route('triages.index'), [
            'X-Inertia' => 'true', 'X-Inertia-Version' => Inertia::getVersion(),
            'X-Inertia-Partial-Component' => 'triages/index',
            'X-Inertia-Partial-Data' => 'encounters,filters,mode',
        ])->assertJsonPath('props.encounters.total', 0)
            ->assertJsonMissingPath('props.summary')->assertJsonMissingPath('props.serviceUnits');

        $queries = collect(DB::getQueryLog())->pluck('query')->implode("\n");
        expect($queries)->not->toContain('service_units', 'triages');
    } finally {
        DB::disableQueryLog();
        DB::flushQueryLog();
    }
});

test('triage pagination keeps the query count constant for one and fifteen patients', function () {
    $this->freezeTime();
    $context = createClinicWorkflow();
    for ($index = 0; $index < 16; $index++) {
        $patient = Patient::factory()->create(['tenant_id' => $context['tenant']->id, 'national_id_number' => null]);
        registerPatient($this, [...$context, 'patient' => $patient])->assertSessionHasNoErrors();
    }
    $this->get(route('triages.index'));
    $headers = ['X-Inertia' => 'true', 'X-Inertia-Version' => Inertia::getVersion(), 'X-Inertia-Partial-Component' => 'triages/index', 'X-Inertia-Partial-Data' => 'encounters,filters,mode'];
    DB::enableQueryLog();

    try {
        $this->get(route('triages.index', ['page' => 1]), $headers)
            ->assertJsonCount(15, 'props.encounters.data')->assertJsonPath('props.encounters.total', 16);
        $fullPageQueries = count(DB::getQueryLog());
        DB::flushQueryLog();
        $this->get(route('triages.index', ['page' => 2]), $headers)->assertJsonCount(1, 'props.encounters.data');
        expect(count(DB::getQueryLog()))->toBe($fullPageQueries);
    } finally {
        DB::disableQueryLog();
        DB::flushQueryLog();
    }
});

test('triage drafts keep unmeasured values empty and preserve a zero pain score in the completed result', function () {
    $context = createClinicWorkflow();
    registerPatient($this, $context)->assertSessionHasNoErrors();
    $context['membership']->update(['role_id' => Role::where('code', SystemRole::Nurse->value)->sole()->id]);
    $encounter = Encounter::withoutGlobalScopes()->sole();
    $values = ['chief_complaint' => 'Keluhan diperbarui', 'temperature' => '', 'heart_rate' => '', 'pain_scale' => '0', 'notes' => 'Catatan perawat'];

    $this->put(route('triages.update', $encounter), ['intent' => 'draft', ...$values])->assertSessionHasNoErrors();
    $this->get(route('triages.edit', $encounter))->assertInertia(fn (Assert $page) => $page
        ->where('encounter.triage.temperature', null)->where('encounter.triage.heart_rate', null)
        ->where('encounter.triage.pain_scale', 0)->where('can.save', true));
    $this->put(route('triages.update', $encounter), ['intent' => 'complete', ...$values])->assertRedirect(route('triages.index'));
    $this->get(route('triages.edit', $encounter))->assertInertia(fn (Assert $page) => $page
        ->where('encounter.triage.chief_complaint', 'Keluhan diperbarui')->where('encounter.triage.notes', 'Catatan perawat')
        ->where('can.save', false)->where('can.complete', false));
    expect($encounter->refresh()->status)->toBe(EncounterStatus::WaitingDoctor);
    expect(Triage::withoutGlobalScopes()->count())->toBe(1);
});
