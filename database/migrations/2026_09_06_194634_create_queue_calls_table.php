<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('queue_calls', function (Blueprint $table): void {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('tenant_id')->constrained()->restrictOnDelete();
            $table->foreignId('clinic_id');
            $table->foreignId('queue_entry_id')->constrained()->restrictOnDelete();
            $table->foreignId('service_unit_id');
            $table->foreignId('actor_id')->constrained('users')->restrictOnDelete();
            $table->date('queue_date');
            $table->string('queue_number', 24);
            $table->string('destination');
            $table->string('stage', 20);
            $table->uuid('request_key');
            $table->timestamps();
            $table->foreign(['tenant_id', 'clinic_id'])->references(['tenant_id', 'id'])->on('clinics')->restrictOnDelete();
            $table->foreign(['clinic_id', 'service_unit_id'])->references(['clinic_id', 'id'])->on('service_units')->restrictOnDelete();
            $table->unique(['clinic_id', 'request_key']);
            $table->index(['tenant_id', 'clinic_id', 'queue_date', 'id'], 'queue_calls_display_index');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('queue_calls');
    }
};
