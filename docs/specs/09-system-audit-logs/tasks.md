# Tasks: Bitácora Unificada y Monitoreo en Tiempo Real (Consola IA-MCP)
<!-- sdd:progress:start -->
## Task Progress

Status: IN_PROGRESS

| Métrica | Cantidad |
| --- | ---: |
| Total de tareas | 10 |
| Tareas realizadas | 0 |
| Tareas por realizar | 10 |
| Tareas bloqueadas | 0 |
| Tareas en progreso | 1 |
| Progreso | 0.0% |

## Registro de tareas

| ID | Estado | Tarea | Evidencia actual |
| --- | --- | --- | --- |
| T1.1 | IN_PROGRESS | [IMPL] Buffer Circular deque(500) y Endpoints de Ingesta/Streaming en FastAPI | pendiente |
| T1.2 | PENDING | [TEST] Pruebas Unitarias de Buffer Circular, Ingesta y Stream SSE | pendiente |
| T2.1 | PENDING | [IMPL] Nueva Pestaña LOG y Componente SystemLogStreamView en React | pendiente |
| T2.2 | PENDING | [TEST] Pruebas de Renderizado Inicial, Conexión SSE y Montaje de Eventos | pendiente |
| T3.1 | PENDING | [IMPL] Barra de Filtros Multidimensional, Freeze Mode y Tarjetas KPIs | pendiente |
| T3.2 | PENDING | [TEST] Pruebas de Filtrado por Actor/Severidad, Freeze Mode y KPIs | pendiente |
| T4.1 | PENDING | [IMPL] Visor Acordeón de Metadatos JSON y Exportador a Archivos CSV/JSON | pendiente |
| T4.2 | PENDING | [TEST] Pruebas de Despliegue de Acordeón y Descarga de Archivos | pendiente |
| T5.1 | PENDING | [IMPL] Telemetría Asíncrona en Boletero, Cinema-Core, Ticket-Auth y Móvil | pendiente |
| T5.2 | PENDING | [TEST] Pruebas de Integración de Telemetría de Eventos Cruzados | pendiente |

## Checklist rápido

- [/] T1.1 [IMPL] Buffer Circular deque(500) y Endpoints de Ingesta/Streaming en FastAPI
- [ ] T1.2 [TEST] Pruebas Unitarias de Buffer Circular, Ingesta y Stream SSE
- [ ] T2.1 [IMPL] Nueva Pestaña LOG y Componente SystemLogStreamView en React
- [ ] T2.2 [TEST] Pruebas de Renderizado Inicial, Conexión SSE y Montaje de Eventos
- [ ] T3.1 [IMPL] Barra de Filtros Multidimensional, Freeze Mode y Tarjetas KPIs
- [ ] T3.2 [TEST] Pruebas de Filtrado por Actor/Severidad, Freeze Mode y KPIs
- [ ] T4.1 [IMPL] Visor Acordeón de Metadatos JSON y Exportador a Archivos CSV/JSON
- [ ] T4.2 [TEST] Pruebas de Despliegue de Acordeón y Descarga de Archivos
- [ ] T5.1 [IMPL] Telemetría Asíncrona en Boletero, Cinema-Core, Ticket-Auth y Móvil
- [ ] T5.2 [TEST] Pruebas de Integración de Telemetría de Eventos Cruzados

<!-- sdd:progress:end -->

Version: 1
Spec-SHA256: 8babcad9870acb9d005097fb9b427231cebbcb1f012fa2271e6f28856ce0923f
Plan-SHA256: e9b29b3080f1d08d727a2ea7f56a8e2484b821cb63476af1ab70f2e1f1e26061

## 1. Trazabilidad y estrategia

