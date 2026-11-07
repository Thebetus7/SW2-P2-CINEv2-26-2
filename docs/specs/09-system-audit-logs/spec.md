# Specification: Bitácora Unificada y Monitoreo en Tiempo Real (Consola IA-MCP)
Status: APPROVED
Version: 1
Risk: estándar

## 1. Objetivo, contexto y alcance

### 1.1 Objetivo Medible
Dotar a la Consola de Auditoría de IA-MCP (`http://localhost:5176/`) de una nueva pestaña interactiva denominada **`LOG`**, capaz de recibir, procesar y presentar en tiempo real (latencia < 500 ms) la bitácora distribuida de eventos operativos generados por todos los actores y microservicios del ecosistema Cine Bolivia (Boletero, Cliente Web, Usuario Móvil, Administrador y Agentes IA), con soporte de filtrado multidimensional, métricas de cabecera (KPIs), inspección de payloads JSON, control de congelamiento de flujo (*Freeze*) y exportación de datos.

### 1.2 Alcance (In Scope / Out of Scope)
- **In Scope:**
  - Nueva pestaña de navegación `LOG` integrada en `AuditMonitorConsole.tsx` (`ms/ms-ia-mcp/frontend`).
  - Endpoint de ingesta unificada HTTP `POST /api/v1/logs/ingest` en `ms-ia-mcp/backend` para recibir telemetría y eventos de cualquier servicio.
  - Streaming unidireccional reactivo vía Server-Sent Events (SSE) o WebSocket en `GET /api/v1/logs/stream`.
  - Buffer circular volátil en memoria RAM (capacidad máxima de 500 eventos FIFO) sin persistencia en disco.
  - Telemetría de eventos de **Boletero** (`ms-boleteo-validator`): escaneos de QR, validaciones y alertas de tickets duplicados/adulterados (409).
  - Telemetría de eventos de **Cliente Web** (`ms-ticket-auth`): inicios de sesión, reservas de butacas, pagos Stripe y consultas de chat.
  - Telemetría de eventos de **Usuario Móvil** (`movil-client`): navegación PWA, registro/activación de notificaciones push VAPID, compras en el drawer y almacenamiento offline en IndexedDB.
  - Telemetría de eventos de **Administrador** (`ms-cinema-core`): creación de películas con póster, archivado lógico (PATCH), gestión de funciones y emisión masiva push.
  - Telemetría de eventos de **Sistema / IA** (`ms-ia-mcp` / `ms-multimedia`): inferencias TensorFlow de taquilla, auditorías GrokCloud y disparos a n8n.
  - Panel visual enriquecido: filtros combinados (Rol y Severidad), buscador por texto libre, inspección de payload en acordeón, switch de Auto-Scroll, botón de Pausa/Reanudar (*Freeze*), tarjetas de KPIs y descarga en formato CSV / JSON.
- **Out of Scope:**
  - Persistencia relacional histórica en bases de datos externas (el alcance acordado define memoria volátil de 500 eventos en RAM).
  - Modificación del esquema criptográfico HMAC de los boletos.
  - Intercepción o bloqueo de solicitudes transaccionales (la bitácora opera en modo reactivo no bloqueante).

---

## 2. Actores y Permisos

| Actor | Canal / Interfaz | Permisos y Comportamiento |
| :--- | :--- | :--- |
| **Auditor / Administrador** | Consola Web IA-MCP (`http://localhost:5176/`) | Visualizar el stream en vivo, pausar/reanudar el flujo, aplicar filtros por actor/severidad, buscar por texto, inspeccionar payloads JSON y exportar reportes. |
| **Boletero** | Lector Cámara (`ms-boleteo-validator`) | Emite eventos al escanear entradas (VALIDACIÓN_EXITOSA, ENTRADA_RECHAZADA_DUPLICADA, FRAUDE_DETECTADO). |
| **Cliente Web** | Portal Cine Bolivia (`ms-ticket-auth`) | Emite eventos al iniciar sesión, seleccionar butacas, completar pagos Stripe y emitir entradas QR. |
| **Usuario Móvil PWA** | App Móvil (`movil-client`) | Emite eventos al instalar/abrir la PWA, aceptar permisos push, comprar en el drawer y descargar boletos offline. |
| **Administrador** | Portal Admin (`ms-cinema-core`) | Emite eventos al crear películas con inferencia de póster, archivar filmes (PATCH) y modificar funciones. |
| **Servicio IA / Sistema** | Background (`ms-ia-mcp`, `ms-multimedia`, `n8n`) | Emite eventos de detección de congestión de taquilla (>40 personas), subocupación y alertas despachadas. |

