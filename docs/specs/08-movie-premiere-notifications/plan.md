# Plan: Módulo de Evolución y Actualizaciones — CRUD Asistido por Deep Learning, Notificaciones Push y Caché de Chat IA
Status: APPROVED
Version: 1
Spec-SHA256: c9917f757fbe9ede1dc485f2006f33ca2a3132cfed166fcf8ee281334f152595
Constitution-SHA256: bf9282dc4cc5ac79d835e768865b29b9544a02c8cd2af2489d72cfc304cb8e84

---

## 1. Arquitectura y Decisiones Técnicas

### Decisiones de Arquitectura (`PLAN-XX`)

* **PLAN-01 (Inferencia de Póster en MS MULTIMEDIA):**
  - **Decisión:** El procesamiento de imágenes de pósteres se delega a `MS MULTIMEDIA` (NestJS `:3001`), exponiendo `POST /api/v1/multimedia/movies/analyze-poster`.
  - **Razón:** Reutiliza la infraestructura existente con `@tensorflow/tfjs` y `@aws-sdk/client-s3` (MinIO S3), evitando cargar dependencias pesadas de Machine Learning en `MS CINEMA-CORE`.
  - **Gestión de Memoria:** Destrucción forzosa e inmediata del tensor mediante `imageTensor.dispose()` en el bloque `finally` para evitar fugas en el heap de V8.

* **PLAN-02 (CRUD Administrativo Asistido en Angular):**
  - **Decisión:** En `MS CINEMA-CORE` (`ms/ms-cinema-core/frontend` `:4200`), se crea el módulo feature `movies` con arquitectura modular Lazy Loading (`movies.routes.ts`), integrando una cuadrícula de catálogo (`movie-catalog.component.ts`) y un modal asistente (`movie-creator-modal.component.ts`).
  - **Razón:** Satisface la regla constitucional `RB-MOVIE-02` (prellenado asistido con control humano antes de guardar) y garantiza la paridad funcional del FrontWeb Admin.

* **PLAN-03 (Servicio Web Push VAPID Desacoplado):**
  - **Decisión:** `MS CINEMA-CORE` (`backend`) adopta la librería estándar `web-push` en Node.js, persistiendo suscripciones en una nueva entidad TypeORM `PushSubscription` y publicando las claves VAPID (`VAPID_PUBLIC_KEY` y `VAPID_PRIVATE_KEY`).
  - **Razón:** Permite que cualquier dispositivo móvil o navegador reciba notificaciones nativas en segundo plano sin dependencias de servicios en la nube de pago (Google Firebase Cloud Messaging / Apple Developer Account).

* **PLAN-04 (Service Worker PWA con Deep Linking y Rich Push):**
  - **Decisión:** En `ms/movil-client` (`:5173`), se configura `vite-plugin-pwa` con inyección de lógica en `sw.js` para escuchar el evento `push`, invocar `self.registration.showNotification(title, { image: posterUrl, ... })` y controlar el evento `notificationclick` mediante `clients.openWindow(...)`.
  - **Razón:** Garantiza que la notificación con la imagen del póster despierte el sistema del teléfono aun con la aplicación cerrada (`RB-NOTIF-01`).

* **PLAN-05 (Caché Híbrida y Memoria Multi-Turno del Chatbot):**
  - **Decisión:** En el frontend (`ms-ticket-auth/frontend` y `movil-client`), los mensajes se sincronizan con `localStorage` e `IndexedDB` bajo la clave `cinema_client_chat_history_v1`. Al enviar una petición a `MS IA-MCP` (`:8001`), se envía el arreglo `history: [{ role, content }]` (máximo 6 turnos recientes).
  - **Razón:** Resuelve la pérdida del historial al cerrar el widget o recargar (<kbd>F5</kbd>) y dota al LLM (GrokCloud) de coherencia contextual multi-turno.

---

## 2. Alcance Físico de Cambios

### Archivos por Crear (`CREATE`)
- `ms/ms-multimedia/backend/src/modules/tickets-media/presentation/movie-poster.controller.ts`
- `ms/ms-multimedia/backend/src/modules/tickets-media/application/analyze-poster.service.ts`
- `ms/ms-cinema-core/backend/src/modules/push/push.module.ts`
- `ms/ms-cinema-core/backend/src/modules/push/domain/push-subscription.entity.ts`
- `ms/ms-cinema-core/backend/src/modules/push/application/push-notification.service.ts`
- `ms/ms-cinema-core/backend/src/modules/push/presentation/push.controller.ts`
- `ms/ms-cinema-core/frontend/src/app/features/movies/movies.routes.ts`
- `ms/ms-cinema-core/frontend/src/app/features/movies/components/movie-catalog.component.ts`
- `ms/ms-cinema-core/frontend/src/app/features/movies/components/movie-creator-modal.component.ts`
- `ms/ms-cinema-core/frontend/src/app/features/movies/services/movie-admin.service.ts`
- `ms/movil-client/src/components/Notifications/NotificationPermissionBanner.tsx`
- `ms/movil-client/src/services/push-subscription.service.ts`

