# Despliegue en Amazon Web Services (AWS) — 04. Desplegar y Verificar

## 1. Clonación del Repositorio y Configuración de Secretos

```bash
# 1. Clonar el repositorio en /var/www o ~/cinev2
cd /home/ubuntu
git clone https://github.com/<TU_ORGANIZACION_O_USUARIO>/CINEv2.git
cd CINEv2

# 2. Configurar los archivos .env para cada microservicio
# Utilice las plantillas definidas en 01_CONFIGURAR_PROYECTO.md
nano ms/ms-cinema-core/backend/.env
nano ms/ms-ticket-auth/backend/.env
nano ms/ms-multimedia/backend/.env
nano ms/ms-ia-mcp/backend/.env
nano ms/ms-boleteo-validator/backend/.env
```

---

## 2. Construcción y Lanzamiento de Contenedores

Ejecutaremos el build de las imágenes y el arranque en segundo plano:

```bash
# Construir imágenes de todos los microservicios y frontends
docker compose build --parallel

# Levantar toda la infraestructura y servicios en segundo plano
docker compose up -d

# Comprobar el estado de los 11 contenedores
docker compose ps
```
Resultado observable esperado: 11 servicios con estado `Up` o `running`:
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
# 1. Ejecutar seeder de Cinema-Core (Salas, Películas y Funciones)
docker exec -it SW2-P2-CINEv2-ms-cinema-core-backend npm run seed:core

# 2. Verificar que Spring Boot haya creado los 15 boletos maestros
docker logs SW2-P2-CINEv2-ms-ticket-auth-backend | grep "DatabaseSeeder"
```
Resultado observable esperado: `[DatabaseSeeder] 15 Boletos maestros sincronizados con firmas HMAC.`

---

## 4. Configuración de Nginx Reverse Proxy con SSL Let's Encrypt

Cree el archivo de configuración virtual en `/etc/nginx/sites-available/cinev2.conf`:

> Si no dispone de dominio propio, puede utilizar el DNS comodín gratuito basado en su IP elástica:  
> `DOMINIO="<TU_IP_PUBLICA>.sslip.io"`

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

# 3. Panel de Boleteo con Cámara Web Obligatoria (ms-boleteo-validator-frontend :5177)
server {
    server_name boleteo.<TU_DOMINIO>;
    location / {
        proxy_pass http://127.0.0.1:5177;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# 4. Consola de Auditoría IA (ms-ia-mcp-frontend :5176)
server {
    server_name ia.<TU_DOMINIO>;
    location / {
        proxy_pass http://127.0.0.1:5176;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# 5. APIs y Almacenamiento S3
server {
    server_name api.<TU_DOMINIO>;
    location /cinema/ {
        proxy_pass http://127.0.0.1:3000/;
    }
    location /auth/ {
        proxy_pass http://127.0.0.1:8081/;
    }
    location /multimedia/ {
        proxy_pass http://127.0.0.1:3001/;
    }
    location /s3/ {
        proxy_pass http://127.0.0.1:9000/;
    }
}
```

Active el sitio y solicite los certificados SSL gratuitos con Certbot:

```bash
# Enlazar sitio
sudo ln -sf /etc/nginx/sites-available/cinev2.conf /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx

# Obtener certificados SSL automáticos con renovación de Certbot
sudo certbot --nginx \
    -d cine.<TU_DOMINIO> \
    -d admin.<TU_DOMINIO> \
    -d boleteo.<TU_DOMINIO> \
    -d ia.<TU_DOMINIO> \
    -d api.<TU_DOMINIO> \
    --non-interactive \
    --agree-tos \
    -m devops@<TU_DOMINIO>
```

---

## 5. Pruebas de Verificación y Salud del Despliegue

Ejecute la verificación desde cualquier terminal externa con `curl`:

```bash
# 1. Verificar portal de cliente
curl -I https://cine.<TU_DOMINIO>

# 2. Verificar API de Películas
curl -s https://api.<TU_DOMINIO>/cinema/api/v1/movies | grep "title"

# 3. Verificar Cámara en Boletero
# Abra en el navegador móvil o desktop https://boleteo.<TU_DOMINIO>
# Al disponer de HTTPS emitido por Let's Encrypt, el navegador activará la cámara web
# en color verde sin ninguna advertencia de contexto inseguro.
```