---

## 3. Datos Funcionales e Invariantes

### 3.1 Estructura del Evento de Bitácora (`SystemLogEvent`)
Cada evento recibido y transmitido debe cumplir la siguiente firma de datos estandarizada:

```typescript
interface SystemLogEvent {
  id: string;               // UUID v4 único (ej. "log-7f3b8a1c-...")
  timestamp: string;        // ISO 8601 UTC (ej. "2026-11-07T16:30:00.123Z")
  sourceService: string;    // 'ms-ticket-auth' | 'ms-cinema-core' | 'ms-boleteo-validator' | 'movil-client' | 'ms-ia-mcp' | 'ms-multimedia'
  actorRole: string;        // 'BOLETERO' | 'CLIENTE_WEB' | 'CLIENTE_MOVIL' | 'ADMIN' | 'SISTEMA_IA'
  actionType: string;       // Ej. 'TICKET_SCAN_SUCCESS', 'PAYMENT_COMPLETED', 'PUSH_SUBSCRIBED', 'MOVIE_CREATED', 'TAQUILLA_OVERFLOW'
  severity: string;         // 'INFO' | 'SUCCESS' | 'WARN' | 'ERROR'
  summary: string;          // Descripción corta en español (ej. "Boleto #b111... validado en Sala 1")
  metadata?: Record<string, any>; // Carga útil estructurada (userId, ticketId, showtimeId, amount, details, etc.)
}
```

### 3.2 Reglas de Negocio (Invariantes)

- **RB-01 (Buffer Circular Volátil de 500 Eventos):** El backend de `ms-ia-mcp` debe mantener en memoria RAM un buffer circular de cola de capacidad máxima igual a 500 eventos. Cuando arribe el evento número 501, se descarta el más antiguo (FIFO) garantizando cero consumo acumulativo de disco y uso acotado de memoria.
- **RB-02 (Ingesta No Bloqueante Fire-and-Forget):** La publicación de eventos de telemetría desde los microservicios (`ms-cinema-core`, `ms-boleteo-validator`, `ms-ticket-auth`, `movil-client`) hacia `ms-ia-mcp` debe ser estrictamente asíncrona y tolerante a fallos. Si `ms-ia-mcp` no está disponible o responde con error, el servicio emisor no debe interrumpir la transacción del usuario bajo ninguna circunstancia.
- **RB-03 (Sanitización de Datos Sensibles):** Ningún evento de bitácora debe contener contraseñas en texto claro, credenciales de autenticación, números completos de tarjeta de crédito (PAN) ni tokens JWT completos. Solo se registrarán identificadores de referencia (`ticketId`, `userId`, `showtimeId`, últimos 4 dígitos o montos).
- **RB-04 (Control de Congelamiento - Freeze Mode en Frontend):** Al activar el botón "Pausar Flujo" en la UI, los nuevos eventos recibidos por SSE/WebSocket continúan acumulándose en un buffer temporal del cliente pero no desplazan el scroll ni alteran la lista visible, mostrando un indicador de badge *"N eventos en espera"*. Al pulsar "Reanudar", la vista se sincroniza inmediatamente.
- **RB-05 (Cómputo en Tiempo Real de KPIs):** La cabecera de la pestaña `LOG` debe calcular de forma reactiva y reactivar 4 métricas acumuladas sobre la sesión actual:
  1. *Total Eventos Recibidos*
  2. *Alertas y Errores (WARN + ERROR)*
  3. *Boletos Validados en Puerta*
  4. *Compras y Reservas Exitosas*
- **RB-06 (Exportación Fiel a la Vista Filtrada):** Cuando el operador active la acción de exportación a CSV o JSON, el archivo descargado debe contener exclusivamente los eventos que coincidan con los filtros activos de Actor, Severidad y Término de Búsqueda al momento de la descarga.
- **RB-07 (Trazabilidad y Deep Linking):** Todo evento que incluya `ticketId` o `showtimeId` debe permitir copiar el identificador al portapapeles mediante un clic directo sobre su etiqueta en la UI.
- **RB-08 (Monitoreo de Usuario Móvil):** Los eventos generados por `movil-client` deben identificarse unívocamente con `actorRole: 'CLIENTE_MOVIL'` e incluir en sus metadatos la modalidad operativa (`online` u `offline`), permitiendo auditar la resiliencia de la PWA.

---

## 4. Flujos, Estados y Comportamiento Observable

