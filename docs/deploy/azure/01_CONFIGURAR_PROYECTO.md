# Despliegue en Microsoft Azure — 01. Configurar Proyecto

Este documento establece las variables de entorno (`.env`) requeridas por los cinco microservicios y las bases de datos de producción para ejecutarse de forma segura y optimizada en una máquina virtual `Standard_B1s` de Microsoft Azure.

---

## 1. Tuning de Memoria para Máquina Virtual B1s (1 GB RAM + 4 GB Swap)

Dado que la instancia `Standard_B1s` cuenta con 1 GB de RAM física, aplicamos las siguientes directrices de contención:

- **Spring Boot 3 (Java 21):** Limitar heap de la JVM mediante `-Xms128m -Xmx384m -XX:+UseG1GC`.
- **Node.js (NestJS / Angular / React):** Limitar tamaño de heap en compilación con `--max-old-space-size=512`.
- **PostgreSQL (Auth y Core):** Ajustar `shared_buffers = 128MB` y `max_connections = 60`.

---

## 2. Variables de Entorno por Microservicio

### 2.1 Backend de Cinema-Core (`ms/ms-cinema-core/backend/.env`)
```env
PORT=3000
NODE_ENV=production

# Base de datos PostgreSQL Core
DB_HOST=SW2-P2-CINEv2-postgres-core
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=<DB_PASSWORD_PROD_AZURE>
DB_NAME=cine_core_db

# Almacenamiento MinIO S3
S3_ENDPOINT=SW2-P2-CINEv2-minio-s3
S3_PORT=9000
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=<MINIO_SECRET_PROD_AZURE>
S3_BUCKET_POSTERS=cinema-posters
S3_USE_SSL=false

# Clave secreta JWT (debe coincidir con ms-ticket-auth)
JWT_SECRET=<JWT_SECRET_HEX_64_CHARS>

# Límites de memoria Node.js
NODE_OPTIONS=--max-old-space-size=384
```

### 2.2 Backend de Ticket-Auth (`ms/ms-ticket-auth/backend/.env`)
```env
PORT=8081
SPRING_PROFILES_ACTIVE=prod

# Base de datos PostgreSQL Auth
DB_HOST=SW2-P2-CINEv2-postgres-auth
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=<DB_PASSWORD_PROD_AZURE>
DB_NAME=cine_auth_db

# Seguridad Criptográfica de Boletos (HMAC-SHA256)
HMAC_SECRET_KEY=<CLAVE_SECRETA_HMAC_64_BYTES>
JWT_SECRET=<JWT_SECRET_HEX_64_CHARS>
JWT_EXPIRATION_HOURS=24

# Opciones de JVM para Azure B1s
JAVA_OPTS=-Xms128m -Xmx384m -XX:+UseG1GC -XX:+ExitOnOutOfMemoryError
```

### 2.3 Backend de Multimedia (`ms/ms-multimedia/backend/.env`)
```env
PORT=3001
NODE_ENV=production

# Servicio de Cinema Core para validar reservas de salas
CORE_SERVICE_URL=http://SW2-P2-CINEv2-ms-cinema-core-backend:3000

# Parámetros del modelo TensorFlow COCO-SSD
TENSORFLOW_CONFIDENCE_THRESHOLD=0.60
NODE_OPTIONS=--max-old-space-size=384
```

### 2.4 Backend de IA-MCP (`ms/ms-ia-mcp/backend/.env`)
```env
PORT=8001
ENVIRONMENT=production

# Proveedor de Inteligencia Artificial GrokCloud / xAI
GROK_API_KEY=<TU_API_KEY_GROKCLOUD>
GROK_MODEL=grok-beta

# Conexión al servidor MCP de Cinema
MCP_SERVER_CORE_URL=http://SW2-P2-CINEv2-ms-cinema-core-backend:3000/mcp
```

### 2.5 Backend de Boleteo-Validator (`ms/ms-boleteo-validator/backend/.env`)
```env
APP_NAME=CineBoliviaBoleteo
APP_ENV=production
APP_KEY=<BASE64_LARAVEL_KEY_AQUI>
APP_DEBUG=false
APP_URL=https://boletero.<TU_DOMINIO_AZURE>

LOG_CHANNEL=stderr
LOG_LEVEL=info

# Verificación de HMAC de boletos (idéntica a ms-ticket-auth)
HMAC_SECRET_KEY=<CLAVE_SECRETA_HMAC_64_BYTES>

# Integración con Core
CORE_API_URL=http://SW2-P2-CINEv2-ms-cinema-core-backend:3000/api/v1
```

---

## 3. Generación Segura de Secretos Criptográficos

Ejecute los siguientes comandos en su consola local para generar claves criptográficas de alta entropía:

```bash
# Generar JWT Secret de 64 caracteres hex
openssl rand -hex 32

# Generar HMAC Secret Key de 64 caracteres hex
openssl rand -hex 32

# Generar APP_KEY de Laravel
openssl rand -base64 32
```

