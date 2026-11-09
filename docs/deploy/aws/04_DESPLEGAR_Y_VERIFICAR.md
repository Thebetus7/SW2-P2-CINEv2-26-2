# Despliegue en Amazon Web Services (AWS) — 04. Desplegar y Verificar (Nodo Multimedia + S3)

Este documento guía el levantamiento de los servicios del nodo **AWS** mediante `docker-compose.aws.yml` y la comprobación de la integración con el bucket real de AWS S3 y DynamoDB.

---

## 1. Conexión y Clonación del Proyecto en AWS EC2

Conéctese a su instancia EC2:

```bash
ssh -i ~/.ssh/cinev2-aws-key.pem ubuntu@<TU_IP_PUBLICA_AWS>
```

> [!NOTE]
> En AWS también se clona la raíz del monorepositorio. El comando `docker-compose.aws.yml` solo compila y activa los contenedores asignados a AWS (`ms-multimedia` y `dynamodb-local`).

Clone el proyecto y entre al directorio:

```bash
cd /home/ubuntu
git clone https://github.com/Thebetus7/SW2-P2-CINEv2-26-2.git CINEv2
cd CINEv2
```

---

## 2. Configurar el Archivo `.env` Raíz

Cree el archivo `.env` en la raíz del repositorio:

```bash
cat << 'EOF' > .env
# ===================================================================
# CONFIGURACIÓN DEL NODO AWS (MULTIMEDIA + AWS S3 BUCKET)
# ===================================================================
CORE_API_URL=http://<IP_PUBLICA_GCP>:3000
AWS_S3_BUCKET=cinev2-media-bucket-prod
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=<TU_AWS_ACCESS_KEY_ID>
AWS_SECRET_ACCESS_KEY=<TU_AWS_SECRET_ACCESS_KEY>
DYNAMODB_ENDPOINT=http://dynamodb-local:8000
TENSORFLOW_CONFIDENCE_THRESHOLD=0.60
EOF
```

---

## 3. Levantar el Nodo AWS con `docker-compose.aws.yml`

```bash
# 1. Construir las imágenes Docker
docker compose -f docker-compose.aws.yml build

# 2. Levantar los 3 contenedores en segundo plano
docker compose -f docker-compose.aws.yml up -d

# 3. Comprobar estado de los servicios
docker compose -f docker-compose.aws.yml ps
```

Resultado observable esperado en `docker compose ps`:
- `SW2-P2-CINEv2-ms-multimedia-backend` (0.0.0.0:3001->3001/tcp) — Up
- `SW2-P2-CINEv2-ms-multimedia-frontend` (0.0.0.0:5175->80/tcp) — Up
- `SW2-P2-CINEv2-dynamodb-local` (0.0.0.0:8002->8000/tcp) — Up

---

## 4. Verificación de Integración con AWS S3

Pruebe subir una imagen de prueba al bucket de AWS S3 desde el servidor:

```bash
# Crear imagen de prueba y subirla a S3
echo "Poster de prueba CineV2" > /tmp/test-poster.txt
aws s3 cp /tmp/test-poster.txt s3://cinev2-media-bucket-prod/posters/test.txt

# Verificar que el archivo esté en S3
aws s3 ls s3://cinev2-media-bucket-prod/posters/
```

Resultado observable: `test.txt` listado en el bucket.

---

## 5. Pruebas Funcionales en el Navegador

Abra en su navegador reemplazando `<IP_AWS>` por la IP pública de su instancia EC2:
- `http://<IP_AWS>:5175` — Simulador Multimedia de Cámaras en Sala. Verifique el canvas de visión artificial TensorFlow detectando las butacas y personas.
- `http://<IP_AWS>:3001/health` — Verifique respuesta JSON `{"status":"ok"}`.
