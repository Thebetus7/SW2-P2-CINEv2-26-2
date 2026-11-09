# Despliegue en Amazon Web Services (AWS) — 02. Crear Servidor y S3 Paso a Paso (Guía Visual Consola Web)

Esta guía está diseñada paso a paso para personas que **nunca han creado un servidor ni un bucket en Amazon Web Services (AWS)**. En Azure se llama *Máquina Virtual*, en GCP se llama *Instancia de VM*, y en AWS el servidor se llama **EC2** (*Elastic Compute Cloud*) y el almacenamiento de archivos se llama **S3** (*Simple Storage Service*).

---

## Resumen de lo que crearemos en AWS

1. **Bucket de AWS S3:** `cinev2-media-bucket-prod` (para guardar y servir públicamente posters y fotos de cartelera).
2. **Credenciales IAM:** Un par de claves (`AWS_ACCESS_KEY_ID` y `AWS_SECRET_ACCESS_KEY`) para que el backend de NestJS pueda subir imágenes al bucket.
3. **Instancia EC2:** Servidor virtual con Ubuntu 22.04 LTS en la capa gratuita (*Free Tier*).
4. **Security Group (Firewall):** Reglas para permitir el acceso a los puertos `22` (SSH), `5175` (Simulador de Salas) y `3001` (API Multimedia).

---

## Paso 0: Iniciar Sesión y Seleccionar la Región

