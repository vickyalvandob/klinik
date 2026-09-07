<?php

use App\EncounterStatus;
use App\Models\Clinic;
use App\Models\ClinicMembership;
use App\Models\Encounter;
use App\Models\Patient;
use App\Models\QueueCall;
use App\Models\QueueEntry;
use App\QueueStatus;
use App\Support\Tenancy\CurrentTenant;
use App\SystemRole;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;

test('front office calls the next waiting number atomically without advancing clinical status', function () {
    $context = createClinicWorkflow(SystemRole::FrontOffice);
    registerPatient($this, $context)->assertRedirect();
    $queue = QueueEntry::withoutGlobalScopes()->sole();
    $payload = ['service_unit_id' => $context['serviceUnit']->uuid, 'stage' => 'triage', 'intent' => 'call', 'request_key' => (string) Str::uuid()];

    $this->post(route('queues.calls.store'), $payload)->assertRedirect()->assertSessionHasNoErrors();

    expect($queue->refresh()->status)->toBe(QueueStatus::Called);
    expect(Encounter::withoutGlobalScopes()->sole()->status)->toBe(EncounterStatus::WaitingTriage);
    $this->assertDatabaseHas('queue_calls', ['queue_entry_id' => $queue->id, 'actor_id' => $context['user']->id, 'queue_number' => 'A001', 'destination' => 'Pemeriksaan Awal · Poli Umum']);

    $this->post(route('queues.calls.store'), $payload)->assertSessionHasNoErrors();
    $this->assertDatabaseCount('queue_calls', 1);
});

test('calling next respects sequence and skips already called entries', function () {
    $context = createClinicWorkflow();
    registerPatient($this, $context)->assertRedirect();
    $first = QueueEntry::withoutGlobalScopes()->sole();
    $context['patient'] = Patient::factory()->create(['tenant_id' => $context['tenant']->id, 'created_by' => $context['user']->id]);
    registerPatient($this, $context)->assertRedirect();
    $second = QueueEntry::withoutGlobalScopes()->latest('id')->firstOrFail();

    $this->post(route('queues.calls.store'), ['service_unit_id' => $context['serviceUnit']->uuid, 'stage' => 'triage', 'intent' => 'call', 'request_key' => (string) Str::uuid()])->assertSessionHasNoErrors();
    expect($first->refresh()->status)->toBe(QueueStatus::Called);
    expect($second->refresh()->status)->toBe(QueueStatus::Waiting);

    $this->post(route('queues.calls.store'), ['service_unit_id' => $context['serviceUnit']->uuid, 'stage' => 'triage', 'intent' => 'call', 'request_key' => (string) Str::uuid()])->assertSessionHasNoErrors();
    expect($second->refresh()->status)->toBe(QueueStatus::Called);
    $this->assertDatabaseCount('queue_calls', 2);
});

test('recall records a new call and prevents overlapping rapid announcements', function () {
    $this->freezeTime();
    $context = createClinicWorkflow();
    registerPatient($this, $context)->assertRedirect();
    $queue = QueueEntry::withoutGlobalScopes()->sole();
    $payload = ['service_unit_id' => $context['serviceUnit']->uuid, 'stage' => 'triage', 'queue_id' => $queue->uuid, 'intent' => 'call', 'request_key' => (string) Str::uuid()];
    $this->post(route('queues.calls.store'), $payload)->assertSessionHasNoErrors();

    $this->post(route('queues.calls.store'), [...$payload, 'intent' => 'recall', 'request_key' => (string) Str::uuid()])->assertSessionHasErrors(['queue' => 'Tunggu 5 detik sebelum memanggil ulang nomor yang sama.']);
    $this->assertDatabaseCount('queue_calls', 1);

    $this->travel(6)->seconds();
    $this->post(route('queues.calls.store'), [...$payload, 'intent' => 'recall', 'request_key' => (string) Str::uuid()])->assertSessionHasNoErrors();
    $this->assertDatabaseCount('queue_calls', 2);
});

