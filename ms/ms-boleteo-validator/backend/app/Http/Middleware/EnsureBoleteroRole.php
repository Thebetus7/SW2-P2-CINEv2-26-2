<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureBoleteroRole
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        // 1. Verificar encabezado explícito de rol
        $headerRole = strtoupper((string) $request->header('X-User-Role', ''));

        // 2. Verificar rol en usuario autenticado (si aplica sesión)
        $userRole = strtoupper((string) ($request->user()?->role ?? ''));

        // 3. Verificar si el token Bearer contiene payload con rol BOLETERO
        $bearerToken = $request->bearerToken();
        $jwtRole = $this->extractRoleFromJwt($bearerToken);

        $effectiveRole = $headerRole ?: ($userRole ?: $jwtRole);

        // Permitir a BOLETERO o ADMIN
        if (in_array($effectiveRole, ['BOLETERO', 'ADMIN'], true)) {
            return $next($request);
        }

        // Si la petición espera JSON
        if ($request->expectsJson() || $request->is('api/*')) {
            return response()->json([
                'error' => 'FORBIDDEN',
                'message' => 'Acceso denegado: Se requiere rol BOLETERO para operar la consola de validación.',
            ], 403);
        }

        // Petición web estándar: redirigir a login
        return redirect()->route('login');
    }

    /**
     * Extrae el rol de un JWT codificado en base64 de manera segura sin dependencias externas pesadas.
     */
    private function extractRoleFromJwt(?string $jwt): string
    {
        if (! $jwt) {
            return '';
        }

        $parts = explode('.', $jwt);
        if (count($parts) < 2) {
            return '';
        }

        $payloadJson = base64_decode(strtr($parts[1], '-_', '+/'));
        if (! $payloadJson) {
            return '';
        }

        $payload = json_decode($payloadJson, true);
        if (is_array($payload) && isset($payload['role'])) {
            return strtoupper((string) $payload['role']);
        }

        return '';
    }
}
