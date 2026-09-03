<?php

namespace App\Http\Controllers;

use App\Actions\EnsureClinicRoles;
use App\Http\Requests\UpdateClinicRoleRequest;
use App\Models\ClinicRole;
use App\Models\Permission;
use App\Support\Tenancy\CurrentClinic;
use App\SystemRole;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class ClinicRoleController extends Controller
{
    public function __construct(
        private readonly CurrentClinic $currentClinic,
        private readonly EnsureClinicRoles $ensureClinicRoles,
    ) {}

    public function index(Request $request): Response
    {
        abort_unless($request->user()?->hasClinicPermission('roles.manage') === true, 403);
        $this->ensureClinicRoles->execute($this->currentClinic->get());

        $roleOrder = array_flip(array_column(SystemRole::cases(), 'value'));
        $roles = ClinicRole::query()
            ->where('clinic_id', $this->currentClinic->id())
            ->with(['role:id,code,name,description', 'permissions:id,key'])
            ->get()
            ->sortBy(fn (ClinicRole $clinicRole): int => $roleOrder[$clinicRole->role->code] ?? 999)
            ->values();

        $selectedUuid = $request->string('role')->toString();
        $selected = $selectedUuid === ''
            ? $roles->firstWhere('role.code', SystemRole::FrontOffice->value) ?? $roles->first()
            : $roles->firstWhere('uuid', $selectedUuid);

        abort_if($selected === null, 404);

        return Inertia::render('clinic-roles/index', [
            'roles' => $roles->map(fn (ClinicRole $clinicRole): array => [
                'uuid' => $clinicRole->uuid,
                'code' => $clinicRole->role->code,
                'name' => $clinicRole->role->name,
                'description' => $clinicRole->role->description,
                'permission_count' => $clinicRole->permissions->count(),
                'editable' => $clinicRole->role->code !== SystemRole::OwnerAdmin->value,
            ]),
            'selectedRole' => [
                'uuid' => $selected->uuid,
                'code' => $selected->role->code,
                'name' => $selected->role->name,
                'description' => $selected->role->description,
                'permissions' => $selected->permissions->pluck('key')->values()->all(),
                'editable' => $selected->role->code !== SystemRole::OwnerAdmin->value,
            ],
            'permissionGroups' => Permission::query()
                ->orderBy('group')
                ->orderBy('name')
                ->get(['key', 'name', 'group'])
                ->groupBy('group'),
        ]);
    }

    public function update(UpdateClinicRoleRequest $request, ClinicRole $clinicRole): RedirectResponse
    {
        abort_unless($clinicRole->clinic_id === $this->currentClinic->id(), 404);
        $clinicRole->loadMissing('role');
        abort_if($clinicRole->role->code === SystemRole::OwnerAdmin->value, 403, 'Izin Pemilik / Admin tidak dapat dikurangi.');

        DB::transaction(function () use ($clinicRole, $request): void {
            $lockedRole = ClinicRole::query()->whereKey($clinicRole->id)->lockForUpdate()->firstOrFail();
            $permissionIds = Permission::query()
                ->whereIn('key', $request->validated('permissions'))
                ->pluck('id')
                ->all();
            $lockedRole->permissions()->sync($permissionIds);
        });

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => "Izin peran {$clinicRole->role->name} berhasil diperbarui.",
        ]);

        return back();
    }
}
