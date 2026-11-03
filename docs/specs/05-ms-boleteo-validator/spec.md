# Specification: Módulo 05 - Panel de Boleteo y Validación Criptográfica en Puerta (MS BOLETEO-VALIDATOR)

> **Estado:** APPROVED  
> **Módulo:** `docs/specs/05-ms-boleteo-validator/`  
> **Ubicación en Código:** `ms/ms-boleteo-validator/backend/` y `ms/ms-boleteo-validator/frontend/`  
> **Metodología:** SDD-Spec-Strict (Zero-Loss)  
> **Subordinación:** Sujeto estrictamente a `docs/constitution.md` (v1.3.0)

---

## 1. Objetivo y Alcance

### 1.1 Objetivo de Negocio
Proveer un canal operativo de alta velocidad y máxima fiabilidad para el personal de acceso físico al cine (`boletero`), permitiendo escanear códigos QR dinámicos mediante la cámara web/móvil continua, verificar de manera autónoma la firma criptográfica HMAC-SHA256, actualizar el estado del boleto a `USED` en tiempo real y desplegar retroalimentación visual inequívoca para impedir accesos fraudulentos o reutilizaciones de entradas, estructurado en Laravel 11 para el backend y React + Inertia para el frontend.

### 1.2 Alcance Funcional (In-Scope)
- **Acceso Exclusivo y Protegido para Boleteros:** Autenticación centralizada validada contra `MS TICKET-AUTH` con redirección obligatoria a la consola de control de acceso.
- **Modo Dual de Captura de Credenciales:**
  1. *Escáner Continuo por Cámara:* Lector en vivo mediante API de video HTML5 / ZXing que detecta y decodifica el JSON del QR dinámico en tiempo real sin requerir pulsar botones.
  2. *Entrada Manual de Contingencia:* Casilla de texto para digitación manual del identificador de ticket en casos de pantallas rotas, reflejos o fallas lumínicas.
- **Verificación Criptográfica Local en React/Laravel:**
  - Desempaquetado del payload JSON `{ ticketId, seatId, showtimeId, issuedAt, sig }`.
  - Recálculo autónomo de la firma HMAC-SHA256 con la clave secreta compartida `clave_secreta_universitaria_mcp` sobre la concatenación `${ticketId}:${seatId}:${showtimeId}:${issuedAt}`.
- **Actualización de Estado en Tiempo Real:** Comunicación autenticada con JWT hacia `MS TICKET-AUTH` (`POST /api/v1/tickets/{id}/use`) para cambiar el estado de la entrada a `USED` en PostgreSQL.
- **Retroalimentación Visual Inmediata y Accesible:**
  - *Acceso Válido (VERDE):* Pantalla de éxito en verde vibrante, sonido de confirmación, despliegue del título de la película, sala, código de butaca y saludo al cliente.
  - *Acceso Denegado (ROJO):* Pantalla de alerta en rojo crítico, sonido de rechazo y motivo explícito (*"Boleto ya utilizado anteriormente"*, *"Firma criptográfica inválida / Falsificación"* o *"Función incorrecta o vencida"*).
- **Registro Histórico de Validaciones del Turno:** Tabla en pantalla que muestra los últimos 20 boletos escaneados en la sesión del boletero con fecha, hora y resultado.

### 1.3 Exclusiones Explícitas (Out-of-Scope)
- **Venta o Cobro de Entradas:** El boletero no tiene funciones de caja ni pasarelas de pago.
- **Gestión de Películas o Salas:** El boletero no puede alterar la programación del complejo.

---

## 2. Actores y Permisos en el Módulo

| Actor | Permisos en este Módulo | Restricciones de Acceso |
| :--- | :--- | :--- |
| **Boletero (`boletero`)** | Iniciar sesión; activar cámara web/móvil; escanear códigos QR; digitar códigos manuales de emergencia; consultar el historial de su turno. | No puede anular boletos, modificar precios ni acceder a módulos administrativos. |
| **Cliente (`cliente`)** | Presentar su código QR dinámico desde la pantalla del dispositivo móvil o credencial impresa para ser escaneado. | No interactúa con la interfaz del panel de boleteo. |
| **Administrador (`admin`)** | Consultar métricas de velocidad de validación y volumen de accesos por puerta. | Supervisión general. |

