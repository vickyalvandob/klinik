<?php

use App\Http\Controllers\ClinicalCatalogController;
use App\Http\Controllers\ClinicController;
use App\Http\Controllers\ClinicRoleController;
use App\Http\Controllers\ClinicUserController;
use App\Http\Controllers\ConsultationController;
use App\Http\Controllers\DoctorQueueController;
use App\Http\Controllers\EncounterCancellationController;
use App\Http\Controllers\MasterDataController;
use App\Http\Controllers\MasterDataOverviewController;
use App\Http\Controllers\MedicalRecordAmendmentController;
use App\Http\Controllers\MedicalRecordController;
use App\Http\Controllers\MedicineStockAdjustmentController;
use App\Http\Controllers\OnboardingController;
use App\Http\Controllers\PatientController;
use App\Http\Controllers\PatientDuplicateController;
use App\Http\Controllers\PharmacyController;
use App\Http\Controllers\Platform\DashboardController as PlatformDashboardController;
use App\Http\Controllers\Platform\TenantController as PlatformTenantController;
use App\Http\Controllers\PrescriptionCancellationController;
use App\Http\Controllers\PrescriptionDispensingController;
use App\Http\Controllers\PrescriptionProcessingController;
use App\Http\Controllers\RegistrationController;
use App\Http\Controllers\RegistrationPatientSearchController;
use App\Http\Controllers\TodayController;
use App\Http\Controllers\TriageController;
use App\Http\Controllers\WorkflowSettingController;
use Illuminate\Support\Facades\Route;

Route::inertia('/', 'welcome')->name('home');

Route::middleware(['auth', 'active', 'verified', 'clinic.context'])->group(function () {
    Route::prefix('onboarding')->name('onboarding.')->group(function () {
        Route::get('/', [OnboardingController::class, 'show'])->name('show');
        Route::put('clinic', [OnboardingController::class, 'clinic'])->name('clinic');
        Route::put('doctor', [OnboardingController::class, 'doctor'])->name('doctor');
        Route::put('users', [OnboardingController::class, 'users'])->name('users');
        Route::put('services', [OnboardingController::class, 'services'])->name('services');
        Route::put('workflow', [OnboardingController::class, 'workflow'])->name('workflow');
        Route::post('complete', [OnboardingController::class, 'complete'])->name('complete');
    });

    Route::middleware('clinic.onboarded')->group(function () {
        Route::get('dashboard', TodayController::class)->name('dashboard');

        Route::get('patients/duplicates', PatientDuplicateController::class)->name('patients.duplicates');
        Route::resource('patients', PatientController::class)->except('destroy');

        Route::get('registrations/patients', RegistrationPatientSearchController::class)
            ->name('registrations.patients');
        Route::get('registrations/create', [RegistrationController::class, 'create'])
            ->name('registrations.create');
        Route::post('registrations', [RegistrationController::class, 'store'])
            ->name('registrations.store');
        Route::post('encounters/{encounter}/cancellation', EncounterCancellationController::class)
            ->name('encounters.cancellations.store');

        Route::get('triages', [TriageController::class, 'index'])->name('triages.index');
        Route::get('encounters/{encounter}/triage', [TriageController::class, 'edit'])
            ->name('triages.edit');
        Route::put('encounters/{encounter}/triage', [TriageController::class, 'update'])
            ->name('triages.update');

        Route::get('doctor', DoctorQueueController::class)->name('doctor-queue.index');
        Route::post('encounters/{encounter}/consultation', ConsultationController::class)
            ->name('consultations.store');
        Route::get('encounters/{encounter}/medical-record', [MedicalRecordController::class, 'edit'])
            ->name('medical-records.edit');
        Route::put('encounters/{encounter}/medical-record', [MedicalRecordController::class, 'update'])
            ->name('medical-records.update');
        Route::post('medical-records/{medicalRecord}/amendments', [MedicalRecordAmendmentController::class, 'store'])
            ->name('medical-record-amendments.store');
        Route::get('clinical-catalog/{resource}', ClinicalCatalogController::class)
            ->name('clinical-catalog.show');

        Route::get('pharmacy', [PharmacyController::class, 'index'])->name('pharmacy.index');
        Route::get('pharmacy/{prescription}', [PharmacyController::class, 'show'])->name('pharmacy.show');
        Route::post('pharmacy/{prescription}/processing', PrescriptionProcessingController::class)
            ->name('pharmacy.processing.store');
        Route::post('pharmacy/{prescription}/dispensing', PrescriptionDispensingController::class)
            ->name('pharmacy.dispensing.store');
        Route::post('pharmacy/{prescription}/cancellation', PrescriptionCancellationController::class)
            ->name('pharmacy.cancellations.store');
        Route::post('pharmacy/stock/{medicine}/adjustment', MedicineStockAdjustmentController::class)
            ->name('pharmacy.stock.adjustments.store');

        Route::get('clinics/{clinic}', [ClinicController::class, 'show'])->name('clinics.show');
        Route::get('clinics/{clinic}/edit', [ClinicController::class, 'edit'])->name('clinics.edit');
        Route::put('clinics/{clinic}', [ClinicController::class, 'update'])->name('clinics.update');

        Route::get('workflow', [WorkflowSettingController::class, 'edit'])->name('workflow.edit');
        Route::put('workflow', [WorkflowSettingController::class, 'update'])->name('workflow.update');

        Route::get('master-data', MasterDataOverviewController::class)->name('master-data.overview');
        Route::get('master-data/{resource}', [MasterDataController::class, 'index'])->name('master-data.index');
        Route::post('master-data/{resource}', [MasterDataController::class, 'store'])->name('master-data.store');
        Route::put('master-data/{resource}/{record}', [MasterDataController::class, 'update'])->name('master-data.update');
        Route::patch('master-data/{resource}/{record}/status', [MasterDataController::class, 'toggle'])->name('master-data.toggle');

        Route::get('users', [ClinicUserController::class, 'index'])->name('clinic-users.index');
        Route::post('users', [ClinicUserController::class, 'store'])->name('clinic-users.store');
        Route::put('users/{membership}', [ClinicUserController::class, 'update'])->name('clinic-users.update');

        Route::get('roles', [ClinicRoleController::class, 'index'])->name('clinic-roles.index');
        Route::put('roles/{clinicRole}', [ClinicRoleController::class, 'update'])->name('clinic-roles.update');
    });
});

Route::prefix('platform')
    ->name('platform.')
    ->middleware(['auth', 'active', 'platform'])
    ->group(function () {
        Route::get('/', PlatformDashboardController::class)->name('index');
        Route::get('tenants/{tenant}', [PlatformTenantController::class, 'show'])->name('tenants.show');
    });

require __DIR__.'/settings.php';
