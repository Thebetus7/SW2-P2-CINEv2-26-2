# Specification: Módulo 06 - Aplicación Móvil del Cliente (MOVIL CLIENT)

> **Estado:** APPROVED  
> **Módulo:** `docs/specs/06-movil-client/`  
> **Ubicación en Código:** `ms/movil-client/` (Frontend Directo React 18 PWA + Capacitor)  
> **Metodología:** SDD-Spec-Strict (Zero-Loss)  
> **Subordinación:** Sujeto estrictamente a `docs/constitution.md` (v1.3.0)

---

## 1. Objetivo y Alcance

### 1.1 Objetivo de Negocio
Brindar al cliente final del cine una experiencia digital fluida, moderna y confiable para consultar la cartelera comercial, adquirir entradas mediante un flujo interactivo paso a paso con previsualización gráfica y pasarela Stripe, contar con asistencia conversacional inteligente en un panel deslizable (Sales Drawer), orientarse dentro del complejo mediante indicaciones asistidas por GPS y acceder a sus salas mostrando sus códigos QR dinámicos aun cuando se encuentre completamente sin conexión a internet ni cobertura celular, estructurada en una base de código unificada en React 18 como PWA y empaquetada con Capacitor.

### 1.2 Alcance Funcional (In-Scope)
- **Arquitectura Híbrida Unificada (React PWA + Capacitor):** Base de código única en React en `ms/movil-client/` configurada como Aplicación Web Progresiva para navegadores móviles y empaquetada con Capacitor para ejecución instalable con acceso a APIs nativas del dispositivo.
- **Acceso Exclusivo de Clientes:** Inicio de sesión y registro de clientes conectado a `MS TICKET-AUTH`, con botón de acceso rápido para pruebas de demostración (`[Ingresar como Cliente]`).
- **Explorador de Cartelera y Funciones:** Catálogo interactivo de películas con sinopsis, duración, horarios programados y visualización de portadas de alta calidad consumidas desde MinIO S3.
- **Flujo Guiado de Compra de Boletos (Stepper UI):**
  1. *Selección de Asientos:* Plano interactivo de la sala con estados en tiempo real (disponibles, ocupados y seleccionados).
  2. *Previsualización Gráfica:* Carga y renderizado de la imagen digital de la entrada en formato JPEG directamente desde MinIO S3.
  3. *Pasarela de Pago Stripe:* Despliegue del contenedor dinámico de Stripe Elements con tarjeta de prueba sugerida (`4242 4242 4242 4242`) y cuenta regresiva visible de 60 segundos con compensación SAGA automática ante expiración.
  4. *Confirmación y Emisión de QR:* Exhibición del código QR dinámico firmado con HMAC-SHA256 listo para ser escaneado por el boletero.
- **Chatbot Asistente Deslizable (Sales Drawer):** Panel lateral retráctil de izquierda a derecha para consultar recomendaciones de películas y disparar compras asistidas en lenguaje natural.
- **Soporte Offline Total de Boletos (Service Workers + IndexedDB):**
  - Registro de Service Worker para almacenamiento en caché de todos los activos de la aplicación.
  - Almacenamiento automático de los boletos comprados (payload del QR e imagen JPEG) en la base de datos local `IndexedDB`.
  - Disponibilidad permanente de la sección "Mis Boletos" para presentar el código QR en la entrada de la sala sin señal telefónica ni Wi-Fi.
- **Tarjeta de Guía Local por GPS ("Cómo llegar a tu Sala"):** Componente informativo que consulta el GPS nativo del dispositivo y presenta indicaciones escritas paso a paso para llegar a la sala asignada (ej. *"Dirígete al 2do piso, pasillo izquierdo, Sala 3"*), junto con el tiempo estimado de espera en taquilla según el conteo de TensorFlow.

### 1.3 Exclusiones Explícitas (Out-of-Scope)
- **Confitería / Dulcería:** Exclusión total de cualquier compra o pedido de alimentos.
- **Anulación Voluntaria de Boletos:** Los boletos pagados son definitivos e inmutables hasta su uso en puerta.

---

## 2. Actores y Permisos en el Módulo

| Actor | Permisos en este Módulo | Restricciones de Acceso |
| :--- | :--- | :--- |
| **Cliente (`cliente`)** | Registrarse; iniciar sesión; navegar cartelera; seleccionar butacas; pagar con Stripe; ver y descargar boletos offline; interactuar con el Chatbot; activar la guía de orientación GPS. | No puede acceder a paneles de administración ni validar entradas ajenas. |
| **Visitante Anónimo** | Visualizar la pantalla de login/registro o utilizar el botón demo de cliente. | No puede ver la cartelera ni reservar asientos sin autenticación previa. |

