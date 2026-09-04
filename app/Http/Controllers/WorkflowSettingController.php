<?php

namespace App\Http\Controllers;

use App\Http\Requests\UpdateWorkflowSettingRequest;
use App\Models\Clinic;
use App\Models\ClinicWorkflowSetting;
use App\Support\Tenancy\CurrentClinic;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class WorkflowSettingController extends Controller
{
    public function __construct(private readonly CurrentClinic $currentClinic) {}

    public function edit(Request $request): Response
    {
        abort_unless($request->user()?->hasClinicPermission('clinic.manage') === true, 403);
        $settings = ClinicWorkflowSetting::query()
            ->where('clinic_id', $this->currentClinic->id())
            ->firstOrNew();

        if (! $settings->exists) {
            $settings->forceFill([
                'opening_time' => '08:00',
                'closing_time' => '17:00',
                'default_visit_duration_minutes' => 15,
                'require_triage' => true,
                'allow_walk_in' => true,
                'pharmacy_enabled' => true,
                'billing_enabled' => true,
                'require_primary_diagnosis' => true,
                'require_final_medical_record' => true,
                'allow_partial_payment' => false,
                'auto_send_prescription_to_pharmacy' => true,
            ]);
        }

        return Inertia::render('workflow/edit', [
            'settings' => [
                'opening_time' => $settings->opening_time,
                'closing_time' => $settings->closing_time,
                'default_visit_duration_minutes' => $settings->default_visit_duration_minutes,
                'require_triage' => $settings->require_triage,
                'allow_walk_in' => $settings->allow_walk_in,
                'pharmacy_enabled' => $settings->pharmacy_enabled,
                'billing_enabled' => $settings->billing_enabled,
                'require_primary_diagnosis' => $settings->require_primary_diagnosis,
                'require_final_medical_record' => $settings->require_final_medical_record,
                'allow_partial_payment' => $settings->allow_partial_payment,
                'auto_send_prescription_to_pharmacy' => $settings->auto_send_prescription_to_pharmacy,
            ],
        ]);
    }

    public function update(UpdateWorkflowSettingRequest $request): RedirectResponse
    {
        DB::transaction(function () use ($request): void {
            Clinic::query()->whereKey($this->currentClinic->id())->lockForUpdate()->firstOrFail();
            $settings = ClinicWorkflowSetting::query()
                ->where('clinic_id', $this->currentClinic->id())
                ->firstOrNew();
            $settings->clinic_id = $this->currentClinic->id();
            $settings->fill($request->validated())->save();
        });

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => 'Pengaturan alur layanan berhasil disimpan.',
        ]);

        return back();
    }
}
