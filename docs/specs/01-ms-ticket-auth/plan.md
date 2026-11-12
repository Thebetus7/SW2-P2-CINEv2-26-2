# Plan Técnico: Módulo 01 - Autenticación Centralizada y Gestión de Boletos (MS TICKET-AUTH)
Constitution-SHA256: bf9282dc4cc5ac79d835e768865b29b9544a02c8cd2af2489d72cfc304cb8e84
Spec-SHA256: e593b8af21ae6ec46409a5c7583755f576fdabd7c27264265920041bac1909a6
Status: APPROVED
Version: 1

Revisión técnica 2026-11-12: PLAN-04 debe propagar errores de Cinema-Core en bloqueo, liberación y confirmación en lugar de simular éxito. PLAN-03 no continuará con una respuesta de fallo. Las fallas de compensación se harán observables para recuperación; no se considerará demostrada la liberación sin respuesta exitosa.

Para la credencial verificable, PLAN-03 consulta en Cinema-Core los datos de la función y butaca; PLAN-04 solicita a Multimedia el JPEG y payload firmado usando `Ticket.createdAt` como `issuedAt`. Verifica que la respuesta corresponda a los mismos identificadores y fecha antes de guardar la firma. Con esos datos existentes en Ticket, el cliente puede reconstruir el payload canónico sin nueva migración. Un fallo o payload incompleto no se sustituye por una firma simulada.

> **Estado:** APPROVED  
> **Versión:** 1.3.0  
> **Módulo:** `docs/specs/01-ms-ticket-auth/`  
> **Ubicación en Código:** `ms/ms-ticket-auth/backend/` y `ms/ms-ticket-auth/frontend/`  
> **Especificación Base:** `docs/specs/01-ms-ticket-auth/spec.md`  
> **Constitución Base:** `docs/constitution.md` (v1.3.0)  
> **Metodología:** SDD-Planning

---

## 1. Resumen Arquitectónico y Decisiones de Diseño

- **Objetivo Técnico:** Implementar el microservicio autocontenido de autenticación, emisión de tokens JWT, orquestación SAGA de compra de boletos e integración con Stripe, organizando el backend en Spring Boot 3 (Java 21) bajo Arquitectura Hexagonal y el frontend en React 18 con Vite para el portal de acceso único y Stepper de pago.
- **Estilo Arquitectónico:**
  - *Backend (`ms/ms-ticket-auth/backend`):* Arquitectura Hexagonal (Puertos y Adaptadores) estricta:
    - Dominio: Entidades puras (`User`, `Ticket`), Value Objects y excepciones tipadas.
    - Aplicación: Casos de uso de autenticación, compra de boleto y orquestación SAGA con compensaciones síncronas.
    - Infraestructura: Adaptadores Spring Data JPA (PostgreSQL puerto 5432), Spring Security con BCrypt, GraphQL Controller / Schema Federado, cliente HTTP hacia `MS CINEMA-CORE` y `MS MULTIMEDIA`, y SDK de Stripe.
  - *Frontend (`ms/ms-ticket-auth/frontend`):* Portal de login unificado con botones de acceso Demo 1-Click y Stepper UI de 4 etapas para pago.
- **Decisiones Técnicas Clave:**
  - **SAGA Coordinator:** `PurchaseTicketSagaCoordinator` con temporizador estricto de 60 segundos mediante tarea programada que invoca `POST /api/v1/showtimes/{id}/seats/{id}/release` si el pago no se completa.
  - **Seguridad:** BCryptPasswordEncoder (costo 10). JWT firmado con HMAC-SHA256 y validez de 8 horas.
  - **Stripe:** Uso de `PaymentIntent` de Stripe en modo desarrollador con captura síncrona.

### 1.1 Matriz de Componentes Técnicos (`PLAN-XX`)

| ID Componente | Nombre / Artefacto Técnico | Capa Arquitectónica | Responsabilidad Técnica | Requisitos que Cubre |
| :--- | :--- | :--- | :--- | :--- |
| **`PLAN-01`** | `V1__init_auth_tickets.sql` / JPA Entities | Infraestructura / Datos | Esquema PostgreSQL, tablas `users` y `tickets`, índices y restricciones. | `RF-01.1`, `RB-AUTH-01`, `RB-AUTH-02` |
| **`PLAN-02`** | `User`, `Ticket`, `TicketState`, Domain Failures | Dominio | Entidades puras, máquina de estados y excepciones tipadas. | `RB-AUTH-02`, `RB-AUTH-03`, `RB-AUTH-05` |
| **`PLAN-03`** | `AuthenticateUserUseCase`, `PurchaseTicketSagaUseCase` | Aplicación | Orquestación de login, bloqueo temporal de butacas y transacciones SAGA. | `HU-01`, `HU-02`, `RF-02.1`, `RF-02.5` |
| **`PLAN-04`** | `CinemaCoreClient`, `MultimediaClient`, `StripeAdapter` | Infraestructura | Clientes HTTP inter-servicio y pasarela externa Stripe (`IC-01.1`, `IC-01.2`). | `RF-02.1`, `RF-02.2`, `RF-02.3`, `IC-01.1` |
| **`PLAN-05`** | `AuthGraphQLController`, `LoginView`, `StepperPayment` | Presentación | Resolvers GraphQL, pantalla de login único con botones Demo y Stepper de 4 pasos. | `HU-01`, `HU-02`, `HU-03`, `RF-01.2`, `IC-01.4` |

