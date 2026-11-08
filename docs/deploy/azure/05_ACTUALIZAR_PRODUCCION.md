# Despliegue en Microsoft Azure — 05. Actualizar Producción

Este documento establece el procedimiento estándar para realizar despliegues continuos, actualizaciones de versión y rollbacks de emergencia en la máquina virtual Azure de producción.

---

## 1. Copia de Seguridad Preventiva (Pre-Deployment Backup)

Antes de cualquier despliegue de código o actualización de esquemas, genere un volcado de las bases de datos PostgreSQL:

```bash
# 1. Crear directorio con fecha y hora
FECHA=$(date +%Y%m%d_%H%M%S)
mkdir -p /home/ubuntu/backups/$FECHA

# 2. Respaldar base de datos de Auth (Postgres 5434)
docker exec SW2-P2-CINEv2-postgres-auth pg_dump -U postgres cine_auth_db > /home/ubuntu/backups/$FECHA/cine_auth_db.sql

# 3. Respaldar base de datos de Core (Postgres 5433)
docker exec SW2-P2-CINEv2-postgres-core pg_dump -U postgres cine_core_db > /home/ubuntu/backups/$FECHA/cine_core_db.sql

# 4. Comprimir el volcado
tar -czvf /home/ubuntu/backups/backup_$FECHA.tar.gz -C /home/ubuntu/backups/$FECHA .
rm -rf /home/ubuntu/backups/$FECHA

echo "Copia de seguridad completada: /home/ubuntu/backups/backup_$FECHA.tar.gz"
```

---

## 2. Actualización de Código y Reconstrucción de Contenedores

```bash
cd /home/ubuntu/CINEv2

# 1. Descargar las últimas confirmaciones (commits) de la rama principal
git checkout main
git pull origin main

# 2. Si la actualización afecta a un único servicio (por ejemplo, Boleteo):
docker compose build ms-boleteo-validator-frontend ms-boleteo-validator-backend
docker compose up -d --no-deps ms-boleteo-validator-frontend ms-boleteo-validator-backend

# 3. Si la actualización es integral para todo el ecosistema:
docker compose build --parallel
docker compose up -d
```

---

## 3. Verificación Post-Despliegue

```bash
# 1. Verificar estado de los servicios
docker compose ps

# 2. Examinar logs del servicio actualizado
docker compose logs -f --tail=50 ms-boleteo-validator-frontend

# 3. Recargar Nginx si hubo modificaciones en las rutas virtuales
sudo nginx -t && sudo systemctl reload nginx
```

---

## 4. Procedimiento de Rollback (Plan de Contingencia)

En caso de fallos inesperados o incompatibilidades:

### Paso 1: Regresar el código fuente a la versión previa
```bash
cd /home/ubuntu/CINEv2
git log --oneline -n 5
git checkout <HASH_COMMIT_ESTABLE_ANTERIOR>
docker compose up -d --build
```

### Paso 2: Restaurar base de datos si se aplicaron migraciones fallidas
```bash
# Descomprimir volcado previo
tar -xzvf /home/ubuntu/backups/backup_<FECHA>.tar.gz -C /tmp/

# Restaurar BD Auth
docker exec -i SW2-P2-CINEv2-postgres-auth psql -U postgres -d cine_auth_db < /tmp/cine_auth_db.sql

# Restaurar BD Core
docker exec -i SW2-P2-CINEv2-postgres-core psql -U postgres -d cine_core_db < /tmp/cine_core_db.sql

# Limpiar archivos temporales
rm -f /tmp/cine_auth_db.sql /tmp/cine_core_db.sql
```

