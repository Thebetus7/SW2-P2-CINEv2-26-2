# 🎬 Ecosistema CINEv2

Plataforma integral y distribuida de microservicios para la gestión de salas, cartelera, venta de boletos con orquestación SAGA, validación de acceso criptográfico (HMAC-SHA256), analítica de afluencia asistida por visión artificial (TensorFlow) y auditoría comercial autónoma mediante el protocolo MCP (Model Context Protocol).

---

## 🏗️ 1. Arquitectura del Sistema

El proyecto sigue una **arquitectura políglota distribuida**. Todos los microservicios y canales residen dentro de la carpeta raíz unificada [`ms/`](ms/), organizados de forma autocontenida con sus respectivas capas `backend/` y `frontend/`:

```mermaid
flowchart TD
    Client["📱 Canal Cliente: MOVIL APP (React PWA + Capacitor)<br/>:5173"] -->|GraphQL| Auth["🔐 MS TICKET-AUTH (Spring Boot 3 + React)<br/>:8081 / :5174"]
    Admin["🖥️ Admin: FRONTWEB (Angular 17 + WebLLM)<br/>:4200"] -->|REST| Core["🏛️ MS CINEMA-CORE (NestJS 10 + TypeORM)<br/>:3000"]
    Boletero["🎟️ Control Acceso: BOLETEO-VALIDATOR (Laravel 11 + React)<br/>:8000 / :5177"] -->|REST (Validar Ticket)| Auth

    Auth -->|1. Bloqueo Temporal Butaca SAGA| Core
    Auth -->|2. Ensamble JPEG + QR HMAC-SHA256| Media["🎨 MS MULTIMEDIA (NestJS + TensorFlow COCO-SSD)<br/>:3001 / :5175"]
    Auth -->|3. Cobro Tarjeta de Prueba| Stripe[("💳 Stripe Sandbox")]

    Agent["🤖 MS IA-MCP: Servidor MCP + Agente GrokCloud<br/>:8001 / :5176"] -->|Leer Ocupación| Core
    Agent -->|Leer Conteo Personas en Fila| Media
    Agent -->|Disparar Alerta Contingencia| N8N["⚡ Automatizador n8n<br/>:5678"]

    Media --> Storage[("📦 MinIO S3 (:9000) & DynamoDB Local (:8002)")]
    Auth --> DB_Auth[("🗄️ PostgreSQL Auth (:5432)")]
    Core --> DB_Core[("🗄️ PostgreSQL Core (:5433)")]
```

---

## 🛠️ 2. Stack Tecnológico

| Módulo | Capa Backend | Capa Frontend | Persistencia / Storage | Puertos |
| :--- | :--- | :--- | :--- | :--- |
| **[`01-ms-ticket-auth`](ms/ms-ticket-auth)** | Java 21 + Spring Boot 3 + GraphQL | React 18 + Vite + Stripe Elements | PostgreSQL (`db_tickets_auth`) | API `:8081` / Web `:5174` / DB `:5432` |
| **[`02-ms-cinema-core`](ms/ms-cinema-core)** | Node.js 20 + NestJS 10 + TypeORM | Angular 17 Admin + WebLLM / Transformers.js | PostgreSQL (`db_cinema_core`) | API `:3000` / Web `:4200` / DB `:5433` |
| **[`03-ms-multimedia`](ms/ms-multimedia)** | Node.js 20 + NestJS 10 + TensorFlow.js | React 18 + Vite (Simulador de Filas) | MinIO S3 + DynamoDB Local | API `:3001` / Web `:5175` / S3 `:9000` / Dynamo `:8002` |
| **[`04-ms-ia-mcp`](ms/ms-ia-mcp)** | Python 3.11 + FastAPI + MCP JSON-RPC | React 18 + Vite (Consola Auditoría) | GrokCloud (xAI) + Webhooks n8n | API `:8001` / Web `:5176` / n8n `:5678` |
| **[`05-ms-boleteo-validator`](ms/ms-boleteo-validator)** | PHP 8.2 + Laravel 11 | React 18 + HTML5 QR / ZXing | SQLite / MySQL local (`access_scans`) | API `:8000` / Web `:5177` |
| **[`06-movil-client`](ms/movil-client)** | *(Consume MS Ticket & Core)* | React 18 PWA + Capacitor + Dexie.js | IndexedDB (Offline en Terminal) | PWA / Web `:5173` |

---

