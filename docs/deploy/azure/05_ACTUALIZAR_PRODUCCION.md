# Despliegue en Microsoft Azure — 05. Actualizar Producción y Variables .env

Este documento establece el procedimiento estándar para actualizar variables de entorno en `.env`, desplegar nuevo código y realizar rollbacks en el servidor de **Microsoft Azure** (IP: `20.102.51.189`).

---

## 1. ¿Cómo Editar el Archivo `.env` y Reiniciar los Servicios en Azure?

> [!IMPORTANT]
> **En Docker, editar `.env` NO surte efecto automáticamente en contenedores activos:**  
> Las variables de entorno se inyectan en el momento de crear el contenedor. Si solo modificas el archivo con `nano .env`, los contenedores continuarán ejecutándose con los valores antiguos en memoria. Debes aplicar los cambios con `docker compose -f docker-compose.azure.yml up -d`.

### Paso a Paso para Actualizar `.env`:

```bash
cd /home/ubuntu/CINEv2

# 1. Abrir el archivo .env para modificar variables (IPs de GCP/AWS, API keys, etc.)
nano .env

# (Edita las variables deseadas, guarda con Ctrl + O, presiona Enter y sal con Ctrl + X)

# 2. Reiniciar e inyectar las nuevas variables en los contenedores
docker compose -f docker-compose.azure.yml up -d

# 3. Comprobar que los contenedores se hayan actualizado (verás "Up less than a minute")
docker compose -f docker-compose.azure.yml ps

# 4. Inspeccionar los logs del backend para confirmar arranque limpio
docker compose -f docker-compose.azure.yml logs --tail=40 ms-ticket-auth-backend
```

---

## 2. Actualización de Código desde Git (Nuevo Commit)

Cuando se suben mejoras o correcciones al repositorio en GitHub:

```bash
cd /home/ubuntu/CINEv2

# 1. Descargar los últimos cambios
git checkout main
git pull origin main

# 2. Reconstruir y levantar únicamente el stack de Azure
docker compose -f docker-compose.azure.yml build
docker compose -f docker-compose.azure.yml up -d --remove-orphans

# 3. Limpiar imágenes intermedias huérfanas para optimizar disco
docker image prune -f
```

### Actualizar solo un microservicio específico:
- **Solo el Frontend de Tickets/Portal Clientes (:5174):**
  ```bash
  docker compose -f docker-compose.azure.yml up -d --build ms-ticket-auth-frontend
  ```
- **Solo el Backend Spring Boot (:8081):**
  ```bash
  docker compose -f docker-compose.azure.yml up -d --build ms-ticket-auth-backend
  ```
- **Solo el Backend de IA GrokCloud (:8001):**
  ```bash
  docker compose -f docker-compose.azure.yml up -d --build ms-ia-mcp-backend
  ```

---

## 3. Verificación Post-Despliegue

```bash
# 1. Estado de los contenedores
docker compose -f docker-compose.azure.yml ps

# 2. Ver logs en tiempo real
docker compose -f docker-compose.azure.yml logs -f --tail=30 ms-ticket-auth-backend

# 3. Verificar estado de Nginx Reverse Proxy
sudo nginx -t && sudo systemctl reload nginx
```

---

## 4. Procedimiento de Rollback Rápido

Si la última versión presenta fallos funcionales:

```bash
cd /home/ubuntu/CINEv2

# 1. Regresar al commit anterior en Git
git checkout HEAD~1

# 2. Reconstruir y reiniciar servicios con la versión estable previa
docker compose -f docker-compose.azure.yml up -d --build
```
