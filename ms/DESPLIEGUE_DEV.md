# 🚀 Guía Maestra de Despliegue y Ejecución (DESPLIEGUE_DEV.md)

Este documento detalla las instrucciones operativas completas para desplegar y ejecutar el ecosistema **CINEv2**. El sistema soporta **4 modalidades operativas armónicas**, formalizadas bajo la regla constitucional `INV-ARCH-06` (Estrategia Tripartita de Contenerización):

* **Modalidad 1: Despliegue Total con Docker Compose Raíz** *(Evaluación y defensa local todo-en-uno)*.
* **Modalidad 2: Despliegue Modular Autónomo por Microservicio** *(Aislamiento en servidores dedicados / AWS EC2 / VPS)*.
* **Modalidad 3: Despliegue Contenerizado con Docker CLI** *(Imágenes individuales para Container Registries / Cloud Run / ECS)*.
* **Modalidad 4: Despliegue Local Nativo** *(Desarrollo en host con recarga en caliente)*.

---

## 1. MODALIDAD 1: Despliegue Total con Docker Compose Raíz (1 Solo Comando)

Esta modalidad levanta de forma coordinada el 100% de la arquitectura: los 6 backends, los 5 frontends web, la PWA móvil y los 5 servicios de persistencia y automatización (`INV-ARCH-06` e `INV-ARCH-07`).

### 1.1 Levantar Todo el Ecosistema

Desde la raíz del repositorio (`.`):

```bash
# Compilar todas las imágenes y levantar los 16 contenedores en segundo plano
docker-compose up --build -d
```

### 1.2 Verificar el Estado de los Contenedores

Todos los contenedores se etiquetan bajo la nomenclatura oficial `SW2-P2-CINEv2-*`:

```bash
docker-compose ps
```

Deberás ver los 16 contenedores en estado `Up`:
* `SW2-P2-CINEv2-postgres-auth` (Puerto 5432)
* `SW2-P2-CINEv2-postgres-core` (Puerto 5433)
* `SW2-P2-CINEv2-minio-s3` (Puertos 9000, 9001)
* `SW2-P2-CINEv2-dynamodb-local` (Puerto 8002)
* `SW2-P2-CINEv2-n8n` (Puerto 5678)
* `SW2-P2-CINEv2-ms-ticket-auth-backend` (Puerto 8081)
* `SW2-P2-CINEv2-ms-ticket-auth-frontend` (Puerto 5174)
* `SW2-P2-CINEv2-ms-cinema-core-backend` (Puerto 3000)
* `SW2-P2-CINEv2-ms-cinema-core-frontend` (Puerto 4200)
* `SW2-P2-CINEv2-ms-multimedia-backend` (Puerto 3001)
* `SW2-P2-CINEv2-ms-multimedia-frontend` (Puerto 5175)
* `SW2-P2-CINEv2-ms-ia-mcp-backend` (Puerto 8001)
* `SW2-P2-CINEv2-ms-ia-mcp-frontend` (Puerto 5176)
* `SW2-P2-CINEv2-ms-boleteo-validator-backend` (Puerto 8000)
* `SW2-P2-CINEv2-ms-boleteo-validator-frontend` (Puerto 5177)
* `SW2-P2-CINEv2-movil-client` (Puerto 5173)

### 1.3 Detener el Ecosistema

```bash
docker-compose down
```

---

## 2. MODALIDAD 2: Despliegue Modular Autónomo por Microservicio (AWS EC2 / VPS)

Cada carpeta en `ms/<microservicio>/` contiene su propio archivo **`docker-compose.yml` autónomo**. Todos los orquestadores modulares se enlazan automáticamente a la red compartida `cinev2-network`, lo que permite:
1. Alojar un microservicio en un servidor AWS EC2 independiente.
2. Alojar dos o más microservicios en un mismo servidor EC2 sin colisiones de puertos ni aislamiento de comunicación.
3. Actualizar o reiniciar un microservicio sin afectar el ciclo de vida de los demás.

### 2.1 Levantar Microservicios de Forma Independiente

```bash
# 01-ms-ticket-auth (Backend Spring Boot + Frontend React + PostgreSQL Auth)
cd ms/ms-ticket-auth
docker compose up -d

# 02-ms-cinema-core (Backend NestJS + Frontend Angular Admin + PostgreSQL Core)
cd ms/ms-cinema-core
docker compose up -d

# 03-ms-multimedia (Backend NestJS + Frontend Simulador + MinIO S3 + DynamoDB Local)
cd ms/ms-multimedia
docker compose up -d

# 04-ms-ia-mcp (Backend FastAPI + Frontend Consola)
cd ms/ms-ia-mcp
docker compose up -d

# 05-ms-boleteo-validator (Backend Laravel + Frontend Escáner)
cd ms/ms-boleteo-validator
docker compose up -d

# 06-movil-client (PWA React + Capacitor en Nginx)
cd ms/movil-client
docker compose up -d
```

