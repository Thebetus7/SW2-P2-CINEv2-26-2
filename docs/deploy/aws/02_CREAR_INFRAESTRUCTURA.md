# Despliegue en Amazon Web Services (AWS) — 02. Crear Servidor y S3 Paso a Paso (Guía Visual Consola Web)

Esta guía está diseñada paso a paso para personas que **nunca han creado un servidor ni un bucket en Amazon Web Services (AWS)**. En esta guía utilizaremos la distribución oficial recomendada por AWS: **Amazon Linux 2023 (AL2023)**, elegible para la capa gratuita (*Free Tier*).

---

## Resumen de lo que crearemos en AWS

1. **Bucket de AWS S3:** `cinev2-media-ticket` (para guardar y servir públicamente posters y fotos de cartelera).
2. **Credenciales IAM:** Un par de claves (`AWS_ACCESS_KEY_ID` y `AWS_SECRET_ACCESS_KEY`) para que el backend de NestJS pueda subir imágenes al bucket.
3. **Instancia EC2:** Servidor virtual con **Amazon Linux 2023 AMI** en la capa gratuita (*Free Tier*).
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
     `cinev2-media-ticket`  
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

1. En la lista de buckets, haz clic sobre el nombre del bucket que acabas de crear (`cinev2-media-ticket`).
2. Haz clic en la pestaña superior **"Permisos"** (Permissions).
3. Baja hasta la sección **"Política de bucket"** (Bucket policy) y haz clic en el botón **"Editar"** (Edit).
4. En el cuadro de texto del editor, pega el siguiente bloque JSON:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::cinev2-media-ticket/*"
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
6. ⚠️ **Copiar claves ahora:**
   - Copia la **Clave de acceso (Access Key ID)** y la **Clave de acceso secreta (Secret Access Key)** en un bloc de notas temporal.

---

## Paso 3: Crear el Servidor EC2 con Amazon Linux 2023 (Capa Gratuita)

### 3.1 Iniciar el Asistente de Creación
1. En la barra de búsqueda superior, escribe `EC2` y selecciona **EC2**.
2. En el panel de control de EC2, haz clic en el botón naranja **"Lanzar la instancia"** (Launch instance).

### 3.2 Llenar el Formulario de la Instancia

1. **Nombre y etiquetas:**
   - En el campo *Nombre*, escribe: `cinev2-aws-multimedia-node`
2. **Imágenes de aplicaciones y sistemas operativos (AMI):**
   - Haz clic en el ícono de **Amazon Linux**.
   - En el menú desplegable *AMI*, asegúrate de seleccionar:  
     👉 **Amazon Linux 2023 AMI** *(Apto para la capa gratuita / Free tier eligible)*.  
     *(Arquitectura: 64 bits x86).*
3. **Tipo de instancia:**
   - Selecciona: **`t3.micro`** (2 vCPU, 1 GiB de memoria) o **`t2.micro`** (1 vCPU, 1 GiB de memoria).  
     *(Aptas para la capa gratuita de 750 horas al mes).*
4. **Par de claves (Key pair - Inicio de sesión):**
   - Haz clic en **"Crear nuevo par de claves"** (Create new key pair) o selecciona una clave existente.
   - Si creas una nueva:
     - Nombre: `cinev2-aws-key`
     - Tipo: RSA, Formato: `.pem`
     - Haz clic en **"Crear par de claves"** y se descargará el archivo `cinev2-aws-key.pem`.
5. **Configuración de red (Firewall / Security Group):**
   - Deja seleccionada la opción **"Crear grupo de seguridad"** (Create security group).
   - Marca las siguientes casillas:
     - ☑ **Permitir el tráfico de SSH desde:** *Cualquier lugar (0.0.0.0/0)*.
     - ☑ **Permitir el tráfico de HTTP desde Internet**.
     - ☑ **Permitir el tráfico de HTTPS desde Internet**.
6. **Configurar almacenamiento (Disco Duro):**
   - Cambia el tamaño de `8 GiB` a: **`30 GiB`** de tipo **gp3**.  
     *(La capa gratuita de AWS incluye hasta 30 GB de almacenamiento EBS gratis al mes. Son necesarios para compilar Docker, el modelo de TensorFlow y el archivo Swap de 4 GB).*
7. **Lanzar Instancia:**
   - Haz clic en el botón naranja grande: **"Lanzar instancia"** (Launch instance).
   - Haz clic en **"Ver todas las instancias"** (View all instances).

---

## Paso 4: Abrir los Puertos de CineV2 en el Security Group de AWS

1. En la lista de instancias de EC2, haz clic sobre tu instancia `cinev2-aws-multimedia-node`.
2. En la parte inferior, haz clic en la pestaña **"Seguridad"** (Security).
3. Haz clic sobre el enlace del **Grupo de seguridad** (Security group).
4. Pestaña **"Reglas de entrada"** (Inbound rules) $\rightarrow$ botón **"Editar reglas de entrada"** (Edit inbound rules).
5. Agrega estas dos reglas:
   - **Regla 1 (Frontend Simulador de Salas):**
     - Tipo: **TCP personalizado** (Custom TCP)
     - Intervalo de puertos: `5175`
     - Origen: **Anywhere-IPv4** (`0.0.0.0/0`)
   - **Regla 2 (Backend API Multimedia TensorFlow):**
     - Tipo: **TCP personalizado** (Custom TCP)
     - Intervalo de puertos: `3001`
     - Origen: **Anywhere-IPv4** (`0.0.0.0/0`)
6. Haz clic en el botón naranja **"Guardar reglas"** (Save rules).

---

## Paso 5: Cómo Conectarse a la Instancia EC2

> [!NOTE]
> En **Amazon Linux 2023**, el usuario administrador por defecto es **`ec2-user`** (a diferencia de Ubuntu que usa `ubuntu`).

### Opción A (Recomendada — Desde el navegador web sin llaves):
1. En la lista de instancias de EC2, selecciona tu máquina `cinev2-aws-multimedia-node`.
2. Haz clic arriba en el botón **"Conectar"** (Connect).
3. En la pestaña **"EC2 Instance Connect"**, verifica que el nombre de usuario sea:  
   👉 **`ec2-user`**
4. Haz clic en el botón naranja **"Conectar"**. Se abrirá la terminal de Amazon Linux 2023 lista en tu navegador.

---

### Opción B (Desde Windows PowerShell con tu llave `.pem`):
1. Abre PowerShell y ve a donde se descargó tu archivo `.pem`:
   ```powershell
   cd C:\Users\TU_USUARIO\Downloads
   ```
2. Asigna permisos correctos a la llave:
   ```powershell
   icacls.exe cinev2-aws-key.pem /reset
   icacls.exe cinev2-aws-key.pem /grant:r "$($env:USERNAME):(R)"
   ```
3. Conéctate como **`ec2-user`**:
   ```bash
   ssh -i cinev2-aws-key.pem ec2-user@<IP_PUBLICA_AWS>
   ```

Continúa con [03_INSTALAR_HERRAMIENTAS.md](file:///docs/deploy/aws/03_INSTALAR_HERRAMIENTAS.md) para configurar el Swap de 4 GB, Docker y Docker Compose en Amazon Linux 2023.
