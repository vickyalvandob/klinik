<?php

namespace App\Http\Controllers;

use App\Http\Requests\IndexClinicUserRequest;
use App\Http\Requests\StoreClinicUserRequest;
use App\Http\Requests\UpdateClinicUserRequest;
use App\Models\ClinicMembership;
use App\Models\ClinicRole;
use App\Models\Permission;
use App\Models\Role;
use App\Models\StaffProfile;
use App\Models\User;
use App\Support\Tenancy\CurrentClinic;
use App\SystemRole;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class ClinicUserController extends Controller
{
    public function __construct(
        private readonly CurrentClinic $currentClinic,
    ) {}

    public function index(IndexClinicUserRequest $request): Response
    {
        Gate::authorize('viewAny', ClinicMembership::class);
        $search = $request->string('search')->trim()->toString();
        $status = $request->string('status')->toString();
        $roleCode = $request->string('role')->toString();

        $query = ClinicMembership::query()
            ->where('clinic_id', $this->currentClinic->id())
            ->with([
                'user:id,uuid,name,email,last_login_at',
                'role:id,code,name',
                'staffProfile:id,uuid,name',
            ])
            ->withCount('permissions');

        if ($search !== '') {
            $query->whereHas('user', function (Builder $userQuery) use ($search): void {
                $userQuery->where(function (Builder $searchQuery) use ($search): void {
                    $searchQuery->where('name', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%");
                });
            });
        }

        if (in_array($status, ['active', 'inactive'], true)) {
            $query->where('is_active', $status === 'active');
        }

        if ($roleCode !== '') {
            $query->whereHas('role', fn (Builder $query) => $query->where('code', $roleCode));
        }

        $editingUuid = $request->string('edit')->toString();
        $editing = $editingUuid === ''
            ? null
            : $this->membershipData($this->findMembership($editingUuid)->load([
                'user:id,uuid,name,email,last_login_at', 'role:id,code,name',
                'staffProfile:id,name', 'permissions:id,key',
            ]), true);
        $formOpen = $editing !== null || $request->boolean('create');

        return Inertia::render('clinic-users/index', [
            'memberships' => fn () => $query->latest('id')->paginate(15)
                ->appends($request->only(['search', 'status', 'role']))
                ->through(fn (ClinicMembership $membership): array => $this->membershipData($membership)),
            'summary' => function (): array {
                $counts = ClinicMembership::query()->where('clinic_id', $this->currentClinic->id())
                    ->selectRaw('is_active, COUNT(*) as total')->groupBy('is_active')->pluck('total', 'is_active');

                return ['total' => (int) $counts->sum(), 'active' => (int) ($counts[1] ?? 0), 'inactive' => (int) ($counts[0] ?? 0)];
            },
            'editing' => $editing,
            'formOpen' => $formOpen,
            'filters' => ['search' => $search, 'status' => $status, 'role' => $roleCode],
            'roles' => function (): array {
                $clinicRoles = ClinicRole::query()->where('clinic_id', $this->currentClinic->id())
                    ->with('permissions:id,key')->get()->keyBy('role_id');
                $roleOrder = array_flip(array_column(SystemRole::cases(), 'value'));

                return Role::query()
                    ->whereIn('code', array_column(SystemRole::cases(), 'value'))
                    ->with('permissions:id,key')
                    ->get(['id', 'code', 'name', 'description'])
                    ->sortBy(fn (Role $role): int => $roleOrder[$role->code])->values()
                    ->map(fn (Role $role): array => [
                        'id' => $role->id, 'code' => $role->code, 'name' => $role->name, 'description' => $role->description,
                        'permissions' => ($clinicRoles->get($role->id)->permissions ?? $role->permissions)->pluck('key')->values()->all(),
                    ])->all();
            },
            'staff' => fn () => ! $formOpen ? [] : StaffProfile::query()
                ->where('clinic_id', $this->currentClinic->id())
                ->where(function (Builder $query) use ($editing): void {
                    $query->where('is_active', true);

                    if (($editing['staff_profile_id'] ?? null) !== null) {
                        $query->orWhereKey($editing['staff_profile_id']);
                    }
                })
                ->where(function (Builder $query) use ($editing): void {
                    $query->whereDoesntHave('memberships');

                    if (($editing['staff_profile_id'] ?? null) !== null) {
                        $query->orWhereKey($editing['staff_profile_id']);
                    }
                })
                ->orderBy('name')
                ->get(['id', 'uuid', 'name']),
            'permissions' => fn () => ! $formOpen || ! $request->user()?->hasClinicPermission('roles.manage') ? (object) [] : Permission::query()
                ->orderBy('group')
                ->orderBy('name')
                ->get(['key', 'name', 'group'])
                ->groupBy('group'),
            'canManageRoles' => $request->user()?->hasClinicPermission('roles.manage') === true,
        ]);
    }

    public function store(StoreClinicUserRequest $request): RedirectResponse
    {
        $validated = $request->validated();

        DB::transaction(function () use ($validated): void {
            $this->lockStaffProfile($validated['staff_profile_id'] ?? null);
            $user = User::query()->create([
                'name' => $validated['name'],
                'email' => $validated['email'],
                'password' => $validated['password'],
            ]);
            $user->forceFill(['email_verified_at' => now()])->save();

            $membership = new ClinicMembership([
                'user_id' => $user->id,
                'staff_profile_id' => $validated['staff_profile_id'] ?? null,
                'role_id' => $validated['role_id'],
                'is_active' => true,
            ]);
            $membership->clinic_id = $this->currentClinic->id();
            $membership->save();
            $this->syncPermissions($membership, $validated['permissions'] ?? []);
        });

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => 'Akun pengguna berhasil dibuat dan siap digunakan.',
        ]);

        return back();
    }

    public function update(UpdateClinicUserRequest $request, ClinicMembership $membership): RedirectResponse
    {
        Gate::authorize('update', $membership);
        $validated = $request->validated();

        if ($membership->user_id === $request->user()?->id
            && ((! $validated['is_active']) || $membership->role_id !== (int) $validated['role_id'])) {
            throw ValidationException::withMessages([
                'is_active' => 'Anda tidak dapat menonaktifkan atau mengganti peran akun sendiri.',
            ]);
        }

        $canManageRoles = $request->user()?->hasClinicPermission('roles.manage') === true;

        DB::transaction(function () use ($membership, $validated, $canManageRoles): void {
            $lockedMembership = ClinicMembership::query()->whereKey($membership->id)->lockForUpdate()->firstOrFail();
            $this->lockStaffProfile($validated['staff_profile_id'] ?? null);
            $lockedMembership->update([
                'staff_profile_id' => $validated['staff_profile_id'] ?? null,
                'role_id' => $validated['role_id'],
                'is_active' => $validated['is_active'],
            ]);
            if ($canManageRoles && array_key_exists('permissions', $validated)) {
                $this->syncPermissions($lockedMembership, $validated['permissions']);
            }
        });

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => 'Akses pengguna berhasil diperbarui.',
        ]);

        return to_route('clinic-users.index');
    }

    /** @param list<string> $permissionKeys */
    private function syncPermissions(ClinicMembership $membership, array $permissionKeys): void
    {
        $permissionIds = Permission::query()->whereIn('key', $permissionKeys)->pluck('id')->all();
        $membership->permissions()->sync($permissionIds);
    }

    private function findMembership(string $uuid): ClinicMembership
    {
        return ClinicMembership::query()
            ->where('clinic_id', $this->currentClinic->id())
            ->where('uuid', $uuid)
            ->firstOrFail();
    }

    private function lockStaffProfile(mixed $staffProfileId): void
    {
        if ($staffProfileId === null) {
            return;
        }

        StaffProfile::query()
            ->where('clinic_id', $this->currentClinic->id())
            ->whereKey($staffProfileId)
            ->lockForUpdate()
            ->firstOrFail();
    }

    /** @return array<string, mixed> */
    private function membershipData(ClinicMembership $membership, bool $includePermissions = false): array
    {
        return [
            'uuid' => $membership->uuid,
            'user' => [
                'uuid' => $membership->user->uuid,
                'name' => $membership->user->name,
                'email' => $membership->user->email,
                'last_login_at' => $membership->user->last_login_at?->toIso8601String(),
            ],
            'role_id' => $membership->role_id,
            'role' => ['code' => $membership->role->code, 'name' => $membership->role->name],
            'staff_profile_id' => $membership->staff_profile_id,
            'staff_name' => $membership->staffProfile?->name,
            'is_active' => $membership->is_active,
            'permission_count' => $includePermissions ? $membership->permissions->count() : $membership->permissions_count,
            ...($includePermissions ? ['permissions' => $membership->permissions->pluck('key')->values()->all()] : []),
            'is_self' => $membership->user_id === auth()->id(),
        ];
    }
}
