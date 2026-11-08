# Despliegue en Google Cloud Platform (GCP) — 01. Configurar Proyecto

## 1. Variables de Entorno de Producción

En cumplimiento de `INV-BIZ-07`, configure las variables de entorno en cada microservicio dentro de la VM de GCP. Cree o edite los archivos `.env` en cada subcarpeta:

### A. ms/ms-cinema-core/backend/.env
```bash
PORT=3000
DB_HOST=postgres-core
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=<POSTGRES_CORE_PASSWORD_GCP>
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
DB_PASSWORD=<POSTGRES_AUTH_PASSWORD_GCP>
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
S3_REGION=us-central1
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

## 2. Optimización de Memoria para Java 21 y Node.js en GCP

Para que la instancia `e2-micro` ejecute el backend de Spring Boot 3 con estabilidad absoluta:

```dockerfile
# En ms/ms-ticket-auth/backend/Dockerfile
ENV JAVA_OPTS="-Xms128m -Xmx384m -XX:+UseG1GC -XX:+ExitOnOutOfMemoryError"
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]
```

Y para los servicios de Node.js / NestJS:
```dockerfile
# En los Dockerfiles de NestJS (Cinema-Core y Multimedia)
ENV NODE_OPTIONS="--max-old-space-size=256"
```

