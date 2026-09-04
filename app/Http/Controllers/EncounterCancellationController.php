<?php

namespace App\Http\Controllers;

use App\Actions\TransitionEncounter;
use App\EncounterStatus;
use App\Http\Requests\CancelEncounterRequest;
use App\Models\Encounter;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;

class EncounterCancellationController extends Controller
{
    public function __invoke(
        CancelEncounterRequest $request,
        Encounter $encounter,
        TransitionEncounter $transitionEncounter,
    ): RedirectResponse {
        $transitionEncounter->execute(
            $encounter,
            EncounterStatus::Cancelled,
            (int) $request->user()->id,
            $request->string('reason')->trim()->toString(),
        );

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => "Kunjungan {$encounter->registration_number} berhasil dibatalkan.",
        ]);

        return back();
    }
}
