<?php

namespace App\Services;

class CryptoValidationService
{
    private string $defaultSecret;

    public function __construct(?string $secret = null)
    {
        if ($secret !== null) {
            $this->defaultSecret = $secret;
        } elseif (function_exists('config') && function_exists('app') && app()->has('config')) {
            $this->defaultSecret = (string) config('services.ticket_auth.mcp_secret', 'clave_secreta_universitaria_mcp');
        } else {
            $this->defaultSecret = 'clave_secreta_universitaria_mcp';
        }
    }

    /**
     * Construye la representación canónica del payload para la firma.
     */
    public function buildCanonicalString(string $ticketId, string $seatId, string $showtimeId, string $issuedAt): string
    {
        return "{$ticketId}:{$seatId}:{$showtimeId}:{$issuedAt}";
    }

    /**
     * Genera la firma HMAC-SHA256 correspondiente a los datos de la entrada.
     */
    public function generateSignature(
        string $ticketId,
        string $seatId,
        string $showtimeId,
        string $issuedAt,
        ?string $secret = null
    ): string {
        $key = $secret ?? $this->defaultSecret;
        $canonical = $this->buildCanonicalString($ticketId, $seatId, $showtimeId, $issuedAt);

        return hash_hmac('sha256', $canonical, $key);
    }

    /**
     * Valida la autenticidad e integridad del payload decodificado del código QR.
     * Retorna true únicamente si la firma coincide con exactitud en tiempo constante.
     *
     * @param  array<string, mixed>  $payload
     */
    public function validateSignature(array $payload, ?string $secret = null): bool
    {
        $requiredKeys = ['ticketId', 'seatId', 'showtimeId', 'issuedAt', 'sig'];
        foreach ($requiredKeys as $key) {
            if (! isset($payload[$key]) || ! is_string($payload[$key]) || trim($payload[$key]) === '') {
                return false;
            }
        }

        $expectedSig = $this->generateSignature(
            $payload['ticketId'],
            $payload['seatId'],
            $payload['showtimeId'],
            $payload['issuedAt'],
            $secret
        );

        return hash_equals($expectedSig, $payload['sig']);
    }
}
