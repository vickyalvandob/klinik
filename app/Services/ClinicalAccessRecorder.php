<?php

namespace App\Services;

use App\Models\Encounter;
use App\Models\MedicalRecordAccessLog;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class ClinicalAccessRecorder
{
    public function record(Encounter $encounter, Request $request, string $action = 'view'): void
    {
        $log = new MedicalRecordAccessLog([
            'medical_record_id' => $encounter->medicalRecord?->id,
            'encounter_id' => $encounter->id,
            'actor_id' => $request->user()?->id,
            'action' => $action,
            'request_id' => $request->attributes->get('request_id', (string) Str::uuid()),
        ]);
        $log->forceFill(['clinic_id' => $encounter->clinic_id])->save();
    }
}
