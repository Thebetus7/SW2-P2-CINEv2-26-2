# Despliegue en Amazon Web Services (AWS) — 05. Actualizar Producción y Variables .env

Este documento detalla el procedimiento para modificar variables de entorno en `.env`, actualizar código y reiniciar los servicios en el servidor de **Amazon Web Services (AWS)** (IP: `3.89.228.24` / Amazon Linux 2023).

---

## 1. ¿Cómo Editar el Archivo `.env` y Reiniciar los Servicios en AWS?

> [!IMPORTANT]
> **En Docker, editar `.env` NO surte efecto automáticamente en contenedores activos:**  
> Las variables de entorno se inyectan en el momento de crear el contenedor. Si solo modificas el archivo con `nano .env`, los contenedores continuarán ejecutándose con los valores antiguos en memoria. Debes aplicar los cambios con `docker compose -f docker-compose.aws.yml up -d`.

### Paso a Paso para Actualizar `.env`:

```bash
cd /home/ec2-user/CINEv2

# 1. Abrir el archivo .env para modificar variables (IP de GCP, Bucket S3, credenciales IAM, etc.)
nano .env

# (Edita las variables deseadas, guarda con Ctrl + O, presiona Enter y sal con Ctrl + X)

# 2. Reiniciar e inyectar las nuevas variables en los contenedores
docker compose -f docker-compose.aws.yml up -d

# 3. Comprobar que los contenedores se hayan actualizado (verás "Up less than a minute")
docker compose -f docker-compose.aws.yml ps

# 4. Inspeccionar los logs del backend para confirmar arranque limpio
docker compose -f docker-compose.aws.yml logs --tail=40 ms-multimedia-backend
```

---

## 2. Actualización de Código desde Git (Nuevo Commit)

Cuando se suben mejoras o correcciones al repositorio en GitHub:

```bash
cd /home/ec2-user/CINEv2

# 1. Descargar los últimos cambios
git checkout main
git pull origin main

# 2. Reconstruir y levantar únicamente el stack de AWS
docker compose -f docker-compose.aws.yml build
docker compose -f docker-compose.aws.yml up -d --remove-orphans

# 3. Limpiar imágenes intermedias huérfanas para optimizar disco
docker image prune -f
```

### Actualizar solo un microservicio específico:
- **Solo el Frontend Simulador de Salas (:5175):**
  ```bash
  docker compose -f docker-compose.aws.yml up -d --build ms-multimedia-frontend
  ```
- **Solo el Backend de Visión Artificial TensorFlow (:3001):**
  ```bash
  docker compose -f docker-compose.aws.yml up -d --build ms-multimedia-backend
  ```

---

## 3. Verificación Post-Despliegue

```bash
# 1. Estado de los contenedores
docker compose -f docker-compose.aws.yml ps

# 2. Ver logs en tiempo real
docker compose -f docker-compose.aws.yml logs -f --tail=30 ms-multimedia-backend
```

---

## 4. Procedimiento de Rollback Rápido

Si la última versión presenta fallos funcionales:

```bash
cd /home/ec2-user/CINEv2

# 1. Regresar al commit anterior en Git
git checkout HEAD~1

# 2. Reconstruir y reiniciar servicios con la versión estable previa
docker compose -f docker-compose.aws.yml up -d --build
```
