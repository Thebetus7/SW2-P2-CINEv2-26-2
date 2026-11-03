# Plan Técnico: Módulo 02 - Núcleo Cinematográfico y FrontWeb Admin (MS CINEMA-CORE)

> **Estado:** APPROVED  
> **Versión:** 1.3.0  
> **Módulo:** `docs/specs/02-ms-cinema-core/`  
> **Ubicación en Código:** `ms/ms-cinema-core/backend/` y `ms/ms-cinema-core/frontend/`  
> **Especificación Base:** `docs/specs/02-ms-cinema-core/spec.md`  
> **Constitución Base:** `docs/constitution.md` (v1.3.0)  
> **Metodología:** SDD-Planning

---

## 1. Resumen Arquitectónico y Decisiones de Diseño

- **Objetivo Técnico:** Implementar el microservicio de salas, películas, cartelera y métricas con bloqueo pesimista en NestJS 10 (TypeORM / PostgreSQL 5433), y el panel administrativo FrontWeb en Angular 17 con arquitectura modular Lazy Loading e inferencia local de IA (WebLLM / Transformers.js).
- **Estilo Arquitectónico:**
  - *Backend (`ms/ms-cinema-core/backend`):* Arquitectura Modular / Hexagonal en NestJS:
    - Dominio: Entidades TypeORM (`CinemaHall`, `Seat`, `Movie`, `Showtime`, `ShowtimeSeat`).
    - Aplicación: Casos de uso de generación matricial paramétrica, programación sin solapamiento (+20 min limpieza) y bloqueo atómico para SAGA.
    - Infraestructura / Presentación: Controladores REST para salas, películas, funciones y endpoints para `MS TICKET-AUTH` (`IC-02.1`) y `MS IA-MCP` (`IC-02.2`).
  - *Frontend (`ms/ms-cinema-core/frontend`):* Angular 17 SPA modular con Lazy Loading, cuadrícula matricial interactiva, interceptores JWT y Web Worker con Transformers.js para analítica offline.

### 1.1 Matriz de Componentes Técnicos (`PLAN-XX`)

| ID Componente | Nombre / Artefacto Técnico | Capa Arquitectónica | Responsabilidad Técnica | Requisitos que Cubre |
| :--- | :--- | :--- | :--- | :--- |
| **`PLAN-01`** | Migración TypeORM / Tablas PostgreSQL | Infraestructura / Datos | Tablas `cinema_halls`, `seats`, `movies`, `showtimes`, `showtime_seats`. | `RF-04.1`, `RB-CORE-01` |
| **`PLAN-02`** | Entidades y Value Objects | Dominio | Reglas de asientos, cálculo de duración + 20 min y capacidad vendible. | `RB-CORE-02`, `RB-CORE-03` |
| **`PLAN-03`** | `LockSeatUseCase`, `ScheduleShowtimeUseCase` | Aplicación | Bloqueo pesimista, liberación SAGA y validación de colisiones horarias. | `RF-05.2`, `RF-05.3`, `SC-02.3.1` |
| **`PLAN-04`** | `WebLlmWorkerService` / Web Worker | Presentación / IA Local | Inferencia offline de lenguaje natural en el navegador. | `HU-14`, `RF-14.1`, `RF-14.2` |
| **`PLAN-05`** | Controladores NestJS y Componentes Angular | Presentación | Endpoints REST y vistas modulares de Angular con cuadrícula interactiva. | `HU-04`, `HU-05`, `HU-13`, `HU-15` |

---

## 2. Estructura Física de Archivos del Módulo

