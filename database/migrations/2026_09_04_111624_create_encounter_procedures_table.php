<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('encounter_procedures', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('tenant_id');
            $table->foreignId('clinic_id');
            $table->foreignId('encounter_id');
            $table->foreignId('medical_record_id');
            $table->foreignId('clinic_service_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('practitioner_id')->nullable();
            $table->string('code_system', 64)->nullable();
            $table->string('code', 32)->nullable();
            $table->string('name_snapshot');
            $table->unsignedBigInteger('price_snapshot')->default(0);
            $table->text('notes')->nullable();
            $table->timestamp('performed_at')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['tenant_id', 'clinic_id', 'encounter_id'], 'encounter_procedures_encounter_index');
            $table->foreign(['tenant_id', 'clinic_id'])
                ->references(['tenant_id', 'id'])->on('clinics')->cascadeOnDelete();
            $table->foreign(['tenant_id', 'clinic_id', 'encounter_id'], 'encounter_procedures_encounter_fk')
                ->references(['tenant_id', 'clinic_id', 'id'])->on('encounters')->restrictOnDelete();
            $table->foreign(['tenant_id', 'clinic_id', 'medical_record_id'], 'encounter_procedures_record_fk')
                ->references(['tenant_id', 'clinic_id', 'id'])->on('medical_records')->cascadeOnDelete();
            $table->foreign(['clinic_id', 'practitioner_id'], 'encounter_procedures_practitioner_fk')
                ->references(['clinic_id', 'id'])->on('practitioners')->restrictOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('encounter_procedures');
    }
};
