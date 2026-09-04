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
        Schema::create('triage_audits', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('tenant_id');
            $table->foreignId('clinic_id');
            $table->foreignId('triage_id');
            $table->foreignId('encounter_id');
            $table->string('action', 32);
            $table->json('before_values')->nullable();
            $table->json('after_values');
            $table->foreignId('actor_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['tenant_id', 'clinic_id', 'triage_id', 'created_at'], 'triage_audits_lookup_index');
            $table->foreign(
                ['tenant_id', 'clinic_id', 'triage_id'],
                'triage_audits_triage_fk',
            )->references(['tenant_id', 'clinic_id', 'id'])
                ->on('triages')
                ->cascadeOnDelete();
            $table->foreign(
                ['tenant_id', 'clinic_id', 'encounter_id'],
                'triage_audits_encounter_fk',
            )->references(['tenant_id', 'clinic_id', 'id'])
                ->on('encounters')
                ->cascadeOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('triage_audits');
    }
};
