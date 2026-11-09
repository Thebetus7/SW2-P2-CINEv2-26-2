# Despliegue en Amazon Web Services (AWS) — 01. Configurar Proyecto (Nodo Multimedia + S3)

Este documento detalla la configuración de variables de entorno para el nodo de **Amazon Web Services (AWS)**, encargado de ejecutar `ms-multimedia` (NestJS + TensorFlow COCO-SSD + React 18) y la conexión con el bucket real de AWS S3 y DynamoDB.

---

> [!IMPORTANT]
> **UN SOLO ARCHIVO `.env` EN LA RAÍZ:**
> No es necesario crear archivos `.env` dentro de las subcarpetas de los microservicios. Docker Compose (`docker-compose.aws.yml`) lee automáticamente el archivo `.env` ubicado en la raíz del repositorio (`/home/ubuntu/CINEv2/.env`) e inyecta todas las variables a los contenedores correspondientes.

---

## 1. Crear el Archivo `.env` en la Raíz del Repositorio

Una vez clonado el repositorio en la instancia EC2 de AWS (`/home/ubuntu/CINEv2`), ejecute:

```bash
cd /home/ubuntu/CINEv2
nano .env
```

Pegue el siguiente bloque de configuración:

```env
# ===================================================================
# CONFIGURACIÓN DEL NODO AWS (MULTIMEDIA + AWS S3 BUCKET)
# Archivo: /home/ubuntu/CINEv2/.env
# ===================================================================

# 1. Conexión Cross-Cloud hacia GCP (Cinema Core para metadatos de salas)
# Reemplace con la IP pública de su VM en GCP (donde corre Cinema-Core en :3000)
CORE_API_URL=http://<IP_PUBLICA_GCP>:3000

# 2. Integración con AWS S3 Bucket Real
AWS_S3_BUCKET=cinev2-media-bucket-prod
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=<TU_AWS_ACCESS_KEY_ID>
AWS_SECRET_ACCESS_KEY=<TU_AWS_SECRET_ACCESS_KEY>

# 3. Base de Datos NoSQL DynamoDB Local
DYNAMODB_ENDPOINT=http://dynamodb-local:8000

# 4. Parámetros del modelo TensorFlow COCO-SSD
TENSORFLOW_CONFIDENCE_THRESHOLD=0.60
```

Guarde el archivo con `Ctrl + O`, presione `Enter` y salga con `Ctrl + X`.

---

## 2. Explicación de las Variables Inyectadas por Docker Compose

| Variable | Contenedor Destino | Propósito |
| :--- | :--- | :--- |
| `CORE_API_URL` | `ms-multimedia-backend` | URL del servicio en GCP para asociar conteos a salas reales. |
| `AWS_S3_BUCKET` | `ms-multimedia-backend` | Bucket de almacenamiento para posters procesados. |
| `AWS_REGION` | `ms-multimedia-backend` | Región geográfica de AWS (ej. `us-east-1`). |
| `AWS_ACCESS_KEY_ID` | `ms-multimedia-backend` | Credenciales de AWS IAM con permisos S3 (`s3:PutObject`, `s3:GetObject`). |
| `AWS_SECRET_ACCESS_KEY` | `ms-multimedia-backend` | Clave secreta asociada al usuario IAM. |
| `DYNAMODB_ENDPOINT` | `ms-multimedia-backend` | Endpoint de persistencia de eventos de congestión en DynamoDB. |

---

## 3. ¿Por qué no se necesitan `.env` en subcarpetas?

El orquestador `docker-compose.aws.yml` mapea explícitamente estas variables hacia los contenedores:
- En `ms-multimedia-backend`: `CORE_SERVICE_URL: ${CORE_API_URL}`, `AWS_S3_BUCKET`, `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `DYNAMODB_ENDPOINT`.
- En `ms-multimedia-frontend`: resuelve dinámicamente la IP del navegador (`window.location.hostname`), conectándose a `:3001` sin requerir variables estáticas.

Continúe con [02_CREAR_INFRAESTRUCTURA.md](file:///docs/deploy/aws/02_CREAR_INFRAESTRUCTURA.md) y [03_INSTALAR_HERRAMIENTAS.md](file:///docs/deploy/aws/03_INSTALAR_HERRAMIENTAS.md).
