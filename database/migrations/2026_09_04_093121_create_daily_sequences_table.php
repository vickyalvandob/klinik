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
        Schema::create('daily_sequences', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id');
            $table->foreignId('clinic_id');
            $table->date('sequence_date');
            $table->string('scope', 80);
            $table->unsignedInteger('last_number')->default(0);
            $table->timestamps();

            $table->unique(['clinic_id', 'sequence_date', 'scope']);
            $table->foreign(['tenant_id', 'clinic_id'])
                ->references(['tenant_id', 'id'])
                ->on('clinics')
                ->cascadeOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('daily_sequences');
    }
};
