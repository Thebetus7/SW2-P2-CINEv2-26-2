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
        Schema::create('tickets', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('ticket_id')->index();
            $table->string('movie_title');
            $table->string('hall_name');
            $table->string('seat_id');
            $table->string('seat_code');
            $table->string('showtime_id')->index();
            $table->decimal('amount', 10, 2)->default(45.00);
            $table->string('status', 30)->default('CONFIRMED')->index();
            $table->string('issued_at')->nullable();
            $table->string('sig', 255)->index();
            $table->text('canonical')->nullable();
            $table->string('user_email')->default('cliente@cine.local');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('tickets');
    }
};

