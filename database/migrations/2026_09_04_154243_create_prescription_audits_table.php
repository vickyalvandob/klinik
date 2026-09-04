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
        Schema::create('prescription_audits', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('tenant_id');
            $table->foreignId('clinic_id');
            $table->foreignId('prescription_id');
            $table->string('action', 32);
            $table->json('before_values')->nullable();
            $table->json('after_values')->nullable();
            $table->foreignId('actor_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['tenant_id', 'clinic_id', 'prescription_id', 'created_at'], 'prescription_audits_timeline_index');
            $table->foreign(['tenant_id', 'clinic_id'])
                ->references(['tenant_id', 'id'])->on('clinics')->cascadeOnDelete();
            $table->foreign(['tenant_id', 'clinic_id', 'prescription_id'], 'prescription_audits_prescription_fk')
                ->references(['tenant_id', 'clinic_id', 'id'])->on('prescriptions')->cascadeOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('prescription_audits');
    }
};