test('finishing triage returns a called queue to waiting for the doctor', function () {
    $context = createClinicWorkflow();
    registerPatient($this, $context)->assertRedirect();
    $queue = QueueEntry::withoutGlobalScopes()->sole();
    $encounter = Encounter::withoutGlobalScopes()->sole();
    $this->post(route('queues.calls.store'), ['service_unit_id' => $context['serviceUnit']->uuid, 'stage' => 'triage', 'intent' => 'call', 'request_key' => (string) Str::uuid()])->assertSessionHasNoErrors();

    $this->put(route('triages.update', $encounter), ['intent' => 'complete', 'chief_complaint' => 'Kontrol'])->assertSessionHasNoErrors();

    expect($queue->refresh()->status)->toBe(QueueStatus::Waiting);
    expect($queue->called_at)->toBeNull();
    $this->post(route('queues.calls.store'), ['service_unit_id' => $context['serviceUnit']->uuid, 'stage' => 'doctor', 'intent' => 'call', 'request_key' => (string) Str::uuid()])->assertSessionHasNoErrors();
    $this->assertDatabaseHas('queue_calls', ['queue_entry_id' => $queue->id, 'stage' => 'doctor', 'destination' => 'Poli Umum']);
});

test('stale and clinically ineligible queue calls do not write an announcement', function (EncounterStatus $status, QueueStatus $queueStatus, string $stage) {
    $context = createClinicWorkflow();
    registerPatient($this, $context)->assertRedirect();
    $queue = QueueEntry::withoutGlobalScopes()->sole();
    Encounter::withoutGlobalScopes()->sole()->update(['status' => $status]);
    $queue->update(['status' => $queueStatus]);

    $this->post(route('queues.calls.store'), ['service_unit_id' => $context['serviceUnit']->uuid, 'stage' => $stage, 'queue_id' => $queue->uuid, 'intent' => 'call', 'request_key' => (string) Str::uuid()])
        ->assertSessionHasErrors(['queue' => 'Antrean sudah berubah. Perbarui daftar sebelum memanggil kembali.']);

    $this->assertDatabaseCount('queue_calls', 0);
    expect($queue->refresh()->status)->toBe($queueStatus);
})->with([
    [EncounterStatus::WaitingTriage, QueueStatus::Called, 'triage'],
    [EncounterStatus::WaitingTriage, QueueStatus::Waiting, 'doctor'],
    [EncounterStatus::InConsultation, QueueStatus::InService, 'doctor'],
    [EncounterStatus::Cancelled, QueueStatus::Cancelled, 'triage'],
    [EncounterStatus::Completed, QueueStatus::Completed, 'doctor'],
]);

test('yesterday queue cannot be called today and an empty queue reports a useful error', function () {
    $context = createClinicWorkflow();
    registerPatient($this, $context)->assertRedirect();
    $queue = QueueEntry::withoutGlobalScopes()->sole();
    $queue->update(['queue_date' => now($context['clinic']->timezone)->subDay()->toDateString()]);
    $payload = ['service_unit_id' => $context['serviceUnit']->uuid, 'stage' => 'triage', 'intent' => 'call', 'request_key' => (string) Str::uuid()];

    $this->post(route('queues.calls.store'), [...$payload, 'queue_id' => $queue->uuid])->assertNotFound();
    $this->post(route('queues.calls.store'), $payload)->assertSessionHasErrors(['queue' => 'Tidak ada antrean yang menunggu pada tahap ini.']);
    $this->assertDatabaseCount('queue_calls', 0);
});

test('queue pages require authentication and calls require update permission', function () {
    $this->get(route('queues.index'))->assertRedirect(route('login'));
    $this->get(route('queues.display'))->assertRedirect(route('login'));
    $this->post(route('queues.calls.store'))->assertRedirect(route('login'));
    $context = createClinicWorkflow(SystemRole::Cashier);
    $this->actingAs($context['user'])->get(route('queues.index'))->assertForbidden();
    $this->get(route('queues.display'))->assertForbidden();
    $this->post(route('queues.calls.store'))->assertForbidden();
    $this->assertDatabaseCount('queue_calls', 0);
});

test('foreign tenant and same tenant foreign clinic queues cannot be called or filtered', function (bool $sameTenant) {
    $foreign = createClinicWorkflow();
    registerPatient($this, $foreign)->assertRedirect();
    $queue = QueueEntry::withoutGlobalScopes()->sole();
    $context = createClinicWorkflow();
    if ($sameTenant) {
        app(CurrentTenant::class)->set($foreign['tenant']);
        $context['clinic'] = Clinic::factory()->for($foreign['tenant'])->create();
        ClinicMembership::factory()->forClinic($context['clinic'])->for($context['user'])->for($context['role'])->create();
    }
    $this->withSession(['current_clinic_id' => $context['clinic']->id])->actingAs($context['user']);

    $this->get(route('queues.index', ['service_unit' => $foreign['serviceUnit']->uuid]))->assertNotFound();
    $this->post(route('queues.calls.store'), ['service_unit_id' => $foreign['serviceUnit']->uuid, 'stage' => 'triage', 'queue_id' => $queue->uuid, 'intent' => 'call', 'request_key' => (string) Str::uuid()])->assertNotFound();
    $this->assertDatabaseCount('queue_calls', 0);
})->with([false, true]);

