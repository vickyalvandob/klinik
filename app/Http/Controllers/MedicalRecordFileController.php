<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreMedicalRecordFileRequest;
use App\Models\MedicalRecord;
use App\Models\MedicalRecordFile;
use App\Services\ClinicalAccessRecorder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Throwable;

class MedicalRecordFileController extends Controller
{
    public function store(StoreMedicalRecordFileRequest $request, MedicalRecord $medicalRecord): RedirectResponse
    {
        $upload = $request->file('file');
        $path = $upload->store('medical-records/'.$medicalRecord->uuid, 'clinical');
        abort_if($path === false, 503, 'Lampiran tidak dapat disimpan. Coba lagi.');
        try {
            $file = new MedicalRecordFile([
                'medical_record_id' => $medicalRecord->id,
                'actor_id' => $request->user()->id,
                'path' => $path,
                'original_name' => mb_substr(basename(str_replace('\\', '/', $upload->getClientOriginalName())), 0, 200),
                'mime_type' => $upload->getMimeType(),
                'size' => $upload->getSize(),
            ]);
            $file->forceFill(['clinic_id' => $medicalRecord->clinic_id])->save();
        } catch (Throwable $exception) {
            Storage::disk('clinical')->delete($path);
            throw $exception;
        }
        Inertia::flash('toast', ['type' => 'success', 'message' => 'Lampiran rekam medis disimpan.']);

        return to_route('medical-records.edit', $medicalRecord->encounter);
    }

    public function show(Request $request, MedicalRecordFile $file, ClinicalAccessRecorder $accessRecorder): StreamedResponse
    {
        Gate::authorize('view', $file->medicalRecord);
        abort_unless(Storage::disk('clinical')->exists($file->getAttribute('path')), 404);
        $accessRecorder->record($file->medicalRecord->encounter, $request, 'file_download');

        return Storage::disk('clinical')->download($file->getAttribute('path'), $file->getAttribute('original_name'), [
            'Content-Type' => 'application/octet-stream', 'X-Content-Type-Options' => 'nosniff',
            'Cache-Control' => 'private, no-store',
        ]);
    }
}
