<?php

namespace App\Http\Controllers;

use App\Http\Requests\OnboardingClinicRequest;
use App\Http\Requests\OnboardingDoctorRequest;
use App\Http\Requests\OnboardingServicesRequest;
use App\Http\Requests\OnboardingUsersRequest;
use App\Http\Requests\OnboardingWorkflowRequest;
use App\Models\Clinic;
use App\Models\ClinicMembership;
use App\Models\ClinicService;
use App\Models\ClinicWorkflowSetting;
use App\Models\Practitioner;
use App\Models\Role;
use App\Models\ServiceUnit;
use App\Models\StaffProfile;
use App\Models\User;
use App\Support\Tenancy\CurrentClinic;
use App\SystemRole;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class OnboardingController extends Controller
{
    public function __construct(private readonly CurrentClinic $currentClinic) {}

    public function show(): Response|RedirectResponse
    {
        $clinic = $this->currentClinic->get();
        Gate::authorize('update', $clinic);

        if ($clinic->hasCompletedOnboarding()) {
            return to_route('dashboard');
        }

        return Inertia::render('onboarding/show', [
            'step' => $clinic->onboarding_step,
            'clinic' => [
                'name' => $clinic->name,
                'legal_name' => $clinic->legal_name,
                'facility_type' => $clinic->facility_type,
                'facility_identifier' => $clinic->facility_identifier,
                'address' => $clinic->address === 'Belum dilengkapi' ? '' : $clinic->address,
                'phone' => $clinic->phone === '-' ? '' : $clinic->phone,
                'email' => $clinic->email,
                'timezone' => $clinic->timezone,
            ],
            'roles' => Role::query()
                ->whereIn('code', collect(SystemRole::cases())
                    ->reject(fn (SystemRole $role): bool => $role === SystemRole::OwnerAdmin)
                    ->map(fn (SystemRole $role): string => $role->value))
                ->orderBy('name')
                ->get(['id', 'code', 'name']),
            'readiness' => [
                'practitioners' => Practitioner::query()->where('clinic_id', $clinic->id)->where('is_active', true)->count(),
                'users' => ClinicMembership::query()->where('clinic_id', $clinic->id)->where('is_active', true)->count(),
                'service_units' => ServiceUnit::query()->where('clinic_id', $clinic->id)->where('is_active', true)->count(),
                'services' => ClinicService::query()->where('clinic_id', $clinic->id)->where('is_active', true)->count(),
                'workflow' => ClinicWorkflowSetting::query()->where('clinic_id', $clinic->id)->exists(),
            ],
        ]);
    }

    public function clinic(OnboardingClinicRequest $request): RedirectResponse
    {
        DB::transaction(function () use ($request): void {
            $clinic = $this->expectStep(1);
            $clinic->update($request->validated());
            $clinic->forceFill(['onboarding_step' => 2])->save();
        });

        return $this->nextStep('Profil klinik tersimpan. Lanjutkan dengan dokter penanggung jawab.');
    }

    public function doctor(OnboardingDoctorRequest $request): RedirectResponse
    {
        DB::transaction(function () use ($request): void {
            $clinic = $this->expectStep(2);
            $validated = $request->validated();
            $staff = new StaffProfile([
                'employee_number' => $validated['employee_number'] ?? null,
                'name' => $validated['name'],
                'email' => $validated['email'] ?? null,
                'phone' => $validated['phone'] ?? null,
                'position' => 'Dokter',
                'employment_type' => 'permanent',
                'joined_on' => today(),
                'is_active' => true,
            ]);
            $staff->clinic_id = $clinic->id;
            $staff->save();

            $practitioner = new Practitioner([
                'staff_profile_id' => $staff->id,
                'profession' => 'doctor',
                'specialization' => $validated['specialization'] ?? 'Dokter umum',
                'license_number' => $validated['license_number'],
                'practice_license_number' => $validated['practice_license_number'] ?? null,
                'is_active' => true,
            ]);
            $practitioner->clinic_id = $clinic->id;
            $practitioner->save();

            $clinic->forceFill(['onboarding_step' => 3])->save();
        });

        return $this->nextStep('Dokter berhasil ditambahkan.');
    }

    public function users(OnboardingUsersRequest $request): RedirectResponse
    {
        DB::transaction(function () use ($request): void {
            $clinic = $this->expectStep(3);
            if (! $request->boolean('skip')) {
                $validated = $request->validated();
                $user = User::query()->create([
                    'name' => $validated['name'],
                    'email' => $validated['email'],
                    'password' => $validated['password'],
                ]);
                $user->forceFill(['email_verified_at' => now()])->save();

                $membership = new ClinicMembership([
                    'user_id' => $user->id,
                    'role_id' => $validated['role_id'],
                    'is_active' => true,
                ]);
                $membership->clinic_id = $clinic->id;
                $membership->save();
            }

            $clinic->forceFill(['onboarding_step' => 4])->save();
        });

        return $this->nextStep($request->boolean('skip')
            ? 'Langkah pengguna dilewati. Akun dapat ditambahkan setelah onboarding.'
            : 'Pengguna operasional berhasil ditambahkan.');
    }

    public function services(OnboardingServicesRequest $request): RedirectResponse
    {
        DB::transaction(function () use ($request): void {
            $clinic = $this->expectStep(4);
            $validated = $request->validated();
            $unit = new ServiceUnit([
                'code' => mb_strtoupper($validated['unit_code']),
                'name' => $validated['unit_name'],
                'type' => 'outpatient',
                'queue_prefix' => mb_strtoupper($validated['queue_prefix']),
                'is_active' => true,
            ]);
            $unit->clinic_id = $clinic->id;
            $unit->save();

            $service = new ClinicService([
                'service_unit_id' => $unit->id,
                'code' => mb_strtoupper($validated['service_code']),
                'name' => $validated['service_name'],
                'price' => $validated['price'],
                'duration_minutes' => $validated['duration_minutes'],
                'is_active' => true,
            ]);
            $service->clinic_id = $clinic->id;
            $service->save();

            $clinic->forceFill(['onboarding_step' => 5])->save();
        });

        return $this->nextStep('Unit dan layanan pertama berhasil dibuat.');
    }

    public function workflow(OnboardingWorkflowRequest $request): RedirectResponse
    {
        DB::transaction(function () use ($request): void {
            $clinic = $this->expectStep(5);
            $settings = new ClinicWorkflowSetting($request->validated());
            $settings->clinic_id = $clinic->id;
            $settings->save();
            $clinic->forceFill(['onboarding_step' => 6])->save();
        });

        return $this->nextStep('Alur layanan tersimpan. Periksa kesiapan klinik Anda.');
    }

    public function complete(): RedirectResponse
    {
        DB::transaction(function (): void {
            $clinic = $this->expectStep(6);

            abort_unless(
                Practitioner::query()->where('clinic_id', $clinic->id)->where('is_active', true)->exists()
                && ServiceUnit::query()->where('clinic_id', $clinic->id)->where('is_active', true)->exists()
                && ClinicService::query()->where('clinic_id', $clinic->id)->where('is_active', true)->exists()
                && ClinicWorkflowSetting::query()->where('clinic_id', $clinic->id)->exists(),
                422,
                'Data wajib onboarding belum lengkap.',
            );

            $clinic->forceFill([
                'onboarding_step' => 6,
                'onboarding_completed_at' => now(),
            ])->save();
        });

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => 'Onboarding selesai. Klinik siap memulai operasional.',
        ]);

        return to_route('dashboard');
    }

    private function expectStep(int $step): Clinic
    {
        $currentClinic = $this->currentClinic->get();
        Gate::authorize('update', $currentClinic);
        $clinic = Clinic::query()->whereKey($currentClinic->id)->lockForUpdate()->firstOrFail();
        abort_if($clinic->hasCompletedOnboarding() || $clinic->onboarding_step !== $step, 409, 'Langkah onboarding tidak sesuai.');

        return $clinic;
    }

    private function nextStep(string $message): RedirectResponse
    {
        Inertia::flash('toast', ['type' => 'success', 'message' => $message]);

        return to_route('onboarding.show');
    }
}
