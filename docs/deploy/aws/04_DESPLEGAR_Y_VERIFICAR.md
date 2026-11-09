# Despliegue en Amazon Web Services (AWS) — 04. Desplegar y Verificar (Nodo Multimedia + S3)

Este documento guía paso a paso la puesta en marcha de los contenedores Docker en **AWS EC2** (`ms-multimedia` y `dynamodb-local`) y la comprobación de la integración con el bucket real de **AWS S3**.

---

## 1. Clonar el Repositorio en la Instancia EC2

Estando dentro de la terminal de tu servidor de AWS:

```bash
cd /home/ubuntu
git clone https://github.com/Thebetus7/SW2-P2-CINEv2-26-2.git CINEv2
cd CINEv2
```

---

## 2. Crear el Archivo de Configuración `.env`

Crea el archivo `.env` en la raíz del proyecto:

```bash
nano .env
```

Pega el siguiente contenido (asegúrate de colocar el nombre real de tu bucket y tus credenciales IAM de AWS):

```env
# ===================================================================
# CONFIGURACIÓN DEL NODO AWS (MULTIMEDIA + AWS S3 BUCKET)
# ===================================================================

# 1. IP del Backend Central en GCP (puerto 3000 de Cinema Core)
CORE_API_URL=http://34.10.125.253:3000

# 2. Bucket Real de AWS S3 y Credenciales IAM
AWS_S3_BUCKET=cinev2-media-bucket-prod-tu-nombre
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY

# 3. Base NoSQL DynamoDB Local (para eventos de congestión)
DYNAMODB_ENDPOINT=http://dynamodb-local:8000

# 4. Umbral de Detección de Personas con TensorFlow
TENSORFLOW_CONFIDENCE_THRESHOLD=0.60
```

Guarda con `Ctrl + O`, presiona `Enter` y sal con `Ctrl + X`.

---

## 3. Construir y Levantar los Contenedores con Docker Compose

El manifiesto `docker-compose.aws.yml` compila únicamente los microservicios asignados a AWS:
- `ms-multimedia-backend` (NestJS con TensorFlow COCO-SSD en el puerto `3001`).
- `ms-multimedia-frontend` (React + Vite Simulador en el puerto `5175`).
- `dynamodb-local` (Motor NoSQL en el puerto `8002`).

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

Para comprobar que tu servidor puede comunicarse con tu bucket de AWS S3, puedes instalar `awscli` en Ubuntu y hacer una prueba rápida:

```bash
# 1. Instalar AWS CLI si no está instalado
sudo apt install -y awscli

# 2. Configurar temporalmente tus credenciales (si no lo has hecho)
aws configure set aws_access_key_id <TU_AWS_ACCESS_KEY_ID>
aws configure set aws_secret_access_key <TU_AWS_SECRET_ACCESS_KEY>
aws configure set default.region us-east-1

# 3. Subir un archivo de prueba al bucket
echo "Prueba de subida desde EC2 - CineV2 Multimedia" > /tmp/prueba-s3.txt
aws s3 cp /tmp/prueba-s3.txt s3://TU_NOMBRE_DE_BUCKET/posters/prueba.txt

# 4. Listar el contenido del bucket para confirmar que se subió
aws s3 ls s3://TU_NOMBRE_DE_BUCKET/posters/
```

**Resultado esperado:**  
Verás en consola el archivo `prueba.txt`, lo que confirma que el servidor y las credenciales IAM tienen acceso de escritura y lectura al almacenamiento en la nube de AWS.

---

## 5. Probar el Sistema en el Navegador

Abre tu navegador (Edge, Chrome, etc.) e ingresa a las siguientes direcciones, reemplazando `<IP_AWS>` por la **IP Pública de tu servidor EC2**:

### 1. Frontend Simulador Multimedia de Cámaras en Sala:
👉 **`http://<IP_AWS>:5175`**
- Verás la interfaz del simulador con los controles de reproducción de transmisiones de cámara.
- Podrás observar la superposición de cajas de detección generadas por **TensorFlow COCO-SSD** identificando aforo y asientos ocupados.

### 2. Backend Health Check de la API Multimedia:
👉 **`http://<IP_AWS>:3001/health`**
- Deberá responder un JSON indicando que el servicio está activo:
  ```json
  {"status":"ok","timestamp":"2026-..."}
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

Con esto, los tres proveedores de nube (**Azure + GCP + AWS**) quedarán 100% interconectados y comunicándose entre sí en producción.
