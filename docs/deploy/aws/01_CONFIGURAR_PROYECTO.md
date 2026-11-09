# Despliegue en Amazon Web Services (AWS) — 01. Configurar Proyecto (Nodo Multimedia + S3)

Este documento detalla la configuración del archivo de variables de entorno `.env` para el nodo de **Amazon Web Services (AWS)**, encargado de ejecutar `ms-multimedia` (NestJS + TensorFlow COCO-SSD + React 18) y su conexión con el bucket real de AWS S3 y DynamoDB Local.

---

> [!IMPORTANT]
> **UN SOLO ARCHIVO `.env` EN LA RAÍZ:**  
> Al igual que en Azure y GCP, **no** es necesario crear archivos `.env` dentro de las subcarpetas de los microservicios. Docker Compose (`docker-compose.aws.yml`) lee automáticamente el archivo `.env` ubicado en la raíz del repositorio (`/home/ubuntu/CINEv2/.env`) e inyecta las variables a los contenedores.

---

## 1. Crear el Archivo `.env` en la Raíz del Repositorio

Una vez conectado por SSH o EC2 Instance Connect a tu servidor en AWS y tras clonar el repositorio en `/home/ubuntu/CINEv2`:

```bash
cd /home/ubuntu/CINEv2
nano .env
```

Pega el siguiente bloque de configuración, reemplazando los valores indicados:

```env
# ===================================================================
# CONFIGURACIÓN DEL NODO AWS (MULTIMEDIA + AWS S3 BUCKET)
# Archivo: /home/ubuntu/CINEv2/.env
# ===================================================================

# 1. Conexión Cross-Cloud hacia el Backend Central de GCP (Cinema Core :3000)
# Reemplaza con la IP pública de tu servidor GCP (ej: 34.10.125.253)
CORE_API_URL=http://34.10.125.253:3000

# 2. Integración con AWS S3 Bucket Real
# Nombre exacto del bucket que creaste en el paso anterior
AWS_S3_BUCKET=cinev2-media-bucket-prod-tu-nombre
AWS_REGION=us-east-1

# Credenciales de usuario IAM que generaste en la consola de AWS
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY

# 3. Base de Datos NoSQL DynamoDB Local (Contenedor interno en puerto 8000)
DYNAMODB_ENDPOINT=http://dynamodb-local:8000

# 4. Parámetros del modelo de Inteligencia Artificial (TensorFlow COCO-SSD)
# Umbral mínimo de certeza para detectar personas en los asientos (0.60 = 60%)
TENSORFLOW_CONFIDENCE_THRESHOLD=0.60
```

Guarda el archivo en el editor `nano` presionando `Ctrl + O`, luego la tecla `Enter`, y sal con `Ctrl + X`.

---

## 2. Explicación Detallada de Cada Variable

| Variable | Contenedor Destino | ¿Para qué sirve? |
| :--- | :--- | :--- |
| `CORE_API_URL` | `ms-multimedia-backend` | Indica la dirección del backend en **GCP** para consultar qué salas y funciones existen al procesar imágenes de cámaras. |
| `AWS_S3_BUCKET` | `ms-multimedia-backend` | Nombre del bucket de AWS S3 donde se guardan y sirven los posters y banners. |
| `AWS_REGION` | `ms-multimedia-backend` | Región de AWS donde está el bucket (`us-east-1`). |
| `AWS_ACCESS_KEY_ID` | `ms-multimedia-backend` | Identificador público de la clave IAM con permisos `AmazonS3FullAccess`. |
| `AWS_SECRET_ACCESS_KEY` | `ms-multimedia-backend` | Clave secreta que firma las peticiones de subida a S3 mediante el SDK de AWS. |
| `DYNAMODB_ENDPOINT` | `ms-multimedia-backend` | Conexión a la base NoSQL DynamoDB que guarda los eventos de ocupación y aforo. |
| `TENSORFLOW_CONFIDENCE_THRESHOLD` | `ms-multimedia-backend` | Filtro de precisión de la visión artificial para no marcar falsos positivos. |

---

## 3. ¿Cómo Conectar los Otros Servidores (Azure y GCP) con este Nodo AWS?

Una vez que tengas levantado el servidor de AWS y conozcas su **IP Pública** (ejemplo `54.210.12.34`):

1. **En Azure (`20.102.51.189`):**  
   En `/home/ubuntu/CINEv2/.env`, asegúrate de que la variable `MULTIMEDIA_URL` apunte a esta IP de AWS:
   ```env
   MULTIMEDIA_URL=http://<IP_PUBLICA_AWS>:3001
   ```
2. **En el Navegador de los Clientes:**  
   El frontend de simulación en el puerto `:5175` detecta automáticamente la IP del navegador (`window.location.hostname`) para comunicarse con el backend en el puerto `:3001`, por lo que no requiere configuración manual adicional.

Continúa con [02_CREAR_INFRAESTRUCTURA.md](file:///docs/deploy/aws/02_CREAR_INFRAESTRUCTURA.md) para crear el bucket y la máquina en AWS, o con [03_INSTALAR_HERRAMIENTAS.md](file:///docs/deploy/aws/03_INSTALAR_HERRAMIENTAS.md) si ya los tienes creados.
