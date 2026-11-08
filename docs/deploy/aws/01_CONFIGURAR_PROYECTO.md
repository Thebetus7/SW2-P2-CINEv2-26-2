# Despliegue en Amazon Web Services (AWS) — 01. Configurar Proyecto (Nodo Multimedia + S3)

Este documento detalla las variables de entorno necesarias en la máquina virtual de AWS para `ms-multimedia` y la conexión con el bucket real de AWS S3.

---

## 1. Archivo `.env` Global de AWS (`/home/ubuntu/CINEv2/.env`)

Cree o edite el archivo `.env` en la raíz del proyecto dentro de la instancia EC2 de AWS:

```env
# ===================================================================
# CONFIGURACIÓN DEL NODO AWS (MULTIMEDIA + AWS S3 BUCKET)
# ===================================================================

# Conexión Cross-Cloud hacia Azure (Cinema Core para verificar salas)
CORE_API_URL=http://<IP_PUBLICA_AZURE>:3000

# Integración con AWS S3 Bucket Real
AWS_S3_BUCKET=cinev2-media-bucket-prod
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=<TU_AWS_ACCESS_KEY_ID>
AWS_SECRET_ACCESS_KEY=<TU_AWS_SECRET_ACCESS_KEY>

# Parámetros del modelo TensorFlow COCO-SSD
TENSORFLOW_CONFIDENCE_THRESHOLD=0.60
```

---

## 2. Variables de Multimedia Backend (`ms/ms-multimedia/backend/.env`)

```env
PORT=3001
NODE_ENV=production

# Conexión Cross-Cloud hacia Cinema Core en Azure
CORE_SERVICE_URL=http://<IP_PUBLICA_AZURE>:3000

# AWS S3 Real
AWS_S3_BUCKET=cinev2-media-bucket-prod
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=<TU_AWS_ACCESS_KEY_ID>
AWS_SECRET_ACCESS_KEY=<TU_AWS_SECRET_ACCESS_KEY>

# Tuning de memoria Node para t3.micro
NODE_OPTIONS=--max-old-space-size=384
```
