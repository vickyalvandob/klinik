<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('diagnoses', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('tenant_id');
            $table->foreignId('clinic_id');
            $table->foreignId('encounter_id');
            $table->foreignId('medical_record_id');
            $table->foreignId('diagnosis_catalog_id')->nullable()->constrained()->nullOnDelete();
            $table->string('code_system', 64);
            $table->string('code', 32);
            $table->string('display');
            $table->string('diagnosis_type', 16);
            $table->string('clinical_status', 32)->nullable();
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['tenant_id', 'clinic_id', 'encounter_id', 'diagnosis_type'], 'diagnoses_encounter_type_index');
            $table->index(['tenant_id', 'clinic_id', 'code'], 'diagnoses_code_index');
            $table->foreign(['tenant_id', 'clinic_id'])
                ->references(['tenant_id', 'id'])->on('clinics')->cascadeOnDelete();
            $table->foreign(['tenant_id', 'clinic_id', 'encounter_id'], 'diagnoses_encounter_fk')
                ->references(['tenant_id', 'clinic_id', 'id'])->on('encounters')->restrictOnDelete();
            $table->foreign(['tenant_id', 'clinic_id', 'medical_record_id'], 'diagnoses_record_fk')
                ->references(['tenant_id', 'clinic_id', 'id'])->on('medical_records')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('diagnoses');
    }
};
