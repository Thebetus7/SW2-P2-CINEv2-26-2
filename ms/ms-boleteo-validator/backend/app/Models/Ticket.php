<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Ticket extends Model
{
    use HasFactory;

    protected $table = 'tickets';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'ticket_id',
        'movie_title',
        'hall_name',
        'seat_id',
        'seat_code',
        'showtime_id',
        'amount',
        'status',
        'issued_at',
        'sig',
        'canonical',
        'user_email',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
    ];
}