El backlog de tareas se estructura en 5 Vertical Slices incrementales y verificables para entregar la nueva pestaña de bitácora en tiempo real `LOG` en la Consola IA-MCP (`http://localhost:5176/`):
- **Slice 1 (T1.1, T1.2):** Infraestructura de backend en FastAPI con `LogBufferService` (buffer circular de 500 eventos en memoria), endpoint de ingesta `POST /api/v1/logs/ingest` y streaming Server-Sent Events (SSE) `GET /api/v1/logs/stream`.
- **Slice 2 (T2.1, T2.2):** Componente frontend `SystemLogStreamView.tsx` integrado en `AuditMonitorConsole.tsx` con conexión SSE en vivo, indicador de estado reactivo y visualización cronológica.
- **Slice 3 (T3.1, T3.2):** Barra de control con filtros combinados (Actores y Severidad), buscador por texto libre, congelamiento de pantalla (*Freeze mode*) y tarjetas de métricas en cabecera (KPIs).
- **Slice 4 (T4.1, T4.2):** Visor acordeón para inspección detallada de payloads JSON con botón de copiado y exportación cliente a archivos descargables `.json` y `.csv`.
- **Slice 5 (T5.1, T5.2):** Emisores de telemetría no bloqueantes (*fire-and-forget*) en los microservicios del sistema (`ms-boleteo-validator`, `ms-cinema-core`, `ms-ticket-auth`, `movil-client`).

---

## 2. Tareas detalladas

### T1.1 [IMPL] Buffer Circular deque(500) y Endpoints de Ingesta/Streaming en FastAPI
**Status:** IN_PROGRESS
**Depends on:** —
**Traceability:** PLAN-01, PLAN-02, RF-09.1, RF-09.3, RB-01, RB-02, RB-03, SC-09.1.1, SC-09.2.1, SC-09.6.1
**Files:** `ms/ms-ia-mcp/backend/app/domain/models.py`, `ms/ms-ia-mcp/backend/app/infrastructure/log_buffer_service.py`, `ms/ms-ia-mcp/backend/app/presentation/log_routes.py`, `ms/ms-ia-mcp/backend/main.py`
**Objective:** Desarrollar el servicio en memoria y los endpoints HTTP/SSE para ingesta y distribución de telemetría en tiempo real.
**Work:** Crear modelo SystemLogEvent con Pydantic, implementar LogBufferService con deque(maxlen=500) y gestión de clientes SSE concurrentes con asyncio.Queue, exponer POST /api/v1/logs/ingest y GET /api/v1/logs/stream con StreamingResponse, y registrar el router en FastAPI.
**Done when:** El endpoint POST almacena eventos en memoria desalojando el elemento 501 (FIFO) y el endpoint GET emite eventos continuos a los escuchas conectados.
**Verification:** NOT_RUN
**Command:** pendiente
**Exit code:** pendiente
**Evidence:** pendiente

### T1.2 [TEST] Pruebas Unitarias de Buffer Circular, Ingesta y Stream SSE
**Status:** PENDING
**Depends on:** T1.1
**Traceability:** PLAN-01, PLAN-02, SC-09.1.1, SC-09.2.1, SC-09.6.1
**Files:** `ms/ms-ia-mcp/backend/tests/test_system_logs_stream.py`
**Objective:** Verificar la retención máxima de 500 eventos, la estructura de los payloads y la emisión continua del stream en FastAPI.
**Work:** Diseñar pruebas en pytest validando el desalojo FIFO al superar 500 registros, la sanitización de eventos en POST /api/v1/logs/ingest y la entrega del snapshot histórico al suscribirse vía SSE.
**Done when:** La suite test_system_logs_stream.py se ejecuta en pytest con código de salida 0.
**Verification:** NOT_RUN
**Command:** pendiente
**Exit code:** pendiente
**Evidence:** pendiente

### T2.1 [IMPL] Nueva Pestaña LOG y Componente SystemLogStreamView en React
**Status:** PENDING
**Depends on:** T1.1
**Traceability:** PLAN-03, RF-09.1, RF-09.2, RB-06, SC-09.1.1
**Files:** `ms/ms-ia-mcp/frontend/src/types/system-logs.types.ts`, `ms/ms-ia-mcp/frontend/src/components/SystemLogStreamView.tsx`, `ms/ms-ia-mcp/frontend/src/components/AuditMonitorConsole.tsx`
**Objective:** Integrar la pestaña LOG en la consola de auditoría y renderizar el feed de eventos en vivo mediante SSE.
**Work:** Definir tipos TypeScript para SystemLogEvent, crear SystemLogStreamView con conexión EventSource nativa hacia /api/v1/logs/stream, renderizar filas con badges cromáticos por severidad (SUCCESS, INFO, WARN, ERROR) y agregar la pestaña 'LOG' en el selector de tabs de AuditMonitorConsole.
**Done when:** Al pulsar la pestaña LOG en http://localhost:5176/ se visualiza el indicador verde En Vivo y los eventos arriban al feed en tiempo real.
**Verification:** NOT_RUN
**Command:** pendiente
**Exit code:** pendiente
**Evidence:** pendiente

