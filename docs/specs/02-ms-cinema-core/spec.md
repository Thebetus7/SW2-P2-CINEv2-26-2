# Specification: Módulo 02 - Núcleo Cinematográfico, Salas, Butacas, Cartelera y FrontWeb Admin (MS CINEMA-CORE)

> **Estado:** APPROVED  
> **Módulo:** `docs/specs/02-ms-cinema-core/`  
> **Ubicación en Código:** `ms/ms-cinema-core/backend/` y `ms/ms-cinema-core/frontend/`  
> **Metodología:** SDD-Spec-Strict (Zero-Loss)  
> **Subordinación:** Sujeto estrictamente a `docs/constitution.md` (v1.3.0)

---

## 1. Objetivo y Alcance

### 1.1 Objetivo de Negocio
Gestionar la infraestructura física y operativa del complejo cinematográfico mediante el modelado jerárquico de salas de proyección, generación paramétrica de matrices de butacas, administración del catálogo de películas, programación horaria de funciones con prevención de solapamientos (+20 min de limpieza), bloqueo atómico transaccional de asientos y cálculo de indicadores clave de rendimiento (KPIs), proveyendo además la consola web administrativa FRONTWEB modular en Angular con inferencia analítica de IA local en el navegador (WebLLM / Transformers.js).

### 1.2 Alcance Funcional (In-Scope)
- **CRUD de Salas (`CinemaHall`) y Butacas Anidadas (`Seat`):** Creación, consulta, modificación y deshabilitación lógica de salas con generación automática de la matriz espacial de asientos por filas alfabéticas y columnas numéricas.
- **Tipificación Especial de Butacas:** Clasificación funcional de butacas individuales dentro de la matriz (`ESTANDAR`, `VIP`, `DISCAPACIDAD`, `PASILLO_BLOQUEADO`).
- **Catálogo de Películas (`Movie`):** Registro de obras cinematográficas con metadatos descriptivos (título, sinopsis, duración en minutos, género, clasificación etaria y referencia a la portada en almacenamiento de objetos MinIO S3).
- **Programación de Cartelera (`Showtime`):** Asignación temporal de proyecciones vinculando película, sala, fecha, hora de inicio y fin, validando la ausencia estricta de solapamientos horarios en la misma sala asegurando 20 minutos de limpieza y desalojo entre funciones consecutivas.
- **Mecanismo de Bloqueo Atómico de Butaca:** Gestión transaccional del estado de cada asiento en una función (`DISPONIBLE`, `RESERVADA_TEMPORAL`, `OCUPADA`, `BLOQUEADA_MANTENIMIENTO`) para prevenir reservas simultáneas y coordinar compensaciones SAGA con `MS TICKET-AUTH`.
- **Cuarteto de KPIs y Métricas de Rendimiento:** Cálculo consolidado de:
  1. Porcentaje de ocupación por sala y función (% aforo ocupado vs capacidad total).
  2. Recaudación acumulada estimada por película y proyección.
  3. Mapa de calor de demanda de butacas (asientos con mayor frecuencia de selección).
  4. Detección de funciones críticas con sub-ocupación (<15% de aforo a menos de 30 minutos del inicio).
- **Consola FrontWeb Administrativa en Angular (`ms/ms-cinema-core/frontend/`):**
  - Arquitectura modular con carga diferida (Lazy Loading).
  - Diseñador visual e interactivo de cuadrículas matriciales de salas.
  - Asistente de inteligencia artificial local offline en el navegador mediante WebLLM o Transformers.js en Web Worker para consultas en lenguaje natural sin conexión a internet.
  - Centro de demostración para el jurado con botón interactivo de ejecución de auditoría y descarga de reportes Excel `.xlsx` generados por n8n.

### 1.3 Exclusiones Explícitas (Out-of-Scope)
- **Procesamiento de Pagos o Facturación:** Las transacciones económicas y pasarelas pertenecen exclusivamente a `MS TICKET-AUTH`.
- **Almacenamiento Físico de Archivos Binarios:** Las imágenes de las portadas se almacenan en MinIO S3 (`MS MULTIMEDIA`); este módulo solo custodia metadatos y URLs.
- **Eliminación Física Destructiva con Historial:** Queda prohibido el borrado físico de salas o butacas que cuenten con funciones vigentes o boletos emitidos.

