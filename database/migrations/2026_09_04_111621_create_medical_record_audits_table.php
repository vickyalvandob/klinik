<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('medical_record_audits', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('tenant_id');
            $table->foreignId('clinic_id');
            $table->foreignId('medical_record_id');
            $table->foreignId('encounter_id');
            $table->string('action', 32);
            $table->json('before_values')->nullable();
            $table->json('after_values')->nullable();
            $table->foreignId('actor_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['tenant_id', 'clinic_id', 'medical_record_id', 'created_at'], 'medical_record_audits_history_index');
            $table->foreign(['tenant_id', 'clinic_id'])
                ->references(['tenant_id', 'id'])->on('clinics')->cascadeOnDelete();
            $table->foreign(['tenant_id', 'clinic_id', 'medical_record_id'], 'medical_record_audits_record_fk')
                ->references(['tenant_id', 'clinic_id', 'id'])->on('medical_records')->restrictOnDelete();
            $table->foreign(['tenant_id', 'clinic_id', 'encounter_id'], 'medical_record_audits_encounter_fk')
                ->references(['tenant_id', 'clinic_id', 'id'])->on('encounters')->restrictOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('medical_record_audits');
    }
};
