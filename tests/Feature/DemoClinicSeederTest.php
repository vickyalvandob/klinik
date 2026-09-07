<?php

use App\Actions\SaveTriage;
use App\EncounterStatus;
use App\Models\Clinic;
use App\Models\ClinicMembership;
use App\Models\ClinicRole;
use App\Models\ClinicService;
use App\Models\Encounter;
use App\Models\Invoice;
use App\Models\MedicalRecord;
use App\Models\Medicine;
use App\Models\Patient;
use App\Models\Payment;
use App\Models\Permission;
use App\Models\Prescription;
use App\Models\QueueEntry;
use App\Models\ServiceUnit;
use App\Models\StaffProfile;
use App\Models\Tenant;
use App\Models\Triage;
use App\Models\TriageAudit;
use App\Models\User;
use App\Support\DemoAccounts;
use App\Support\Tenancy\CurrentClinic;
use App\Support\Tenancy\CurrentTenant;
use App\SystemRole;
use Database\Seeders\DemoClinicSeeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $this->travelTo(Carbon::parse('2026-09-07 09:00:00', 'UTC'));
});

test('the local demo seeder is complete and idempotent', function () {
    $this->seed(DemoClinicSeeder::class);
    $this->seed(DemoClinicSeeder::class);

    expect(Tenant::query()->where('slug', 'klinik-sehat-sentosa')->count())->toBe(1)
        ->and(User::query()->count())->toBe(7)
        ->and(ClinicMembership::withoutGlobalScopes()->count())->toBe(6)
        ->and(StaffProfile::withoutGlobalScopes()->count())->toBe(6)
        ->and(ServiceUnit::withoutGlobalScopes()->count())->toBe(3)
        ->and(ClinicService::withoutGlobalScopes()->count())->toBe(3)
        ->and(Medicine::withoutGlobalScopes()->count())->toBe(3)
        ->and(Patient::withoutGlobalScopes()->count())->toBe(7)
        ->and(Encounter::withoutGlobalScopes()->count())->toBe(7)
        ->and(QueueEntry::withoutGlobalScopes()->count())->toBe(7)
        ->and(Triage::withoutGlobalScopes()->count())->toBe(6)
        ->and(TriageAudit::withoutGlobalScopes()->count())->toBe(6);

    expect(MedicalRecord::withoutGlobalScopes()->count())->toBe(5)
        ->and(Prescription::withoutGlobalScopes()->count())->toBe(2)
        ->and(Invoice::withoutGlobalScopes()->count())->toBe(3)
        ->and(Payment::withoutGlobalScopes()->count())->toBe(2)
        ->and(Invoice::withoutGlobalScopes()->where('status', 'partially_paid')->sole()->balance_due)->toBe(50000)
        ->and(Invoice::withoutGlobalScopes()->where('status', 'paid')->sole()->total_amount)->toBe(81000);

    $owner = User::query()->where('email', 'owner@klinik.test')->firstOrFail();
    $platform = User::query()->where('email', 'platform@klinik.test')->firstOrFail();

    expect(Hash::check('password', $owner->password))->toBeTrue()
        ->and($owner->is_platform_admin)->toBeFalse()
        ->and($platform->is_platform_admin)->toBeTrue();
});

test('reseeding preserves visit progress financial audits stock and sequence numbers', function () {
    $this->seed(DemoClinicSeeder::class);
    $clinic = Clinic::withoutGlobalScopes()->sole();
    $membership = ClinicMembership::withoutGlobalScopes()->whereHas('role', fn ($query) => $query->where('code', SystemRole::Nurse->value))->sole();
    app(CurrentTenant::class)->set(Tenant::query()->sole());
    app(CurrentClinic::class)->set($clinic, $membership);
    $encounter = Encounter::query()->where('status', EncounterStatus::WaitingTriage)->sole();
    app(SaveTriage::class)->execute($encounter, ['chief_complaint' => 'Keluhan diperbarui petugas.'], true, $membership->user_id);
    DB::table('daily_sequences')->where('scope', 'encounter-registration')->update(['last_number' => 42]);
    $tables = ['patients', 'encounters', 'queue_entries', 'encounter_status_histories', 'triages', 'triage_audits', 'medical_records', 'medical_record_audits', 'prescriptions', 'prescription_audits', 'invoices', 'invoice_items', 'payments', 'billing_audits', 'medicine_stocks', 'stock_movements', 'daily_sequences'];
    $snapshots = collect($tables)->mapWithKeys(fn (string $table): array => [$table => DB::table($table)->orderBy('id')->get()->toJson()]);

    $this->travel(30)->minutes();
    $this->seed(DemoClinicSeeder::class);

    foreach ($snapshots as $table => $snapshot) {
        expect(DB::table($table)->orderBy('id')->get()->toJson())->toBe($snapshot);
    }
    expect($encounter->refresh()->status)->toBe(EncounterStatus::WaitingDoctor)
        ->and(app(CurrentClinic::class)->membership()->id)->toBe($membership->id);
});

