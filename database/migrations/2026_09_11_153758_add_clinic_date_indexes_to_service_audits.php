<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('service_audits', function (Blueprint $table) {
        foreach (['triage_audits', 'medical_record_audits', 'billing_audits', 'prescription_audits'] as $name) {
            Schema::table($name, function (Blueprint $table) use ($name): void {
                $table->index(['tenant_id', 'clinic_id', 'created_at', 'id'], $name.'_clinic_date_index');
            });
        }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('service_audits', function (Blueprint $table) {
        foreach (['triage_audits', 'medical_record_audits', 'billing_audits', 'prescription_audits'] as $name) {
            Schema::table($name, function (Blueprint $table) use ($name): void {
                $table->dropIndex($name.'_clinic_date_index');
            });
        }
        });
    }
};
