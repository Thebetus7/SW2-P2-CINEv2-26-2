# Despliegue en Amazon Web Services (AWS) — 04. Desplegar y Verificar (Nodo Multimedia + S3)

Este documento guía el levantamiento de los servicios del nodo AWS mediante `docker-compose.aws.yml` y la comprobación de la integración con el bucket real de AWS S3.

---

## 1. Conexión y Clonación en EC2

```bash
# Conectar por SSH
ssh -i ~/.ssh/cinev2-aws-key.pem ubuntu@<IP_AWS>

# Clonar el proyecto
cd /home/ubuntu
git clone https://github.com/<TU_USUARIO>/CINEv2.git
cd CINEv2

# Configurar variables del archivo .env
nano .env
```

---

## 2. Levantar el Nodo AWS con `docker-compose.aws.yml`

```bash
# Construir y levantar los contenedores de AWS
docker compose -f docker-compose.aws.yml build --parallel
docker compose -f docker-compose.aws.yml up -d

# Comprobar estado de los servicios
docker compose -f docker-compose.aws.yml ps
```

Resultado observable esperado:
- `SW2-P2-CINEv2-ms-multimedia-backend` (3001:3001) — Up
- `SW2-P2-CINEv2-ms-multimedia-frontend` (5175:80) — Up
- `SW2-P2-CINEv2-dynamodb-local` (8002:8000) — Up

---

## 3. Verificación de Integración con AWS S3

Pruebe subir una imagen de prueba al bucket de AWS S3:

```bash
# Crear imagen de prueba y subirla a S3
echo "Poster de prueba CineV2" > /tmp/test-poster.txt
aws s3 cp /tmp/test-poster.txt s3://cinev2-media-bucket-prod/posters/test.txt

# Verificar que el archivo esté en S3
aws s3 ls s3://cinev2-media-bucket-prod/posters/
```
Resultado observable: `test.txt` listado en el bucket.

---

## 4. Pruebas Funcionales del Simulador en el Navegador

Abra en su navegador:
- `http://<IP_AWS>:5175` — Simulador Multimedia de Cámaras en Sala. Verifique el canvas de visión artificial TensorFlow detectando las butacas y personas.
- `http://<IP_AWS>:3001/health` — Verifique respuesta JSON `{"status":"ok"}`.
