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
        Schema::create('access_scans', function (Blueprint $table) {
            $table->id();
            $table->string('ticket_id')->index();
            $table->string('movie_title')->nullable();
            $table->string('hall_name')->nullable();
            $table->string('seat_code')->nullable();
            $table->timestamp('scanned_at')->useCurrent();
            $table->enum('result', ['SUCCESS', 'ALREADY_USED', 'INVALID_SIGNATURE', 'EXPIRED'])->index();
            $table->string('validator_email')->index();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('access_scans');
    }
};
