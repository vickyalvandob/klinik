<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('encounters', function (Blueprint $table) {
            $table->timestamp('started_at')->nullable()->after('registered_at');
            $table->timestamp('clinical_finished_at')->nullable()->after('started_at');
            $table->timestamp('completed_at')->nullable()->after('clinical_finished_at');
        });
    }

    public function down(): void
    {
        Schema::table('encounters', function (Blueprint $table) {
            $table->dropColumn(['started_at', 'clinical_finished_at', 'completed_at']);
        });
    }
};
