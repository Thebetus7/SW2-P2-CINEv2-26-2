# Despliegue en Google Cloud Platform (GCP) — 05. Actualizar Producción (Servidor de Examen)

Este documento detalla el procedimiento para actualizar el código en el servidor de Google Cloud sin perder los datos de salas, cartelera o boletos sembrados.

---

## 1. Copia de Seguridad Rápida de Bases de Datos

Antes de subir cambios, guarde un volcado rápido de las bases de datos:

```bash
# 1. Crear carpeta de respaldo con fecha
FECHA=$(date +%Y%m%d_%H%M%S)
mkdir -p /home/ubuntu/backups/$FECHA

# 2. Respaldar base de datos de Auth (5434) y Core (5433)
docker exec SW2-P2-CINEv2-postgres-auth pg_dump -U postgres cine_auth_db > /home/ubuntu/backups/$FECHA/cine_auth_db.sql
docker exec SW2-P2-CINEv2-postgres-core pg_dump -U postgres cine_core_db > /home/ubuntu/backups/$FECHA/cine_core_db.sql

# 3. Comprimir el volcado
tar -czvf /home/ubuntu/backups/backup_$FECHA.tar.gz -C /home/ubuntu/backups/$FECHA .
rm -rf /home/ubuntu/backups/$FECHA

echo "Respaldo listo en: /home/ubuntu/backups/backup_$FECHA.tar.gz"
```

---

## 2. Descargar Cambios y Reconstruir Contenedores

```bash
cd /home/ubuntu/CINEv2

# 1. Descargar las últimas confirmaciones del repositorio
git checkout main
git pull origin main

# 2. Reconstruir los contenedores modificados
docker compose build --parallel

# 3. Levantar los cambios en segundo plano
docker compose up -d
```

---

## 3. Comprobar que los Servicios estén Corriendo

```bash
# 1. Verificar estado de los 11 contenedores
docker compose ps

# 2. Ver logs en tiempo real para confirmar que no haya caídas
docker compose logs -f --tail=30
```

---

## 4. Revertir Cambios (Rollback de Emergencia)

Si una modificación rompe el código antes de la entrega:

```bash
cd /home/ubuntu/CINEv2
# Regresar al commit anterior
git checkout HEAD~1
docker compose up -d --build
```