---

## 2. Estructura Física de Archivos del Módulo

```text
ms/ms-ticket-auth/
├── backend/
│   ├── pom.xml                                                                       # Dependencias Maven (Spring Boot 3, GraphQL, Security, Stripe SDK)
│   ├── src/main/resources/
│   │   ├── application.yml                                                           # Configuración: puerto 8081, PostgreSQL 5432, JWT secret y Stripe keys
│   │   ├── graphql/schema.graphqls                                                   # Esquema GraphQL federado con Ticket, Showtime, User
│   │   └── db/migration/V1__init_auth_tickets.sql                                    # [CREATE] (PLAN-01) Migración Flyway/PostgreSQL
│   ├── src/main/java/com/cine/auth/
│   │   ├── domain/
│   │   │   ├── model/
│   │   │   │   ├── User.java                                                         # [CREATE] (PLAN-02) Entidad de usuario y rol
│   │   │   │   ├── Ticket.java                                                       # [CREATE] (PLAN-02) Entidad de boleto y ciclo de vida
│   │   │   │   └── TicketStatus.java                                                 # [CREATE] (PLAN-02) Enum (PENDING_PAYMENT, CONFIRMED, USED, CANCELLED)
│   │   │   ├── exception/
│   │   │   │   ├── DomainException.java                                              # [CREATE] (PLAN-02) Excepción base tipada
│   │   │   │   ├── SeatAlreadyReservedException.java                                 # [CREATE] (PLAN-02) Conflicto de asiento (409)
│   │   │   │   └── PaymentExpiredException.java                                      # [CREATE] (PLAN-02) Expiración de 60 segundos
│   │   │   └── repository/
│   │   │       ├── UserRepositoryPort.java                                           # [CREATE] (PLAN-02) Puerto de usuarios
│   │   │       └── TicketRepositoryPort.java                                         # [CREATE] (PLAN-02) Puerto de boletos
│   │   ├── application/
│   │   │   ├── dto/
│   │   │   │   ├── LoginRequestDto.java                                              # [CREATE] (PLAN-03) Payload de login
│   │   │   │   ├── AuthResponseDto.java                                              # [CREATE] (PLAN-03) Token JWT y perfil de usuario
│   │   │   │   ├── InitiatePurchaseDto.java                                          # [CREATE] (PLAN-03) Datos de butaca y función
│   │   │   │   └── ConfirmPaymentDto.java                                            # [CREATE] (PLAN-03) Confirmación con Stripe PaymentIntent
│   │   │   └── usecase/
│   │   │       ├── AuthenticateUserUseCase.java                                      # [CREATE] (PLAN-03) Verificación BCrypt y JWT
│   │   │       ├── RegisterUserUseCase.java                                          # [CREATE] (PLAN-03) Registro con BCrypt
│   │   │       └── PurchaseTicketSagaCoordinator.java                                # [CREATE] (PLAN-03) Orquestador SAGA con temporizador de 60s
│   │   └── infrastructure/
│   │       ├── adapter/
│   │       │   ├── JpaUserRepositoryAdapter.java                                     # [CREATE] (PLAN-04) Implementación JPA de UserRepositoryPort
│   │       │   ├── JpaTicketRepositoryAdapter.java                                   # [CREATE] (PLAN-04) Implementación JPA de TicketRepositoryPort
│   │       │   ├── CinemaCoreRestClient.java                                         # [CREATE] (PLAN-04) Cliente HTTP hacia MS CINEMA-CORE (IC-01.1)
│   │       │   ├── MultimediaRestClient.java                                         # [CREATE] (PLAN-04) Cliente HTTP hacia MS MULTIMEDIA (IC-01.2)
│   │       │   └── StripePaymentGatewayAdapter.java                                  # [CREATE] (PLAN-04) Adaptador de API Stripe (test cards)
│   │       ├── config/
│   │       │   ├── SecurityConfig.java                                               # [CREATE] (PLAN-04) Spring Security + JWT Filter
│   │       │   └── DatabaseSeeder.java                                               # [CREATE] (PLAN-01) Carga de 3 usuarios demo con BCrypt
│   │       └── presentation/
│   │           ├── AuthGraphQLResolver.java                                          # [CREATE] (PLAN-05) Query y Mutation GraphQL (IC-01.4)
│   │           ├── TicketGraphQLResolver.java                                        # [CREATE] (PLAN-05) Resolver federado para Tickets
│   │           └── TicketRestController.java                                         # [CREATE] (PLAN-05) Endpoint REST para MS BOLETEO-VALIDATOR (IC-01.3)
│   ├── src/test/java/com/cine/auth/
│   │   ├── domain/TicketDomainTest.java                                              # [CREATE] Test unitario de reglas de boleto
│   │   ├── application/PurchaseSagaTest.java                                         # [CREATE] Test de compensación SAGA de 60s
│   │   └── presentation/AuthGraphQLIntegrationTest.java                              # [CREATE] Test BDD de endpoints GraphQL
│   └── Dockerfile                                                                    # Multi-stage build Java 21 Alpine
│
└── frontend/
    ├── package.json                                                                  # React 18, Vite, Apollo Client, TailwindCSS, Stripe Elements
    ├── vite.config.ts
    ├── src/
    │   ├── components/
    │   │   ├── LoginView.tsx                                                         # [CREATE] (PLAN-05) Portal único de login con botones Demo 1-Click
    │   │   ├── StepperPayment.tsx                                                    # [CREATE] (PLAN-05) Stepper UI de 4 etapas con cronómetro de 60s
    │   │   ├── TicketPreview.tsx                                                     # [CREATE] (PLAN-05) Renderizado de imagen desde MinIO S3
    │   │   └── StripePaymentWrapper.tsx                                              # [CREATE] (PLAN-05) Contenedor de Stripe Elements de prueba
    │   └── tests/
    │       └── LoginAndPurchase.spec.tsx                                             # [CREATE] Test BDD visual de login demo y compra
    └── Dockerfile                                                                    # Nginx Alpine para servir frontend
```

