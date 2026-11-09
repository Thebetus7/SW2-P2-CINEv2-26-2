# Despliegue en Google Cloud Platform (GCP) — 04. Desplegar y Verificar (Nodo Cinema-Core + Boleteo)

Este documento guía el levantamiento de los servicios del nodo **GCP** mediante `docker-compose.gcp.yml` y la comprobación del panel administrativo y el lector de boletos por cámara.

---

## 1. Conexión y Clonación del Proyecto en GCP

Dentro de la terminal SSH en Google Cloud Compute Engine:

```bash
cd /home/ubuntu
git clone https://github.com/Thebetus7/SW2-P2-CINEv2-26-2.git CINEv2
cd CINEv2
```

> [!NOTE]
> Al igual que en Azure, se clona la raíz del proyecto. El manifiesto `docker-compose.gcp.yml` solo compila y levanta los 5 contenedores de GCP, dejando intacto el resto.

---

## 2. Configurar la Conexión con Azure y AWS (Archivo `.env`)

Cree el archivo `.env` en la raíz del repositorio:

```bash
cat << 'EOF' > .env
# ===================================================================
# CONFIGURACIÓN DEL NODO GCP (CINEMA-CORE + BOLETEO)
# ===================================================================
DB_PASSWORD=postgres
AUTH_API_URL=http://<IP_PUBLICA_AZURE>:8081
AWS_S3_BUCKET=cinev2-media-bucket-prod
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=mock_key
AWS_SECRET_ACCESS_KEY=mock_secret
HMAC_SECRET_KEY=clave_secreta_para_firmar_boletos_qr_hmac_sha256_cinev2_universidad_2026
JWT_SECRET=supersecretjwtkeyforcinemav2production2026hexformat001122334455667788
EOF
```

Reemplace `<IP_PUBLICA_AZURE>` por la IP de su máquina en Azure (ej. `20.102.51.189`).

---

## 3. Levantar los Servicios de GCP con Docker Compose

```bash
# 1. Construir las imágenes Docker
docker compose -f docker-compose.gcp.yml build

# 2. Levantar los 5 contenedores en segundo plano
docker compose -f docker-compose.gcp.yml up -d

# 3. Comprobar que los servicios estén activos
docker compose -f docker-compose.gcp.yml ps
```

Resultado esperado en `docker compose ps`:
- `SW2-P2-CINEv2-postgres-core` (0.0.0.0:5433->5432/tcp) — Up
- `SW2-P2-CINEv2-ms-cinema-core-backend` (0.0.0.0:3000->3000/tcp) — Up
- `SW2-P2-CINEv2-ms-cinema-core-frontend` (0.0.0.0:4200->80/tcp) — Up
- `SW2-P2-CINEv2-ms-boleteo-validator-backend` (0.0.0.0:8000->8000/tcp) — Up
- `SW2-P2-CINEv2-ms-boleteo-validator-frontend` (0.0.0.0:5177->80/tcp) — Up

---

## 4. Sembrar Salas, Películas y Funciones (Seeders)

```bash
docker exec -it SW2-P2-CINEv2-ms-cinema-core-backend npm run seed:core
```

Resultado observable: Salas, butacas y películas maestras sembradas en PostgreSQL Core.

---

## 5. Pruebas Funcionales en el Navegador y Habilitar Cámara (:5177)

Abra en su navegador reemplazando `<IP_GCP>` por la IP pública de su instancia de Google Cloud:

### A. Panel Administrador de Cine en Angular (Puerto 4200)
- **URL:** `http://<IP_GCP>:4200`
- **Credenciales Maestras:**
  - **Administrador:** `admin@cine.local` / `admin123`
- **Funcionalidad:** Gestión de películas, salas, programación de funciones y chatbot ejecutivo local con WebLLM.

### B. Validador de Boleteo en Puerta con Lector de Cámara (Puerto 5177)
- **URL:** `http://<IP_GCP>:5177`
- **Credenciales Maestras:**
  - **Boletero:** `boletero@cine.local` / `boletero123`

> [!TIP]
> **Habilitar acceso a la cámara en HTTP (Chrome / Edge / Brave):**
> Al no usar HTTPS, los navegadores bloquean la cámara por defecto. Para habilitarla en 30 segundos:
> 1. En una nueva pestaña de Chrome escribe: `chrome://flags/#unsafely-treat-insecure-origin-as-secure`
> 2. En el recuadro pega la URL: `http://<IP_GCP>:5177`
> 3. En el desplegable de la derecha selecciona **Enabled**.
> 4. Haz clic en el botón azul abajo a la derecha: **Relaunch**.
> 5. Al volver a abrir `http://<IP_GCP>:5177`, haz clic en *"Permitir Cámara"*. El escáner QR leerá los códigos y validará la firma HMAC en tiempo real con Azure.
