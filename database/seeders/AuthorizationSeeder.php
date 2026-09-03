<?php

namespace Database\Seeders;

use App\Actions\SyncAuthorizationCatalog;
use Illuminate\Database\Seeder;

class AuthorizationSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(SyncAuthorizationCatalog $syncAuthorizationCatalog): void
    {
        $syncAuthorizationCatalog->execute();
    }
}