---

## 2. Actores y Permisos en el Módulo

| Actor | Permisos en este Módulo | Restricciones de Acceso |
| :--- | :--- | :--- |
| **Administrador (`admin`)** | Acceso completo al panel Angular; crear y editar salas y butacas; registrar películas; programar cartelera; visualizar dashboard de KPIs; ejecutar consultas a la IA local; disparar pruebas para el jurado. | No puede alterar estados de butacas asignadas a boletos pagados sin proceso de auditoría. |
| **Cliente (`cliente`)** | Consultar cartelera pública y disponibilidad de asientos en tiempo real a través de las APIs de lectura. | No puede acceder a las pantallas administrativas de Angular ni modificar la configuración de salas o cartelera. |
| **Microservicio `MS TICKET-AUTH` (Sistema)** | Solicitar bloqueo temporal de butaca (`RESERVAR_TEMPORAL`), liberación compensatoria (`LIBERAR_DISPONIBLE`) o confirmación final (`OCUPAR`). | Opera bajo contratos tipados máquina a máquina. |
| **Microservicio `MS IA-MCP` (Sistema)** | Consultar métricas de ocupación y recaudación mediante la herramienta `get_occupancy_metrics()`. | Solo lectura de métricas agregadas. |

---

## 3. Modelo Funcional de Datos y Reglas de Negocio Específicas

### 3.1 Entidades Funcionales y Atributos de Dominio

#### Entidad: Sala (`CinemaHall`)
- `id`: Identificador único (UUID).
- `nombre`: Texto descriptivo único (ej. "Sala 1 - MacroXE", "Sala 2 - 3D").
- `totalFilas`: Número entero positivo (ej. 10 filas correspondientes a A–J).
- `columnasPorFila`: Número entero positivo (ej. 15 asientos por fila).
- `capacidadTotal`: Número entero computado automáticamente (`totalFilas * columnasPorFila` menos asientos inactivos/pasillos).
- `tipoProyeccion`: Enumerador (`2D`, `3D`, `IMAX`, `VIP`).
- `estadoOperativo`: Enumerador (`ACTIVA`, `EN_MANTENIMIENTO`).

#### Entidad: Butaca (`Seat`)
- `id`: Identificador único (UUID).
- `salaId`: Referencia obligatoria a la sala contenedora.
- `fila`: Letra identificadora de fila (ej. "A", "B", "C").
- `numero`: Entero identificador en la fila (ej. 1, 2, 3...).
- `codigoVisible`: Etiqueta legible concatenada (ej. "C-8").
- `tipo`: Enumerador (`ESTANDAR`, `VIP`, `DISCAPACIDAD`, `PASILLO_BLOQUEADO`).
- `habilitada`: Booleano (indica si está disponible para venta general).

#### Entidad: Película (`Movie`)
- `id`: Identificador único (UUID).
- `titulo`: Texto obligatorio (ej. "Oppenheimer").
- `sinopsis`: Texto descriptivo detallado.
- `duracionMinutos`: Entero positivo (ej. 180).
- `clasificacion`: Enumerador (`ATP`, `PG-13`, `R-16`, `R-18`).
- `genero`: Texto o categoría (ej. "Ciencia Ficción", "Drama").
- `portadaUrl`: URL de la imagen en MinIO S3.
- `estadoCatalogo`: Enumerador (`EN_CARTELERA`, `PROXIMO_ESTRENO`, `ARCHIVADA`).

