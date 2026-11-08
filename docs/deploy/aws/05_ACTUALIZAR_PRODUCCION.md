# Despliegue en Amazon Web Services (AWS) — 05. Actualizar Producción

## 1. Procedimiento de Backup Previo a la Actualización

Antes de desplegar cualquier nueva versión de código o migración de esquema, el rol **DevOps** debe ejecutar el volcado de las bases de datos de producción:

```bash
# 1. Crear directorio de backups con fecha
FECHA=$(date +%Y%m%d_%H%M%S)
mkdir -p /home/ubuntu/backups/$FECHA

# 2. Volcado de db_tickets_auth
docker exec SW2-P2-CINEv2-postgres-auth pg_dump -U postgres db_tickets_auth > /home/ubuntu/backups/$FECHA/db_tickets_auth.sql

# 3. Volcado de db_cinema_core
docker exec SW2-P2-CINEv2-postgres-core pg_dump -U postgres db_cinema_core > /home/ubuntu/backups/$FECHA/db_cinema_core.sql

echo "Backups creados exitosamente en /home/ubuntu/backups/$FECHA"
```

---

## 2. Actualización de Código y Reconstrucción de Imágenes

```bash
cd /home/ubuntu/CINEv2

# 1. Descargar los últimos cambios del repositorio
git pull origin main

# 2. Reconstruir únicamente los contenedores con cambios de código
docker compose build

# 3. Desplegar los nuevos contenedores sin tiempo de inactividad prolongado
docker compose up -d --remove-orphans

# 4. Limpiar imágenes huérfanas para ahorrar espacio en disco EBS
docker image prune -f
```

---

## 3. Procedimiento de Rollback Inmediato

Si una actualización presenta anomalías o fallos funcionales, ejecute la reversión al estado previo:

```bash
# 1. Regresar al commit anterior en Git
git checkout HEAD~1

# 2. Reconstruir y reiniciar servicios
docker compose up -d --build

# 3. Restaurar bases de datos si hubo migraciones destructivas
docker exec -i SW2-P2-CINEv2-postgres-auth psql -U postgres -d db_tickets_auth < /home/ubuntu/backups/<FECHA>/db_tickets_auth.sql
docker exec -i SW2-P2-CINEv2-postgres-core psql -U postgres -d db_cinema_core < /home/ubuntu/backups/<FECHA>/db_cinema_core.sql
```

