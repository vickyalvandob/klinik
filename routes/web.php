<?php

use App\Http\Controllers\AuditLogController;
use App\Http\Controllers\BillingController;
use App\Http\Controllers\ClinicalCatalogController;
use App\Http\Controllers\ClinicController;
use App\Http\Controllers\ClinicRoleController;
use App\Http\Controllers\ClinicUserController;
use App\Http\Controllers\ConsultationController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\DoctorQueueController;
use App\Http\Controllers\EncounterCancellationController;
use App\Http\Controllers\InvoicePaymentController;
use App\Http\Controllers\InvoiceVoidController;
use App\Http\Controllers\MasterDataController;
use App\Http\Controllers\MasterDataOverviewController;
use App\Http\Controllers\MedicalRecordAmendmentController;
use App\Http\Controllers\MedicalRecordController;
use App\Http\Controllers\MedicalRecordFileController;
use App\Http\Controllers\MedicineStockAdjustmentController;
use App\Http\Controllers\OnboardingController;
use App\Http\Controllers\PatientController;
use App\Http\Controllers\PatientDuplicateController;
use App\Http\Controllers\PaymentReceiptController;
use App\Http\Controllers\PaymentVoidController;
use App\Http\Controllers\PharmacyController;
use App\Http\Controllers\Platform\DashboardController as PlatformDashboardController;
use App\Http\Controllers\Platform\TenantController as PlatformTenantController;
use App\Http\Controllers\PrescriptionCancellationController;
use App\Http\Controllers\PrescriptionDispensingController;
use App\Http\Controllers\PrescriptionProcessingController;
use App\Http\Controllers\QueueCallController;
use App\Http\Controllers\QueueController;
use App\Http\Controllers\QueueDisplayController;
use App\Http\Controllers\RegistrationController;
use App\Http\Controllers\RegistrationIndexController;
use App\Http\Controllers\RegistrationPatientSearchController;
use App\Http\Controllers\RegistrationTicketController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\TriageController;
use Illuminate\Support\Facades\Route;

Route::inertia('/', 'welcome')->name('home');

Route::get('queue-display/{clinicUuid}', QueueDisplayController::class)
    ->middleware(['signed', 'throttle:60,1'])->name('queue-display.show');

Route::middleware(['auth', 'auth.session', 'active', 'verified', 'clinic.context'])->group(function () {
    Route::prefix('onboarding')->name('onboarding.')->group(function () {
        Route::get('/', [OnboardingController::class, 'show'])->name('show');
        Route::put('clinic', [OnboardingController::class, 'clinic'])->name('clinic');
        Route::put('doctor', [OnboardingController::class, 'doctor'])->name('doctor');
        Route::put('users', [OnboardingController::class, 'users'])->name('users');
        Route::put('services', [OnboardingController::class, 'services'])->name('services');
        Route::post('complete', [OnboardingController::class, 'complete'])->name('complete');
    });

    Route::middleware('clinic.onboarded')->group(function () {
        Route::get('dashboard', DashboardController::class)->name('dashboard');
        Route::get('queues', [QueueController::class, 'index'])->name('queues.index');
        Route::get('queues/display', [QueueController::class, 'show'])->name('queues.display');
        Route::post('queues/calls', QueueCallController::class)->middleware('throttle:30,1')->name('queues.calls.store');
        Route::get('reports', [ReportController::class, 'index'])->name('reports.index');
        Route::get('reports/export', [ReportController::class, 'export'])->middleware('throttle:clinic-export')->name('reports.export');
        Route::get('audit', AuditLogController::class)->name('audit.index');
        Route::get('registrations', RegistrationIndexController::class)->name('registrations.index');
        Route::get('registrations/{encounter}/ticket', RegistrationTicketController::class)->name('registrations.ticket');

        Route::get('patients/duplicates', PatientDuplicateController::class)->middleware('throttle:clinic-search')->name('patients.duplicates');
        Route::resource('patients', PatientController::class)->except('destroy');

        Route::get('registrations/patients', RegistrationPatientSearchController::class)
            ->middleware('throttle:clinic-search')
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
            ->middleware('throttle:clinic-read')
            ->name('medical-records.edit');
        Route::put('encounters/{encounter}/medical-record', [MedicalRecordController::class, 'update'])
            ->name('medical-records.update');
        Route::post('medical-records/{medicalRecord}/amendments', [MedicalRecordAmendmentController::class, 'store'])
            ->name('medical-record-amendments.store');
        Route::get('clinical-catalog/{resource}', ClinicalCatalogController::class)
            ->middleware('throttle:clinic-search')
            ->name('clinical-catalog.show');
        Route::post('medical-records/{medicalRecord}/files', [MedicalRecordFileController::class, 'store'])
            ->middleware('throttle:clinic-payment')->name('medical-record-files.store');
        Route::get('medical-record-files/{file}', [MedicalRecordFileController::class, 'show'])
            ->middleware('throttle:clinic-read')->name('medical-record-files.show');

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

        Route::get('billing', [BillingController::class, 'index'])->name('billing.index');
        Route::get('billing/{invoice}', [BillingController::class, 'show'])->name('billing.show');
        Route::post('billing/{invoice}/payments', InvoicePaymentController::class)
            ->middleware('throttle:clinic-payment')
            ->name('billing.payments.store');
        Route::post('billing/{invoice}/void', InvoiceVoidController::class)
            ->name('billing.void');
        Route::post('billing/payments/{payment}/void', PaymentVoidController::class)
            ->name('billing.payments.void');
        Route::get('billing/{invoice}/receipts/{payment}', PaymentReceiptController::class)
            ->name('billing.receipts.show');

        Route::get('clinics/{clinic}', [ClinicController::class, 'show'])->name('clinics.show');
        Route::get('clinics/{clinic}/edit', [ClinicController::class, 'edit'])->name('clinics.edit');
        Route::put('clinics/{clinic}', [ClinicController::class, 'update'])->name('clinics.update');

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