### 4.1 Flujo Principal: Recepción y Visualización de Bitácora en Vivo
1. El usuario auditor accede a `http://localhost:5176/` y selecciona la nueva pestaña `LOG` en la barra superior.
2. El componente frontend establece una conexión persistente mediante Server-Sent Events (SSE) a `GET http://localhost:8001/api/v1/logs/stream`.
3. Al conectarse, el backend envía un evento inicial con el volcado de los eventos recientes existentes en el buffer circular de 500 elementos.
4. El indicador de estado muestra `● En Vivo (Conectado)` con un destello esmeralda.
5. Cada vez que cualquier microservicio despache `POST /api/v1/logs/ingest`:
   - El backend añade el evento al buffer circular de memoria.
   - El backend difunde el evento a través del stream SSE a todas las consolas conectadas.
   - La lista del frontend añade el evento al inicio de la lista con una animación suave de entrada.
   - Si `Auto-Scroll` está activado, la vista permanece anclada al evento más reciente.
   - Si el usuario pulsa sobre la fila del evento, se despliega un acordeón con el visualizador JSON coloreado y botón para copiar.

### 4.2 Flujo Secundario: Filtrado y Búsqueda Multidimensional
1. El operador selecciona uno o varios filtros rápidos:
   - **Actores:** `[Todos]`, `[Boletero]`, `[Cliente Web]`, `[Cliente Móvil]`, `[Admin]`, `[Sistema/IA]`.
   - **Severidad:** `[INFO]`, `[SUCCESS]`, `[WARN]`, `[ERROR]`.
2. El operador escribe en el campo de búsqueda (ej. `"b1110001"` o `"Gladiador"` o `"Stripe"`).
3. La lista se filtra instantáneamente en memoria sin recargar la página.
4. Si ningún evento coincide con los filtros, se muestra un estado vacío elegante con botón *"Restablecer filtros"*.

### 4.3 Flujo Secundario: Congelamiento de Flujo (*Freeze*)
1. El operador detecta una anomalía de validación y presiona el botón `Pausar (Freeze)`.
2. El stream no se desconecta a nivel de red, pero los nuevos eventos no se renderizan en el DOM.
3. Un badge flotante indica `⏸️ 14 nuevos eventos en cola`.
4. El operador inspecciona con calma el payload del evento seleccionado.
5. Al pulsar `Reanudar`, los 14 eventos se integran y la lista vuelve al modo reactivo en vivo.

### 4.4 Flujo Secundario: Exportación de Auditoría
1. El operador aplica un filtro (ej. Actor `BOLETERO` y Severidad `WARN`).
2. Presiona el botón `Exportar` y selecciona `CSV` o `JSON`.
3. El frontend genera un blob en el navegador con el archivo descargable `bitacora_auditoria_YYYYMMDD_HHMM.csv` respetando los filtros activos.

---

## 5. Requisitos EARS

### HU-09.1: Navegación y Conectividad en Tiempo Real
- **RF-09.1 (Pestaña LOG y Conexión Streaming):**  
  *Cuando* el operador seleccione la pestaña `LOG` en la consola IA-MCP, *el sistema debe* conectarse al endpoint de streaming `/api/v1/logs/stream` mediante Server-Sent Events (SSE), desplegar el indicador visual `En Vivo` y cargar el estado inicial del buffer en memoria (RB-01, RB-06).
- **RF-09.2 (Desconexión y Reintento):**  
  *Si* la conexión de streaming con el backend se interrumpe, *el sistema debe* mostrar el indicador en estado de reconexión ámbar y reintentar automáticamente la reconexión de forma progresiva sin bloquear la UI (RB-06).

### HU-09.2: Ingesta de Eventos Políglota
- **RF-09.3 (Endpoint de Ingesta Unificado):**  
  *Cuando* cualquier microservicio (`ms-cinema-core`, `ms-boleteo-validator`, `ms-ticket-auth`, `movil-client` o `ms-ia-mcp`) envíe un payload válido a `POST /api/v1/logs/ingest`, *el sistema debe* validar la estructura `SystemLogEvent`, incorporarlo al buffer circular FIFO de memoria y transmitirlo en tiempo real a los clientes conectados (RB-01, RB-02, RB-03).
- **RF-09.4 (Ingesta Silenciosa ante Fallas):**  
  *Si* el backend de `ms-ia-mcp` estuviese temporalmente inaccesible al emitir telemetría desde los microservicios, *el sistema emisor debe* capturar la excepción y continuar el flujo de negocio sin presentar errores visuales al usuario final (RB-02).

