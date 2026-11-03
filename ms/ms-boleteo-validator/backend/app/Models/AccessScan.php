<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AccessScan extends Model
{
    use HasFactory;

    public const RESULT_SUCCESS = 'SUCCESS';

    public const RESULT_ALREADY_USED = 'ALREADY_USED';

    public const RESULT_INVALID_SIGNATURE = 'INVALID_SIGNATURE';

    public const RESULT_EXPIRED = 'EXPIRED';

    protected $table = 'access_scans';

    protected $fillable = [
        'ticket_id',
        'movie_title',
        'hall_name',
        'seat_code',
        'scanned_at',
        'result',
        'validator_email',
    ];

    protected $casts = [
        'scanned_at' => 'datetime',
    ];

    /**
     * Scope para limitar a los escaneos más recientes.
     */
    public function scopeRecent(Builder $query, int $limit = 20): Builder
    {
        return $query->orderByDesc('scanned_at')->orderByDesc('id')->limit($limit);
    }

    /**
     * Scope para filtrar por el boletero en sesión.
     */
    public function scopeForValidator(Builder $query, string $email): Builder
    {
        return $query->where('validator_email', $email);
    }

    /**
     * Determina si el escaneo representó un acceso exitoso.
     */
    public function isSuccess(): bool
    {
        return $this->result === self::RESULT_SUCCESS;
    }

    /**
     * Determina si el escaneo fue denegado/rechazado.
     */
    public function isRejected(): bool
    {
        return $this->result !== self::RESULT_SUCCESS;
    }
}
