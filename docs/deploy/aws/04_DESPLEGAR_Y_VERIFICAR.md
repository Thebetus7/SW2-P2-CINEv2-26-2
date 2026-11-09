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

## 2. Crear y Configurar el Archivo `.env` (Paso Crucial)

> [!WARNING]
> **NO dejes `TU_ACCESS_KEY_ID_AQUI` ni `TU_SECRET_ACCESS_KEY_AQUI`:**  
> Esos textos son marcadores de posición (*placeholders*). Si los dejas así, la API de multimedia fallará al intentar autenticarse contra AWS S3 arrojando el error `InvalidAccessKeyId: The AWS Access Key Id you provided does not exist in our records`.

### 2.1 Cómo Obtener tus Credenciales Reales en AWS IAM (si aún no las tienes)

Si no guardaste tus claves en el paso anterior, puedes generarlas en 1 minuto:
1. En la consola web de AWS ([console.aws.amazon.com](https://console.aws.amazon.com)), busca **IAM** en la barra superior.
2. En el menú izquierdo, haz clic en **Usuarios** (Users).
3. Selecciona tu usuario (ej. `cinev2-s3-service-user`).
   - *(Asegúrate de que en la pestaña "Permisos" tenga asignada la política `AmazonS3FullAccess`)*.
4. Haz clic en la pestaña **"Credenciales de seguridad"** (Security credentials).
5. Baja hasta la sección **Claves de acceso** (Access keys) y haz clic en **"Crear clave de acceso"** (Create access key).
6. Selecciona el caso de uso **"Código local"** (Local code), marca la casilla de confirmación y haz clic en **Siguiente** $\rightarrow$ **Crear clave de acceso**.
7. Verás dos cadenas de texto:
   - **Clave de acceso (Access Key ID):** Empieza siempre con **`AKIA...`** (ejemplo: `AKIA4V2EXAMPLE123456`).
   - **Clave de acceso secreta (Secret Access Key):** Una cadena larga de unos 40 caracteres (ejemplo: `vF7b+9KjL1mN2oP3qR4sT5uV6wX7yZ8aB9c0d1e2`).

---

### 2.2 Crear el Archivo `.env` en la Terminal de EC2

Ejecuta el siguiente comando para generar la plantilla base en `/home/ec2-user/CINEv2/.env`:

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
AWS_ACCESS_KEY_ID=AKIA_PEGA_AQUI_TU_ACCESS_KEY
AWS_SECRET_ACCESS_KEY=PEGA_AQUI_TU_SECRET_ACCESS_KEY

# 3. Base NoSQL DynamoDB Local (para eventos de congestión)
DYNAMODB_ENDPOINT=http://dynamodb-local:8000

# 4. Umbral de Detección de Personas con TensorFlow
TENSORFLOW_CONFIDENCE_THRESHOLD=0.60
EOF
```

### 2.3 Editar el `.env` con tus Claves Reales

Abre el archivo con el editor `nano`:

```bash
nano .env
```

1. Usa las flechas del teclado para situarte en `AWS_ACCESS_KEY_ID=` y reemplaza con tu clave que empieza con `AKIA...`.
2. Sitúate en `AWS_SECRET_ACCESS_KEY=` y reemplaza con tu clave secreta de IAM.
3. Guarda los cambios: presiona `Ctrl + O`, luego la tecla `Enter`, y sal del editor con `Ctrl + X`.

### 2.4 Ejemplo Visual de un `.env` Correcto

Tu archivo `.env` terminado debe lucir similar a esto (sin comillas y con tus valores reales):

```env
CORE_API_URL=http://34.10.125.253:3000
AWS_S3_BUCKET=cinev2-media-ticket
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIA3X7N8PQ2ABCDEF12
AWS_SECRET_ACCESS_KEY=u8YxZ+3mK9jL1nB4vC7wQ2eR5tY8uI0oP3aS6d9F
DYNAMODB_ENDPOINT=http://dynamodb-local:8000
TENSORFLOW_CONFIDENCE_THRESHOLD=0.60
```

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
