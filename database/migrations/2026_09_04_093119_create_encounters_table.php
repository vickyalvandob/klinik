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
        Schema::table('service_units', function (Blueprint $table) {
            $table->unique(['clinic_id', 'id']);
        });

        Schema::table('practitioners', function (Blueprint $table) {
            $table->unique(['clinic_id', 'id']);
        });

        Schema::create('encounters', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('tenant_id');
            $table->foreignId('clinic_id');
            $table->foreignId('patient_id');
            $table->foreignId('service_unit_id');
            $table->foreignId('practitioner_id');
            $table->date('encounter_date');
            $table->unsignedInteger('registration_sequence');
            $table->string('registration_number', 40);
            $table->string('registration_type', 20)->default('walk_in');
            $table->text('chief_complaint');
            $table->string('status', 32);
            $table->timestamp('registered_at');
            $table->foreignId('registered_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('cancelled_at')->nullable();
            $table->foreignId('cancelled_by')->nullable()->constrained('users')->nullOnDelete();
            $table->text('cancellation_reason')->nullable();
            $table->timestamps();

            $table->unique(['tenant_id', 'clinic_id', 'id']);
            $table->unique(['clinic_id', 'encounter_date', 'registration_sequence'], 'encounters_daily_registration_sequence_unique');
            $table->unique(['clinic_id', 'registration_number']);
            $table->index(['tenant_id', 'clinic_id', 'encounter_date', 'status'], 'encounters_today_status_index');
            $table->index(['tenant_id', 'clinic_id', 'patient_id', 'encounter_date'], 'encounters_patient_history_index');
            $table->index(['tenant_id', 'clinic_id', 'practitioner_id', 'encounter_date'], 'encounters_practitioner_queue_index');
            $table->foreign(['tenant_id', 'clinic_id'])
                ->references(['tenant_id', 'id'])
                ->on('clinics')
                ->cascadeOnDelete();
            $table->foreign(['tenant_id', 'patient_id'])
                ->references(['tenant_id', 'id'])
                ->on('patients')
                ->restrictOnDelete();
            $table->foreign(['clinic_id', 'service_unit_id'])
                ->references(['clinic_id', 'id'])
                ->on('service_units')
                ->restrictOnDelete();
            $table->foreign(['clinic_id', 'practitioner_id'])
                ->references(['clinic_id', 'id'])
                ->on('practitioners')
                ->restrictOnDelete();
        });

    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('encounters');

        Schema::table('practitioners', function (Blueprint $table) {
            $table->dropUnique(['clinic_id', 'id']);
        });

        Schema::table('service_units', function (Blueprint $table) {
            $table->dropUnique(['clinic_id', 'id']);
        });
    }
};