### Archivos por Modificar (`MODIFY`)
- `ms/ms-multimedia/backend/src/modules/tickets-media/tickets-media.module.ts`
- `ms/ms-cinema-core/backend/src/app.module.ts`
- `ms/ms-cinema-core/backend/src/modules/movies/application/create-movie.use-case.ts`
- `ms/ms-cinema-core/frontend/src/app/app.routes.ts`
- `ms/ms-ticket-auth/frontend/src/components/ClientChat/ClientChatWindow.tsx`
- `ms/ms-ticket-auth/frontend/src/services/client-chat.service.ts`
- `ms/movil-client/src/components/Chatbot/ChatDrawer.tsx`
- `ms/movil-client/src/App.tsx`
- `ms/ms-ia-mcp/backend/app/presentation/client_chat_routes.py`
- `ms/ms-ia-mcp/backend/app/agent/client_chat_agent.py`

---

## 3. Persistencia e Integraciones

### 3.1 Esquema Relacional de Suscripciones Push (`push_subscriptions` en `db_cinema_core`)
```sql
CREATE TABLE IF NOT EXISTS push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NULL,
    endpoint TEXT NOT NULL UNIQUE,
    p256dh_key TEXT NOT NULL,
    auth_secret TEXT NOT NULL,
    device_info VARCHAR(255) NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_delivered_at TIMESTAMP WITH TIME ZONE NULL
);
CREATE INDEX IF NOT EXISTS idx_push_endpoint ON push_subscriptions(endpoint);
```

### 3.2 Almacenamiento en MinIO S3 (`cinev2-media`)
- **Bucket:** `cinev2-media`
- **Carpeta:** `posters/`
- **Estructura de clave:** `posters/${uuidv4()}-${cleanFilename}.jpg`
- **Headers:** `Content-Type: image/jpeg`, `Cache-Control: max-age=31536000`

### 3.3 Esquema de Caché en Cliente (`localStorage` / `IndexedDB`)
- **Clave:** `cinema_client_chat_history_v1`
- **Estructura JSON:**
  - `sessionId`: string (UUID generado)
  - `updatedAt`: timestamp ISO
  - `messages`: Array de hasta 30 objetos `ClientChatMessage`

---

## 4. Contratos Frontend / Backend

### 4.1 Análisis de Póster con Deep Learning
- **Método / Ruta:** `POST http://localhost:3001/api/v1/multimedia/movies/analyze-poster`
- **Entrada:** `multipart/form-data` con campo `poster` (Buffer binario JPEG/PNG).
- **Salida Exitosa (`HTTP 200 OK`):**
  ```json
  {
    "posterUrl": "http://localhost:9000/cinev2-media/posters/uuid-dune2.jpg",
    "suggestedGenre": "Ciencia Ficción / Aventura",
    "suggestedRating": "PG-13",
    "detectedTitle": "Dune: Parte Dos",
    "inferenceTimeMs": 145
  }
  ```
- **Error Observable (`HTTP 400 / 503`):** `{ "statusCode": 400, "message": "Formato de imagen inválido." }`

### 4.2 Registro de Suscripción Push
- **Método / Ruta:** `POST http://localhost:3000/api/v1/push/subscribe`
- **Entrada (`JSON`):**
  ```json
  {
    "endpoint": "https://fcm.googleapis.com/fpm/send/...",
    "keys": {
      "p256dh": "BNcR...",
      "auth": "tBH8..."
    },
    "userId": "uuid-opcional",
    "deviceInfo": "Chrome Mobile 124"
  }
  ```
- **Salida Exitosa (`HTTP 201 Created`):** `{ "status": "subscribed", "subscriptionId": "uuid" }`

### 4.3 Obtención de Clave Pública VAPID
- **Método / Ruta:** `GET http://localhost:3000/api/v1/push/vapid-public-key`
- **Salida Exitosa (`HTTP 200 OK`):** `{ "publicKey": "BEl62iUYgUivxIkv69yViEuiBIa..." }`

### 4.4 Chat con Memoria Multi-Turno
- **Método / Ruta:** `POST http://localhost:8001/api/v1/client-chat/message`
- **Entrada (`JSON`):**
  ```json
  {
    "message": "¿A qué hora es la siguiente función?",
    "history": [
      { "role": "user", "content": "Hola, me interesa ver Dune 2" },
      { "role": "assistant", "content": "Dune 2 está disponible en Sala IMAX a las 18:00 y 21:00." }
    ],
    "sessionId": "session-uuid"
  }
  ```

---

## 5. Flujos y Estados de Interacción

