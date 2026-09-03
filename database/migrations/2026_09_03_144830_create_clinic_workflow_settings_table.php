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
        Schema::create('clinic_workflow_settings', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('tenant_id');
            $table->foreignId('clinic_id');
            $table->time('opening_time')->default('08:00');
            $table->time('closing_time')->default('17:00');
            $table->unsignedSmallInteger('default_visit_duration_minutes')->default(15);
            $table->boolean('require_triage')->default(true);
            $table->boolean('allow_walk_in')->default(true);
            $table->boolean('pharmacy_enabled')->default(true);
            $table->boolean('auto_send_prescription_to_pharmacy')->default(true);
            $table->timestamps();

            $table->unique('clinic_id');
            $table->foreign(['tenant_id', 'clinic_id'])
                ->references(['tenant_id', 'id'])
                ->on('clinics')
                ->cascadeOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('clinic_workflow_settings');
    }
};
