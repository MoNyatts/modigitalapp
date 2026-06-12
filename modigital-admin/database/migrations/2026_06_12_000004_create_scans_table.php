<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('scans', function (Blueprint $table) {
            $table->id();
            $table->foreignId('qr_code_id')->constrained()->cascadeOnDelete();
            $table->foreignId('activity_id')->constrained()->cascadeOnDelete();
            $table->foreignId('scanned_by')->nullable()->constrained('users')->nullOnDelete();
            $table->unsignedInteger('admission_count')->default(1);
            $table->string('notes')->nullable();
            $table->timestamps();

            $table->index(['activity_id', 'created_at']);
            $table->index(['qr_code_id', 'activity_id']);
        });

        Schema::create('rejected_scans', function (Blueprint $table) {
            $table->id();
            $table->string('qr_code_raw');             // what was scanned/typed
            $table->foreignId('qr_code_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('activity_id')->constrained()->cascadeOnDelete();
            $table->foreignId('scanned_by')->nullable()->constrained('users')->nullOnDelete();
            $table->unsignedInteger('attempted_count')->default(1);
            $table->string('reason');
            $table->timestamps();

            $table->index(['activity_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('rejected_scans');
        Schema::dropIfExists('scans');
    }
};