---

## 3. Modelo Funcional de Datos y Reglas de Negocio Específicas

### 3.1 Estructuras de Datos Funcionales

#### Payload Decodificado del Código QR
```json
{
  "ticketId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "seatId": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "showtimeId": "123e4567-e89b-12d3-a456-426614174000",
  "issuedAt": "2026-11-03T18:30:00Z",
  "sig": "b5a932c0f21448d3885d56b00684f09d846b4f74d022b7a9768fb7d206f40b3c"
}
```

#### Registro Local de Validación (`access_scans`)
- `id`: Identificador correlativo del escaneo (BigIncrements).
- `ticket_id`: UUID del boleto procesado.
- `movie_title`: Nombre de la película.
- `hall_name`: Sala correspondiente.
- `seat_code`: Asiento validado (ej. "C-8").
- `scanned_at`: Timestamp de la operación.
- `result`: Enumerador (`SUCCESS`, `ALREADY_USED`, `INVALID_SIGNATURE`, `EXPIRED`).
- `validator_email`: Correo del boletero en sesión.

### 3.2 Reglas de Negocio del Módulo (`RB-BOL-XX`)

- **`RB-BOL-01` (Verificación Criptográfica Previa a la Red):** Antes de consultar el estado del ticket en la base de datos central, la interfaz debe comprobar localmente que `HMAC_SHA256(payload, clave_secreta_universitaria_mcp) == sig`. Si la firma no coincide exactamente, el boleto se rechaza de inmediato como intento de falsificación sin saturar la red con peticiones al backend.
- **`RB-BOL-02` (Unicidad Estricta de Uso):** Un boleto solo puede transicionar a `USED` una única vez en toda su vida útil. Si un boleto en estado `USED` es escaneado por segunda vez, el sistema debe bloquear el acceso, emitir la alarma visual roja y mostrar la hora exacta en que fue utilizado previamente.
- **`RB-BOL-03` (Congelamiento y Continuidad Operativa):** Tras cada lectura (exitosa o fallida), el sistema despliega el resultado durante 2.5 segundos de confirmación y reactiva automáticamente el escáner continuo sin obligar al boletero a recargar la página o hacer clics adicionales.
- **`RB-BOL-04` (Sincronización Transaccional Inter-Servicio):** La confirmación de uso se transmite mediante llamada HTTP con JWT firmado a `MS TICKET-AUTH`. Si la red experimenta un microcorte transitorio, el sistema ofrece un botón de reintento inmediato sin perder la firma capturada.

---

## 4. Requerimientos Funcionales Estructurados (Patrón EARS)

### Historia de Usuario `HU-12`: Escaneo Continuo y Validación de Boletos por Cámara
*Como boletero en puerta de acceso, quiero enfocar la cámara en el teléfono del cliente para que el sistema valide el QR automáticamente en menos de un segundo, agilizando el ingreso a la sala.*

- **`RF-12.1` (Activación Automática de Cámara):** Al iniciar sesión el boletero, el sistema deberá solicitar permisos de video y activar el visor de la cámara en pantalla completa con una cuadrícula guía de enfoque.
- **`RF-12.2` (Lectura y Verificación HMAC en Vivo):** Cuando la cámara capture un código QR, el sistema deberá decodificar el JSON, verificar la firma HMAC-SHA256 y consultar el estado del boleto en `MS TICKET-AUTH`.
- **`RF-12.3` (Despliegue Visual de Acceso Exitoso):** Si la firma es legítima y el ticket estaba en `CONFIRMED`, el sistema deberá cambiar su estado a `USED`, pintar la pantalla de verde y mostrar: *"ACCESO PERMITIDO - [Película] - Sala [X] - Butaca [Fila-Num]"*.
- **`RF-12.4` (Alerta Visual de Acceso Denegado):** Si la firma no coincide o el ticket ya figura como `USED`, el sistema deberá pintar la pantalla de rojo crítico y desplegar la advertencia: *"ACCESO DENEGADO - Boleto ya utilizado / Firma inválida"*.
- **`RF-12.5` (Entrada Manual de Emergencia):** Cuando el boletero pulse "Validación Manual", el sistema deberá desplegar una casilla de texto donde se pueda ingresar el código del ticket y pulsar "Verificar", aplicando exactamente el mismo flujo criptográfico.

