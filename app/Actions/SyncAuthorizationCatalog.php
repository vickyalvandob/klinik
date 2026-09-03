<?php

namespace App\Actions;

use App\Models\Permission;
use App\Models\Role;
use App\Support\Authorization\PermissionCatalog;
use Illuminate\Support\Facades\DB;

final class SyncAuthorizationCatalog
{
    public function execute(): void
    {
        DB::transaction(function (): void {
            foreach (PermissionCatalog::permissions() as $key => $definition) {
                Permission::query()->updateOrCreate(
                    ['key' => $key],
                    ['name' => $definition['name'], 'group' => $definition['group']],
                );
            }

            $permissionIds = Permission::query()->pluck('id', 'key');

            foreach (PermissionCatalog::roles() as $code => $definition) {
                $role = Role::query()->updateOrCreate(
                    ['code' => $code],
                    ['name' => $definition['name'], 'description' => $definition['description']],
                );

                $role->permissions()->sync(
                    collect($definition['permissions'])
                        ->map(fn (string $permission): int => (int) $permissionIds->get($permission))
                        ->all(),
                );
            }
        });
    }
}
