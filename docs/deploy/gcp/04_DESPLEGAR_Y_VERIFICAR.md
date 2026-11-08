# Despliegue en Google Cloud Platform (GCP) — 04. Desplegar y Verificar

## 1. Clonación del Repositorio y Configuración de Secretos

Conéctese a la instancia `cinev2-vm-prod` a través de SSH y clone el repositorio:

```bash
# 1. Acceder al directorio de trabajo en la instancia GCP
cd /home/ubuntu
git clone https://github.com/<TU_ORGANIZACION_O_USUARIO>/CINEv2.git
cd CINEv2

# 2. Configurar los archivos .env para cada microservicio
# Utilice los valores de producción optimizados en 01_CONFIGURAR_PROYECTO.md
nano ms/ms-cinema-core/backend/.env
nano ms/ms-ticket-auth/backend/.env
nano ms/ms-multimedia/backend/.env
nano ms/ms-ia-mcp/backend/.env
nano ms/ms-boleteo-validator/backend/.env
```

---

## 2. Construcción y Lanzamiento de Contenedores

En la máquina `e2-micro`, gracias a la memoria de intercambio (Swap de 4GB) configurada en el paso 03, los builds se completan de forma estable:

```bash
# 1. Construir las imágenes de producción de los microservicios
docker compose build --parallel

# 2. Levantar la infraestructura y microservicios en segundo plano
docker compose up -d

# 3. Comprobar el estado operativo de los 11 contenedores
docker compose ps
```

Resultado observable esperado: Todos los servicios deben figurar en estado `Up` o `running`:
- `SW2-P2-CINEv2-postgres-auth` (5434:5432)
- `SW2-P2-CINEv2-postgres-core` (5433:5432)
- `SW2-P2-CINEv2-minio-s3` (9000:9000, 9001:9001)
- `SW2-P2-CINEv2-dynamodb-local` (8002:8000)
- `SW2-P2-CINEv2-n8n` (5678:5678)
- `SW2-P2-CINEv2-ms-ticket-auth-backend` (8081:8081)
- `SW2-P2-CINEv2-ms-ticket-auth-frontend` (5174:80)
- `SW2-P2-CINEv2-ms-cinema-core-backend` (3000:3000)
- `SW2-P2-CINEv2-ms-cinema-core-frontend` (4200:80)
- `SW2-P2-CINEv2-ms-multimedia-backend` (3001:3001)
- `SW2-P2-CINEv2-ms-multimedia-frontend` (5175:80)
- `SW2-P2-CINEv2-ms-ia-mcp-backend` (8001:8001)
- `SW2-P2-CINEv2-ms-ia-mcp-frontend` (5176:80)
- `SW2-P2-CINEv2-ms-boleteo-validator-backend` (8000:8000)
- `SW2-P2-CINEv2-ms-boleteo-validator-frontend` (5177:80)

---

## 3. Inicialización y Siembra de Datos (Seeders)

```bash
# 1. Ejecutar seeder de Cinema-Core (Salas, Películas, Funciones y Butacas)
docker exec -it SW2-P2-CINEv2-ms-cinema-core-backend npm run seed:core

# 2. Verificar la siembra criptográfica de Spring Boot (15 boletos maestros con HMAC)
docker logs SW2-P2-CINEv2-ms-ticket-auth-backend | grep "DatabaseSeeder"
```
Resultado observable esperado: `[DatabaseSeeder] 15 Boletos maestros sincronizados con firmas HMAC.`

---

## 4. Configuración de Nginx Reverse Proxy con SSL Let's Encrypt

Cree el archivo de configuración virtual en `/etc/nginx/sites-available/cinev2.conf`:

> Si no dispone de dominio comercial propio, use el servicio DNS wildcard gratuito con la IP estática reservada en GCP:  
> `DOMINIO="<TU_IP_ESTATICA_GCP>.sslip.io"`

