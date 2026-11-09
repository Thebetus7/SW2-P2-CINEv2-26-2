# Despliegue en Microsoft Azure — 01. Configurar Proyecto (Nodo Ticket-Auth + IA-MCP)

Este documento detalla la configuración de variables de entorno para el nodo de **Microsoft Azure**, encargado de ejecutar `ms-ticket-auth` (Spring Boot Java 21 + React 18) y `ms-ia-mcp` (FastAPI Python 3.11 + React 18), enlazando la comunicación Cross-Cloud con GCP (Cinema-Core) y AWS (Multimedia).

---

> [!IMPORTANT]
> **UN SOLO ARCHIVO `.env` EN LA RAÍZ:**
> No es necesario crear archivos `.env` dentro de las subcarpetas de los microservicios. Docker Compose (`docker-compose.azure.yml`) lee automáticamente el archivo `.env` ubicado en la raíz del repositorio (`/home/ubuntu/CINEv2/.env`) e inyecta todas las variables a los contenedores correspondientes.

---

## 1. Crear el Archivo `.env` en la Raíz del Repositorio

Una vez clonado el repositorio en el servidor de Azure (`/home/ubuntu/CINEv2`), ejecute:

```bash
cd /home/ubuntu/CINEv2
nano .env
```

Pegue el siguiente bloque de configuración:

```env
# ===================================================================
# CONFIGURACIÓN DEL NODO AZURE (TICKET-AUTH + IA-MCP)
# Archivo: /home/ubuntu/CINEv2/.env
# ===================================================================

# 1. Base de Datos PostgreSQL Auth (Local en Azure - Puerto 5434)
DB_PASSWORD=postgres

# 2. Conexiones Cross-Cloud hacia otros servidores
# Reemplace con la IP pública de su VM en GCP (donde corre Cinema-Core en :3000)
CORE_API_URL=http://<IP_PUBLICA_GCP>:3000

# Reemplace con la IP pública de su VM en AWS (donde corre Multimedia en :3001)
MULTIMEDIA_URL=http://<IP_PUBLICA_AWS>:3001

# 3. Proveedor de Inteligencia Artificial (GrokCloud / xAI)
GROK_API_KEY=[api key]
GROK_MODEL=qwen/qwen3.8-27b
GROK_BASE_URL=https://api.groq.com/openai/v1

# 4. Secretos Criptográficos (Seguridad y Tokens JWT)
JWT_SECRET=supersecretjwtkeyforcinemav2production2026hexformat001122334455667788
HMAC_SECRET_KEY=clave_secreta_para_firmar_boletos_qr_hmac_sha256_cinev2_universidad_2026
```

Guarde el archivo con `Ctrl + O`, presione `Enter` y salga con `Ctrl + X`.

---

## 2. Explicación de las Variables Inyectadas por Docker Compose

Docker Compose toma este único `.env` y lo distribuye a los contenedores según su función:

| Variable | Contenedor Destino | Propósito |
| :--- | :--- | :--- |
| `DB_PASSWORD` | `postgres-auth`, `ms-ticket-auth-backend` | Clave de acceso a la base de datos de usuarios y tickets. |
| `CORE_API_URL` | `ms-ticket-auth-backend`, `ms-ia-mcp-backend` | URL del backend central en GCP (películas, salas, funciones). |
| `MULTIMEDIA_URL` | `ms-ticket-auth-backend`, `ms-ia-mcp-backend` | URL del servicio en AWS (detección de aforo y banners). |
| `GROK_API_KEY` | `ms-ia-mcp-backend` | API Key para consultas de IA y chatbot de recomendaciones. |
| `GROK_MODEL` | `ms-ia-mcp-backend` | Modelo LLM configurado (Qwen / Grok / Llama). |
| `JWT_SECRET` | `ms-ticket-auth-backend` | Clave de firma para los tokens de sesión de usuarios y roles. |
| `HMAC_SECRET_KEY` | `ms-ticket-auth-backend` | Clave de firmado criptográfico de los códigos QR de los boletos. |

---

## 3. ¿Por qué no se necesitan `.env` en subcarpetas?

El orquestador `docker-compose.azure.yml` mapea explícitamente estas variables hacia los contenedores:
- En `ms-ticket-auth-backend`: `CINEMA_CORE_URL: ${CORE_API_URL}`, `MULTIMEDIA_URL: ${MULTIMEDIA_URL}`, `JWT_SECRET: ${JWT_SECRET}`.
- En `ms-ia-mcp-backend`: `CORE_API_URL: ${CORE_API_URL}`, `GROQ_API_KEY: ${GROK_API_KEY}`, `GROK_MODEL: ${GROK_MODEL}`.
- En los frontends (`ms-ticket-auth-frontend` y `ms-ia-mcp-frontend`): detectan automáticamente la IP del navegador (`window.location.hostname`), por lo que no requieren ninguna variable en tiempo de build o ejecución.

Con esto completado, continúe con [02_CREAR_INFRAESTRUCTURA.md](file:///docs/deploy/azure/02_CREAR_INFRAESTRUCTURA.md) y [03_PREPARAR_SERVIDOR.md](file:///docs/deploy/azure/03_PREPARAR_SERVIDOR.md).
