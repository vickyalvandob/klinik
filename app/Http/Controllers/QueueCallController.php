<?php

namespace App\Http\Controllers;

use App\Actions\CallQueue;
use App\Http\Requests\CallQueueRequest;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;

class QueueCallController extends Controller
{
    public function __invoke(CallQueueRequest $request, CallQueue $callQueue): RedirectResponse
    {
        $call = $callQueue->execute([
            'service_unit_id' => $request->string('service_unit_id')->toString(),
            'stage' => $request->string('stage')->toString(),
            'queue_id' => $request->filled('queue_id') ? $request->string('queue_id')->toString() : null,
            'intent' => $request->string('intent')->toString(),
            'request_key' => $request->string('request_key')->toString(),
        ], (int) $request->user()->id);
        Inertia::flash('toast', ['type' => 'success', 'message' => "Antrean {$call->queue_number} dipanggil ke {$call->destination}."]);

        return back();
    }
}