---

## 3. Modelo Funcional de Datos y Reglas de Negocio Específicas

### 3.1 Estructura del Almacenamiento Local Offline (`IndexedDB`)

#### Almacén Local: `OfflineTickets`
- `ticketId` (Clave Primaria - UUID).
- `peliculaTitulo`: Nombre de la película.
- `salaNombre`: Nombre descriptivo de la sala.
- `butacaCodigo`: Código del asiento (ej. "C-8").
- `fechaHoraFuncion`: Timestamp de la función.
- `qrJsonPayload`: Texto JSON completo con la firma criptográfica HMAC-SHA256.
- `jpegImageBlob`: Objeto binario (Blob) de la imagen completa del ticket descargada de MinIO S3 para visualización sin red.
- `descargadoEn`: Timestamp de sincronización local.

### 3.2 Reglas de Negocio del Módulo (`RB-MOB-XX`)

- **`RB-MOB-01` (Garantía de Persistencia Inmediata Offline):** Inmediatamente después de que la pasarela Stripe apruebe la compra, la aplicación debe descargar tanto el JSON del QR como el binario JPEG del ticket en el `IndexedDB` local antes de notificar éxito al usuario, asegurando que el boleto quede resguardado ante cualquier desconexión súbita.
- **`RB-MOB-02` (Funcionamiento en Modo Avión / Sin Señal):** Al abrir la pestaña "Mis Boletos" en un dispositivo sin conexión a internet, el sistema no debe mostrar pantallas en blanco ni errores de red; debe leer directamente de `IndexedDB` y desplegar el código QR con brillo de pantalla optimizado para lectura rápida de la cámara del boletero.
- **`RB-MOB-03` (Simetría del Chatbot Deslizable):** Toda compra realizada a través del Chatbot debe aplicar el mismo temporizador de 60 segundos, la misma previsualización del ticket en MinIO y el mismo contenedor de Stripe Elements que el flujo estándar.
- **`RB-MOB-04` (Guía GPS Informativa sin Invasión):** La guía de ubicación debe solicitar permisos de geolocalización de forma clara; si el usuario deniega los permisos, la tarjeta despliega las indicaciones fijas del boleto sin bloquear el resto de la aplicación.

---

## 4. Requerimientos Funcionales Estructurados (Patrón EARS)

### Historia de Usuario `HU-16`: Compra Visual de Boletos con Stepper UI y Stripe
*Como cliente, quiero ver cada paso de mi compra con la entrada previa y pagar de forma rápida con tarjeta de prueba, para tener certeza de mi compra y obtener mi QR.*

- **`RF-16.1` (Selección Dinámica de Butacas):** Al tocar una butaca libre en el mapa de la sala, el sistema deberá marcarla en color resaltado y activar el botón "Continuar Compra".
- **`RF-16.2` (Previsualización de Entrada Gráfica):** El sistema deberá desplegar la imagen JPEG estilizada del ticket recuperada de MinIO S3 en la Etapa 2 del Stepper.
- **`RF-16.3` (Temporizador Regresivo de 60 Segundos):** Durante el proceso de pago en Stripe, la interfaz deberá mostrar una barra de tiempo regresiva visible; si el tiempo expira, la reserva se cancela y se notifica al usuario liberando el asiento.
- **`RF-16.4` (Confirmación y Descarga a IndexedDB):** Tras la aprobación de Stripe, el sistema deberá exhibir el código QR dinámico y guardar los datos en `IndexedDB`.

---

### Historia de Usuario `HU-17`: Consulta y Validación Offline de Boletos
*Como cliente dentro del cine sin señal celular, quiero abrir mi aplicación y ver mis boletos con sus códigos QR, para ingresar a la sala sin contratiempos.*

- **`RF-17.1` (Caché por Service Worker):** El sistema deberá registrar un Service Worker que conserve la aplicación disponible en modo desconectado.
- **`RF-17.2` (Lectura Local desde IndexedDB):** Cuando no haya conexión a internet, la vista "Mis Boletos" deberá cargar y desplegar todas las entradas confirmadas almacenadas en la base de datos local.

---

### Historia de Usuario `HU-18`: Orientación Interna por GPS hacia la Sala
*Como cliente que asiste a una función, quiero recibir indicaciones claras de cómo llegar a mi sala y cuánto tiempo hay de fila, para ingresar a tiempo a la función.*

