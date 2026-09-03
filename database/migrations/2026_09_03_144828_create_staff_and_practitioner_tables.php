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
        Schema::create('staff_profiles', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('tenant_id');
            $table->foreignId('clinic_id');
            $table->string('employee_number', 64)->nullable();
            $table->string('name');
            $table->string('email')->nullable();
            $table->string('phone', 32)->nullable();
            $table->string('position')->nullable();
            $table->string('employment_type', 32)->default('permanent');
            $table->date('joined_on')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['clinic_id', 'employee_number']);
            $table->index(['tenant_id', 'clinic_id', 'is_active']);
            $table->foreign(['tenant_id', 'clinic_id'])
                ->references(['tenant_id', 'id'])
                ->on('clinics')
                ->cascadeOnDelete();
        });

        Schema::create('practitioners', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('tenant_id');
            $table->foreignId('clinic_id');
            $table->foreignId('staff_profile_id')->constrained()->restrictOnDelete();
            $table->string('profession', 32)->default('doctor');
            $table->string('specialization')->nullable();
            $table->string('license_number', 100);
            $table->string('practice_license_number', 100)->nullable();
            $table->text('schedule_notes')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['clinic_id', 'staff_profile_id']);
            $table->unique(['clinic_id', 'license_number']);
            $table->index(['tenant_id', 'clinic_id', 'profession', 'is_active']);
            $table->foreign(['tenant_id', 'clinic_id'])
                ->references(['tenant_id', 'id'])
                ->on('clinics')
                ->cascadeOnDelete();
        });

        Schema::table('clinic_memberships', function (Blueprint $table) {
            $table->unique(['clinic_id', 'staff_profile_id']);
            $table->foreign('staff_profile_id')
                ->references('id')
                ->on('staff_profiles')
                ->restrictOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('clinic_memberships', function (Blueprint $table) {
            $table->dropForeign(['staff_profile_id']);
            $table->dropUnique(['clinic_id', 'staff_profile_id']);
        });

        Schema::dropIfExists('practitioners');
        Schema::dropIfExists('staff_profiles');
    }
};