### 5.1 Flujo de Registro de Película Asistido por Deep Learning
1. El Administrador navega a `/movies` en Angular y pulsa `[+ Nueva Película]`.
2. Se abre el modal con área de carga. El Administrador arrastra el archivo de imagen.
3. El frontend muestra un spinner: `"Procesando imagen con Deep Learning en MS MULTIMEDIA..."`.
4. El backend responde con los metadatos y la URL de MinIO.
5. El formulario se auto-completa con el Título, Género y Rating sugerido.
6. El Administrador revisa, ingresa la duración (ej. 166 min) y sinopsis, y selecciona estado `EN_CARTELERA`.
7. Pulsa `[Guardar y Publicar Estreno]`.
8. `MS CINEMA-CORE` guarda la película e inicia el broadcast Web Push asíncrono.
9. En los dispositivos móviles suscritos con la PWA cerrada, el sistema operativo despierta y despliega la notificación con el póster expandido.

### 5.2 Flujo de Caché y Persistencia del Chat
1. El usuario interactúa con el chat; cada turno se persiste en `localStorage` / `IndexedDB`.
2. Si el usuario recarga la página (<kbd>F5</kbd>) o cierra y reabre la burbuja, el hook `useChatCache` detecta el almacenamiento existente y lo hidrata de inmediato.
3. Si el usuario desea iniciar una nueva consulta, pulsa el ícono de basurero / `"Nueva Conversación"` en el header; se purga la clave `cinema_client_chat_history_v1` y vuelve al estado inicial.

---

## 6. Diseño Visual e Interacción

### 6.1 Catálogo y Modal Asistido en Angular (`:4200`)
- **Paleta y Tokens:** Fondo `bg-slate-950`, tarjetas `bg-slate-900 border-slate-800`, acentos en gradiente rosa/violeta `from-rose-600 to-indigo-600`.
- **Área de Drag & Drop:** Borde discontinuo `border-2 border-dashed border-slate-700 hover:border-rose-500`, con ícono de imagen y feedback de carga con barra de progreso pulsante.
- **Badges de Inferencia IA:** Pastilla identificativa `"Autocompletado con TensorFlow COCO-SSD"` para transparentar al administrador que los campos fueron sugeridos por IA.

### 6.2 Notificación Nativa Móvil (*Rich Push*)
- **Layout del Sistema Operativo:** Título en negrita, ícono del cine a 192px, cuerpo con género y clasificación, e imagen del póster expandida a ancho completo (BigPictureStyle en Android / Rich Notification en iOS).

---

## 7. Vertical Slices de Implementación

* **Slice 1 (Visión Artificial & MinIO):** Endpoint `analyze-poster` en `MS MULTIMEDIA` con TensorFlow, carga a MinIO y respuesta JSON de atributos.
* **Slice 2 (CRUD en FrontWeb Angular):** Componentes `MovieCatalogComponent` y `MovieCreatorModalComponent` consumiendo `analyze-poster` y la API de películas de `MS CINEMA-CORE`.
* **Slice 3 (Infraestructura Web Push VAPID):** Módulo `PushModule` en `MS CINEMA-CORE`, entidad `PushSubscription`, endpoints VAPID y servicio de broadcast.
* **Slice 4 (Recepción Móvil en PWA Cerrada):** Integración del Service Worker en `ms/movil-client`, banner de suscripción `NotificationPermissionBanner` y manejo del evento `push` con imagen.
* **Slice 5 (Persistencia en Caché del Chatbot):** Servicio de almacenamiento local en `ms-ticket-auth/frontend` y `movil-client` con soporte multi-turno en `ms-ia-mcp/backend`.

---

## 8. Verificación y Pruebas

```bash
# Verificación de compilación en microservicios afectados
cd ms/ms-multimedia/backend && npm test
cd ms/ms-cinema-core/backend && npm test
cd ms/ms-cinema-core/frontend && npm test
cd ms/movil-client && npm test
cd ms/ms-ia-mcp/backend && pytest
```

---

## 9. Trazabilidad y Riesgos

- **Matriz de Trazabilidad:**
  - `RF-08.1`, `RF-08.2` $\rightarrow$ `PLAN-01`, `PLAN-02` (Slice 1 y 2).
  - `RF-08.3` $\rightarrow$ `PLAN-02` (Slice 2).
  - `RF-08.4`, `RF-08.5`, `RF-08.8` $\rightarrow$ `PLAN-03` (Slice 3).
  - `RF-08.6`, `RF-08.7` $\rightarrow$ `PLAN-04` (Slice 4).
  - `RF-08.9` .. `RF-08.12` $\rightarrow$ `PLAN-05` (Slice 5).
- **Riesgo Mitigado:** Expiración de subscripciones push resuelta mediante purga automática en códigos HTTP 410/404 sin bloquear el broadcast.