#### Entidad: Función / Cartelera (`Showtime`)
- `id`: Identificador único (UUID).
- `peliculaId`: Referencia obligatoria a la película proyectada.
- `salaId`: Referencia obligatoria a la sala de exhibición.
- `fechaHoraInicio`: Marca de tiempo (ISO-8601).
- `fechaHoraFin`: Marca de tiempo calculada automáticamente (`fechaHoraInicio + duracionMinutos + 20 minutos de limpieza`).
- `precioBase`: Valor numérico positivo.
- `estado`: Enumerador (`PROGRAMADA`, `EN_CURSO`, `FINALIZADA`, `CANCELADA`).

### 3.2 Reglas de Negocio del Módulo (`RB-CORE-XX` y `RB-FW-XX`)

- **`RB-CORE-01` (Generación Matricial Paramétrica):** Al registrar una nueva sala, el usuario ingresa la cantidad de filas y columnas; el sistema autogenera inmediatamente todas las entidades de butacas asociadas con código visible `${Fila}-${Numero}` en tipo `ESTANDAR`, permitiendo la edición individual posterior.
- **`RB-CORE-02` (Prevención de Solapamiento Horario en Sala):** Queda estrictamente prohibido programar dos funciones en la misma sala cuyo rango horario se traslape. El sistema debe validar que entre el fin de una proyección y el inicio de la siguiente existan al menos 20 minutos de holgura operativa para limpieza y desalojo.
- **`RB-CORE-03` (Integridad y Bloqueo de Eliminación por Historial):** Si una sala o butaca está asociada a una función con boletos emitidos (o históricos), el sistema impide terminantemente su eliminación física (`DELETE` rechazado) y ofrece su pase a estado `EN_MANTENIMIENTO`, impidiendo nuevas reservas sin alterar el registro previo.
- **`RB-CORE-04` (Concurrencia y Bloqueo Atómico de Butaca):** En una función activa, una butaca solo puede transicionar a `RESERVADA_TEMPORAL` si su estado previo es estrictamente `DISPONIBLE`. Si dos solicitudes concurrentes intentan bloquear la misma butaca, el sistema procesa la primera y rechaza de inmediato la segunda con error de conflicto (409 Conflict).
- **`RB-CORE-05` (Sincronización de Compensación SAGA):** Al recibir la señal de liberación de `MS TICKET-AUTH` (por expiración de 60 segundos o cobro fallido), el sistema debe revertir atómicamente el estado del asiento a `DISPONIBLE` para que vuelva a figurar libre en la cartelera en tiempo real.
- **`RB-CORE-06` (Cálculo Dinámico de Alerta de Sub-ocupación):** Toda función a menos de 30 minutos de iniciar con un porcentaje de aforo menor al 15% debe ser catalogada como anomalía de baja ocupación y exponerse a `MS IA-MCP`.
- **`RB-FW-01` (Soberanía Offline de la IA Local):** El asistente de analítica en el navegador debe funcionar al 100% aun cuando el administrador desconecte su cable de red o apague el Wi-Fi; debe consultar la memoria en caché del navegador (IndexedDB / LocalStorage) y emitir la respuesta en lenguaje natural sin mostrar errores de conexión.
- **`RB-FW-02` (Aislamiento de Carga por Módulos):** Cada submódulo funcional de FrontWeb Angular debe cargarse bajo demanda (Lazy Loading). El peso inicial de la aplicación no debe penalizarse con librerías pesadas hasta que el administrador ingrese a sus respectivas pestañas.
- **`RB-FW-03` (Sincronización Reactiva de KPIs):** Cuando se complete una compra en `MS TICKET-AUTH` o se valide un boleto en el `PANEL DE BOLETEO`, el dashboard debe actualizar sus indicadores de ocupación en un tiempo no mayor a 3 segundos.

---

## 4. Máquina de Estados de la Butaca en una Función (`ShowtimeSeatState`)

```mermaid
stateDiagram-v2
    [*] --> DISPONIBLE : Creación de la función
    
    DISPONIBLE --> RESERVADA_TEMPORAL : Solicitud de compra de cliente (Inicio de Stepper)
    RESERVADA_TEMPORAL --> DISPONIBLE : Compensación SAGA (Expiran 60s o pago fallido)
    RESERVADA_TEMPORAL --> OCUPADA : Pago confirmado exitosamente en Stripe
    
    DISPONIBLE --> BLOQUEADA_MANTENIMIENTO : Administrador deshabilita asiento
    BLOQUEADA_MANTENIMIENTO --> DISPONIBLE : Administrador rehabilita asiento
    
    OCUPADA --> [*] : Función finalizada
```

