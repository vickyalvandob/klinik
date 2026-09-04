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
        Schema::table('prescriptions', function (Blueprint $table) {
            $table->timestamp('processing_started_at')->nullable()->after('prescribed_at');
            $table->foreignId('processing_started_by')->nullable()->after('processing_started_at')->constrained('users')->nullOnDelete();
            $table->timestamp('dispensed_at')->nullable()->after('processing_started_by');
            $table->foreignId('dispensed_by')->nullable()->after('dispensed_at')->constrained('users')->nullOnDelete();
            $table->timestamp('cancelled_at')->nullable()->after('dispensed_by');
            $table->foreignId('cancelled_by')->nullable()->after('cancelled_at')->constrained('users')->nullOnDelete();
            $table->text('cancellation_reason')->nullable()->after('cancelled_by');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('prescriptions', function (Blueprint $table) {
            $table->dropConstrainedForeignId('processing_started_by');
            $table->dropConstrainedForeignId('dispensed_by');
            $table->dropConstrainedForeignId('cancelled_by');
            $table->dropColumn([
                'processing_started_at', 'dispensed_at', 'cancelled_at', 'cancellation_reason',
            ]);
        });
    }
};