### HU-09.3: Control de Visualización, Filtros y KPIs
- **RF-09.5 (Filtros Combinados por Actor y Severidad):**  
  *Mientras* el operador active filtros de actor (`BOLETERO`, `CLIENTE_WEB`, `CLIENTE_MOVIL`, `ADMIN`, `SISTEMA_IA`) y/o severidad (`INFO`, `SUCCESS`, `WARN`, `ERROR`), *el sistema debe* renderizar exclusivamente los eventos que satisfagan ambas condiciones (RB-05).
- **RF-09.6 (Tarjetas de Métricas de Cabecera):**  
  *Cuando* se agreguen o filtren eventos en la consola, *el sistema debe* actualizar en tiempo real los contadores numéricos de la cabecera: Total Eventos, Alertas/Errores, Boletos Validados y Transacciones Completadas (RB-05).
- **RF-09.7 (Pausa y Congelamiento de Flujo):**  
  *Cuando* el operador active el modo `Pausar (Freeze)`, *el sistema debe* retener los nuevos eventos en un acumulador en memoria y mantener fija la posición de lectura hasta que el operador pulse `Reanudar` (RB-04).
- **RF-09.8 (Inspección Detallada de Metadatos JSON):**  
  *Al* hacer clic sobre cualquier registro de la bitácora, *el sistema debe* desplegar un contenedor expandible tipo acordeón con la carga útil formateada e indentada, permitiendo copiar el JSON con un solo clic (RB-03, RB-07).
- **RF-09.9 (Exportación en CSV y JSON):**  
  *Cuando* el operador solicite exportar la bitácora, *el sistema debe* generar de inmediato un archivo descargable con los registros actualmente visibles tras el filtrado (RB-06).

---

## 6. Criterios de Aceptación y Escenarios BDD

### SC-09.1.1: Conexión Exitosa y Carga del Buffer en Tiempo Real → RF-09.1
- **Dado** que el backend de `ms-ia-mcp` está operativo y cuenta con 25 eventos previos en su buffer de memoria,
- **Cuando** el usuario entra a `http://localhost:5176/` y pulsa sobre la pestaña `LOG`,
- **Entonces** el indicador de conexión muestra `● En Vivo (SSE Conectado)`, se renderizan los 25 eventos en orden cronológico inverso y las tarjetas de métricas muestran el total de 25 eventos procesados.

### SC-09.2.1: Ingesta y Despliegue en Vivo de Evento del Boletero → RF-09.3
- **Dado** que la consola de auditoría está abierta en la pestaña `LOG`,
- **Cuando** `ms-boleteo-validator` emite un log de `TICKET_SCAN_SUCCESS` para el ticket `b1110001` mediante `POST /api/v1/logs/ingest`,
- **Entonces** aparece inmediatamente una nueva fila con badge verde `SUCCESS`, el actor `BOLETERO`, el resumen del boleto validado y el contador de "Boletos Validados" se incrementa en +1.

### SC-09.2.2: Ingesta de Alerta de Intento de Doble Uso de Entrada → RF-09.3
- **Dado** que un usuario intenta ingresar dos veces con el mismo boleto en `ms-boleteo-validator`,
- **Cuando** el boletero escanea la entrada y el validador retorna código HTTP 409,
- **Entonces** se recibe en la consola un evento con severidad `WARN`, actor `BOLETERO`, título `"Intento de Doble Validación Detectado"` y se contabiliza en la tarjeta de "Alertas y Errores".

### SC-09.3.1: Ingesta de Actividades del Usuario Móvil (PWA) → RF-09.3, RB-08
- **Dado** que un usuario accede desde su dispositivo móvil a `movil-client`,
- **Cuando** activa los permisos Web Push o completa una compra asistida en el Chat Drawer,
- **Entonces** la bitácora recibe un evento con actor `CLIENTE_MOVIL`, severidad `INFO` o `SUCCESS`, y en sus metadatos se visualiza el modo `online` o la descarga de boleto offline en IndexedDB.

### SC-09.4.1: Filtrado Combinado de Eventos → RF-09.5
- **Dado** que la bitácora contiene eventos de Administrador, Cliente y Boletero,
- **Cuando** el operador selecciona el chip de actor `ADMIN` y desmarca los demás,
- **Entonces** la lista solo muestra eventos de creación de películas, archivado lógico y asignación de salas, ocultando los eventos de compras o validaciones.

### SC-09.5.1: Congelamiento de Pantalla (Freeze Mode) → RF-09.7, RB-04
- **Dado** que el stream está recibiendo eventos continuamente a razón de 1 evento cada 2 segundos,
- **Cuando** el operador pulsa el botón `⏸️ Pausar`,
- **Entonces** la lista deja de desplazarse, los nuevos eventos entrantes no mueven el scroll y aparece un badge que indica `⏸️ En pausa (+X nuevos eventos)`.
- **Y cuando** pulsa `▶️ Reanudar`, la lista se actualiza suavemente y vuelve a mostrar el flujo en tiempo real.

