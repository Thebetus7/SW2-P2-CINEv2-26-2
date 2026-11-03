# Specification: Módulo 03 - Servicios Multimedia, Visión Artificial y Firma Criptográfica (MS MULTIMEDIA)

> **Estado:** APPROVED  
> **Módulo:** `docs/specs/03-ms-multimedia/`  
> **Ubicación en Código:** `ms/ms-multimedia/backend/` y `ms/ms-multimedia/frontend/`  
> **Metodología:** SDD-Spec-Strict (Zero-Loss)  
> **Subordinación:** Sujeto estrictamente a `docs/constitution.md` (v1.3.0)

---

## 1. Objetivo y Alcance

### 1.1 Objetivo de Negocio
Proveer la infraestructura de procesamiento multimedia, almacenamiento de objetos, analítica de video basada en aprendizaje profundo ligero y seguridad criptográfica para la emisión de credenciales de acceso, desacoplando la persistencia de binarios pesados de los metadatos transaccionales y habilitando el monitoreo inteligente de afluencia de personas en las taquillas del complejo cinematográfico mediante visión artificial, acompañado de un frontend simulador de afluencia para demostración interactiva.

### 1.2 Alcance Funcional (In-Scope)
- **Persistencia Híbrida de Objetos y Metadatos:**
  - Almacenamiento de archivos binarios (portadas de películas y credenciales gráficas de tickets) en buckets de **MinIO S3** local (`http://localhost:9000`).
  - Almacenamiento de series temporales de afluencia y metadatos de boletos en **DynamoDB Local** (`http://localhost:8002`).
- **Configuración Estricta de AWS SDK Local:** Configuración explícita de clientes de S3 y DynamoDB apuntando a emuladores contenerizados en Docker sin requerir credenciales en AWS Cloud.
- **Generación y Firma Criptográfica de Código QR Dinámico:** Matriz bidimensional QR con payload JSON firmado mediante **HMAC-SHA256** utilizando la clave secreta `clave_secreta_universitaria_mcp`.
- **Renderizado Gráfico de Entradas en Formato JPEG:** Ensamblaje visual del ticket en formato JPEG estilizado, fusionando la portada de la película, sala, butaca, fecha/hora, precio y el código QR dinámico incrustado.
- **Detección y Conteo de Personas con TensorFlow.js (COCO-SSD):**
  - Endpoint HTTP para la ingesta de cuadros de imágenes.
  - Ejecución del modelo preentrenado COCO-SSD filtrando exclusivamente etiquetas `"person"` con confianza $\ge 0.50$.
  - Clasificación de congestión (`NORMAL` si $\le 40$, `CONGESTIONADA` si $> 40$).
  - Registro de series temporales en DynamoDB.
- **Frontend Interactivo de Simulación (`ms/ms-multimedia/frontend/`):**
  - Botones de simulación interactiva: `[Simular Fila Normal]` (8 personas) y `[Simular Fila Congestionada]` (45 personas).
  - Visualizador de eventos de afluencia y monitor en tiempo real de llamadas a MinIO y DynamoDB.
- **Exposición de Métricas para Servidor MCP:** Suministro del conteo en tiempo real a la herramienta semántica `get_line_analytics()` consumida por `MS IA-MCP`.

### 1.3 Exclusiones Explícitas (Out-of-Scope)
- **Validación de Boletos en Puerta:** La lectura de cámara y verificación HMAC pertenece a `MS BOLETEO-VALIDATOR`.
- **Venta de Confitería:** Prohibido el conteo o analítica sobre áreas de dulcería (acorde a `INV-BIZ-01`); el foco exclusivo es taquillas y accesos.
- **Conexión a Servicios Productivos de AWS Cloud:** Prohibido el tráfico saliente hacia la nube pública de AWS.

---

## 2. Actores y Permisos en el Módulo