```nginx
# /etc/nginx/sites-available/cinev2.conf

# 1. Portal Principal de Clientes y Login (ms-ticket-auth-frontend :5174)
server {
    server_name cine.<TU_DOMINIO>;
    location / {
        proxy_pass http://127.0.0.1:5174;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# 2. Panel de Administración de Cine (ms-cinema-core-frontend :4200)
server {
    server_name admin.<TU_DOMINIO>;
    location / {
        proxy_pass http://127.0.0.1:4200;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# 3. Panel de Boletero y Validador QR con Cámara (ms-boleteo-validator-frontend :5177)
# CRÍTICO: Este bloque REQUIERE HTTPS para habilitar la API getUserMedia de la cámara.
server {
    server_name boletero.<TU_DOMINIO>;
    location / {
        proxy_pass http://127.0.0.1:5177;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# 4. Consola de Auditoría e Inteligencia Artificial MCP (ms-ia-mcp-frontend :5176)
server {
    server_name ia-audit.<TU_DOMINIO>;
    location / {
        proxy_pass http://127.0.0.1:5176;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# 5. Simulador Multimedia de Cámaras en Sala (ms-multimedia-frontend :5175)
server {
    server_name multimedia.<TU_DOMINIO>;
    location / {
        proxy_pass http://127.0.0.1:5175;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# 6. Gateway de APIs Unificadas Backend
server {
    server_name api.<TU_DOMINIO>;

    # ms-ticket-auth backend
    location /auth/ {
        proxy_pass http://127.0.0.1:8081/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # ms-cinema-core backend
    location /core/ {
        proxy_pass http://127.0.0.1:3000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # ms-multimedia backend
    location /multimedia/ {
        proxy_pass http://127.0.0.1:3001/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # ms-ia-mcp backend
    location /mcp/ {
        proxy_pass http://127.0.0.1:8001/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # ms-boleteo-validator backend
    location /validator/ {
        proxy_pass http://127.0.0.1:8000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Habilitar el sitio y emitir los certificados SSL automáticos con Certbot:

```bash
# Enlazar y verificar la configuración de Nginx
sudo ln -sf /etc/nginx/sites-available/cinev2.conf /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx

# Obtener certificados SSL gratuitos de Let's Encrypt
sudo certbot --nginx -d cine.<TU_DOMINIO> -d admin.<TU_DOMINIO> -d boletero.<TU_DOMINIO> -d ia-audit.<TU_DOMINIO> -d multimedia.<TU_DOMINIO> -d api.<TU_DOMINIO> --non-interactive --agree-tos -m admin@<TU_DOMINIO>
```

---

## 5. Matriz de Validación de Endpoints y Puertos

| Servicio | URL Pública de Producción | Protocolo | Verificación Funcional |
| :--- | :--- | :--- | :--- |
| **Cliente / Login** | `https://cine.<TU_DOMINIO>` | HTTPS | HTTP 200, formulario interactivo de reserva |
| **Admin Cine** | `https://admin.<TU_DOMINIO>` | HTTPS | HTTP 200, dashboard de administración Angular |
| **Boletero Puerta** | `https://boletero.<TU_DOMINIO>` | HTTPS | HTTP 200, **cámara activa sin bloqueo W3C** |
| **Auditoría IA MCP** | `https://ia-audit.<TU_DOMINIO>` | HTTPS | HTTP 200, consola de chat y logs GrokCloud |
| **Simulador Multimedia** | `https://multimedia.<TU_DOMINIO>` | HTTPS | HTTP 200, visor de butacas y canvas TensorFlow |
| **Health Check Auth** | `https://api.<TU_DOMINIO>/auth/actuator/health` | HTTPS | `{"status":"UP"}` |
| **Health Check Core** | `https://api.<TU_DOMINIO>/core/api/v1/health` | HTTPS | `{"status":"ok"}` |
| **Health Check MCP** | `https://api.<TU_DOMINIO>/mcp/health` | HTTPS | `{"status":"online"}` |
| **Health Check Boleteo** | `https://api.<TU_DOMINIO>/validator/api/health` | HTTPS | `{"status":"healthy"}` |

---

## 6. Verificación Específica del Lector QR de Cámara en Boletero

1. Ingrese a `https://boletero.<TU_DOMINIO>` desde un teléfono móvil o laptop con cámara web.
2. Inicie sesión con el usuario de rol boletero:
   - Usuario: `boletero`
   - Contraseña: `<PASSWORD_CONFIGURADA>`
3. El navegador solicitará el permiso `¿Permitir que boletero.<TU_DOMINIO> use su cámara?`. Presione **Permitir**.
4. Verifique que la pantalla muestre el feed en vivo y un marco rectangular de enfoque.
5. Acerque uno de los 15 códigos QR maestros generados por el seeder y verifique la respuesta visual:
   - Pantalla verde: `BOLETO AUTORIZADO - Firma HMAC-SHA256 Válida`.
   - Registro en la tabla inferior del turno con timestamp y butaca asignada.