### 2.2 Despliegue Conjunto de 2 Microservicios en un Mismo Servidor EC2
Si decides alojar, por ejemplo, `ms-ticket-auth` y `ms-cinema-core` en la misma máquina EC2:
```bash
# En la máquina EC2:
cd ms/ms-ticket-auth && docker compose up -d
cd ../ms-cinema-core && docker compose up -d
```
Ambos microservicios se conectan a la red `cinev2-network`. `ms-ticket-auth` puede consumir directamente `http://SW2-P2-CINEv2-ms-cinema-core-backend:3000` con resolución DNS interna de Docker y sin costos de transferencia por red pública.

---

## 3. MODALIDAD 3: Despliegue Contenerizado con Docker CLI

Para pipelines CI/CD o despliegues directos a Container Registries:

```bash
# Crear red común
docker network create cinev2-network || true

# Compilar y correr contenedores individuales
docker build -t ms-ticket-auth-backend ms/ms-ticket-auth/backend
docker run -d --name SW2-P2-CINEv2-ms-ticket-auth-backend --network cinev2-network -p 8081:8081 ms-ticket-auth-backend

docker build -t ms-cinema-core-backend ms/ms-cinema-core/backend
docker run -d --name SW2-P2-CINEv2-ms-cinema-core-backend --network cinev2-network -p 3000:3000 ms-cinema-core-backend
```

---

## 4. MODALIDAD 4: Despliegue Local Nativo (Desarrollo en Host)

Para desarrollo activo y depuración con hot-reload en la máquina física:

### 4.1 Comandos de Ejecución Local Nativa

| Microservicio / App | Capa | Comando de Inicio | URL de Acceso |
| :--- | :--- | :--- | :--- |
| **01-ms-ticket-auth** | Backend | `cd ms/ms-ticket-auth/backend && ./mvnw spring-boot:run` | `http://localhost:8081` |
| | Frontend | `cd ms/ms-ticket-auth/frontend && npm run dev` | `http://localhost:5174` |
| **02-ms-cinema-core** | Backend | `cd ms/ms-cinema-core/backend && npm run start:dev` | `http://localhost:3000` |
| | Frontend | `cd ms/ms-cinema-core/frontend && npm start` | `http://localhost:4200` |
| **03-ms-multimedia** | Backend | `cd ms/ms-multimedia/backend && npm run start:dev` | `http://localhost:3001` |
| | Frontend | `cd ms/ms-multimedia/frontend && npm run dev` | `http://localhost:5175` |
| **04-ms-ia-mcp** | Backend | `cd ms/ms-ia-mcp/backend && python main.py` | `http://localhost:8001` |
| | Frontend | `cd ms/ms-ia-mcp/frontend && npm run dev` | `http://localhost:5176` |
| **05-ms-boleteo-validator** | Backend | `cd ms/ms-boleteo-validator/backend && php artisan serve --port 8000` | `http://localhost:8000` |
| | Frontend | `cd ms/ms-boleteo-validator/frontend && npm run dev -- --port 5177` | `http://localhost:5177` |
| **06-movil-client** | PWA Móvil | `cd ms/movil-client && npm run dev` | `http://localhost:5173` |

---

## 5. Matriz Rápida de URLs y Credenciales Demo

### 5.1 Credenciales Preconfiguradas (BCrypt)

| Rol | Correo de Acceso | Contraseña | Redirección Automática |
| :--- | :--- | :--- | :--- |
| **Administrador** | `admin@cine.local` | `Admin123!` | Redirige al panel Angular (`:4200`) |
| **Cliente** | `cliente@cine.local` | `Cliente123!` | Redirige a la PWA Móvil (`:5173`) |
| **Boletero** | `boletero@cine.local` | `Boletero123!` | Redirige al Escáner de Cámara (`:5177`) |

### 5.2 Tarjeta de Prueba Stripe (Modo Sandbox)
* **Número de Tarjeta:** `4242 4242 4242 4242`
* **Vencimiento:** Cualquier fecha futura (ej. `12/28`)
* **CVC:** `123` | **Código Postal:** `00000`

---

## 6. Comandos de Verificación y Testing Automatizado

```bash
# Suites de Backend
cd ms/ms-ticket-auth/backend && ./mvnw test
cd ms/ms-cinema-core/backend && npm test
cd ms/ms-multimedia/backend && npm test
cd ms/ms-ia-mcp/backend && pytest
cd ms/ms-boleteo-validator/backend && php artisan test

# Suites de Frontend
cd ms/ms-ticket-auth/frontend && npm test
cd ms/ms-cinema-core/frontend && npm test
cd ms/ms-multimedia/frontend && npm test
cd ms/ms-ia-mcp/frontend && npm test
cd ms/ms-boleteo-validator/frontend && npm test
cd ms/movil-client && npm test
```
