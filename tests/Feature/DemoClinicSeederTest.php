<?php

use App\Models\ClinicMembership;
use App\Models\ClinicService;
use App\Models\Encounter;
use App\Models\Medicine;
use App\Models\Patient;
use App\Models\QueueEntry;
use App\Models\ServiceUnit;
use App\Models\StaffProfile;
use App\Models\Tenant;
use App\Models\Triage;
use App\Models\TriageAudit;
use App\Models\User;
use App\SystemRole;
use Database\Seeders\DemoClinicSeeder;
use Illuminate\Support\Facades\Hash;

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
        ->and(Patient::withoutGlobalScopes()->count())->toBe(2)
        ->and(Encounter::withoutGlobalScopes()->count())->toBe(2)
        ->and(QueueEntry::withoutGlobalScopes()->count())->toBe(2)
        ->and(Triage::withoutGlobalScopes()->count())->toBe(1)
        ->and(TriageAudit::withoutGlobalScopes()->count())->toBe(1);

    $owner = User::query()->where('email', 'owner@klinik.test')->firstOrFail();
    $platform = User::query()->where('email', 'platform@klinik.test')->firstOrFail();

    expect(Hash::check('password', $owner->password))->toBeTrue()
        ->and($owner->is_platform_admin)->toBeFalse()
        ->and($platform->is_platform_admin)->toBeTrue();
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
