<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('prescriptions', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('tenant_id');
            $table->foreignId('clinic_id');
            $table->foreignId('encounter_id');
            $table->foreignId('medical_record_id');
            $table->foreignId('patient_id');
            $table->foreignId('practitioner_id');
            $table->string('status', 20)->default('draft');
            $table->timestamp('prescribed_at')->nullable();
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique('encounter_id');
            $table->unique(['tenant_id', 'clinic_id', 'id']);
            $table->index(['tenant_id', 'clinic_id', 'status', 'prescribed_at'], 'prescriptions_worklist_index');
            $table->foreign(['tenant_id', 'clinic_id'])
                ->references(['tenant_id', 'id'])->on('clinics')->cascadeOnDelete();
            $table->foreign(['tenant_id', 'clinic_id', 'encounter_id'], 'prescriptions_encounter_fk')
                ->references(['tenant_id', 'clinic_id', 'id'])->on('encounters')->restrictOnDelete();
            $table->foreign(['tenant_id', 'clinic_id', 'medical_record_id'], 'prescriptions_record_fk')
                ->references(['tenant_id', 'clinic_id', 'id'])->on('medical_records')->cascadeOnDelete();
            $table->foreign(['tenant_id', 'patient_id'], 'prescriptions_patient_fk')
                ->references(['tenant_id', 'id'])->on('patients')->restrictOnDelete();
            $table->foreign(['clinic_id', 'practitioner_id'], 'prescriptions_practitioner_fk')
                ->references(['clinic_id', 'id'])->on('practitioners')->restrictOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('prescriptions');
    }
};
