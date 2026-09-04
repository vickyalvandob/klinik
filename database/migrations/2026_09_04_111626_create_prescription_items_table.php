<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('prescription_items', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('tenant_id');
            $table->foreignId('clinic_id');
            $table->foreignId('prescription_id');
            $table->foreignId('medicine_id')->nullable()->constrained()->nullOnDelete();
            $table->string('medicine_name_snapshot');
            $table->string('strength_snapshot', 64)->nullable();
            $table->string('dosage_form_snapshot', 64)->nullable();
            $table->decimal('quantity', 10, 2);
            $table->string('unit', 32);
            $table->string('dose_text', 100)->nullable();
            $table->string('frequency_text', 100)->nullable();
            $table->string('route_text', 100)->nullable();
            $table->string('timing_text', 100)->nullable();
            $table->string('duration_text', 100)->nullable();
            $table->text('instruction');
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['tenant_id', 'clinic_id', 'prescription_id'], 'prescription_items_prescription_index');
            $table->foreign(['tenant_id', 'clinic_id'])
                ->references(['tenant_id', 'id'])->on('clinics')->cascadeOnDelete();
            $table->foreign(['tenant_id', 'clinic_id', 'prescription_id'], 'prescription_items_prescription_fk')
                ->references(['tenant_id', 'clinic_id', 'id'])->on('prescriptions')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('prescription_items');
    }
};
