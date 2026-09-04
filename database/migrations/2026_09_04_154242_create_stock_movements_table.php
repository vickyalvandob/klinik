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
        Schema::create('stock_movements', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('tenant_id');
            $table->foreignId('clinic_id');
            $table->foreignId('medicine_id')->constrained()->restrictOnDelete();
            $table->foreignId('prescription_id')->nullable()->constrained()->restrictOnDelete();
            $table->foreignId('prescription_item_id')->nullable()->constrained()->restrictOnDelete();
            $table->string('type', 24);
            $table->decimal('quantity_change', 12, 2);
            $table->decimal('quantity_before', 12, 2);
            $table->decimal('quantity_after', 12, 2);
            $table->text('reason');
            $table->foreignId('actor_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['tenant_id', 'clinic_id', 'medicine_id', 'created_at'], 'stock_movements_ledger_index');
            $table->index(['tenant_id', 'clinic_id', 'prescription_id'], 'stock_movements_prescription_index');
            $table->foreign(['tenant_id', 'clinic_id'])
                ->references(['tenant_id', 'id'])->on('clinics')->cascadeOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('stock_movements');
    }
};
