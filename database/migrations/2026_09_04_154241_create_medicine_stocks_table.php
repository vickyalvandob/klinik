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
        Schema::create('medicine_stocks', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('tenant_id');
            $table->foreignId('clinic_id');
            $table->foreignId('medicine_id')->constrained()->restrictOnDelete();
            $table->decimal('quantity', 12, 2)->default(0);
            $table->timestamp('last_movement_at')->nullable();
            $table->timestamps();

            $table->unique('medicine_id');
            $table->unique(['tenant_id', 'clinic_id', 'id']);
            $table->index(['tenant_id', 'clinic_id', 'quantity']);
            $table->foreign(['tenant_id', 'clinic_id'])
                ->references(['tenant_id', 'id'])->on('clinics')->cascadeOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('medicine_stocks');
    }
};