---

## 3. Modelo Físico de Persistencia (PostgreSQL `db_tickets_auth`, Puerto 5432)

### 3.1 Tablas Físicas

#### Tabla: `users`
| Columna | Tipo Físico | Nulabilidad | Restricciones / Índices | Propósito |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `UUID` | `NOT NULL` | `PRIMARY KEY` | Identificador único |
| `full_name` | `VARCHAR(100)` | `NOT NULL` | | Nombre del usuario |
| `email` | `VARCHAR(120)` | `NOT NULL` | `UNIQUE`, `idx_users_email` | Correo de acceso |
| `password_hash` | `VARCHAR(255)` | `NOT NULL` | | Hash BCrypt (costo 10) |
| `role` | `VARCHAR(20)` | `NOT NULL` | Check: `ADMIN`, `CLIENTE`, `BOLETERO` | Rol de autorización |
| `created_at` | `TIMESTAMP` | `NOT NULL` | Default `CURRENT_TIMESTAMP` | Fecha de creación |

#### Tabla: `tickets`
| Columna | Tipo Físico | Nulabilidad | Restricciones / Índices | Propósito |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `UUID` | `NOT NULL` | `PRIMARY KEY` | Identificador único del boleto |
| `user_id` | `UUID` | `NOT NULL` | `FOREIGN KEY (users.id)` | Comprador del ticket |
| `showtime_id` | `UUID` | `NOT NULL` | `idx_tickets_showtime` | Referencia a la función |
| `seat_id` | `UUID` | `NOT NULL` | `idx_tickets_seat` | Referencia a la butaca |
| `price_paid` | `DECIMAL(10,2)` | `NOT NULL` | Check `> 0` | Monto cobrado en Stripe |
| `status` | `VARCHAR(25)` | `NOT NULL` | Enum: `PENDING_PAYMENT`, `CONFIRMED`, `USED`, `CANCELLED` | Ciclo de vida |
| `ticket_image_url`| `VARCHAR(255)` | `NULL` | | URL de MinIO S3 |
| `qr_signature` | `VARCHAR(255)` | `NULL` | | Firma HMAC-SHA256 |
| `lock_expires_at`| `TIMESTAMP` | `NULL` | | Límite de 60 segundos |
| `created_at` | `TIMESTAMP` | `NOT NULL` | Default `CURRENT_TIMESTAMP` | Marca temporal |

