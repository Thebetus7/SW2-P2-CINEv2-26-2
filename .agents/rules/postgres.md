# Regla de Configuración y Credenciales de PostgreSQL

## 1. Credenciales de Acceso a PostgreSQL
- **Host**: `localhost` (o `127.0.0.1`)
- **Puerto**: `5432`
- **Usuario**: `postgres`
- **Contraseña**: `123456789`

## 2. Convención Automática de Nombres de Base de Datos
- Cuando se configure, ejecute o migre cualquier microservicio o proyecto y no se solicite ni especifique explícitamente el nombre de la base de datos:
  - El agente debe crear y utilizar automáticamente una base de datos con el nombre del proyecto o módulo correspondiente (ejemplo: `db_cinev2`, `db_tickets_auth`, `db_cinema_core` o el nombre del directorio del proyecto en ejecución).
  - Si la base de datos no existe previamente en la instancia de PostgreSQL, el agente debe proceder a crearla (`CREATE DATABASE <nombre_proyecto>;`) antes de ejecutar migraciones o iniciar servicios que dependan de ella.
