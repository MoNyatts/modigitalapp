<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('qr_codes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('event_id')->constrained()->cascadeOnDelete();
            $table->string('code');                    // e.g. "S001", "D012", "M5003"
            $table->string('guest_name');
            $table->string('phone_number')->nullable();
            $table->char('type', 1);                   // S | D | M
            $table->unsignedInteger('max_admissions'); // S=1, D=2, M{n}=n
            $table->string('qr_hash', 16)->unique();   // value embedded in the QR image
            $table->boolean('is_valid')->default(true);
            $table->foreignId('uploaded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique(['event_id', 'code']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('qr_codes');
    }
};