- **`RF-18.1` (Detección de Proximidad por GPS):** El sistema deberá consultar la posición del terminal para comprobar si el cliente se encuentra en las inmediaciones del cine.
- **`RF-18.2` (Despliegue de Tarjeta de Orientación):** La app deberá desplegar la tarjeta *"Cómo llegar a tu Sala"* con instrucciones paso a paso hacia la sala indicada en el boleto y el tiempo estimado de fila en taquilla.

---

## 5. Comportamiento Observable y Criterios de Aceptación (Escenarios BDD Gherkin)

### Escenario 1: Presentación de Boleto en Modo Avión / Offline (`SC-07.1.1`)
```gherkin
Given que el cliente compró un boleto para la función de hoy y activa el "Modo Avión" en su dispositivo móvil
When abre la aplicación y pulsa en la pestaña "Mis Boletos"
Then el Service Worker carga la interfaz de la aplicación sin errores de red
And el sistema recupera la entrada guardada desde la base de datos local IndexedDB
And despliega la imagen gráfica del boleto y el código QR dinámico con la firma HMAC-SHA256
And el boletero puede escanear el QR desde la pantalla sin requerir conexión a internet
```

### Escenario 2: Activación de la Tarjeta de Guía GPS hacia la Sala (`SC-07.2.1`)
```gherkin
Given que el cliente con entrada para la "Sala 2" abre el detalle de su función dentro del cine
When autoriza los permisos de geolocalización GPS
Then la app despliega la tarjeta informativa "Orientación en el Complejo"
And muestra el texto: "Te encuentras cerca de la entrada principal. Sube por las escaleras eléctricas al 2do piso y gira a la izquierda para ingresar a la Sala 2."
And despliega el indicador de afluencia: "Tiempo estimado en taquilla: Menos de 5 minutos (fila despejada)"
```

### Escenario 3: Interacción con el Chatbot Deslizable (`SC-07.3.1`)
```gherkin
Given que el cliente pulsa el botón flotante del asistente
When el drawer se despliega suavemente de izquierda a derecha
And el cliente selecciona una butaca dentro de las recomendaciones del chat
Then dentro del mismo drawer se previsualiza la imagen JPEG del ticket
And se abre el contenedor de Stripe Elements con la tarjeta de prueba "4242424..." sugerida
And el cliente completa la compra sin salir del componente deslizable
```

---

## 6. Efectos Secundarios e Integraciones

### 6.1 Dependencias con otros Microservicios
* **Con `MS TICKET-AUTH`:** Consumo de queries y mutaciones GraphQL federadas para cartelera, compras y autenticación.
* **Con `MS CINEMA-CORE`:** Consulta de salas y disponibilidad de butacas.
* **Con `MS MULTIMEDIA` y `MinIO S3`:** Descarga de portadas de películas y credenciales gráficas de tickets.
* **Con `MS IA-MCP`:** Canal conversacional del Chatbot deslizable (`/api/v1/chat`).
* **Con `IndexedDB` y `Service Workers`:** Persistencia offline garantizada de credenciales.

---

## 7. Contratos de Interconexión y Comunicación Inter-Servicios (`IC-CONTRACT-06`)

### `IC-06.1` (GraphQL Queries y Mutations hacia `MS TICKET-AUTH`)
- **Protocolo:** GraphQL sobre HTTP (Endpoint `http://localhost:8081/graphql`)
- **Mutación de Compra:** `initiatePurchase(input: { showtimeId, seatId, userId })`
- **Mutación de Confirmación:** `confirmPurchase(ticketId, stripePaymentIntentId)`
- **Query de Boletos:** `myTickets(userId: $userId)`

### `IC-06.2` (REST Consulta de Cartelera hacia `MS CINEMA-CORE`)
- **Protocolo:** REST sobre HTTP/1.1
- **Ruta:** `GET http://localhost:3000/api/v1/showtimes/billboard`
- **Response:** Listado de películas con salas, horarios y disponibilidad de butacas.

### `IC-06.3` (Descarga de Imágenes desde MinIO S3)
- **Protocolo:** HTTP GET
- **URLs:** `http://localhost:9000/cine-tickets/tickets/{ticketId}.jpg` y `http://localhost:9000/cine-posters/posters/{movieId}.jpg`

### `IC-06.4` (Chatbot Conversacional hacia `MS IA-MCP`)
- **Protocolo:** REST sobre HTTP/1.1
- **Ruta:** `POST http://localhost:8001/api/v1/chat`
- **Payload:** `{ userId, message }`