### SC-09.6.1: Límite del Buffer Circular en RAM → RF-09.3, RB-01
- **Dado** que el buffer en memoria ya cuenta con exactamente 500 eventos,
- **Cuando** ingresa el evento número 501,
- **Entonces** el evento más antiguo es desalojado de la memoria RAM, el tamaño del buffer se mantiene en exactamente 500 y no se genera consumo creciente de recursos en el servidor.

### SC-09.7.1: Exportación Fiel a Archivo CSV/JSON → RF-09.9, RB-06
- **Dado** que el operador ha filtrado los eventos por severidad `ERROR` y existen 3 registros que coinciden,
- **Cuando** presiona `Exportar` y elige formato `JSON`,
- **Entonces** se descarga un archivo `.json` que contiene exactamente el array de esos 3 eventos filtrados.

---

## 7. Integraciones, Efectos y Requisitos de Calidad

- **Rendimiento:** Latencia de entrega desde la llamada al endpoint de ingesta hasta el renderizado en pantalla inferior a 500 milisegundos.
- **Eficiencia de Memoria:** Tamaño máximo en RAM del backend acotado (< 5 MB para 500 eventos en memoria).
- **Resiliencia (Graceful Degradation):** Si el servidor de logs se detiene, ningún microservicio emisor de boletos, pagos o películas interrumpe su ejecución.
- **Accesibilidad y UX:** Soporte de tema oscuro consistente con la estética visual Slate/Indigo de la consola IA-MCP, contraste WCAG AA en los badges de severidad y soporte completo de navegación por teclado.

---

## 8. Registro de Inferencias y Decisiones

| ID | Hallazgo / Decisión | Categoría | Origen o Razonamiento | Acción Acordada |
| :--- | :--- | :--- | :--- | :--- |
| **INF-01** | Pestaña `LOG` en `http://localhost:5176/` | **HECHO** | Solicitud directa del usuario en el prompt inicial. | Crear nuevo Tab `LOG` en `AuditMonitorConsole.tsx`. |
| **INF-02** | Cobertura de Actores del Sistema | **HECHO** | Boletero, cliente comprador, admin y actividades de usuarios en móvil. | Incluir `BOLETERO`, `CLIENTE_WEB`, `CLIENTE_MOVIL`, `ADMIN`, `SISTEMA_IA`. |
| **INF-03** | Streaming reactivo vía Server-Sent Events (SSE) | **ACORDADO** | Selección recomendada y aceptada por el usuario en pregunta asistida (A2). | Endpoint `GET /api/v1/logs/stream` en FastAPI con fallback WebSocket. |
| **INF-04** | Persistencia volátil en memoria (500 eventos) | **ACORDADO** | Elección explícita del usuario en pregunta asistida (A3). | Usar `collections.deque(maxlen=500)` en Python; cero migraciones de BD requeridas. |
| **INF-05** | Filtros, Freeze, Acordeón JSON, KPIs y Exportación | **ACORDADO** | Selección asistida con confirmación multi-select del usuario (A1). | Implementar barra de control completa y tarjetas de métricas en la UI. |
| **INF-06** | Ingesta no bloqueante (*Fire-and-forget*) | **DERIVADO** | Requisito de disponibilidad crítica de venta de boletos y pasarela de pago. | Emisión en segundo plano en los clientes HTTP de cada microservicio sin `await` bloqueante. |

---

## 9. Trazabilidad y Pendientes

### Matriz de Cobertura
- `HU-09.1` (Navegación y Streaming) $\rightarrow$ `RF-09.1`, `RF-09.2` $\rightarrow$ `SC-09.1.1`
- `HU-09.2` (Ingesta y Microservicios) $\rightarrow$ `RF-09.3`, `RF-09.4` $\rightarrow$ `SC-09.2.1`, `SC-09.2.2`, `SC-09.3.1`, `SC-09.6.1`
- `HU-09.3` (Filtros, Freeze, KPIs, Detalle y Exportación) $\rightarrow$ `RF-09.5`, `RF-09.6`, `RF-09.7`, `RF-09.8`, `RF-09.9` $\rightarrow$ `SC-09.4.1`, `SC-09.5.1`, `SC-09.7.1`

### Pendientes
- Ninguno funcional. La especificación se encuentra lista para revisión formal mediante el comando `/sdd-spec-clarify`.

