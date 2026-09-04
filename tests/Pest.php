<?php

use App\Actions\SyncAuthorizationCatalog;
use App\Models\Clinic;
use App\Models\ClinicMembership;
use App\Models\ClinicWorkflowSetting;
use App\Models\Patient;
use App\Models\Practitioner;
use App\Models\Role;
use App\Models\ServiceUnit;
use App\Models\StaffProfile;
use App\Models\Tenant;
use App\Models\User;
use App\Support\Tenancy\CurrentClinic;
use App\Support\Tenancy\CurrentTenant;
use App\SystemRole;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

/*
|--------------------------------------------------------------------------
| Test Case
|--------------------------------------------------------------------------
|
| The closure you provide to your test functions is always bound to a specific PHPUnit test
| case class. By default, that class is "PHPUnit\Framework\TestCase". Of course, you may
| need to change it using the "pest()" function to bind different classes or traits.
|
*/

pest()->extend(TestCase::class)
    ->use(RefreshDatabase::class)
    ->in('Feature');

/*
|--------------------------------------------------------------------------
| Expectations
|--------------------------------------------------------------------------
|
| When you're writing tests, you often need to check that values meet certain conditions. The
| "expect()" function gives you access to a set of "expectations" methods that you can use
| to assert different things. Of course, you may extend the Expectation API at any time.
|
*/

expect()->extend('toBeOne', function () {
    return $this->toBe(1);
});

/*
|--------------------------------------------------------------------------
| Functions
|--------------------------------------------------------------------------
|
| While Pest is very powerful out-of-the-box, you may have some testing code specific to your
| project that you don't want to repeat in every file. Here you can also expose helpers as
| global functions to help you to reduce the number of lines of code in your test files.
|
*/

/**
 * @return array{
 *     tenant: Tenant,
 *     clinic: Clinic,
 *     user: User,
 *     membership: ClinicMembership,
 *     role: Role
 * }
 */
function createClinicUser(SystemRole $systemRole = SystemRole::OwnerAdmin): array
{
    app(CurrentClinic::class)->clear();
    app(CurrentTenant::class)->clear();
    app(SyncAuthorizationCatalog::class)->execute();

    $tenant = Tenant::factory()->create();
    $clinic = Clinic::factory()->for($tenant)->create();
    $user = User::factory()->create();
    $role = Role::query()->where('code', $systemRole->value)->firstOrFail();
    $membership = ClinicMembership::factory()
        ->forClinic($clinic)
        ->for($user)
        ->for($role)
        ->create();

    return compact('tenant', 'clinic', 'user', 'membership', 'role');
}

/**
 * @return array{
 *     tenant: Tenant,
 *     clinic: Clinic,
 *     user: User,
 *     membership: ClinicMembership,
 *     role: Role,
 *     patient: Patient,
 *     serviceUnit: ServiceUnit,
 *     practitioner: Practitioner
 * }
 */
function createClinicWorkflow(
    SystemRole $systemRole = SystemRole::OwnerAdmin,
    bool $requireTriage = true,
): array {
    $context = createClinicUser($systemRole);
    $tenant = $context['tenant'];
    $clinic = $context['clinic'];
    $user = $context['user'];

    ClinicWorkflowSetting::factory()->create([
        'tenant_id' => $tenant->id,
        'clinic_id' => $clinic->id,
        'require_triage' => $requireTriage,
        'allow_walk_in' => true,
    ]);
    $serviceUnit = ServiceUnit::factory()->create([
        'tenant_id' => $tenant->id,
        'clinic_id' => $clinic->id,
        'code' => 'PU',
        'name' => 'Poli Umum',
        'queue_prefix' => 'A',
    ]);
    $staffProfile = StaffProfile::factory()->create([
        'tenant_id' => $tenant->id,
        'clinic_id' => $clinic->id,
        'employee_number' => 'DOC-001',
        'name' => 'dr. Test',
    ]);
    $practitioner = Practitioner::factory()->create([
        'tenant_id' => $tenant->id,
        'clinic_id' => $clinic->id,
        'staff_profile_id' => $staffProfile->id,
        'profession' => 'doctor',
        'is_active' => true,
    ]);
    $patient = Patient::factory()->create([
        'tenant_id' => $tenant->id,
        'created_by' => $user->id,
        'national_id_number' => null,
    ]);

    return [
        ...$context,
        'patient' => $patient,
        'serviceUnit' => $serviceUnit,
        'practitioner' => $practitioner,
    ];
}

/** @param array<string, mixed> $context */
function registerPatient(TestCase $test, array $context): TestResponse
{
    return $test->actingAs($context['user'])->post(route('registrations.store'), [
        'patient_id' => $context['patient']->uuid,
        'service_unit_id' => $context['serviceUnit']->uuid,
        'practitioner_id' => $context['practitioner']->uuid,
        'chief_complaint' => 'Keluhan pasien untuk pemeriksaan',
    ]);
}