| Actor | Permisos en este Módulo | Restricciones de Acceso |
| :--- | :--- | :--- |
| **Microservicio `MS TICKET-AUTH` (Sistema)** | Solicitar la generación de la credencial gráfica en JPEG y la firma HMAC-SHA256 del código QR (`IC-03.1`). | Solo solicitudes de generación y consulta firmadas. |
| **Microservicio `MS CINEMA-CORE` (Sistema)** | Subir y consultar portadas de películas en MinIO S3. | Acceso al bucket `cine-posters`. |
| **Microservicio `MS IA-MCP` (Sistema)** | Consultar el último conteo de personas en fila mediante `get_line_analytics()` (`IC-03.2`). | Solo lectura de métricas de afluencia. |
| **Administrador (`admin`)** | Disparar simulaciones de cámara con imágenes de prueba desde el frontend simulador. | Panel de simulación controlado. |
| **Cliente (`cliente`)** | Descargar y previsualizar la imagen JPEG de su entrada confirmada y el código QR. | Acceso de solo lectura a sus propios recursos en MinIO S3. |

---

## 3. Modelo Funcional de Datos y Reglas de Negocio Específicas

### 3.1 Estructuras de Persistencia Híbrida

#### Bucket MinIO S3: `cine-posters`
- Clave: `posters/{peliculaId}.jpg`
- Contenido: Imagen binaria original de la película.

#### Bucket MinIO S3: `cine-tickets`
- Clave: `tickets/{ticketId}.jpg`
- Contenido: Credencial gráfica digital en formato JPEG con el QR incrustado.

#### Tabla DynamoDB: `LineAnalytics`
- `cameraZoneId` (Partition Key - String): Identificador de la zona de captura (ej. `"TAQUILLA_PRINCIPAL"`).
- `timestamp` (Sort Key - String ISO-8601): Momento del procesamiento del cuadro.
- `personCount` (Number): Cantidad entera de personas detectadas por COCO-SSD.
- `inferenceTimeMs` (Number): Milisegundos empleados por el modelo en la inferencia.
- `congestionStatus` (String): Estado clasificado (`NORMAL` si $\le 40$, `CONGESTIONADA` si $> 40$).

#### Tabla DynamoDB: `TicketMetadata`
- `ticketId` (Partition Key - String UUID).
- `seatId` (String UUID).
- `showtimeId` (String UUID).
- `issuedAt` (String ISO-8601).
- `cryptoSignature` (String Hex HMAC-SHA256).
- `s3JpegUrl` (String): Enlace de acceso a la imagen completa en MinIO S3.

### 3.2 Reglas de Negocio del Módulo (`RB-MEDIA-XX`)

- **`RB-MEDIA-01` (Firma Criptográfica Inquebrantable):** El código QR dinámico debe encapsular un JSON con la estructura:
  ```json
  {
    "ticketId": "uuid-v4",
    "seatId": "uuid-v4",
    "showtimeId": "uuid-v4",
    "issuedAt": "iso-timestamp",
    "sig": "hmac_sha256_hex"
  }
  ```
  Donde `sig` se genera aplicando HMAC-SHA256 con la clave `clave_secreta_universitaria_mcp` sobre `${ticketId}:${seatId}:${showtimeId}:${issuedAt}`.
- **`RB-MEDIA-02` (Renderizado Gráfico Obligatorio en JPEG):** Toda entrada emitida debe generarse como una imagen visual completa en formato JPEG que integre la carátula de la película, sala, butaca, fecha/hora y el QR dinámico. Queda prohibido devolver únicamente el código QR plano o un PDF genérico.
- **`RB-MEDIA-03` (Filtrado Exclusivo de Personas en TensorFlow):** El modelo COCO-SSD debe descartar cualquier objeto detectado que no sea de clase `"person"` y cuya confianza sea menor a 0.50 (50%). Solo las cajas delimitadoras de personas confirmadas suman al contador entero.
- **`RB-MEDIA-04` (Regla de Detección de Congestión en Taquilla):** Si el conteo entero de personas en la zona de taquilla supera el umbral de 40 individuos, el registro se marca con `congestionStatus = "CONGESTIONADA"`, habilitando la condición para que el Agente Auditor dispare contingencias en n8n.
- **`RB-MEDIA-05` (Aislamiento Total de AWS SDK):** Las llamadas a S3 y DynamoDB deben forzar los endpoints locales `http://localhost:9000` y `http://localhost:8002`. Cualquier intento de resolución DNS hacia dominios `*.amazonaws.com` se considerará una falla de configuración crítica.

