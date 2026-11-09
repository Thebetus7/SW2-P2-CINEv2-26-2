# Despliegue en Google Cloud Platform (GCP) — 01. Configurar Proyecto (Nodo Cinema-Core + Boleteo)

Este documento detalla la configuración de variables de entorno para el nodo de **Google Cloud Platform (GCP)**, encargado de ejecutar `ms-cinema-core` (NestJS Node.js + Angular 17) y `ms-boleteo-validator` (Laravel 11 PHP 8.2 + React 18), enlazando la comunicación Cross-Cloud con Azure (Ticket-Auth) y AWS (S3).

---

> [!IMPORTANT]
> **UN SOLO ARCHIVO `.env` EN LA RAÍZ:**
> No es necesario crear archivos `.env` dentro de las subcarpetas de los microservicios. Docker Compose (`docker-compose.gcp.yml`) lee automáticamente el archivo `.env` ubicado en la raíz del repositorio (`/home/ubuntu/CINEv2/.env`) e inyecta todas las variables a los contenedores correspondientes.

---

## 1. Crear el Archivo `.env` en la Raíz del Repositorio

Una vez clonado el repositorio en el servidor de GCP (`/home/ubuntu/CINEv2`), ejecute:

```bash
cd /home/ubuntu/CINEv2
nano .env
```

Pegue el siguiente bloque de configuración:

```env
# ===================================================================
# CONFIGURACIÓN DEL NODO GCP (CINEMA-CORE + BOLETEO-VALIDATOR)
# Archivo: /home/ubuntu/CINEv2/.env
# ===================================================================

# 1. Base de Datos PostgreSQL Core (Local en GCP - Puerto 5433)
DB_PASSWORD=postgres

# 2. Conexión Cross-Cloud hacia Azure (Ticket-Auth para validación HMAC de boletos)
# Reemplace con la IP pública de su VM en Azure (donde corre Ticket-Auth en :8081)
AUTH_API_URL=http://<IP_PUBLICA_AZURE>:8081

# 3. Conexión hacia AWS S3 Real (Bucket para Posters de Cartelera)
AWS_S3_BUCKET=cinev2-media-bucket-prod
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=<TU_AWS_ACCESS_KEY_ID>
AWS_SECRET_ACCESS_KEY=<TU_AWS_SECRET_ACCESS_KEY>

# 4. Secretos Criptográficos (Seguridad y Verificación de QR)
HMAC_SECRET_KEY=clave_secreta_para_firmar_boletos_qr_hmac_sha256_cinev2_universidad_2026
JWT_SECRET=supersecretjwtkeyforcinemav2production2026hexformat001122334455667788
```

Guarde el archivo con `Ctrl + O`, presione `Enter` y salga con `Ctrl + X`.

---

## 2. Explicación de las Variables Inyectadas por Docker Compose

| Variable | Contenedor Destino | Propósito |
| :--- | :--- | :--- |
| `DB_PASSWORD` | `postgres-core`, `ms-cinema-core-backend` | Clave de acceso a la base de datos de salas, películas y asientos. |
| `AUTH_API_URL` | `ms-boleteo-validator-backend` | URL del servicio en Azure para sincronizar estado de boletos. |
| `AWS_S3_BUCKET` | `ms-cinema-core-backend` | Nombre del bucket en AWS para almacenar las carátulas. |
| `AWS_ACCESS_KEY_ID` | `ms-cinema-core-backend` | Credenciales de acceso a la API de Amazon S3. |
| `AWS_SECRET_ACCESS_KEY` | `ms-cinema-core-backend` | Clave secreta para subir posters a Amazon S3. |
| `HMAC_SECRET_KEY` | `ms-boleteo-validator-backend` | Clave compartida para verificar la autenticidad del código QR. |

---

## 3. ¿Por qué no se necesitan `.env` en subcarpetas?

El orquestador `docker-compose.gcp.yml` mapea explícitamente estas variables hacia los contenedores:
- En `ms-cinema-core-backend`: mapea la base de datos `postgres-core` y las credenciales de AWS S3.
- En `ms-boleteo-validator-backend`: conecta internamente con `ms-cinema-core-backend:3000` e inyecta `AUTH_API_URL` y `HMAC_SECRET_KEY`.
- En los frontends (`ms-cinema-core-frontend` y `ms-boleteo-validator-frontend`): se comunican con sus backends correspondientes.

Continúe con [02_CREAR_INFRAESTRUCTURA.md](file:///docs/deploy/gcp/02_CREAR_INFRAESTRUCTURA.md) y [03_INSTALAR_HERRAMIENTAS.md](file:///docs/deploy/gcp/03_INSTALAR_HERRAMIENTAS.md).