---

## 5. Requerimientos Funcionales Estructurados (Patrón EARS)

### Historia de Usuario `HU-04`: Gestión Paramétrica de Salas y Matrices de Asientos
*Como administrador del cine, quiero configurar salas indicando dimensiones de filas y columnas, para generar rápidamente la distribución de butacas y personalizar asientos especiales.*

- **`RF-04.1` (Creación Paramétrica de Sala):** Cuando el administrador ingrese el nombre de sala, cantidad de filas (ej. 8) y columnas (ej. 12), el sistema deberá crear la sala y autogenerar las 96 butacas correspondientes con sus códigos visuales correlativos (A-1 a H-12) en estado `ESTANDAR`.
- **`RF-04.2` (Personalización de Butacas Especiales):** Cuando el administrador seleccione una o más butacas en el visor gráfico de la sala en Angular, el sistema deberá permitir reclasificar su tipo a `VIP`, `DISCAPACIDAD` o `PASILLO_BLOQUEADO`, recalculando de inmediato la capacidad vendible total.
- **`RF-04.3` (Protección contra Borrado Físico):** Si el administrador intenta eliminar una sala con funciones históricas o vigentes, el sistema deberá rechazar la operación física, mostrar la alerta *"La sala posee funciones asociadas y no puede ser eliminada"* y habilitar la opción de marcarla como `EN_MANTENIMIENTO`.

---

### Historia de Usuario `HU-05`: Catálogo de Películas y Programación de Cartelera
*Como administrador, quiero dar de alta películas y programar horarios en las salas disponibles, para mantener actualizada la cartelera comercial del cine.*

- **`RF-05.1` (Registro de Película):** Cuando el administrador complete los datos obligatorios de una película (título, sinopsis, duración, género y URL de portada), el sistema deberá registrar la película en estado `EN_CARTELERA` y ponerla a disposición para programación.
- **`RF-05.2` (Programación sin Solapamiento):** Cuando el administrador programe una función asignando película, sala y horario de inicio, el sistema deberá computar la hora de finalización sumando la duración más 20 minutos de limpieza y verificar que no exista colisión horaria con otra función en la misma sala.
- **`RF-05.3` (Rechazo de Conflicto Horario):** Si el horario programado colisiona con otra función existente en la misma sala, el sistema deberá bloquear la creación y presentar el mensaje: *"Existe un solapamiento con la función programada de [Título] de [HoraInicio] a [HoraFin]."*

---

### Historia de Usuario `HU-06`: Dashboard Ejecutivo y Suministro de KPIs a la IA
*Como administrador y como sistema de auditoría inteligente, quiero consultar métricas consolidadas de ocupación y recaudación, para evaluar el rendimiento de las salas y detectar anomalías.*

- **`RF-06.1` (Cálculo de Aforo y Recaudación):** El sistema deberá computar en tiempo real el porcentaje de ocupación (`(butacas_ocupadas / capacidad_total) * 100`) y la recaudación total acumulada por cada sala y función programada.
- **`RF-06.2` (Mapa de Calor de Demanda):** El sistema deberá generar un ranking visual de las butacas con mayor frecuencia de ocupación histórica dentro de cada sala para optimizar la asignación tarifaria.
- **`RF-06.3` (Herramienta Semántica de Ocupación para MCP):** Cuando el microservicio `MS IA-MCP` invoque la herramienta `get_occupancy_metrics()`, el sistema deberá retornar un payload estructurado con el aforo actual de todas las salas, el porcentaje de ocupación promedio y el listado de funciones críticas con menos del 15% de ocupación próximas a comenzar.

---

