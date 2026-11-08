# Despliegue en Google Cloud Platform (GCP) — 05. Actualizar Producción

Este documento detalla el procedimiento operativo estándar para aplicar nuevas versiones de código en la instancia de producción en GCP, garantizando la persistencia de datos y la capacidad de rollback inmediato.

---

## 1. Copia de Seguridad Preventiva (Pre-Deployment Backup)

Antes de realizar cualquier actualización en producción, genere un volcado de las bases de datos PostgreSQL:

```bash
# 1. Crear directorio de backups con marca de tiempo
FECHA=$(date +%Y%m%d_%H%M%S)
mkdir -p /home/ubuntu/backups/$FECHA

# 2. Respaldar base de datos de ms-ticket-auth (Postgres 5434)
docker exec SW2-P2-CINEv2-postgres-auth pg_dump -U postgres cine_auth_db > /home/ubuntu/backups/$FECHA/cine_auth_db.sql

# 3. Respaldar base de datos de ms-cinema-core (Postgres 5433)
docker exec SW2-P2-CINEv2-postgres-core pg_dump -U postgres cine_core_db > /home/ubuntu/backups/$FECHA/cine_core_db.sql

# 4. Comprimir el respaldo
tar -czvf /home/ubuntu/backups/backup_$FECHA.tar.gz -C /home/ubuntu/backups/$FECHA .
rm -rf /home/ubuntu/backups/$FECHA

echo "Backup completado exitosamente: /home/ubuntu/backups/backup_$FECHA.tar.gz"
```

> [!TIP]
> Si tiene configurado un bucket gratuito en Google Cloud Storage (hasta 5 GB Always Free en región US), puede transferir el archivo con:  
> `gcloud storage cp /home/ubuntu/backups/backup_$FECHA.tar.gz gs://<TU_BUCKET_BACKUP_GCP>/`

---

## 2. Actualización de Código y Reconstrucción

```bash
cd /home/ubuntu/CINEv2

# 1. Traer los cambios más recientes desde la rama principal
git checkout main
git pull origin main

# 2. Reconstruir únicamente los contenedores cuyos servicios sufrieron cambios
# Por ejemplo, si se modificó el frontend del boletero:
docker compose build ms-boleteo-validator-frontend

# O reconstruir todo el ecosistema en paralelo:
docker compose build --parallel

# 3. Aplicar los cambios sin detener la base de datos
docker compose up -d --no-deps ms-boleteo-validator-frontend
```

---

## 3. Verificación Post-Despliegue

```bash
# 1. Inspeccionar logs en tiempo real para verificar que no existan errores de inicio
docker compose logs -f --tail=50 ms-boleteo-validator-frontend

# 2. Verificar que Nginx siga enrutando correctamente las peticiones
sudo nginx -t && sudo systemctl reload nginx

# 3. Validar estado general de los contenedores
docker compose ps
```

---

## 4. Procedimiento de Rollback (Plan de Contingencia)

Si una actualización presenta anomalías o fallos funcionales críticos:

### Paso 1: Revertir el código fuente a la versión estable previa
```bash
cd /home/ubuntu/CINEv2
# Obtener el hash del commit anterior
git log --oneline -n 5
git checkout <COMMIT_ANTERIOR_HASH>

# Reconstruir y reiniciar servicios
docker compose up -d --build
```

### Paso 2: Restaurar base de datos si hubo migraciones destructivas
```bash
# Descomprimir el respaldo previo
tar -xzvf /home/ubuntu/backups/backup_<FECHA>.tar.gz -C /tmp/

# Restaurar BD Auth
docker exec -i SW2-P2-CINEv2-postgres-auth psql -U postgres -d cine_auth_db < /tmp/cine_auth_db.sql

# Restaurar BD Core
docker exec -i SW2-P2-CINEv2-postgres-core psql -U postgres -d cine_core_db < /tmp/cine_core_db.sql

# Limpiar archivos temporales
rm -f /tmp/cine_auth_db.sql /tmp/cine_core_db.sql
```

