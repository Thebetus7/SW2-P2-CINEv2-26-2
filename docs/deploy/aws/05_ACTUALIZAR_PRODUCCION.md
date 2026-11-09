# Despliegue en Amazon Web Services (AWS) — 05. Actualizar Producción

Este documento detalla el procedimiento para actualizar el código y reconstruir los servicios del nodo **AWS** (`ms-multimedia` y `dynamodb-local`) sin alterar el funcionamiento del resto del ecosistema.

---

## 1. Actualización de Código y Reconstrucción de Imágenes

Conéctate a tu servidor EC2 de AWS mediante SSH o EC2 Instance Connect:

```bash
cd /home/ubuntu/CINEv2

# 1. Descargar los últimos cambios del repositorio
git pull origin main

# 2. Reconstruir únicamente los contenedores del nodo AWS
docker compose -f docker-compose.aws.yml build

# 3. Levantar los nuevos contenedores en segundo plano
docker compose -f docker-compose.aws.yml up -d --remove-orphans

# 4. Limpiar imágenes huérfanas intermedias para no consumir espacio en disco
docker image prune -f
```

---

## 2. Actualizar solo un Servicio Específico

Si únicamente hiciste cambios en el frontend simulador o en el backend de multimedia:

- **Para actualizar solo el Frontend Simulador (puerto :5175):**
  ```bash
  docker compose -f docker-compose.aws.yml up -d --build ms-multimedia-frontend
  ```

- **Para actualizar solo el Backend de Visión Artificial (puerto :3001):**
  ```bash
  docker compose -f docker-compose.aws.yml up -d --build ms-multimedia-backend
  ```

---

## 3. Procedimiento de Rollback Rápido

Si la última versión presenta fallos funcionales, puedes regresar de inmediato al commit anterior:

```bash
cd /home/ubuntu/CINEv2

# 1. Regresar al commit anterior en Git
git checkout HEAD~1

# 2. Reconstruir y reiniciar servicios con la versión anterior estable
docker compose -f docker-compose.aws.yml up -d --build
```
