<?php

namespace App\Http\Controllers;

use App\Support\MasterDataRegistry;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class MasterDataOverviewController extends Controller
{
    public function __invoke(Request $request): Response
    {
        abort_unless($request->user()?->hasClinicPermission('master_data.manage'), 403);

        return Inertia::render('master-data/overview', [
            'resources' => MasterDataRegistry::navigation(),
        ]);
    }
}
