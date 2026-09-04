<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('diagnosis_catalogs', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->string('code_system', 64);
            $table->string('code', 32);
            $table->string('display');
            $table->text('search_terms')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['code_system', 'code']);
            $table->index(['is_active', 'code']);
            $table->index(['is_active', 'display']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('diagnosis_catalogs');
    }
};