test('invalid queue input is rejected before mutation', function () {
    $context = createClinicWorkflow();
    $this->actingAs($context['user'])->post(route('queues.calls.store'), ['stage' => 'cashier', 'intent' => 'delete', 'request_key' => 'bad'])
        ->assertSessionHasErrors(['service_unit_id', 'stage', 'intent', 'request_key']);
    $this->post(route('queues.calls.store'), ['service_unit_id' => $context['serviceUnit']->uuid, 'stage' => 'triage', 'intent' => 'recall', 'request_key' => (string) Str::uuid()])->assertSessionHasErrors('queue_id');
    $this->assertDatabaseCount('queue_calls', 0);
});

test('the queue worklist filters stages and stays private to the current clinic', function () {
    $foreign = createClinicWorkflow();
    registerPatient($this, $foreign)->assertRedirect();
    $context = createClinicWorkflow();
    $this->withSession(['current_clinic_id' => $context['clinic']->id]);
    registerPatient($this, $context)->assertRedirect();

    $this->get(route('queues.index'))->assertInertia(fn (Assert $page) => $page
        ->component('queues/index')->has('queues.data', 1)->where('summary.waiting', 1)
        ->where('queues.data.0.patient_name', $context['patient']->name));
    $this->get(route('queues.index', ['stage' => 'doctor']))->assertInertia(fn (Assert $page) => $page->has('queues.data', 0));
});

test('signed monitor shows only public queue data even when a staff session exists', function () {
    $context = createClinicWorkflow();
    registerPatient($this, $context)->assertRedirect();
    $queue = QueueEntry::withoutGlobalScopes()->sole();
    QueueCall::factory()->create(['queue_entry_id' => $queue->id, 'actor_id' => $context['user']->id, 'queue_number' => 'A001']);
    $url = $this->get(route('queues.display'))->assertRedirect()->headers->get('Location');

    $this->get($url)->assertInertia(fn (Assert $page) => $page->component('queues/display')
        ->where('board.clinic_name', $context['clinic']->name)
        ->has('board.units.0.next', 1)->where('board.units.0.waiting_count', 1)
        ->where('board.calls.0.number', 'A001')->missing('auth')->missing('currentMembership')->missing('currentClinic'))
        ->assertDontSee($context['patient']->name)->assertDontSee($context['patient']->medical_record_number)
        ->assertDontSee($context['user']->email);
});

test('a guest display rejects missing expired and modified signatures and inactive clinics', function () {
    $context = createClinicWorkflow();
    $this->get(route('queue-display.show', ['clinicUuid' => $context['clinic']->uuid]))->assertForbidden();
    $expired = URL::temporarySignedRoute('queue-display.show', now()->subMinute(), ['clinicUuid' => $context['clinic']->uuid]);
    $this->get($expired)->assertForbidden();
    $url = URL::temporarySignedRoute('queue-display.show', now()->addHour(), ['clinicUuid' => $context['clinic']->uuid]);
    $this->get(str_replace($context['clinic']->uuid, (string) Str::uuid(), $url))->assertForbidden();
    $this->get($url)->assertInertia(fn (Assert $page) => $page->component('queues/display'));
    $context['clinic']->update(['is_active' => false]);
    $this->get($url)->assertNotFound();
});

test('a monitor excludes other clinics and bounds upcoming numbers while keeping the full count', function () {
    $foreign = createClinicWorkflow();
    registerPatient($this, $foreign)->assertRedirect();
    $foreignQueue = QueueEntry::withoutGlobalScopes()->sole();
    QueueCall::factory()->create(['queue_entry_id' => $foreignQueue->id, 'queue_number' => 'PRIVATE99']);
    $context = createClinicWorkflow();
    $this->withSession(['current_clinic_id' => $context['clinic']->id]);
    for ($i = 0; $i < 7; $i++) {
        $context['patient'] = Patient::factory()->create(['tenant_id' => $context['tenant']->id, 'created_by' => $context['user']->id]);
        registerPatient($this, $context)->assertRedirect();
    }
    $url = URL::temporarySignedRoute('queue-display.show', now()->addHour(), ['clinicUuid' => $context['clinic']->uuid]);

    $this->get($url)->assertInertia(fn (Assert $page) => $page->has('board.units', 1)
        ->where('board.units.0.waiting_count', 7)->has('board.units.0.next', 5)->where('board.units.0.next.0', 'A001')
        ->has('board.calls', 0))->assertDontSee('PRIVATE99');
});