---

## 4. Requerimientos Funcionales Estructurados (Patrón EARS)

### Historia de Usuario `HU-07`: Generación y Firma Criptográfica de Boletos en JPEG
*Como sistema de boletería, quiero generar una credencial gráfica completa en formato JPEG con un código QR firmado con HMAC-SHA256, para proveer una entrada visual y segura a los clientes.*

- **`RF-07.1` (Generación de Código QR Firmado):** Cuando `MS TICKET-AUTH` solicite la emisión de un boleto enviando `{ ticketId, seatId, showtimeId }`, el sistema deberá generar la marca temporal `issuedAt`, calcular la firma HMAC-SHA256 y crear la matriz gráfica del código QR.
- **`RF-07.2` (Composición Gráfica en JPEG):** El sistema deberá fusionar la portada de la película almacenada en MinIO con los textos descriptivos de la función y estampar el código QR en la credencial, guardando la imagen final en el bucket `cine-tickets` en formato JPEG.
- **`RF-07.3` (Persistencia de Metadatos en DynamoDB):** Tras la subida a MinIO S3, el sistema deberá registrar el ID del ticket, la firma criptográfica y la URL pública en la tabla `TicketMetadata` de DynamoDB local.

---

### Historia de Usuario `HU-08`: Visión Artificial y Conteo de Personas en Filas (TensorFlow COCO-SSD)
*Como administrador y como sistema de auditoría, quiero procesar imágenes de las cámaras de taquilla mediante un modelo de detección de objetos, para monitorear la afluencia y detectar filas congestionadas.*

- **`RF-08.1` (Ingesta y Detección por Cuadro):** Cuando se envíe una imagen al endpoint HTTP de análisis, el sistema deberá procesarla con TensorFlow.js y el modelo COCO-SSD, identificando únicamente las predicciones con etiqueta `"person"`.
- **`RF-08.2` (Registro de Conteo en DynamoDB):** El sistema deberá totalizar el número de personas detectadas y persistir el registro en la tabla `LineAnalytics` con la zona, la marca temporal y el estado de congestión.
- **`RF-08.3` (Simulador de Prueba Rápida en Frontend):** El frontend en `ms/ms-multimedia/frontend/` deberá proveer dos botones de prueba rápida:
  - `[Simular Fila Normal]`: Procesa una imagen precargada con 8 personas y actualiza DynamoDB.
  - `[Simular Fila Congestionada]`: Procesa una imagen precargada con 45 personas y activa la alerta de taquilla saturada.
- **`RF-08.4` (Suministro de Datos a MCP):** Cuando `MS IA-MCP` invoque la herramienta `get_line_analytics()`, el sistema deberá consultar el último registro de `LineAnalytics` en DynamoDB y retornar la cantidad de personas y el estado de congestión.

---

## 5. Comportamiento Observable y Criterios de Aceptación (Escenarios BDD Gherkin)

### Escenario 1: Generación Exitosa de Ticket Gráfico en JPEG con Firma HMAC (`SC-03.1.1`)
```gherkin
Given que MS TICKET-AUTH solicita la emisión de un boleto para la función "Avatar 2", sala 1, butaca "C-8"
When MS MULTIMEDIA procesa la solicitud
Then genera el payload JSON con ticketId, seatId, showtimeId y timestamp
And calcula la firma "sig" mediante HMAC-SHA256 usando "clave_secreta_universitaria_mcp"
And ensambla la credencial visual completa en formato JPEG con la carátula y el código QR incrustado
And guarda el archivo binario en el bucket MinIO S3 "cine-tickets/ticket-c8.jpg"
And registra los metadatos en la tabla DynamoDB "TicketMetadata"
And retorna la URL accesible "http://localhost:9000/cine-tickets/ticket-c8.jpg"
```

