# Despliegue en Microsoft Azure — 04. Desplegar y Verificar (Nodo Ticket-Auth + IA-MCP)

Este documento guía el levantamiento de los servicios del nodo Azure mediante `docker-compose.azure.yml` y la comprobación de firmas criptográficas HMAC.

---

## 1. Conexión y Clonación en Azure

```bash
# Conectarse a la máquina virtual
ssh -i ~/.ssh/id_rsa ubuntu@<IP_AZURE>

# Clonar el proyecto
cd /home/ubuntu
git clone https://github.com/<TU_USUARIO>/CINEv2.git
cd CINEv2

# Configurar variables con la IP de GCP y AWS
nano .env
```

O crear el `.env` directamente:
```bash
cat <<EOF > .env
CORE_API_URL=http://<IP_GCP>:3000
MULTIMEDIA_URL=http://<IP_AWS>:3001
GROK_API_KEY=xai-mock-or-real-api-key
DB_PASSWORD=postgres
EOF
```

---

## 2. Levantar el Nodo Azure con `docker-compose.azure.yml`

```bash
# Construir y levantar los 5 contenedores de Azure
docker compose -f docker-compose.azure.yml build --parallel
docker compose -f docker-compose.azure.yml up -d

# Comprobar estado de los servicios
docker compose -f docker-compose.azure.yml ps
```

Resultado observable esperado:
- `SW2-P2-CINEv2-postgres-auth` (Puerto 5434:5432) — Up
- `SW2-P2-CINEv2-ms-ticket-auth-backend` (Puerto 8081:8081) — Up
- `SW2-P2-CINEv2-ms-ticket-auth-frontend` (Puerto 5174:80) — Up
- `SW2-P2-CINEv2-ms-ia-mcp-backend` (Puerto 8001:8001) — Up
- `SW2-P2-CINEv2-ms-ia-mcp-frontend` (Puerto 5176:80) — Up

---

## 3. Verificar Siembra y Firmas HMAC de Spring Boot

```bash
docker logs SW2-P2-CINEv2-ms-ticket-auth-backend | grep "DatabaseSeeder"
```
Resultado: `[DatabaseSeeder] 15 Boletos maestros sincronizados con firmas HMAC.`

---

## 4. Pruebas Funcionales en el Navegador

Abra en su navegador:
1. `http://<IP_AZURE>:5174` — Verifique el Portal de Clientes y el catálogo interactivo de funciones sincronizadas desde GCP.
   - Login: `cliente@cine.local` / `Cliente123!`
2. `http://<IP_AZURE>:5176` — Verifique la Consola de Auditoría e IA con GrokCloud.
3. `http://<IP_AZURE>:8081/actuator/health` — JSON: `{"status":"UP"}`.