```text
ms/ms-cinema-core/
├── backend/
│   ├── package.json                                                                  # NestJS 10, TypeORM, pg, class-validator, Jest
│   ├── tsconfig.json
│   ├── src/
│   │   ├── app.module.ts
│   │   ├── database/
│   │   │   ├── ormconfig.ts                                                          # PostgreSQL db_cinema_core (puerto 5433)
│   │   │   └── migrations/
│   │   │       └── 1700000000000-InitCinemaCore.ts                                  # [CREATE] (PLAN-01) Tablas e índices
│   │   ├── modules/
│   │   │   ├── halls/
│   │   │   │   ├── domain/cinema-hall.entity.ts, seat.entity.ts                      # [CREATE] (PLAN-02) Entidades de sala y butaca
│   │   │   │   ├── application/create-hall.use-case.ts                               # [CREATE] (PLAN-03) Generación matricial paramétrica
│   │   │   │   └── presentation/halls.controller.ts                                  # [CREATE] (PLAN-05) CRUD de salas
│   │   │   ├── movies/
│   │   │   │   ├── domain/movie.entity.ts                                            # [CREATE] (PLAN-02) Entidad película
│   │   │   │   └── presentation/movies.controller.ts                                 # [CREATE] (PLAN-05) Catálogo de películas
│   │   │   ├── showtimes/
│   │   │   │   ├── domain/showtime.entity.ts, showtime-seat.entity.ts                # [CREATE] (PLAN-02) Función con +20 min limpieza
│   │   │   │   ├── application/schedule-showtime.use-case.ts                         # [CREATE] (PLAN-03) Validación de no traslape
│   │   │   │   ├── application/lock-seat.use-case.ts                                 # [CREATE] (PLAN-03) Bloqueo pesimista SAGA (IC-02.1)
│   │   │   │   └── presentation/showtimes.controller.ts                              # [CREATE] (PLAN-05) Endpoints para SAGA y cartelera
│   │   │   └── metrics/
│   │   │       ├── application/compute-kpis.use-case.ts                              # [CREATE] (PLAN-03) Ocupación y alertas críticas
│   │   │       └── presentation/metrics.controller.ts                                # [CREATE] (PLAN-05) Endpoint para MS IA-MCP (IC-02.2)
│   │   └── test/
│   │       ├── showtime-overlap.spec.ts                                              # [CREATE] Test de prevención de solapamientos
│   │       └── seat-lock-concurrency.spec.ts                                         # [CREATE] Test de concurrencia y bloqueo atómico
│   └── Dockerfile                                                                    # Multi-stage Node 20 Alpine
│
└── frontend/
    ├── package.json                                                                  # Angular 17, @xenova/transformers / @mlc-ai/web-llm, TailwindCSS
    ├── angular.json
    ├── src/
    │   ├── app/
    │   │   ├── app.routes.ts                                                         # Rutas Lazy Loading protegidas por AdminAuthGuard
    │   │   ├── core/
    │   │   │   ├── guards/admin-auth.guard.ts                                        # Redirección obligatoria a ms/ms-ticket-auth/frontend
    │   │   │   └── interceptors/jwt.interceptor.ts                                   # Inyección de token JWT
    │   │   └── features/
    │   │       ├── halls/
    │   │       │   └── components/hall-designer.component.ts                         # [CREATE] (PLAN-05) Diseñador gráfico de butacas
    │   │       ├── showtimes/
    │   │       │   └── components/showtime-calendar.component.ts                     # [CREATE] (PLAN-05) Calendario de programación
    │   │       ├── local-ai/
    │   │       │   ├── services/web-llm-worker.service.ts                            # [CREATE] (PLAN-04) Orquestador del Web Worker
    │   │       │   └── workers/local-ai.worker.ts                                    # [CREATE] (PLAN-04) Inferencia offline Transformers.js
    │   │       └── audit-demo/
    │   │           └── components/audit-demo.component.ts                            # [CREATE] (PLAN-05) Botones para jurado y descarga Excel
    │   └── tests/
    │       └── LocalAiOffline.spec.ts                                                # [CREATE] Test BDD de inferencia sin red
    └── Dockerfile                                                                    # Nginx Alpine
```

---

## 3. Modelo Físico de Persistencia (PostgreSQL `db_cinema_core`, Puerto 5433)

### Tablas Principales:
1. `cinema_halls`: `id UUID PK`, `name VARCHAR(80) UNIQUE`, `total_rows INT`, `columns_per_row INT`, `total_capacity INT`, `projection_type VARCHAR(20)`, `status VARCHAR(20)`.
2. `seats`: `id UUID PK`, `hall_id UUID FK`, `row_letter CHAR(2)`, `seat_number INT`, `visible_code VARCHAR(10)`, `seat_type VARCHAR(30)`, `is_active BOOLEAN`.
3. `movies`: `id UUID PK`, `title VARCHAR(150)`, `synopsis TEXT`, `duration_minutes INT`, `rating VARCHAR(10)`, `genre VARCHAR(50)`, `poster_url VARCHAR(255)`, `status VARCHAR(20)`.
4. `showtimes`: `id UUID PK`, `movie_id UUID FK`, `hall_id UUID FK`, `start_time TIMESTAMP`, `end_time TIMESTAMP`, `base_price DECIMAL(10,2)`, `status VARCHAR(20)`.
5. `showtime_seats`: `id UUID PK`, `showtime_id UUID FK`, `seat_id UUID FK`, `status VARCHAR(25)`, `locked_until TIMESTAMP`, `locked_by_ticket_id UUID`.

