# Despliegue en Google Cloud Platform (GCP) — 01. Configurar Proyecto (Nodo Cinema-Core + Boleteo)

Este documento detalla las variables de entorno necesarias en la máquina virtual de Google Cloud para `ms-cinema-core` y `ms-boleteo-validator`, configurando la conexión Cross-Cloud hacia Azure (Ticket-Auth) y AWS (S3 Bucket).

---

## 1. Archivo `.env` Global de GCP (`/home/ubuntu/CINEv2/.env`)

Cree o edite el archivo `.env` en la raíz del proyecto dentro de la máquina de GCP:

```env
# ===================================================================
# CONFIGURACIÓN DEL NODO GCP (CINEMA-CORE + BOLETEO)
# Frameworks: NestJS + Angular 17 + Laravel 11 PHP + React
# ===================================================================

# Base de datos local PostgreSQL Core (Puerto 5433)
DB_PASSWORD=postgres

# Conexión Cross-Cloud hacia Azure (Ticket-Auth para firmas HMAC)
AUTH_API_URL=http://<IP_PUBLICA_AZURE>:8081

# Conexión hacia AWS S3 Real (Bucket para Posters de Cartelera)
AWS_S3_BUCKET=cinev2-media-bucket-prod
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=<TU_AWS_ACCESS_KEY_ID>
AWS_SECRET_ACCESS_KEY=<TU_AWS_SECRET_ACCESS_KEY>

# Secretos Criptográficos
HMAC_SECRET_KEY=clave_secreta_para_firmar_boletos_qr_hmac_sha256_cinev2_universidad_2026
JWT_SECRET=supersecretjwtkeyforcinemav2production2026hexformat001122334455667788
```

---

## 2. Variables de Cinema-Core Backend (`ms/ms-cinema-core/backend/.env`)

```env
PORT=3000
NODE_ENV=production

# Base de datos local
DB_HOST=postgres-core
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=db_cinema_core

# AWS S3 Real
AWS_S3_BUCKET=cinev2-media-bucket-prod
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=<TU_AWS_ACCESS_KEY_ID>
AWS_SECRET_ACCESS_KEY=<TU_AWS_SECRET_ACCESS_KEY>

# Tuning de memoria Node para e2-micro
NODE_OPTIONS=--max-old-space-size=384
```

---

## 3. Variables de Boleteo-Validator (`ms/ms-boleteo-validator/backend/.env`)

```env
APP_NAME=CineBoliviaBoleteo
APP_ENV=production
APP_KEY=base64:s7V1u2XyZ3aBcDeFgHiJkLmNoPqRsTuVwXyZ0123456=
APP_DEBUG=false
APP_URL=http://localhost:8000

# Conexión Cross-Cloud hacia Azure (Ticket-Auth)
TICKET_AUTH_URL=http://<IP_PUBLICA_AZURE>:8081

# Conexión local a Cinema Core en GCP
CINEMA_CORE_URL=http://ms-cinema-core-backend:3000

# Clave compartida para verificar HMAC-SHA256
HMAC_SECRET_KEY=clave_secreta_para_firmar_boletos_qr_hmac_sha256_cinev2_universidad_2026
```