### T2.2 [TEST] Pruebas de Renderizado Inicial, Conexión SSE y Montaje de Eventos
**Status:** PENDING
**Depends on:** T2.1
**Traceability:** PLAN-03, SC-09.1.1
**Files:** `ms/ms-ia-mcp/frontend/src/tests/SystemLogStreamView.spec.tsx`
**Objective:** Validar el ciclo de vida del componente, la conexión EventSource y el renderizado correcto de eventos iniciales.
**Work:** Crear suite en Vitest mockeando EventSource de navegador, verificando la carga inicial de registros, el indicador visual de conexión y el renderizado accesible de cada fila.
**Done when:** Las pruebas de montaje y streaming en Vitest pasan con código 0.
**Verification:** NOT_RUN
**Command:** pendiente
**Exit code:** pendiente
**Evidence:** pendiente

### T3.1 [IMPL] Barra de Filtros Multidimensional, Freeze Mode y Tarjetas KPIs
**Status:** PENDING
**Depends on:** T2.1
**Traceability:** PLAN-03, PLAN-04, RF-09.5, RF-09.6, RF-09.7, RB-04, RB-05, SC-09.4.1, SC-09.5.1
**Files:** `ms/ms-ia-mcp/frontend/src/components/SystemLogStreamView.tsx`
**Objective:** Incorporar filtros por Actor y Severidad, buscador de texto libre, botón de congelamiento de pantalla y métricas de cabecera.
**Work:** Implementar selector de chips por Actor (BOLETERO, CLIENTE_WEB, CLIENTE_MOVIL, ADMIN, SISTEMA_IA) y Severidad (INFO, SUCCESS, WARN, ERROR), barra de búsqueda en tiempo real, mecanismo de retención en cola al activar Freeze con badge flotante (+N eventos en espera), palanca de Auto-Scroll y cálculo dinámico de KPIs (Total, Alertas, Boletos, Compras).
**Done when:** El operador puede pausar el flujo para leer un registro sin saltos de scroll y filtrar instantáneamente cualquier combinación de actores y severidades.
**Verification:** NOT_RUN
**Command:** pendiente
**Exit code:** pendiente
**Evidence:** pendiente

### T3.2 [TEST] Pruebas de Filtrado por Actor/Severidad, Freeze Mode y KPIs
**Status:** PENDING
**Depends on:** T3.1
**Traceability:** PLAN-03, PLAN-04, SC-09.4.1, SC-09.5.1
**Files:** `ms/ms-ia-mcp/frontend/src/tests/SystemLogStreamView.spec.tsx`
**Objective:** Validar la precisión del filtrado en memoria, el congelamiento de pantalla y el cómputo de las tarjetas de métricas.
**Work:** Escribir tests simulando la llegada de eventos variados, activando el botón Freeze para comprobar que no se altere la lista visible hasta reanudar, y validando los contadores reactivos de la cabecera.
**Done when:** Los escenarios de filtrado y control de flujo concluyen exitosamente en Vitest.
**Verification:** NOT_RUN
**Command:** pendiente
**Exit code:** pendiente
**Evidence:** pendiente

