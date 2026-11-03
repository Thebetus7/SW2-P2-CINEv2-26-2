# Plan Técnico: Módulo 05 - Panel de Boleteo y Validación Criptográfica (MS BOLETEO-VALIDATOR)

> **Estado:** APPROVED  
> **Versión:** 1.3.0  
> **Módulo:** `docs/specs/05-ms-boleteo-validator/`  
> **Ubicación en Código:** `ms/ms-boleteo-validator/backend/` y `ms/ms-boleteo-validator/frontend/`  
> **Especificación Base:** `docs/specs/05-ms-boleteo-validator/spec.md`  
> **Constitución Base:** `docs/constitution.md` (v1.3.0)  
> **Metodología:** SDD-Planning

---

## 1. Resumen Arquitectónico y Decisiones de Diseño

- **Objetivo Técnico:** Implementar la aplicación de validación de boletos con escaneo por cámara HTML5 continuo, verificación local HMAC-SHA256 y sincronización con Spring Boot (`MS TICKET-AUTH`), con backend en Laravel 11 y frontend en React con Inertia.js.
- **Estilo Arquitectónico:**
  - *Backend (`ms/ms-boleteo-validator/backend`):* Laravel 11 API con base de datos local SQLite o PostgreSQL para logging de turnos (`access_scans`), servicio de validación HMAC en PHP y cliente HTTP con Guzzle hacia Ticket-Auth (`IC-05.1`).
  - *Frontend (`ms/ms-boleteo-validator/frontend`):* Componentes React con lector `@zxing/browser` o `html5-qrcode`, feedback de colores Verde/Rojo y tabla histórica de validaciones.

### 1.1 Matriz de Componentes Técnicos (`PLAN-XX`)

| ID Componente | Nombre / Artefacto Técnico | Capa Arquitectónica | Responsabilidad Técnica | Requisitos que Cubre |
| :--- | :--- | :--- | :--- | :--- |
| **`PLAN-01`** | Migración `create_access_scans_table` | Infraestructura / Datos | Registro histórico de lecturas del boletero. | `RB-BOL-02`, `SC-05.1.1` |
| **`PLAN-02`** | `CryptoValidationService` | Dominio / Cripto | Verificación de firma HMAC-SHA256 con clave secreta. | `RB-BOL-01`, `SC-05.1.3` |
| **`PLAN-03`** | `TicketAuthClient` | Infraestructura | Cliente HTTP con token JWT hacia `MS TICKET-AUTH` (`IC-05.1`). | `RB-BOL-04`, `SC-05.1.2` |
| **`PLAN-04`** | `BoleteoController`, `web.php` | Aplicación / API | Endpoints para escaneo y registro. | `HU-12`, `RF-12.2` |
| **`PLAN-05`** | `ScannerView.tsx`, `CameraScanner.tsx` | Presentación (React) | Cámara continua, feedback Verde/Rojo y entrada manual. | `RF-12.1`, `RF-12.4`, `RF-12.5` |

---

## 2. Estructura Física de Archivos del Módulo

```text
ms/ms-boleteo-validator/
├── backend/
│   ├── composer.json                                                                 # Laravel 11, Guzzle, Pest
│   ├── artisan
│   ├── routes/
│   │   ├── api.php                                                                   # API endpoints
│   │   └── web.php
│   ├── database/
│   │   └── migrations/
│   │       └── 2026_11_03_000000_create_access_scans_table.php                       # Tabla local de registro de entradas
│   ├── app/
│   │   ├── Services/
│   │   │   ├── CryptoValidationService.php                                           # HMAC-SHA256 en PHP
│   │   │   └── TicketAuthClient.php                                                  # Cliente HTTP hacia Spring Boot (IC-05.1)
│   │   └── Http/Controllers/
│   │       └── BoleteoController.php                                                 # Endpoints /api/validate-ticket
│   ├── tests/
│   │   └── Feature/CryptoValidationTest.php                                          # Test de firma HMAC
│   └── Dockerfile                                                                    # PHP 8.2 FPM / Alpine
│
└── frontend/
    ├── package.json                                                                  # React 18, @zxing/browser / html5-qrcode, TailwindCSS
    ├── src/
    │   ├── Components/
    │   │   ├── CameraScanner.tsx                                                     # Lector continuo de cámara HTML5
    │   │   ├── ManualEntryModal.tsx                                                  # Casilla para digitación manual
    │   │   └── ResultAlertOverlay.tsx                                                # Pantalla Verde / Roja de confirmación
    │   └── Pages/
    │       └── BoleteoScanner.tsx                                                    # Vista principal con cámara y turnos
    └── Dockerfile
```

