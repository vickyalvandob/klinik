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
        Schema::create('medical_record_access_logs', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('tenant_id')->constrained()->restrictOnDelete();
            $table->foreignId('clinic_id');
            $table->foreignId('medical_record_id')->nullable();
            $table->foreignId('encounter_id');
            $table->foreignId('actor_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('action', 40);
            $table->uuid('request_id');
            $table->timestamps();
            $table->foreign(['tenant_id', 'clinic_id'])->references(['tenant_id', 'id'])->on('clinics')->restrictOnDelete();
            $table->foreign(['tenant_id', 'clinic_id', 'encounter_id'], 'rme_access_encounter_fk')
                ->references(['tenant_id', 'clinic_id', 'id'])->on('encounters')->restrictOnDelete();
            $table->foreign(['tenant_id', 'clinic_id', 'medical_record_id'], 'rme_access_record_fk')
                ->references(['tenant_id', 'clinic_id', 'id'])->on('medical_records')->restrictOnDelete();
            $table->index(['tenant_id', 'clinic_id', 'created_at'], 'rme_access_date_index');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('medical_record_access_logs');
    }
};
