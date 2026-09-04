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
        Schema::create('triages', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('tenant_id');
            $table->foreignId('clinic_id');
            $table->foreignId('encounter_id');
            $table->foreignId('practitioner_id')->nullable();
            $table->text('chief_complaint')->nullable();
            $table->unsignedSmallInteger('systolic_bp')->nullable();
            $table->unsignedSmallInteger('diastolic_bp')->nullable();
            $table->unsignedSmallInteger('heart_rate')->nullable();
            $table->unsignedSmallInteger('respiratory_rate')->nullable();
            $table->decimal('temperature', 4, 1)->nullable();
            $table->unsignedTinyInteger('spo2')->nullable();
            $table->decimal('weight', 6, 2)->nullable();
            $table->decimal('height', 5, 2)->nullable();
            $table->unsignedTinyInteger('pain_scale')->nullable();
            $table->text('notes')->nullable();
            $table->string('status', 16)->default('draft');
            $table->timestamp('completed_at')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique('encounter_id');
            $table->unique(['tenant_id', 'clinic_id', 'id']);
            $table->index(['tenant_id', 'clinic_id', 'status', 'updated_at'], 'triages_worklist_index');
            $table->foreign(
                ['tenant_id', 'clinic_id', 'encounter_id'],
                'triages_encounter_fk',
            )->references(['tenant_id', 'clinic_id', 'id'])
                ->on('encounters')
                ->cascadeOnDelete();
            $table->foreign(
                ['clinic_id', 'practitioner_id'],
                'triages_practitioner_fk',
            )->references(['clinic_id', 'id'])
                ->on('practitioners')
                ->restrictOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('triages');
    }
};
