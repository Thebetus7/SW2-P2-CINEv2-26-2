# Despliegue en Microsoft Azure — 04. Desplegar y Verificar (Nodo Ticket-Auth + IA-MCP)

Este documento guía el levantamiento de los servicios del nodo **Azure** mediante `docker-compose.azure.yml` y la comprobación de firmas criptográficas HMAC y login de usuarios.

---

## 1. Conexión y Clonación del Proyecto en Azure

Conéctese a su máquina virtual:

```bash
ssh ubuntu@<TU_IP_PUBLICA_AZURE>
```

> [!NOTE]
> **¿Por qué se clona todo el repositorio?**
> En un monorepositorio con despliegue distribuido multi-cloud, se clona la raíz en cada servidor (`/home/ubuntu/CINEv2`). El manifiesto específico `docker-compose.azure.yml` **solo compila y levanta los contenedores asignados a Azure**, ignorando por completo el resto de carpetas.

Clone el proyecto y navegue a la raíz:

```bash
cd /home/ubuntu
git clone https://github.com/Thebetus7/SW2-P2-CINEv2-26-2.git CINEv2
cd CINEv2
```

---

## 2. Configurar el Archivo `.env` Raíz

Cree el archivo `.env` en la raíz del repositorio:

```bash
cat << 'EOF' > .env
# ===================================================================
# CONFIGURACIÓN DEL NODO AZURE (TICKET-AUTH + IA-MCP)
# ===================================================================
DB_PASSWORD=postgres
CORE_API_URL=http://<IP_PUBLICA_GCP>:3000
MULTIMEDIA_URL=http://<IP_PUBLICA_AWS>:3001
GROK_API_KEY=[api key]
GROK_MODEL=qwen/qwen3.8-27b
GROK_BASE_URL=https://api.groq.com/openai/v1
JWT_SECRET=supersecretjwtkeyforcinemav2production2026hexformat001122334455667788
HMAC_SECRET_KEY=clave_secreta_para_firmar_boletos_qr_hmac_sha256_cinev2_universidad_2026
EOF
```

*(Si aún no tiene las IPs de GCP o AWS, puede dejarlas temporalmente como `http://localhost:3000` y `http://localhost:3001`; el sistema funcionará y levantará sin fallar gracias al circuit breaker y fallbacks).*

---

## 3. Levantar el Nodo Azure con `docker-compose.azure.yml`

Ejecute el build y levantamiento de los 5 contenedores:

```bash
# 1. Construir imágenes Docker
docker compose -f docker-compose.azure.yml build

# 2. Levantar los servicios en segundo plano
docker compose -f docker-compose.azure.yml up -d

# 3. Comprobar que los 5 contenedores están en estado "Up"
docker compose -f docker-compose.azure.yml ps
```

Resultado observable esperado en `docker compose ps`:
- `SW2-P2-CINEv2-postgres-auth` (0.0.0.0:5434->5432/tcp) — Up
- `SW2-P2-CINEv2-ms-ticket-auth-backend` (0.0.0.0:8081->8081/tcp) — Up
- `SW2-P2-CINEv2-ms-ticket-auth-frontend` (0.0.0.0:5174->80/tcp) — Up
- `SW2-P2-CINEv2-ms-ia-mcp-backend` (0.0.0.0:8001->8001/tcp) — Up
- `SW2-P2-CINEv2-ms-ia-mcp-frontend` (0.0.0.0:5176->80/tcp) — Up

---

## 4. Verificar Inicialización y Firmas HMAC de Spring Boot

Revise los logs del seeder automático en Spring Boot:

```bash
docker logs SW2-P2-CINEv2-ms-ticket-auth-backend | grep "DatabaseSeeder"
```

Resultado observable esperado:
```text
[DatabaseSeeder] Usuario maestro creado: admin@cine.local con rol ADMIN
[DatabaseSeeder] Usuario maestro creado: cliente@cine.local con rol CLIENTE
[DatabaseSeeder] Usuario maestro creado: boletero@cine.local con rol BOLETERO
[DatabaseSeeder] 15 Boletos maestros sincronizados con firmas HMAC.
```

---

## 5. Pruebas Funcionales desde el Navegador

Abra las siguientes URLs en el navegador de su computadora reemplazando `<IP_AZURE>` por la IP pública de su máquina (`20.102.51.189`):

### A. Portal de Clientes y Compra de Boletos (Puerto 5174)
- **URL:** `http://<IP_AZURE>:5174`
- **Credenciales Maestras:**
  - **Cliente:** `cliente@cine.local` / `cliente123`
  - **Administrador:** `admin@cine.local` / `admin123`
  - **Boletero:** `boletero@cine.local` / `boletero123`
- **Verificación:** Ingrese como cliente, explore el selector de películas y asientos interactivo, y visualice el boleto con código QR firmado digitalmente con HMAC-SHA256.

### B. Consola de Auditoría e Inteligencia Artificial GrokCloud (Puerto 5176)
- **URL:** `http://<IP_AZURE>:5176`
- **Verificación:** Haga clic en el botón `[Ejecutar Auditoría MCP Ahora]` para verificar la conexión en tiempo real con GrokCloud / xAI y el streaming de logs de eventos.

### C. Healthcheck de Backend Spring Boot (Puerto 8081)
- **URL:** `http://<IP_AZURE>:8081/actuator/health`
- **Respuesta esperada:** `{"status":"UP"}`

### D. Healthcheck de Backend FastAPI IA-MCP (Puerto 8001)
- **URL:** `http://<IP_AZURE>:8001/health`
- **Respuesta esperada:** `{"status":"healthy","service":"ms-ia-mcp"}`
