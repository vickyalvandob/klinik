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
        Schema::create('invoices', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('tenant_id');
            $table->foreignId('clinic_id');
            $table->foreignId('encounter_id');
            $table->foreignId('patient_id');
            $table->string('invoice_number', 40);
            $table->string('status', 24)->default('issued');
            $table->unsignedBigInteger('subtotal')->default(0);
            $table->unsignedBigInteger('total_amount')->default(0);
            $table->unsignedBigInteger('paid_amount')->default(0);
            $table->unsignedBigInteger('balance_due')->default(0);
            $table->timestamp('issued_at');
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('voided_at')->nullable();
            $table->foreignId('voided_by')->nullable()->constrained('users')->nullOnDelete();
            $table->text('void_reason')->nullable();
            $table->timestamps();

            $table->unique('encounter_id');
            $table->unique(['clinic_id', 'invoice_number']);
            $table->unique(['tenant_id', 'clinic_id', 'id']);
            $table->index(['tenant_id', 'clinic_id', 'status', 'issued_at'], 'invoices_worklist_index');
            $table->foreign(['tenant_id', 'clinic_id'])
                ->references(['tenant_id', 'id'])->on('clinics')->cascadeOnDelete();
            $table->foreign(['tenant_id', 'clinic_id', 'encounter_id'], 'invoices_encounter_fk')
                ->references(['tenant_id', 'clinic_id', 'id'])->on('encounters')->restrictOnDelete();
            $table->foreign(['tenant_id', 'patient_id'], 'invoices_patient_fk')
                ->references(['tenant_id', 'id'])->on('patients')->restrictOnDelete();
        });

        Schema::create('invoice_items', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('tenant_id');
            $table->foreignId('clinic_id');
            $table->foreignId('invoice_id');
            $table->string('item_type', 24);
            $table->uuid('source_uuid')->nullable();
            $table->string('code_snapshot', 64)->nullable();
            $table->string('description_snapshot');
            $table->decimal('quantity', 12, 2);
            $table->string('unit', 32)->nullable();
            $table->unsignedBigInteger('unit_price');
            $table->unsignedBigInteger('line_total');
            $table->timestamps();

            $table->index(['tenant_id', 'clinic_id', 'invoice_id'], 'invoice_items_invoice_index');
            $table->foreign(['tenant_id', 'clinic_id'])
                ->references(['tenant_id', 'id'])->on('clinics')->cascadeOnDelete();
            $table->foreign(['tenant_id', 'clinic_id', 'invoice_id'], 'invoice_items_invoice_fk')
                ->references(['tenant_id', 'clinic_id', 'id'])->on('invoices')->cascadeOnDelete();
        });

        Schema::create('payments', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('tenant_id');
            $table->foreignId('clinic_id');
            $table->foreignId('invoice_id');
            $table->string('payment_number', 40);
            $table->unsignedBigInteger('amount');
            $table->string('method', 24);
            $table->string('reference_number', 100)->nullable();
            $table->text('notes')->nullable();
            $table->string('status', 16)->default('received');
            $table->timestamp('received_at');
            $table->foreignId('received_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('voided_at')->nullable();
            $table->foreignId('voided_by')->nullable()->constrained('users')->nullOnDelete();
            $table->text('void_reason')->nullable();
            $table->timestamps();

            $table->unique(['clinic_id', 'payment_number']);
            $table->unique(['tenant_id', 'clinic_id', 'id']);
            $table->index(['tenant_id', 'clinic_id', 'status', 'received_at'], 'payments_reconciliation_index');
            $table->foreign(['tenant_id', 'clinic_id'])
                ->references(['tenant_id', 'id'])->on('clinics')->cascadeOnDelete();
            $table->foreign(['tenant_id', 'clinic_id', 'invoice_id'], 'payments_invoice_fk')
                ->references(['tenant_id', 'clinic_id', 'id'])->on('invoices')->restrictOnDelete();
        });

        Schema::create('billing_audits', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('tenant_id');
            $table->foreignId('clinic_id');
            $table->foreignId('invoice_id');
            $table->foreignId('payment_id')->nullable();
            $table->string('action', 32);
            $table->json('before_values')->nullable();
            $table->json('after_values')->nullable();
            $table->foreignId('actor_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['tenant_id', 'clinic_id', 'invoice_id', 'created_at'], 'billing_audits_invoice_index');
            $table->foreign(['tenant_id', 'clinic_id'])
                ->references(['tenant_id', 'id'])->on('clinics')->cascadeOnDelete();
            $table->foreign(['tenant_id', 'clinic_id', 'invoice_id'], 'billing_audits_invoice_fk')
                ->references(['tenant_id', 'clinic_id', 'id'])->on('invoices')->restrictOnDelete();
            $table->foreign(['tenant_id', 'clinic_id', 'payment_id'], 'billing_audits_payment_fk')
                ->references(['tenant_id', 'clinic_id', 'id'])->on('payments')->restrictOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('billing_audits');
        Schema::dropIfExists('payments');
        Schema::dropIfExists('invoice_items');
        Schema::dropIfExists('invoices');
    }
};