1. Ingresa a la consola de administración de AWS:  
   👉 **[https://console.aws.amazon.com](https://console.aws.amazon.com)**
2. Inicia sesión con tu cuenta de AWS (*Root user* o usuario IAM).
3. **Selecciona la Región (Esquina superior derecha):**  
   Haz clic en el menú desplegable de regiones (al lado de tu nombre de usuario) y selecciona:  
   👉 **EE. UU. Este (Norte de Virginia) `us-east-1`**  
   *(Esta región ofrece la mayor compatibilidad y disponibilidad con la capa gratuita).*

---

## Paso 1: Crear y Configurar el Bucket de AWS S3

El microservicio `ms-multimedia` y el portal cliente almacenan posters de películas en S3 para que los navegadores puedan cargarlos a alta velocidad.

### 1.1 Crear el Bucket
1. En la barra de búsqueda superior de AWS, escribe `S3` y haz clic en el servicio **S3**.
2. En la pantalla principal de S3, haz clic en el botón naranja **"Crear bucket"** (Create bucket).
3. Configura los campos:
   - **Tipo de bucket:** Déjalo en **De uso general** (General purpose).
   - **Nombre del bucket:** Escribe un nombre único a nivel mundial, por ejemplo:  
     `cinev2-media-bucket-prod-tu-nombre` (ej: `cinev2-media-bucket-prod-edberto`).  
     *(Guarda este nombre, lo usarás en el archivo `.env`).*
   - **Región de AWS:** Asegúrate de que diga **EE. UU. Este (Norte de Virginia) us-east-1**.
   - **Propiedad de objetos:** Deja seleccionada la opción recomendada **ACL deshabilitadas** (ACLs disabled).
4. **Bloqueo de acceso público (Block Public Access):**
   - ⚠️ **DESMARCA** la casilla principal:  
     ☐ **Bloquear *todo* el acceso público** (Block *all* public access).
   - Al desmarcarla, aparecerá una advertencia amarilla abajo. Marca la casilla de confirmación:  
     ☑ *Reconozco que la configuración actual puede provocar que este bucket y los objetos que contiene pasen a ser públicos*.  
     *(Esto es necesario para que cualquier persona en internet pueda ver los posters de las películas en la cartelera).*
5. **Cifrado del bucket:** Déjalo por defecto (Cifrado del lado del servidor con claves administradas por Amazon S3 - SSE-S3).
6. Ve al fondo de la página y haz clic en el botón naranja **"Crear bucket"** (Create bucket).

### 1.2 Agregar la Política de Lectura Pública (Bucket Policy)
Para que las imágenes subidas al bucket puedan ser leídas por los navegadores:

1. En la lista de buckets, haz clic sobre el nombre del bucket que acabas de crear.
2. Haz clic en la pestaña superior **"Permisos"** (Permissions).
3. Baja hasta la sección **"Política de bucket"** (Bucket policy) y haz clic en el botón **"Editar"** (Edit).
4. En el cuadro de texto del editor, pega el siguiente bloque JSON (reemplazando `TU_NOMBRE_DE_BUCKET` por el nombre exacto de tu bucket):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::TU_NOMBRE_DE_BUCKET/*"
    }
  ]
}
```

5. Baja y haz clic en el botón naranja **"Guardar cambios"** (Save changes).  
   *(Ahora verás una etiqueta roja/naranja que dice **Público**, lo cual indica que las imágenes son visibles en la web).*

---

## Paso 2: Crear Credenciales de Acceso (AWS IAM)

Para que el backend de Node.js/NestJS tenga autorización de subir imágenes a S3 desde el servidor, necesita un par de claves (`Access Key` y `Secret Key`).

1. En la barra de búsqueda superior de AWS, escribe `IAM` y haz clic en **IAM**.
2. En el menú lateral izquierdo, haz clic en **"Usuarios"** (Users) y luego en el botón azul/naranja **"Crear usuario"** (Create user).
3. **Paso 1: Especificar detalles de usuario:**
   - Nombre de usuario: `cinev2-s3-service-user`
   - No marques la casilla de acceso a la consola de administración. Haz clic en **Siguiente** (Next).
4. **Paso 2: Establecer permisos:**
   - Selecciona la opción **"Asociar políticas directamente"** (Attach policies directly).
   - En el buscador de políticas escribe: `AmazonS3FullAccess`
   - Marca la casilla ☑ al lado de **`AmazonS3FullAccess`**.
   - Haz clic en **Siguiente** (Next) y luego en **"Crear usuario"** (Create user).
5. **Paso 3: Generar las Claves de Acceso:**
   - En la lista de usuarios, haz clic sobre el usuario recién creado: `cinev2-s3-service-user`.
   - Haz clic en la pestaña **"Credenciales de seguridad"** (Security credentials).
   - Baja hasta la sección **Claves de acceso** (Access keys) y haz clic en **"Crear clave de acceso"** (Create access key).
   - En el caso de uso, selecciona **"Código local"** (Local code) o **"Otro"** (Other).
   - Marca la casilla de confirmación y haz clic en **Siguiente** -> **Crear clave de acceso**.
6. ⚠️ **MUY IMPORTANTE (Copiar claves ahora):**
   - Verás dos valores:
     - **Clave de acceso (Access Key ID):** Ejemplo `AKIAIOSFODNN7EXAMPLE`
     - **Clave de acceso secreta (Secret Access Key):** Haz clic en "Mostrar" y copia la clave larga.
   - Copia ambos valores en un bloc de notas temporal o descarga el archivo `.csv`. *(AWS nunca más te volverá a mostrar la clave secreta después de cerrar esta pantalla).*

---

## Paso 3: Crear el Servidor EC2 (Máquina Virtual)

Ahora crearemos el servidor donde correrán los contenedores Docker de Multimedia.

### 3.1 Iniciar el Asistente de Creación
1. En la barra de búsqueda superior, escribe `EC2` y selecciona **EC2**.
2. En el panel de control de EC2, busca el botón naranja **"Lanzar la instancia"** (Launch instance) y haz clic en él.

### 3.2 Llenar el Formulario de la Instancia

Configura paso a paso los siguientes apartados:

1. **Nombre y etiquetas:**
   - En el campo *Nombre*, escribe: `cinev2-aws-multimedia-node`
2. **Imágenes de aplicaciones y sistemas operativos (AMI):**
   - Haz clic en el ícono de **Ubuntu**.
   - En el menú desplegable *AMI*, asegúrate de que esté seleccionada:  
     👉 **Ubuntu Server 22.04 LTS (HVM), SSD Volume Type** (Arquitectura de 64 bits x86).  
     *(Aparecerá una etiqueta verde que dice: **Apto para la capa gratuita** / Free tier eligible).*
3. **Tipo de instancia:**
   - Selecciona: **`t3.micro`** (2 vCPU, 1 GiB de memoria) o **`t2.micro`** (1 vCPU, 1 GiB de memoria).  
     *(Ambas son aptas para la capa gratuita con 750 horas al mes).*
4. **Par de claves (Key pair - Inicio de sesión):**
   - Este archivo permite conectarte de forma segura por SSH a tu servidor.
   - Haz clic en el enlace azul **"Crear nuevo par de claves"** (Create new key pair).
   - Se abrirá una ventana emergente:
     - **Nombre del par de claves:** Escribe `cinev2-aws-key`
     - **Tipo de par de claves:** RSA
     - **Formato de archivo de clave privada:** Selecciona **`.pem`** (para usar con OpenSSH en Windows PowerShell, Mac o Linux).
   - Haz clic en **"Crear par de claves"**.  
     👉 *Tu navegador descargará automáticamente el archivo `cinev2-aws-key.pem`. Guárdalo bien en tu carpeta de Descargas o en `C:\Users\TU_USUARIO\.ssh\`.*
5. **Configuración de red (Firewall / Security Group):**
   - Deja seleccionada la opción **"Crear grupo de seguridad"** (Create security group).
   - Marca las siguientes casillas:
     - ☑ **Permitir el tráfico de SSH desde:** *Cualquier lugar (0.0.0.0/0)*.
     - ☑ **Permitir el tráfico de HTTP desde Internet**.
     - ☑ **Permitir el tráfico de HTTPS desde Internet**.
   - *(En el Paso 4 abriremos los puertos específicos de CineV2: `5175` y `3001`).*
6. **Configurar almacenamiento (Disco Duro):**
   - Por defecto AWS pone `8 GiB`.
   - Cámbialo a: **`30 GiB`** de tipo **gp3**.  
     *(La capa gratuita de AWS incluye hasta **30 GB** de almacenamiento EBS gratis al mes. Los 30 GB son necesarios para compilar Docker, el modelo de TensorFlow y el archivo Swap de 4 GB).*
7. **Lanzar Instancia:**
   - Revisa el panel derecho que resume la configuración y haz clic en el botón naranja grande:  
     👉 **"Lanzar instancia"** (Launch instance).
   - Espera 10 segundos hasta ver el mensaje verde: *Iniciado correctamente*.
   - Haz clic en el botón inferior **"Ver todas las instancias"** (View all instances).

---

## Paso 4: Abrir los Puertos de CineV2 en el Security Group de AWS

El servidor debe recibir conexiones en los puertos del frontend simulador (`5175`) y del backend de IA (`3001`):

1. En la lista de instancias de EC2, haz clic sobre tu instancia `cinev2-aws-multimedia-node`.
2. En la mitad inferior de la pantalla, haz clic en la pestaña **"Seguridad"** (Security).
3. Verás un enlace con el nombre del grupo de seguridad, por ejemplo: `launch-wizard-1` o `sg-0abc123...`. Haz clic sobre él.
4. En la pantalla del grupo de seguridad, haz clic en la pestaña **"Reglas de entrada"** (Inbound rules) y presiona el botón **"Editar reglas de entrada"** (Edit inbound rules).
5. Haz clic en el botón **"Agregar regla"** (Add rule) y agrega:
   - **Regla 1 (Frontend Simulador de Salas):**
     - Tipo: **TCP personalizado** (Custom TCP)
     - Intervalo de puertos: `5175`
     - Origen: Selecciona **Anywhere-IPv4** (`0.0.0.0/0`)
     - Descripción: `CineV2 Frontend Simulador`
   - Haz clic nuevamente en **"Agregar regla"**:
   - **Regla 2 (Backend API Multimedia TensorFlow):**
     - Tipo: **TCP personalizado** (Custom TCP)
     - Intervalo de puertos: `3001`
     - Origen: Selecciona **Anywhere-IPv4** (`0.0.0.0/0`)
     - Descripción: `CineV2 Backend Multimedia API`
6. Haz clic en el botón naranja **"Guardar reglas"** (Save rules).

---

## Paso 5: Cómo Conectarse a la Instancia EC2

Para empezar a instalar Docker y clonar el repositorio, debes entrar a la terminal de tu servidor. Tienes dos formas muy sencillas:

### Opción A (La más fácil — Sin instalar nada, directo en el navegador web):
1. Ve a la lista de **Instancias** en la consola de EC2.
2. Selecciona tu máquina `cinev2-aws-multimedia-node` marcando su casilla.
3. En la parte superior derecha, haz clic en el botón **"Conectar"** (Connect).
4. Deja seleccionada la pestaña **"EC2 Instance Connect"**.
5. Asegúrate de que el nombre de usuario sea `ubuntu` y haz clic en el botón naranja **"Conectar"** abajo a la derecha.
6. ¡Listo! Se abrirá una pestaña en tu navegador con la terminal negra de Ubuntu lista para usar.

---

### Opción B (Desde tu computadora con Windows PowerShell usando el archivo `.pem`):
1. Abre **PowerShell** en tu computadora.
2. Navega hasta donde se descargó tu archivo `.pem` (usualmente la carpeta Descargas):
   ```powershell
   cd C:\Users\TU_USUARIO\Downloads
   ```
3. Si Windows te da un error de permisos con la llave `.pem` (`Permissions are too open`), ejecuta estos dos comandos para protegerla:
   ```powershell
   icacls.exe cinev2-aws-key.pem /reset
   icacls.exe cinev2-aws-key.pem /grant:r "$($env:USERNAME):(R)"
   ```
4. Conéctate reemplazando `<IP_PUBLICA_AWS>` por la **Dirección IPv4 pública** que aparece en la consola de EC2:
   ```bash
   ssh -i cinev2-aws-key.pem ubuntu@<IP_PUBLICA_AWS>
   ```
5. Si te pregunta `Are you sure you want to continue connecting (yes/no/[fingerprint])?`, escribe `yes` y presiona `Enter`.

---

## Resumen de Datos Obtenidos

Al completar esta guía, tendrás anotados estos datos para los siguientes pasos:

| Dato | Ejemplo | Dónde se utilizará |
| :--- | :--- | :--- |
| **IP Pública de EC2** | `54.210.12.34` | Para acceder al frontend `:5175` y configurar el `.env` de Azure |
| **Nombre del Bucket S3** | `cinev2-media-bucket-prod-edberto` | En el archivo `.env` de AWS y Azure |
| **AWS_ACCESS_KEY_ID** | `AKIAIOSFODNN7EXAMPLE` | En el archivo `.env` de AWS |
| **AWS_SECRET_ACCESS_KEY** | `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY` | En el archivo `.env` de AWS |
| **Región de AWS** | `us-east-1` | En el archivo `.env` de AWS |

Continúa con [03_INSTALAR_HERRAMIENTAS.md](file:///docs/deploy/aws/03_INSTALAR_HERRAMIENTAS.md) para configurar la memoria Swap de 4 GB y Docker.
