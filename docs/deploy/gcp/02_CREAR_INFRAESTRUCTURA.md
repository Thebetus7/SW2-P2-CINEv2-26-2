# Despliegue en Google Cloud Platform (GCP) — 02. Crear Infraestructura (Nodo Cinema-Core + Boleteo)

Esta guía explica paso a paso cómo crear la máquina virtual en Google Cloud Console para alojar **Cinema-Core (NestJS / Angular)** y **Boleteo-Validator (Laravel / React)**.

---

## Método 1: Paso a Paso en la Página Web (Google Cloud Console)

### Paso 1: Entrar y verificar tu Proyecto
1. Ingresa a: **[https://console.cloud.google.com](https://console.cloud.google.com)**
2. En la barra superior, asegúrate de tener seleccionado tu proyecto activo.

---

### Paso 2: Crear la Máquina Virtual (Compute Engine)
1. Haz clic en el **Menú de navegación `☰`** (esquina superior izquierda).
2. Ve a **Compute Engine** -> **Instancias de VM**.
3. Haz clic en el botón azul superior **"CREAR INSTANCIA"**.

Configura exactamente estos campos:
- **Nombre:** Escribe `cinev2-gcp-core-node`
- **Región:** `us-central1 (Iowa)` *(Always Free)*
- **Zona:** `us-central1-a`
- **Configuración de máquina:**
  - Serie: **E2**
  - Tipo de máquina: **`e2-micro (2 vCPU, 1 GB de memoria)`**
- **Disco de arranque:**
  - Haz clic en **"CAMBIAR"**.
  - Sistema operativo: **Ubuntu**
  - Versión: **Ubuntu 22.04 LTS (x86/64)**
  - Tipo de disco: **Disco persistente estándar**
  - Tamaño: **`30`** GB
  - Haz clic en **"SELECCIONAR"**.
- **Firewall:** Marca ☑ **Permitir tráfico HTTP** y ☑ **Permitir tráfico HTTPS**.
- **Etiquetas de Red:**
  - Despliega **"Opciones avanzadas"** -> **"Redes"**.
  - En **Etiquetas de red**, escribe: `cinev2-gcp-core` y presiona `Enter`.
- Haz clic en el botón azul **"CREAR"** al fondo.

---

### Paso 3: Abrir los Puertos en el Firewall de Google Cloud

Debemos habilitar los puertos del panel de administración (`4200`), API Core (`3000`), validador boletero con cámara (`5177`) y API Laravel (`8000`):

1. Menú `☰` -> **Red de VPC** -> **Reglas de firewall**.
2. Haz clic en **"+ CREAR REGLA DE FIREWALL"**.
3. Llena los campos:
   - **Nombre:** `allow-cinev2-core`
   - **Destinos:** **Etiquetas de destino especificadas**.
   - **Etiquetas de destino:** Escribe `cinev2-gcp-core` y presiona `Enter`.
   - **Rangos de IPv4 de origen:** `0.0.0.0/0`
   - **Protocolos y puertos:**
     - Marca **TCP**.
     - En el cuadro escribe: `22, 4200, 3000, 5177, 8000`
4. Haz clic en el botón azul **"CREAR"**.

---

### Paso 4: Conectarse por SSH
1. Vuelve a **Compute Engine** -> **Instancias de VM**.
2. Mira la columna **"IP externa"** de tu máquina `cinev2-gcp-core-node` y anótala (ej: `34.123.45.67`).
3. En la columna **"Conectar"**, haz clic en el botón **"SSH"**. Se abrirá la terminal negra en el navegador.

---

## Método 2: Por Terminal Web (Google Cloud Shell)

Si prefieres hacerlo con comandos directos en Cloud Shell (ícono `>_` arriba a la derecha):

```bash
# 1. Regla de firewall para los puertos de Cinema-Core y Boleteo
gcloud compute firewall-rules create allow-cinev2-core \
    --direction=INGRESS \
    --priority=1000 \
    --action=ALLOW \
    --rules=tcp:22,tcp:4200,tcp:3000,tcp:5177,tcp:8000 \
    --source-ranges=0.0.0.0/0 \
    --target-tags=cinev2-gcp-core

# 2. Crear instancia e2-micro Always Free
gcloud compute instances create cinev2-gcp-core-node \
    --zone=us-central1-a \
    --machine-type=e2-micro \
    --image-family=ubuntu-2204-lts \
    --image-project=ubuntu-os-cloud \
    --boot-disk-size=30GB \
    --boot-disk-type=pd-standard \
    --tags=cinev2-gcp-core

# 3. Mostrar IP externa
gcloud compute instances describe cinev2-gcp-core-node \
    --zone=us-central1-a \
    --format='value(networkInterfaces[0].accessConfigs[0].natIP)'
```