### T4.1 [IMPL] Visor Acordeón de Metadatos JSON y Exportador a Archivos CSV/JSON
**Status:** PENDING
**Depends on:** T3.1
**Traceability:** PLAN-03, PLAN-05, RF-09.8, RF-09.9, RB-03, RB-06, RB-07, SC-09.7.1
**Files:** `ms/ms-ia-mcp/frontend/src/components/SystemLogStreamView.tsx`
**Objective:** Permitir la inspección profunda de metadatos de cada evento y la descarga de la bitácora filtrada.
**Work:** Agregar contenedor expandible tipo acordeón al hacer clic sobre cualquier evento con visualización JSON indentada y botón de copiado con feedback visual, e implementar utilidades de exportación que generen un archivo blob descargable en CSV y JSON respetando los filtros activos.
**Done when:** Al pulsar sobre una fila se observa el payload JSON completo formateado y al presionar Exportar se descarga el archivo correspondiente con los eventos filtrados.
**Verification:** NOT_RUN
**Command:** pendiente
**Exit code:** pendiente
**Evidence:** pendiente

### T4.2 [TEST] Pruebas de Despliegue de Acordeón y Descarga de Archivos
**Status:** PENDING
**Depends on:** T4.1
**Traceability:** PLAN-03, PLAN-05, SC-09.7.1
**Files:** `ms/ms-ia-mcp/frontend/src/tests/SystemLogStreamView.spec.tsx`
**Objective:** Validar la apertura del acordeón, el copiado al portapapeles y la generación correcta del blob de exportación.
**Work:** Crear pruebas unitarias verificando la presencia del JSON formateado tras la interacción del usuario y comprobando la llamada al generador de descarga de archivos con los datos filtrados.
**Done when:** Todas las pruebas de inspección y exportación en Vitest pasan con éxito.
**Verification:** NOT_RUN
**Command:** pendiente
**Exit code:** pendiente
**Evidence:** pendiente

### T5.1 [IMPL] Telemetría Asíncrona en Boletero, Cinema-Core, Ticket-Auth y Móvil
**Status:** PENDING
**Depends on:** T1.1
**Traceability:** PLAN-04, RF-09.3, RF-09.4, RB-02, RB-08, SC-09.2.1, SC-09.2.2, SC-09.3.1
**Files:** `ms/ms-boleteo-validator/backend/app/Http/Controllers/BoleteoController.php`, `ms/ms-cinema-core/backend/src/modules/movies/application/create-movie.use-case.ts`, `ms/ms-ticket-auth/frontend/src/services/ticket-storage.service.ts`, `ms/movil-client/src/services/push-subscription.service.ts`
**Objective:** Conectar los puntos clave del sistema para que emitan eventos de bitácora no bloqueantes hacia la Consola IA-MCP.
**Work:** Implementar dispatch HTTP asíncrono no bloqueante (fire-and-forget) en BoleteoController ante validaciones de boletos (y rechazos 409 por intento duplicado), en CreateMovieUseCase ante creación y archivado de películas, en ticket-storage al confirmar compras, y en push-subscription.service ante suscripciones y actividades en movil-client.
**Done when:** Las operaciones realizadas en cualquier microservicio se reflejan instantáneamente en la pestaña LOG de la Consola IA-MCP sin penalizar los tiempos de respuesta.
**Verification:** NOT_RUN
**Command:** pendiente
**Exit code:** pendiente
**Evidence:** pendiente

### T5.2 [TEST] Pruebas de Integración de Telemetría de Eventos Cruzados
**Status:** PENDING
**Depends on:** T5.1
**Traceability:** PLAN-04, SC-09.2.1, SC-09.2.2, SC-09.3.1
**Files:** `ms/ms-ia-mcp/backend/tests/test_system_logs_stream.py`
**Objective:** Validar la recepción integral de eventos provenientes de los distintos microservicios emisores.
**Work:** Ejecutar prueba de extremo a extremo simulando eventos de validación de boleto, creación de película en Cinema-Core y actividades del usuario móvil, verificando su ingreso al buffer y su propagación al stream.
**Done when:** Las pruebas de integración en pytest pasan con código 0.
**Verification:** NOT_RUN
**Command:** pendiente
**Exit code:** pendiente
**Evidence:** pendiente

---

## 3. Bitácora

- **2026-11-07:** Creación inicial del backlog de tareas estructurado en 5 vertical slices a partir de la especificación y plan aprobados para la pestaña LOG en la Consola IA-MCP. Cobertura de buffer circular en RAM, streaming SSE, componentes React con filtros y freeze mode, visor JSON, exportador CSV/JSON y telemetría no bloqueante de microservicios.