## 🚪 Punto de Entrada Principal del Sistema (`/login`)

> [!IMPORTANT]
> **URL PRINCIPAL DE INICIO:** 👉 [http://localhost:5174](http://localhost:5174)
>
> Toda la interacción con el ecosistema está centralizada en el **Portal Único de Autenticación** ([`ms/ms-ticket-auth/frontend`](ms/ms-ticket-auth/frontend) en el puerto `5174`). Desde allí no necesitas recordar los puertos de cada aplicación; el portal provee botones de **Acceso Demo 1-Click** que inician sesión y te redirigen automáticamente a la aplicación correspondiente según tu rol (`INV-BIZ-08`):
>
> * 👤 **`[Ingresar como Administrador]`** $\rightarrow$ Redirige a la **Consola FRONTWEB (Angular 17)** en [http://localhost:4200](http://localhost:4200) *(Diseñador matricial de salas, cartelera y WebLLM local)*.
> * 🍿 **`[Ingresar como Cliente]`** $\rightarrow$ Redirige al **Canal Cliente / MOVIL APP (React PWA)** en [http://localhost:5173](http://localhost:5173) *(Catálogo, selección interactiva de asientos, pago y boletos offline)*.
> * 🎟️ **`[Ingresar como Boletero]`** $\rightarrow$ Redirige al **Panel de Boleteo (Laravel 11 + React)** en [http://localhost:5177](http://localhost:5177) *(Lector de cámara continuo para validación criptográfica de códigos QR)*.

---

## 🚀 3. Instrucciones de Despliegue en Desarrollo

El ecosistema soporta **tres modalidades de ejecución**:

### 🌟 Opción A: Despliegue del Servidor en Docker (Recomendado para Evaluación)

Esta modalidad levanta de forma coordinada los **15 contenedores de backend, infraestructura y frontends administrativos** en una sola red Docker compartida (`cinev2-network`).

> [!NOTE]
> La aplicación móvil (`ms/movil-client`) **se excluye deliberadamente del servidor**, ya que es una aplicación del lado cliente (PWA) diseñada para ejecutarse en el dispositivo móvil del espectador.

```bash
# 1. Compilar y levantar los 15 contenedores del servidor en segundo plano
docker-compose up --build -d

# 2. Verificar que todos los servicios estén saludables (Up)
docker-compose ps

# 3. (Opcional) Ver los logs en tiempo real
docker-compose logs -f

# 4. Detener todos los contenedores del servidor
docker-compose down
```

---

### 📱 Opción B: Ejecución de la Aplicación Móvil (Cliente)

Para interactuar con la cartelera, selección interactiva de butacas y compras desde el navegador o smartphone:

```bash
cd ms/movil-client
npm install
npm run dev
```

* **Acceso Local:** Abre [`http://localhost:5173`](http://localhost:5173) en tu navegador.
* **Acceso desde Celular en la misma red Wi-Fi:** Abre en el navegador móvil `http://<IP-DE-TU-PC>:5173`.
* **Soporte Offline:** Una vez comprado un boleto, puedes desactivar el Wi-Fi/datos y el ticket seguirá visible en "Mis Boletos" gracias a Service Workers e IndexedDB (Dexie.js).

---

### 🌐 Opción C: Despliegue Modular Autónomo (AWS EC2 / VPS Dedicado)

Cada microservicio contiene su propio orquestador [`docker-compose.yml`](docker-compose.yml) autónomo. Si deseas alojar uno o varios microservicios en un servidor dedicado:

```bash
# Servidor dedicado a MS TICKET-AUTH
cd ms/ms-ticket-auth
docker compose up -d

# Servidor dedicado a MS CINEMA-CORE
cd ms/ms-cinema-core
docker compose up -d

# Servidor dedicado a MS MULTIMEDIA
cd ms/ms-multimedia
docker compose up -d

# Servidor dedicado a MS IA-MCP
cd ms/ms-ia-mcp
docker compose up -d

# Servidor dedicado a MS BOLETEO-VALIDATOR
cd ms/ms-boleteo-validator
docker compose up -d
```

---

### 💻 Opción D: Desarrollo Local Nativo (Sin Docker para Apps)

Si deseas programar con hot-reload nativo en tu máquina física:

1. **Levantar las Bases de Datos de Apoyo:**
   ```bash
   # PostgreSQL Auth (5432)
   docker run -d --name SW2-P2-CINEv2-postgres-auth -p 5432:5432 -e POSTGRES_DB=db_tickets_auth -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres postgres:15-alpine

   # PostgreSQL Core (5433)
   docker run -d --name SW2-P2-CINEv2-postgres-core -p 5433:5432 -e POSTGRES_DB=db_cinema_core -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres postgres:15-alpine

   # MinIO S3 (9000/9001)
   docker run -d --name SW2-P2-CINEv2-minio-s3 -p 9000:9000 -p 9001:9001 -e MINIO_ROOT_USER=minioadmin -e MINIO_ROOT_PASSWORD=minioadmin minio/minio server /data --console-address ":9001"

   # DynamoDB Local (8002)
   docker run -d --name SW2-P2-CINEv2-dynamodb-local -p 8002:8000 amazon/dynamodb-local -jar DynamoDBLocal.jar -sharedDb
   ```

2. **Comandos de Inicio por Microservicio:**
   * **`ms-ticket-auth`:**
     * Backend: `cd ms/ms-ticket-auth/backend && ./mvnw spring-boot:run` (`:8081`)
     * Frontend: `cd ms/ms-ticket-auth/frontend && npm run dev` (`:5174`)
   * **`ms-cinema-core`:**
     * Backend: `cd ms/ms-cinema-core/backend && npm run start:dev` (`:3000`)
     * Frontend: `cd ms/ms-cinema-core/frontend && npm start` (`:4200`)
   * **`ms-multimedia`:**
     * Backend: `cd ms/ms-multimedia/backend && npm run start:dev` (`:3001`)
     * Frontend: `cd ms/ms-multimedia/frontend && npm run dev` (`:5175`)
   * **`ms-ia-mcp`:**
     * Backend: `cd ms/ms-ia-mcp/backend && python main.py` (`:8001`)
     * Frontend: `cd ms/ms-ia-mcp/frontend && npm run dev` (`:5176`)
   * **`ms-boleteo-validator`:**
     * Backend: `cd ms/ms-boleteo-validator/backend && php artisan serve --port 8000` (`:8000`)
     * Frontend: `cd ms/ms-boleteo-validator/frontend && npm run dev -- --port 5177` (`:5177`)

---

## 🔑 4. Credenciales de Prueba y Sandbox

### 4.1 Cuentas Demo Preconfiguradas (BCrypt)

El sistema cuenta con un portal unificado en [`http://localhost:5174`](http://localhost:5174) con botones de **Acceso Demo 1-Click** y redirección automática por rol:

| Rol | Correo Electrónico | Contraseña | Redirección por Rol |
| :--- | :--- | :--- | :--- |
| **Administrador** | `admin@cine.local` | `Admin123!` | Consola Angular Admin (`:4200`) |
| **Cliente** | `cliente@cine.local` | `Cliente123!` | Canal Cliente PWA (`:5173`) |
| **Boletero** | `boletero@cine.local` | `Boletero123!` | Escáner Cámara Boletero (`:5177`) |

### 4.2 Tarjeta de Prueba Stripe (Simulación Sandbox)
* **Número de Tarjeta:** `4242 4242 4242 4242`
* **Expiración:** Cualquier fecha futura (ejemplo: `12/28`)
* **CVC:** `123`
* **Código Postal:** `00000`

---

## 🧪 5. Verificación y Testing Automatizado

Para certificar la salud de la arquitectura y la lógica de negocio en todos los servicios:

```bash
# Pruebas Automatizadas de Backend
cd ms/ms-ticket-auth/backend && ./mvnw test
cd ms/ms-cinema-core/backend && npm test
cd ms/ms-multimedia/backend && npm test
cd ms/ms-ia-mcp/backend && pytest
cd ms/ms-boleteo-validator/backend && php artisan test

# Pruebas Automatizadas de Frontend
cd ms/ms-ticket-auth/frontend && npm test
cd ms/ms-cinema-core/frontend && npm test
cd ms/ms-multimedia/frontend && npm test
cd ms/ms-ia-mcp/frontend && npm test
cd ms/ms-boleteo-validator/frontend && npm test
cd ms/movil-client && npm test
```

---

## 📚 6. Documentación Adicional

* **Constitución del Proyecto:** [`docs/constitution.md`](docs/constitution.md)
* **Contrato Operativo SDD:** [`AGENTS.md`](AGENTS.md)
* **Guía Detallada de Despliegue:** [`ms/DESPLIEGUE_DEV.md`](ms/DESPLIEGUE_DEV.md)