### Historia de Usuario `HU-14`: Asistente de Negocio Offline con IA en Navegador
*Como administrador, quiero consultar dudas operativas del cine en lenguaje natural sin depender de internet, para obtener resúmenes inmediatos en cualquier circunstancia.*

- **`RF-14.1` (Carga del Modelo Ligero en Navegador):** Al acceder por primera vez a la consola de analítica en Angular, el sistema deberá inicializar el modelo de lenguaje cuantizado (WebLLM o Transformers.js) en segundo plano (Web Worker) sin congelar la interfaz.
- **`RF-14.2` (Procesamiento Analítico Local):** Cuando el usuario escriba preguntas operativas (ej. *"¿Qué película recaudó más?"*), el modelo local deberá procesar la información de la memoria caché y retornar la respuesta explicativa de inmediato sin requerir conexión a internet.

---

### Historia de Usuario `HU-15`: Demostración Interactiva de Contingencias y Descarga de Excel
*Como administrador en defensa académica, quiero disparar auditorías y simulaciones de cámara con un solo clic, para exhibir la integración completa del sistema ante el jurado.*

- **`RF-15.1` (Gatillado de Auditoría MCP en Vivo):** Al pulsar `[Ejecutar Auditoría MCP Ahora]`, el sistema deberá invocar a `MS IA-MCP`, mostrar el diálogo del agente GrokCloud en pantalla y actualizar el centro de descargas con el archivo `.xlsx` compilado por n8n.
- **`RF-15.2` (Descarga Real de Reporte Excel):** Cuando el usuario haga clic en `[Descargar Reporte Predictivo.xlsx]`, el sistema deberá iniciar la descarga del archivo binario legítimo generado por n8n.

---

## 6. Comportamiento Observable y Criterios de Aceptación (Escenarios BDD Gherkin)

### Escenario 1: Creación Exitosa de Sala con Matriz Paramétrica (`SC-02.1.1`)
```gherkin
Given que el administrador autenticado ingresa al panel de gestión de salas en Angular
When completa el formulario con nombre "Sala 3 - Atmos", filas 5 y columnas 10
And presiona "Crear Sala y Generar Butacas"
Then el sistema crea la sala con capacidad total de 50 asientos en PostgreSQL db_cinema_core
And genera visualmente una cuadrícula de 5 filas (A a E) y 10 columnas (1 a 10)
And todas las butacas quedan inicializadas como "ESTANDAR" y disponibles
```

### Escenario 2: Intento de Solapamiento Horario en Cartelera (`SC-02.2.1`)
```gherkin
Given que la "Sala 1" tiene programada la película "Avatar 2" de 18:00 a 21:20 (incluyendo 20 min de limpieza)
When el administrador intenta programar en la "Sala 1" la película "Titanic" con inicio a las 20:30
Then el sistema detecta la superposición horaria
And impide el guardado de la nueva función
And muestra la alerta observable "Existe un solapamiento con la función programada de Avatar 2 de 18:00 a 21:20"
```

### Escenario 3: Bloqueo Atómico Concurrente de Butaca (`SC-02.3.1`)
```gherkin
Given que la butaca "C-5" de la función 101 se encuentra en estado "DISPONIBLE"
When dos clientes intentan reservar simultáneamente la butaca "C-5"
Then la primera solicitud es aceptada y la butaca transiciona a "RESERVADA_TEMPORAL"
And la segunda solicitud es rechazada inmediatamente con error 409 y el mensaje "La butaca seleccionada ya no se encuentra disponible"
And la butaca permanece asignada de forma exclusiva al primer cliente durante 60 segundos
```

### Escenario 4: Liberación Compensatoria SAGA de Butaca (`SC-02.3.2`)
```gherkin
Given que la butaca "B-4" de la función 202 se encuentra en estado "RESERVADA_TEMPORAL"
When se recibe la orden de compensación de MS TICKET-AUTH por expiración de tiempo de pago
Then el sistema actualiza atómicamente la butaca "B-4" al estado "DISPONIBLE"
And el asiento vuelve a figurar en verde en la cartelera de todos los clientes conectados
```