---

## 5. Comportamiento Observable y Criterios de Aceptación (Escenarios BDD Gherkin)

### Escenario 1: Validación Exitosa de Boleto Legítimo (`SC-05.1.1`)
```gherkin
Given que el boletero "boletero@cine.local" tiene activa la cámara en el panel de boleteo
When un cliente presenta su código QR dinámico legítimo para la butaca "C-8" de la película "Avatar 2"
Then el escáner decodifica el JSON en menos de 500 ms
And comprueba que la firma HMAC-SHA256 es auténtica
And MS TICKET-AUTH confirma que el ticket está en estado "CONFIRMED"
And actualiza el estado del ticket a "USED"
And la pantalla se tiñe de color verde mostrando "ACCESO AUTORIZADO - Butaca C-8"
And el registro se agrega a la lista de validaciones recientes del turno
```

### Escenario 2: Intento de Reingreso con Boleto Ya Utilizado (`SC-05.1.2`)
```gherkin
Given que un boleto para la butaca "C-8" ya fue escaneado y marcado como "USED" hace 10 minutos
When el mismo código QR es presentado nuevamente ante la cámara
Then el sistema detecta que el estado actual en la base de datos es "USED"
And tiñe la pantalla de rojo parpadeante
And muestra la alerta en negrita "ACCESO RECHAZADO: Boleto ya utilizado a las 18:35"
And bloquea el ingreso físico del portador
```

### Escenario 3: Código QR Falsificado o Alterado (`SC-05.1.3`)
```gherkin
Given que una persona maliciosa genera un código QR manual alterando el número de asiento a "A-1" sin la clave institucional
When la cámara del boletero lee el código QR falso
Then el algoritmo local en React/Laravel recalcula el HMAC-SHA256 con "clave_secreta_universitaria_mcp"
And detecta que la firma calculada no coincide con el campo "sig"
And rechaza la solicitud de inmediato sin consultar la base de datos central
And despliega la alarma roja "ACCESO DENEGADO: Firma criptográfica ilegítima / Código adulterado"
```

---

## 6. Efectos Secundarios e Integraciones

### 6.1 Dependencias con otros Microservicios
* **Con `MS TICKET-AUTH`:** Consumo de la API de autenticación para login del boletero y mutación/endpoint para marcar el boleto como `USED`.
* **Con `MS MULTIMEDIA`:** Comparte el algoritmo y clave secreta `clave_secreta_universitaria_mcp` para la verificación criptográfica simétrica.

---

## 7. Contratos de Interconexión y Comunicación Inter-Servicios (`IC-CONTRACT-05`)

### `IC-05.1` (Invocación de Validación hacia `MS TICKET-AUTH`)
- **Protocolo:** REST sobre HTTP/1.1
- **Ruta:** `POST http://localhost:8081/api/v1/tickets/{ticketId}/use`
- **Headers:**
  - `Authorization: Bearer <JWT_BOLETERO>`
  - `Content-Type: application/json`
- **Request Payload:**
  ```json
  {
    "ticketId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "qrSignature": "b5a932c0f21448d3885d56b00684f09d846b4f74d022b7a9768fb7d206f40b3c",
    "scannedAt": "2026-11-03T02:15:00Z"
  }
  ```
- **Success Response (200 OK):**
  ```json
  {
    "valid": true,
    "status": "USED",
    "movieTitle": "Avatar 2: El Sentido del Agua",
    "hallName": "Sala IMAX 1",
    "seatLabel": "C-8"
  }
  ```
- **Failure Response (409 Conflict):**
  ```json
  {
    "valid": false,
    "errorCode": "TICKET_ALREADY_USED",
    "message": "El boleto ya fue utilizado con anterioridad."
  }
  ```