### Escenario 2: Detección de Fila Congestionada con TensorFlow COCO-SSD (`SC-03.2.1`)
```gherkin
Given que el evaluador activa el botón de prueba "[Simular Fila Congestionada]" en el frontend simulador
When el modelo COCO-SSD analiza el cuadro de imagen precargado
Then detecta 45 cajas delimitadoras clasificadas exclusivamente como "person"
And descarta objetos que no sean personas
And calcula que 45 supera el umbral crítico de 40
And registra en DynamoDB la fila con congestionStatus = "CONGESTIONADA"
And la interfaz despliega en color ámbar el aviso "Taquilla Congestionada: 45 personas en fila"
```

### Escenario 3: Consulta de Analítica de Fila desde el Servidor MCP (`SC-03.3.1`)
```gherkin
Given que la última lectura en DynamoDB registra 45 personas en la taquilla principal
When el servidor MS IA-MCP ejecuta la herramienta "get_line_analytics()"
Then MS MULTIMEDIA responde con el JSON estructurado conteniendo personCount = 45 y congestionStatus = "CONGESTIONADA"
And el tiempo de respuesta es menor a 200 ms
And no realiza llamadas a la nube pública de AWS
```

---

## 6. Efectos Secundarios e Integraciones

### 6.1 Dependencias con otros Microservicios
* **Con `MinIO S3 Local`:** Requiere el bucket `cine-posters` y `cine-tickets` creados en `http://localhost:9000`.
* **Con `DynamoDB Local`:** Requiere las tablas `LineAnalytics` y `TicketMetadata` aprovisionadas en `http://localhost:8002`.
* **Con `MS TICKET-AUTH`:** Entrega la URL del ticket gráfico para la previsualización del cliente y el QR para el GraphQL federado.
* **Con `MS IA-MCP`:** Provee el feed de datos analíticos para la auditoría continua.

---

## 7. Contratos de Interconexión y Comunicación Inter-Servicios (`IC-CONTRACT-03`)

### `IC-03.1` (Endpoint de Emisión de Credencial Gráfica y QR consumido por `MS TICKET-AUTH`)
- **Protocolo:** REST sobre HTTP/1.1
- **Ruta:** `POST /api/v1/multimedia/tickets/generate`
- **Request Payload:**
  ```json
  {
    "ticketId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "seatId": "e1f14798-2936-4d08-8123-cb84524458d1",
    "showtimeId": "a9a85f64-5717-4562-b3fc-2c963f66af11",
    "movieTitle": "Avatar 2: El Sentido del Agua",
    "hallName": "Sala IMAX 1",
    "seatLabel": "C-8",
    "price": 35.00
  }
  ```
- **Success Response (201 Created):**
  ```json
  {
    "ticketId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "ticketImageUrl": "http://localhost:9000/cine-tickets/tickets/3fa85f64.jpg",
    "qrCodePayload": {
      "ticketId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "seatId": "e1f14798-2936-4d08-8123-cb84524458d1",
      "showtimeId": "a9a85f64-5717-4562-b3fc-2c963f66af11",
      "issuedAt": "2026-11-03T01:50:00Z",
      "sig": "b5a932c0f21448d3885d56b00684f09d846b4f74d022b7a9768fb7d206f40b3c"
    }
  }
  ```

### `IC-03.2` (Endpoint de Analítica de Filas consumido por `MS IA-MCP`)
- **Protocolo:** REST sobre HTTP/1.1
- **Ruta:** `GET /api/v1/analytics/line-congestion`
- **Headers:** `X-Internal-Service: ms-ia-mcp`
- **Success Response (200 OK):**
  ```json
  {
    "cameraZoneId": "TAQUILLA_PRINCIPAL",
    "personCount": 45,
    "congestionStatus": "CONGESTIONADA",
    "threshold": 40,
    "lastEvaluatedAt": "2026-11-03T02:05:00Z"
  }
  ```

### `IC-03.3` (Endpoint de Detección de Cuadros para Inferencia)
- **Protocolo:** REST sobre HTTP/1.1 (Multipart / Form-data o Base64 JSON)
- **Ruta:** `POST /api/v1/analytics/detect-queue`
- **Success Response (200 OK):** Retorna `personCount`, `boxes`, `inferenceTimeMs`.