### Escenario 5: Consulta de KPIs desde el Servidor MCP (`SC-02.4.1`)
```gherkin
Given que existen 3 funciones programadas para hoy donde la Sala 2 tiene solo un 10% de ocupación faltando 20 minutos
When el servidor MS IA-MCP ejecuta la consulta "get_occupancy_metrics()"
Then el sistema retorna un contrato de datos con el porcentaje de aforo de cada sala
And clasifica a la Sala 2 con la bandera de alerta "SALA_SUBOCUPADA"
And no expone datos personales de clientes ni contraseñas
```

### Escenario 6: Consulta Analítica Offline con IA en el Navegador (`SC-02.5.1`)
```gherkin
Given que el administrador se encuentra en FrontWeb y se desconecta completamente el acceso a internet
When abre el panel de IA Local y escribe "¿Cuál es la función con menor aforo hoy?"
Then el modelo local en el navegador analiza los datos de cartelera cacheados
And responde en menos de 2 segundos: "La función de Oppenheimer en Sala 2 a las 18:00 tiene solo un 8% de ocupación."
And no emite ninguna solicitud de red externa fallida
```

---

## 7. Efectos Secundarios e Integraciones

### 7.1 Dependencias con otros Microservicios
* **Con `MS TICKET-AUTH`:** Responde a comandos síncronos de bloqueo (`RESERVAR_TEMPORAL`), liberación compensatoria (`LIBERAR_DISPONIBLE`) y ocupación definitiva (`CONFIRMAR_OCUPADA`).
* **Con `MS MULTIMEDIA`:** Suministra metadatos de salas y butacas para el renderizado del ticket gráfico y la generación del código QR.
* **Con `MS IA-MCP`:** Provee el catálogo de funciones y métricas de ocupación para la auditoría comercial continua.

---

## 8. Contratos de Interconexión y Comunicación Inter-Servicios (`IC-CONTRACT-02`)

### `IC-02.1` (Endpoints SAGA consumidos por `MS TICKET-AUTH`)
- **Protocolo:** REST sobre HTTP/1.1
- **Base URL:** `http://localhost:3000/api/v1/showtimes`
- **Operaciones:**
  1. *Bloqueo Temporal:*
     - `POST /{showtimeId}/seats/{seatId}/lock`
     - Response: `{ status: "LOCKED", showtimeId, seatId, expiresAt }` (HTTP 200) o `{ errorCode: "SEAT_ALREADY_RESERVED" }` (HTTP 409).
  2. *Liberación Compensatoria SAGA:*
     - `POST /{showtimeId}/seats/{seatId}/release`
     - Response: `{ status: "RELEASED", seatId }` (HTTP 200).
  3. *Confirmación Definitiva:*
     - `POST /{showtimeId}/seats/{seatId}/confirm`
     - Response: `{ status: "OCCUPIED_DEFINITIVE", seatId }` (HTTP 200).

### `IC-02.2` (Endpoint de Métricas consumido por `MS IA-MCP`)
- **Protocolo:** REST sobre HTTP/1.1
- **Ruta:** `GET /api/v1/metrics/occupancy`
- **Headers:** `X-Internal-Service: ms-ia-mcp`
- **Success Response (200 OK):**
  ```json
  {
    "timestamp": "2026-11-03T02:00:00Z",
    "totalHalls": 4,
    "averageOccupancyPercentage": 42.5,
    "criticalShows": [
      {
        "showtimeId": "a9a85f64-5717-4562-b3fc-2c963f66af11",
        "movieTitle": "Oppenheimer",
        "hallName": "Sala 2",
        "occupancyPercentage": 8.0,
        "minutesUntilStart": 18,
        "status": "SALA_SUBOCUPADA"
      }
    ]
  }
  ```

### `IC-02.3` (Endpoint de Cartelera Pública consumido por `MOVIL CLIENT`)
- **Protocolo:** REST sobre HTTP/1.1
- **Ruta:** `GET /api/v1/showtimes/billboard`
- **Success Response (200 OK):** Listado de películas con funciones programadas, horarios y salas disponibles.

