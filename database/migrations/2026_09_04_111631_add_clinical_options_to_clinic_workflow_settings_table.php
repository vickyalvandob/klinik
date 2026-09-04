<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('clinic_workflow_settings', function (Blueprint $table) {
            $table->boolean('billing_enabled')->default(true)->after('pharmacy_enabled');
            $table->boolean('require_primary_diagnosis')->default(true)->after('billing_enabled');
            $table->boolean('require_final_medical_record')->default(true)->after('require_primary_diagnosis');
            $table->boolean('allow_partial_payment')->default(false)->after('require_final_medical_record');
        });
    }

    public function down(): void
    {
        Schema::table('clinic_workflow_settings', function (Blueprint $table) {
            $table->dropColumn([
                'billing_enabled', 'require_primary_diagnosis',
                'require_final_medical_record', 'allow_partial_payment',
            ]);
        });
    }
};
