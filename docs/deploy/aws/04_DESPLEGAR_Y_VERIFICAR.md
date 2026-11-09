# Despliegue en Amazon Web Services (AWS) — 04. Desplegar y Verificar (Nodo Multimedia + S3)

Este documento guía paso a paso la puesta en marcha de los contenedores Docker en **Amazon Linux 2023** (`ms-multimedia` y `dynamodb-local`) y la comprobación de la integración con el bucket real de **AWS S3** (`cinev2-media-ticket`).

---

## 1. Clonar el Repositorio en la Instancia EC2

Estando dentro de la terminal de tu servidor de AWS como `ec2-user`:

```bash
cd /home/ec2-user
git clone https://github.com/Thebetus7/SW2-P2-CINEv2-26-2.git CINEv2
cd CINEv2
```

---

## 2. Crear el Archivo de Configuración `.env`

Crea el archivo `.env` en la raíz del proyecto:

```bash
cat << 'EOF' > .env
# ===================================================================
# CONFIGURACIÓN DEL NODO AWS (MULTIMEDIA + AWS S3 BUCKET)
# ===================================================================

# 1. IP del Backend Central en GCP (puerto 3000 de Cinema Core)
CORE_API_URL=http://34.10.125.253:3000

# 2. Bucket Real de AWS S3 y Credenciales IAM
AWS_S3_BUCKET=cinev2-media-ticket
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=TU_ACCESS_KEY_ID_AQUI
AWS_SECRET_ACCESS_KEY=TU_SECRET_ACCESS_KEY_AQUI

# 3. Base NoSQL DynamoDB Local (para eventos de congestión)
DYNAMODB_ENDPOINT=http://dynamodb-local:8000

# 4. Umbral de Detección de Personas con TensorFlow
TENSORFLOW_CONFIDENCE_THRESHOLD=0.60
EOF
```

*(Edita con `nano .env` para colocar tus credenciales reales de IAM generadas en el Paso 2).*

---

## 3. Construir y Levantar los Contenedores con Docker Compose

Ejecuta:

```bash
# 1. Construir las imágenes Docker (tardará 2 a 3 minutos la primera vez)
docker compose -f docker-compose.aws.yml build

# 2. Levantar los contenedores en segundo plano
docker compose -f docker-compose.aws.yml up -d

# 3. Comprobar que los 3 contenedores estén en estado "Up"
docker compose -f docker-compose.aws.yml ps
```

**Resultado esperado:**
```text
NAME                                   COMMAND                  SERVICE                  STATUS              PORTS
SW2-P2-CINEv2-dynamodb-local           "-jar DynamoDBLocal.…"   dynamodb-local           Up                  0.0.0.0:8002->8000/tcp
SW2-P2-CINEv2-ms-multimedia-backend    "docker-entrypoint.s…"   ms-multimedia-backend    Up                  0.0.0.0:3001->3001/tcp
SW2-P2-CINEv2-ms-multimedia-frontend   "/docker-entrypoint.…"   ms-multimedia-frontend   Up                  0.0.0.0:5175->80/tcp
```

---

## 4. Verificar la Conexión con el Bucket de AWS S3

Para comprobar que tu servidor puede comunicarse con tu bucket `cinev2-media-ticket`:

```bash
# 1. Subir un archivo de prueba al bucket
echo "Prueba de subida desde EC2 - CineV2 Multimedia" > /tmp/prueba-s3.txt
aws s3 cp /tmp/prueba-s3.txt s3://cinev2-media-ticket/posters/prueba.txt

# 2. Listar el contenido del bucket para confirmar que se subió
aws s3 ls s3://cinev2-media-ticket/posters/
```

**Resultado esperado:**  
Verás en consola el archivo `prueba.txt`, lo que confirma que el servidor y las credenciales IAM tienen acceso de escritura y lectura al almacenamiento en la nube de AWS.

---

## 5. Probar el Sistema en el Navegador

Abre tu navegador (Edge, Chrome, etc.) e ingresa a las siguientes direcciones, reemplazando `<IP_AWS>` por la **IP Pública de tu servidor EC2**:

### 1. Frontend Simulador Multimedia de Cámaras en Sala:
👉 **`http://<IP_AWS>:5175`**
- Verás la interfaz del simulador con los controles de reproducción de transmisiones de cámara y el canvas de **TensorFlow COCO-SSD** detectando butacas ocupadas.

### 2. Backend Health Check de la API Multimedia:
👉 **`http://<IP_AWS>:3001/health`**
- Deberá responder un JSON indicando que el servicio está activo:
  ```json
  {"status":"ok"}
  ```

---

## 6. Cerrar el Enlace Cross-Cloud en el Servidor de Azure

Una vez que tengas la IP pública de AWS funcionando:

1. Entra a tu servidor de **Azure** (`20.102.51.189`).
2. Abre el archivo `/home/ubuntu/CINEv2/.env`.
3. Actualiza la variable `MULTIMEDIA_URL` con tu IP de AWS:
   ```env
   MULTIMEDIA_URL=http://<IP_PUBLICA_AWS>:3001
   ```
4. Reinicia el backend de tickets en Azure para que tome el nuevo enlace:
   ```bash
   docker compose -f docker-compose.azure.yml up -d ms-ticket-auth-backend
   ```
