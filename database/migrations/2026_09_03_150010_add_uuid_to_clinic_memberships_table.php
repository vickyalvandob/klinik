<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('clinic_memberships', function (Blueprint $table) {
            $table->uuid('uuid')->nullable()->after('id');
        });

        DB::table('clinic_memberships')
            ->select('id')
            ->orderBy('id')
            ->chunkById(500, function ($memberships): void {
                foreach ($memberships as $membership) {
                    DB::table('clinic_memberships')
                        ->where('id', $membership->id)
                        ->update(['uuid' => (string) Str::uuid()]);
                }
            });

        Schema::table('clinic_memberships', function (Blueprint $table) {
            $table->uuid('uuid')->nullable(false)->change();
            $table->unique('uuid');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('clinic_memberships', function (Blueprint $table) {
            $table->dropUnique(['uuid']);
            $table->dropColumn('uuid');
        });
    }
};
