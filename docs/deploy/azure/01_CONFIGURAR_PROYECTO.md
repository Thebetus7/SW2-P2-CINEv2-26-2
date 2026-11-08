# Despliegue en Microsoft Azure — 01. Configurar Proyecto (Nodo Ticket-Auth + IA-MCP)

Este documento detalla las variables de entorno necesarias en la máquina virtual de Microsoft Azure para `ms-ticket-auth` (Spring Boot Java 21) y `ms-ia-mcp` (FastAPI Python), configurando la conexión Cross-Cloud hacia GCP (Cinema-Core) y AWS (Multimedia).

---

## 1. Archivo `.env` Global de Azure (`/home/ubuntu/CINEv2/.env`)

Cree o edite el archivo `.env` en la raíz del proyecto dentro de la máquina de Azure:

```env
# ===================================================================
# CONFIGURACIÓN DEL NODO AZURE (TICKET-AUTH + IA-MCP)
# Frameworks: Spring Boot 3 (Java 21) + React + FastAPI (Python 3.11)
# ===================================================================

# Base de datos local PostgreSQL Auth (Puerto 5434)
DB_PASSWORD=postgres

# Conexiones Cross-Cloud hacia GCP y AWS
CORE_API_URL=http://<IP_PUBLICA_GCP>:3000
MULTIMEDIA_URL=http://<IP_PUBLICA_AWS>:3001

# Llave de IA GrokCloud / xAI
GROK_API_KEY=xai-mock-or-real-api-key

# Secretos Criptográficos
HMAC_SECRET_KEY=clave_secreta_para_firmar_boletos_qr_hmac_sha256_cinev2_universidad_2026
JWT_SECRET=supersecretjwtkeyforcinemav2production2026hexformat001122334455667788
```

---

## 2. Variables de Ticket-Auth Backend (`ms/ms-ticket-auth/backend/.env`)

```env
PORT=8081
SPRING_PROFILES_ACTIVE=prod

# Base de datos local
DB_HOST=postgres-auth
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=db_tickets_auth

# Integración Cross-Cloud
CINEMA_CORE_URL=http://<IP_PUBLICA_GCP>:3000
MULTIMEDIA_URL=http://<IP_PUBLICA_AWS>:3001

# Seguridad Criptográfica
HMAC_SECRET_KEY=clave_secreta_para_firmar_boletos_qr_hmac_sha256_cinev2_universidad_2026
JWT_SECRET=supersecretjwtkeyforcinemav2production2026hexformat001122334455667788
JWT_EXPIRATION_HOURS=24

# Opciones de JVM para Azure B1s
JAVA_OPTS=-Xms128m -Xmx384m -XX:+UseG1GC
```

---

## 3. Variables de IA-MCP Backend (`ms/ms-ia-mcp/backend/.env`)

```env
PORT=8001
ENVIRONMENT=production

# Conexiones Cross-Cloud
CORE_API_URL=http://<IP_PUBLICA_GCP>:3000
MULTIMEDIA_API_URL=http://<IP_PUBLICA_AWS>:3001

# Proveedor IA
GROK_API_KEY=xai-mock-or-real-api-key
GROK_MODEL=grok-beta
```