test('demo roles reset stale permissions without changing another clinic or its context', function () {
    $this->seed(DemoClinicSeeder::class);
    $demoMembership = ClinicMembership::withoutGlobalScopes()->whereHas('role', fn ($query) => $query->where('code', SystemRole::Cashier->value))->sole();
    $demoRole = ClinicRole::withoutGlobalScopes()->where('clinic_id', $demoMembership->clinic_id)->where('role_id', $demoMembership->role_id)->sole();
    $extra = Permission::query()->where('key', 'registration.view')->sole();
    $demoRole->permissions()->attach($extra);
    $demoMembership->permissions()->attach($extra);
    $foreign = createClinicUser();
    $this->actingAs($foreign['user'])->get(route('clinic-roles.index'))->assertOk();
    $foreignRole = ClinicRole::query()->where('clinic_id', $foreign['clinic']->id)->where('role_id', $demoMembership->role_id)->sole();
    $foreignRole->permissions()->sync([$extra->id]);

    $this->seed(DemoClinicSeeder::class);

    expect($demoMembership->permissions()->count())->toBe(0)
        ->and($demoRole->permissions()->where('key', 'registration.view')->exists())->toBeFalse()
        ->and($foreignRole->permissions()->pluck('key')->all())->toBe(['registration.view'])
        ->and(app(CurrentClinic::class)->id())->toBe($foreign['clinic']->id)
        ->and(app(CurrentTenant::class)->id())->toBe($foreign['tenant']->id);
});

test('production never seeds or exposes demo accounts', function () {
    $this->app->instance('env', 'production');
    $this->artisan('db:seed', ['--class' => DemoClinicSeeder::class, '--force' => true])->assertSuccessful();
    $this->get(route('login'))->assertInertia(fn (Assert $page) => $page->where('demoAccounts', []));
    expect(User::query()->count())->toBe(0)
        ->and(Tenant::query()->count())->toBe(0)
        ->and(DemoAccounts::loginOptions())->toBe([]);
});

test('a new demo day reuses patient masters and retains the previous visits', function () {
    $this->seed(DemoClinicSeeder::class);
    $oldVisits = Encounter::withoutGlobalScopes()->pluck('id')->all();
    $this->travel(1)->days();
    $this->seed(DemoClinicSeeder::class);

    expect(Patient::withoutGlobalScopes()->count())->toBe(7)
        ->and(Encounter::withoutGlobalScopes()->count())->toBe(14)
        ->and(Encounter::withoutGlobalScopes()->whereIn('id', $oldVisits)->count())->toBe(7);
});

test('local demo login options reflect active seeded accounts and staff names', function () {
    $this->seed(DemoClinicSeeder::class);
    $this->app->instance('env', 'local');
    $this->get(route('login'))->assertInertia(fn (Assert $page) => $page->has('demoAccounts', 7)
        ->where('demoAccounts.5.label', 'Kasir')->where('demoAccounts.5.name', 'Dimas Saputra'));
    User::query()->where('email', 'kasir@klinik.test')->update(['is_active' => false]);
    $this->get(route('login'))->assertInertia(fn (Assert $page) => $page->has('demoAccounts', 6)
        ->where('demoAccounts', fn ($accounts) => ! collect($accounts)->contains('email', 'kasir@klinik.test')));
});

test('all seeded clinic and platform accounts can log in to their own areas', function () {
    $this->seed(DemoClinicSeeder::class);

    $accounts = [
        'owner@klinik.test' => SystemRole::OwnerAdmin,
        'frontoffice@klinik.test' => SystemRole::FrontOffice,
        'perawat@klinik.test' => SystemRole::Nurse,
        'dokter@klinik.test' => SystemRole::Doctor,
        'farmasi@klinik.test' => SystemRole::Pharmacy,
        'kasir@klinik.test' => SystemRole::Cashier,
    ];

    $accountNumber = 1;
    foreach ($accounts as $email => $role) {
        $this->withServerVariables(['REMOTE_ADDR' => "127.0.0.{$accountNumber}"])
            ->post(route('login.store'), [
                'email' => $email,
                'password' => 'password',
            ])->assertRedirect(route('dashboard', absolute: false));
        $this->assertAuthenticated();

        $membership = ClinicMembership::withoutGlobalScopes()
            ->where('user_id', auth()->id())
            ->with('role')
            ->firstOrFail();
        expect($membership->role->code)->toBe($role->value);

        auth()->logout();
        $this->app['session']->flush();
        $accountNumber++;
    }

    $this->withServerVariables(['REMOTE_ADDR' => '127.0.0.99'])->post(route('login.store'), [
        'email' => 'platform@klinik.test',
        'password' => 'password',
    ])->assertRedirect(route('platform.index', absolute: false));

    expect(auth()->user()?->is_platform_admin)->toBeTrue();
});
