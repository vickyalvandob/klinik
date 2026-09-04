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
        Schema::create('queue_entries', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('tenant_id');
            $table->foreignId('clinic_id');
            $table->foreignId('encounter_id');
            $table->foreignId('service_unit_id');
            $table->foreignId('practitioner_id');
            $table->date('queue_date');
            $table->unsignedInteger('queue_sequence');
            $table->string('queue_number', 24);
            $table->string('status', 20);
            $table->timestamp('called_at')->nullable();
            $table->timestamp('service_started_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamp('cancelled_at')->nullable();
            $table->timestamps();

            $table->unique('encounter_id');
            $table->unique(['clinic_id', 'service_unit_id', 'queue_date', 'queue_sequence'], 'queue_entries_daily_sequence_unique');
            $table->index(['tenant_id', 'clinic_id', 'queue_date', 'status'], 'queue_entries_today_status_index');
            $table->index(['tenant_id', 'clinic_id', 'queue_date', 'service_unit_id', 'status'], 'queue_entries_unit_status_index');
            $table->foreign(['tenant_id', 'clinic_id', 'encounter_id'])
                ->references(['tenant_id', 'clinic_id', 'id'])
                ->on('encounters')
                ->cascadeOnDelete();
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
        Schema::dropIfExists('queue_entries');
    }
};
