# Despliegue en Amazon Web Services (AWS) — 01. Configurar Proyecto

## 1. Variables de Entorno de Producción

En cumplimiento de `INV-BIZ-07`, cada microservicio utiliza sus variables de entorno aisladas sin exponer contraseñas reales en el repositorio. En el servidor AWS, configure los siguientes archivos `.env` en cada ruta respectiva:

### A. ms/ms-cinema-core/backend/.env
```bash
PORT=3000
DB_HOST=postgres-core
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=<POSTGRES_CORE_PASSWORD_PROD>
DB_NAME=db_cinema_core
SYNCHRONIZE=false
RUN_MIGRATIONS=true
MULTIMEDIA_API_URL=http://ms-multimedia-backend:3001
```

### B. ms/ms-ticket-auth/backend/.env
```bash
PORT=8081
DB_HOST=postgres-auth
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=<POSTGRES_AUTH_PASSWORD_PROD>
DB_NAME=db_tickets_auth
CINEMA_CORE_URL=http://ms-cinema-core-backend:3000
MULTIMEDIA_URL=http://ms-multimedia-backend:3001
JWT_SECRET=<JWT_SECRET_ALEATORIO_64_CHARS>
STRIPE_SECRET_KEY=<STRIPE_SECRET_KEY_PROD_O_TEST>
HMAC_SECRET=clave_secreta_universitaria_mcp
```

### C. ms/ms-multimedia/backend/.env
```bash
PORT=3001
S3_ENDPOINT=http://minio-s3:9000
S3_REGION=us-east-1
MINIO_ROOT_USER=<MINIO_USER_PROD>
MINIO_ROOT_PASSWORD=<MINIO_PASSWORD_PROD>
DYNAMODB_ENDPOINT=http://dynamodb-local:8000
HMAC_SECRET=clave_secreta_universitaria_mcp
```

### D. ms/ms-ia-mcp/backend/.env
```bash
PORT=8001
CORE_API_URL=http://ms-cinema-core-backend:3000
MULTIMEDIA_API_URL=http://ms-multimedia-backend:3001
N8N_WEBHOOK_URL=http://n8n:5678/webhook/contingency
GROK_API_KEY=<GROK_API_KEY_DE_PRODUCCION>
```

### E. ms/ms-boleteo-validator/backend/.env
```bash
APP_NAME="CineV2 Boleteo"
APP_ENV=production
APP_KEY=<BASE64_LARAVEL_KEY>
APP_DEBUG=false
APP_URL=https://boleteo.<TU_DOMINIO>
TICKET_AUTH_URL=http://ms-ticket-auth-backend:8081
CINEMA_CORE_URL=http://ms-cinema-core-backend:3000
HMAC_SECRET=clave_secreta_universitaria_mcp
```

---

## 2. Ajuste de Parámetros de Memoria de Java 21 para Spring Boot

Para que Spring Boot 3 (`ms-ticket-auth-backend`) opere de forma óptima en una instancia EC2 de bajo coste con 1-2 GB de RAM, agregue las siguientes opciones a su `Dockerfile` o comando de ejecución:

```dockerfile
# En ms/ms-ticket-auth/backend/Dockerfile
ENV JAVA_OPTS="-Xms128m -Xmx384m -XX:+UseG1GC -XX:+ExitOnOutOfMemoryError"
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]
```

---

## 3. Verificación de Compilaciones Locales antes del Despliegue

Ejecute la verificación previa en su entorno local para certificar que ningún build falle al subirlo al servidor:

```bash
# Verificar builds de frontends
cd ms/ms-cinema-core/frontend && npm run build
cd ../../ms-ticket-auth/frontend && npm run build
cd ../../ms-boleteo-validator/frontend && npm run build
cd ../../movil-client && npm run build

# Verificar que los Dockerfiles existan y sintaxis correcta
docker compose config
```
Resultado esperado: Un manifiesto YAML consolidado de Compose sin advertencias de sintaxis.

