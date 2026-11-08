# Despliegue en Google Cloud Platform (GCP) — 04. Desplegar y Verificar (Nodo Cinema-Core + Boleteo)

Este documento guía el levantamiento de los servicios del nodo GCP mediante `docker-compose.gcp.yml` y la comprobación de la cámara para el boletero.

---

## 1. Clonar el Proyecto en la Terminal SSH de GCP

Dentro de la ventana negra de SSH en Google Cloud:

```bash
cd /home/ubuntu
git clone https://github.com/<TU_USUARIO>/CINEv2.git
cd CINEv2
```

---

## 2. Configurar la Conexión con Azure y AWS (Archivo `.env`)

Reemplaza `<IP_AZURE>` por la IP del nodo Azure (Ticket-Auth) y ejecuta:

```bash
cat <<EOF > .env
AUTH_API_URL=http://<IP_AZURE>:8081
AWS_S3_BUCKET=cinev2-media-bucket-prod
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=mock_key
AWS_SECRET_ACCESS_KEY=mock_secret
DB_PASSWORD=postgres
EOF
```

---

## 3. Levantar los Servicios de GCP con Docker Compose

```bash
docker compose -f docker-compose.gcp.yml build --parallel
docker compose -f docker-compose.gcp.yml up -d
```

Comprobar que los 5 contenedores estén activos:

```bash
docker compose -f docker-compose.gcp.yml ps
```

Resultado esperado:
- `SW2-P2-CINEv2-postgres-core` (Puerto 5433:5432) — Up
- `SW2-P2-CINEv2-ms-cinema-core-backend` (Puerto 3000:3000) — Up
- `SW2-P2-CINEv2-ms-cinema-core-frontend` (Puerto 4200:80) — Up
- `SW2-P2-CINEv2-ms-boleteo-validator-backend` (Puerto 8000:8000) — Up
- `SW2-P2-CINEv2-ms-boleteo-validator-frontend` (Puerto 5177:80) — Up

---

## 4. Sembrar Salas, Películas y Funciones (Seeders)

```bash
docker exec -it SW2-P2-CINEv2-ms-cinema-core-backend npm run seed:core
```
Resultado: Salas, butacas y películas maestras sembradas en PostgreSQL Core.

---

## 5. Probar en el Navegador y Habilitar la Cámara (:5177)

1. **Panel Administrador de Cine (Angular):**  
   Abre en tu navegador:
   ```text
   http://<IP_GCP>:4200
   ```
   Credenciales: `admin@cine.local` / `Admin123!`

2. **Validador de Boleteo en Puerta con Cámara (React):**  
   Como se accede directamente por IP `http://`, habilita la cámara en Chrome o Edge:
   - Abre una pestaña y ve a: `chrome://flags/#unsafely-treat-insecure-origin-as-secure`
   - Agrega la URL del boletero: `http://<IP_GCP>:5177`
   - Cambia a **Enabled** y presiona **Relaunch**.
   - Entra a `http://<IP_GCP>:5177`, inicia sesión con `boletero@cine.local` / `Boletero123!` y permite la cámara.
   - ¡El escáner QR leerá los boletos y validará la firma comunicándose con Azure!
