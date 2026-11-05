<?php

namespace Database\Seeders;

use App\Models\AccessScan;
use App\Models\Ticket;
use App\Models\User;
use App\Services\CryptoValidationService;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $cryptoService = new CryptoValidationService();

        // 1. Usuarios del Ecosistema CineV2
        $users = [
            [
                'name' => 'Administrador General',
                'email' => 'admin@cine.local',
                'password' => Hash::make('admin123'),
            ],
            [
                'name' => 'Cliente Frecuente',
                'email' => 'cliente@cine.local',
                'password' => Hash::make('cliente123'),
            ],
            [
                'name' => 'Boletero Sala',
                'email' => 'boletero@cine.local',
                'password' => Hash::make('boletero123'),
            ],
        ];

        foreach ($users as $userData) {
            User::updateOrCreate(
                ['email' => $userData['email']],
                $userData
            );
        }

        // 2. Definición Maestra de 15 Boletos con Firmas Criptográficas HMAC-SHA256 Válidas
        $issuedAt = '2026-11-04T18:00:00Z';

        $ticketDefinitions = [
            [
                'num' => '01',
                'movie' => 'Avatar 2: El Sentido del Agua',
                'hall' => 'Sala 1 - IMAX Laser',
                'seat' => 'C-8',
                'showtime' => 'st-avatar2-hoy-tarde',
                'amount' => 55.00,
                'status' => 'CONFIRMED',
            ],
            [
                'num' => '02',
                'movie' => 'Avatar 2: El Sentido del Agua',
                'hall' => 'Sala 1 - IMAX Laser',
                'seat' => 'C-9',
                'showtime' => 'st-avatar2-hoy-tarde',
                'amount' => 55.00,
                'status' => 'CONFIRMED',
            ],
            [
                'num' => '03',
                'movie' => 'Dune: Parte Dos',
                'hall' => 'Sala 1 - IMAX Laser',
                'seat' => 'D-5',
                'showtime' => 'st-dune2-hoy-tarde',
                'amount' => 55.00,
                'status' => 'USED',
            ],
            [
                'num' => '04',
                'movie' => 'Dune: Parte Dos',
                'hall' => 'Sala 1 - IMAX Laser',
                'seat' => 'D-6',
                'showtime' => 'st-dune2-hoy-tarde',
                'amount' => 55.00,
                'status' => 'USED',
            ],
            [
                'num' => '05',
                'movie' => 'Oppenheimer',
                'hall' => 'Sala 3 - Dolby Atmos 2D',
                'seat' => 'B-4',
                'showtime' => 'st-oppenheimer-hoy-noche',
                'amount' => 35.00,
                'status' => 'USED',
            ],
            [
                'num' => '06',
                'movie' => 'Intensamente 2',
                'hall' => 'Sala 3 - Dolby Atmos 2D',
                'seat' => 'C-4',
                'showtime' => 'st-insideout2-hoy-tarde',
                'amount' => 35.00,
                'status' => 'CONFIRMED',
            ],
            [
                'num' => '07',
                'movie' => 'Intensamente 2',
                'hall' => 'Sala 3 - Dolby Atmos 2D',
                'seat' => 'C-5',
                'showtime' => 'st-insideout2-hoy-tarde',
                'amount' => 35.00,
                'status' => 'CONFIRMED',
            ],
            [
                'num' => '08',
                'movie' => 'Gladiador II',
                'hall' => 'Sala 4 - VIP Lounge Experience',
                'seat' => 'A-3',
                'showtime' => 'st-gladiator2-hoy-noche',
                'amount' => 65.00,
                'status' => 'CONFIRMED',
            ],
            [
                'num' => '09',
                'movie' => 'Gladiador II',
                'hall' => 'Sala 4 - VIP Lounge Experience',
                'seat' => 'A-4',
                'showtime' => 'st-gladiator2-hoy-noche',
                'amount' => 65.00,
                'status' => 'USED',
            ],
            [
                'num' => '10',
                'movie' => 'Deadpool & Wolverine',
                'hall' => 'Sala 2 - MacroXE RealD 3D',
                'seat' => 'D-6',
                'showtime' => 'st-deadpool-hoy-noche',
                'amount' => 45.00,
                'status' => 'CONFIRMED',
            ],
            [
                'num' => '11',
                'movie' => 'Deadpool & Wolverine',
                'hall' => 'Sala 2 - MacroXE RealD 3D',
                'seat' => 'D-7',
                'showtime' => 'st-deadpool-hoy-noche',
                'amount' => 45.00,
                'status' => 'PENDING_PAYMENT',
            ],
            [
                'num' => '12',
                'movie' => 'Spider-Man: A Través del Spider-Verso',
                'hall' => 'Sala 2 - MacroXE RealD 3D',
                'seat' => 'E-5',
                'showtime' => 'st-spider-hoy-tarde',
                'amount' => 40.00,
                'status' => 'CONFIRMED',
            ],
            [
                'num' => '13',
                'movie' => 'Interestelar',
                'hall' => 'Sala 2 - MacroXE RealD 3D',
                'seat' => 'F-5',
                'showtime' => 'st-interstellar-hoy-noche',
                'amount' => 45.00,
                'status' => 'CONFIRMED',
            ],
            [
                'num' => '14',
                'movie' => 'Oppenheimer',
                'hall' => 'Sala 4 - VIP Lounge Experience',
                'seat' => 'B-1',
                'showtime' => 'st-oppenheimer-hoy-noche',
                'amount' => 65.00,
                'status' => 'PENDING_PAYMENT',
            ],
            [
                'num' => '15',
                'movie' => 'Dune: Parte Dos',
                'hall' => 'Sala 1 - IMAX Laser',
                'seat' => 'E-8',
                'showtime' => 'st-dune2-manana-noche',
                'amount' => 55.00,
                'status' => 'CONFIRMED',
            ],
        ];

        Ticket::query()->truncate();

        foreach ($ticketDefinitions as $def) {
            $ticketId = "b11100{$def['num']}-2026-4000-8000-0000000000{$def['num']}";
            $canonical = $cryptoService->buildCanonicalString($ticketId, $def['seat'], $def['showtime'], $issuedAt);
            $signature = $cryptoService->generateSignature($ticketId, $def['seat'], $def['showtime'], $issuedAt);

            Ticket::create([
                'id' => $ticketId,
                'ticket_id' => $ticketId,
                'movie_title' => $def['movie'],
                'hall_name' => $def['hall'],
                'seat_id' => $def['seat'],
                'seat_code' => $def['seat'],
                'showtime_id' => $def['showtime'],
                'amount' => $def['amount'],
                'status' => $def['status'],
                'issued_at' => $issuedAt,
                'sig' => $signature,
                'canonical' => $canonical,
                'user_email' => 'cliente@cine.local',
            ]);
        }

        // 3. Auditoría de Escaneos Realistas (AccessScan) para el Boletero (15 registros)
        AccessScan::query()->truncate();

        $scanRecords = [
            // Escaneos Exitosos de Boletos Utilizados
            [
                'ticket_id' => 'b1110003-2026-4000-8000-000000000003',
                'movie_title' => 'Dune: Parte Dos',
                'hall_name' => 'Sala 1 - IMAX Laser',
                'seat_code' => 'D-5',
                'scanned_at' => now()->subMinutes(120),
                'result' => AccessScan::RESULT_SUCCESS,
                'validator_email' => 'boletero@cine.local',
            ],
            [
                'ticket_id' => 'b1110004-2026-4000-8000-000000000004',
                'movie_title' => 'Dune: Parte Dos',
                'hall_name' => 'Sala 1 - IMAX Laser',
                'seat_code' => 'D-6',
                'scanned_at' => now()->subMinutes(118),
                'result' => AccessScan::RESULT_SUCCESS,
                'validator_email' => 'boletero@cine.local',
            ],
            [
                'ticket_id' => 'b1110005-2026-4000-8000-000000000005',
                'movie_title' => 'Oppenheimer',
                'hall_name' => 'Sala 3 - Dolby Atmos 2D',
                'seat_code' => 'B-4',
                'scanned_at' => now()->subMinutes(90),
                'result' => AccessScan::RESULT_SUCCESS,
                'validator_email' => 'boletero@cine.local',
            ],
            [
                'ticket_id' => 'b1110009-2026-4000-8000-000000000009',
                'movie_title' => 'Gladiador II',
                'hall_name' => 'Sala 4 - VIP Lounge Experience',
                'seat_code' => 'A-4',
                'scanned_at' => now()->subMinutes(60),
                'result' => AccessScan::RESULT_SUCCESS,
                'validator_email' => 'boletero@cine.local',
            ],

            // Reintentos de Entrada (Boleto Ya Utilizado - RB-BOL-02)
            [
                'ticket_id' => 'b1110003-2026-4000-8000-000000000003',
                'movie_title' => 'Dune: Parte Dos',
                'hall_name' => 'Sala 1 - IMAX Laser',
                'seat_code' => 'D-5',
                'scanned_at' => now()->subMinutes(115),
                'result' => AccessScan::RESULT_ALREADY_USED,
                'validator_email' => 'boletero@cine.local',
            ],
            [
                'ticket_id' => 'b1110004-2026-4000-8000-000000000004',
                'movie_title' => 'Dune: Parte Dos',
                'hall_name' => 'Sala 1 - IMAX Laser',
                'seat_code' => 'D-6',
                'scanned_at' => now()->subMinutes(110),
                'result' => AccessScan::RESULT_ALREADY_USED,
                'validator_email' => 'boletero@cine.local',
            ],
            [
                'ticket_id' => 'b1110009-2026-4000-8000-000000000009',
                'movie_title' => 'Gladiador II',
                'hall_name' => 'Sala 4 - VIP Lounge Experience',
                'seat_code' => 'A-4',
                'scanned_at' => now()->subMinutes(55),
                'result' => AccessScan::RESULT_ALREADY_USED,
                'validator_email' => 'boletero@cine.local',
            ],

            // Intentos con Firma Inválida o Código QR Falsificado (RB-BOL-01)
            [
                'ticket_id' => 'b1110999-FAKE-4000-8000-000000000999',
                'movie_title' => 'Intento Adulterado',
                'hall_name' => 'Sala 1 - IMAX Laser',
                'seat_code' => 'X-9',
                'scanned_at' => now()->subMinutes(45),
                'result' => AccessScan::RESULT_INVALID_SIGNATURE,
                'validator_email' => 'boletero@cine.local',
            ],
            [
                'ticket_id' => 'b1110888-BADS-4000-8000-000000000888',
                'movie_title' => 'Firma Manipulada',
                'hall_name' => 'Sala 2 - MacroXE RealD 3D',
                'seat_code' => 'Z-1',
                'scanned_at' => now()->subMinutes(30),
                'result' => AccessScan::RESULT_INVALID_SIGNATURE,
                'validator_email' => 'boletero@cine.local',
            ],

            // Escaneos Exitosos de Turno Previo
            [
                'ticket_id' => 'b1110001-2026-4000-8000-000000000001',
                'movie_title' => 'Avatar 2: El Sentido del Agua',
                'hall_name' => 'Sala 1 - IMAX Laser',
                'seat_code' => 'C-8',
                'scanned_at' => now()->subMinutes(25),
                'result' => AccessScan::RESULT_SUCCESS,
                'validator_email' => 'boletero@cine.local',
            ],
            [
                'ticket_id' => 'b1110002-2026-4000-8000-000000000002',
                'movie_title' => 'Avatar 2: El Sentido del Agua',
                'hall_name' => 'Sala 1 - IMAX Laser',
                'seat_code' => 'C-9',
                'scanned_at' => now()->subMinutes(24),
                'result' => AccessScan::RESULT_SUCCESS,
                'validator_email' => 'boletero@cine.local',
            ],
            [
                'ticket_id' => 'b1110006-2026-4000-8000-000000000006',
                'movie_title' => 'Intensamente 2',
                'hall_name' => 'Sala 3 - Dolby Atmos 2D',
                'seat_code' => 'C-4',
                'scanned_at' => now()->subMinutes(18),
                'result' => AccessScan::RESULT_SUCCESS,
                'validator_email' => 'boletero@cine.local',
            ],
            [
                'ticket_id' => 'b1110008-2026-4000-8000-000000000008',
                'movie_title' => 'Gladiador II',
                'hall_name' => 'Sala 4 - VIP Lounge Experience',
                'seat_code' => 'A-3',
                'scanned_at' => now()->subMinutes(12),
                'result' => AccessScan::RESULT_SUCCESS,
                'validator_email' => 'boletero@cine.local',
            ],
            [
                'ticket_id' => 'b1110010-2026-4000-8000-000000000010',
                'movie_title' => 'Deadpool & Wolverine',
                'hall_name' => 'Sala 2 - MacroXE RealD 3D',
                'seat_code' => 'D-6',
                'scanned_at' => now()->subMinutes(8),
                'result' => AccessScan::RESULT_SUCCESS,
                'validator_email' => 'boletero@cine.local',
            ],
            [
                'ticket_id' => 'b1110012-2026-4000-8000-000000000012',
                'movie_title' => 'Spider-Man: A Través del Spider-Verso',
                'hall_name' => 'Sala 2 - MacroXE RealD 3D',
                'seat_code' => 'E-5',
                'scanned_at' => now()->subMinutes(3),
                'result' => AccessScan::RESULT_SUCCESS,
                'validator_email' => 'boletero@cine.local',
            ],
        ];

        foreach ($scanRecords as $scan) {
            AccessScan::create($scan);
        }
    }
}
