# Despliegue en Microsoft Azure — 02. Crear Servidor Paso a Paso (Guía Visual Portal Web)

Esta guía está diseñada paso a paso para personas que **nunca han creado un servidor en Microsoft Azure**. En AWS el servidor se llama **EC2**; en Azure se llama simplemente **"Máquinas virtuales" (Virtual Machines)**.

---

## Paso 0: Activar tu Suscripción (Imprescindible para empezar)

En la pantalla principal de Azure (**"Le damos la bienvenida a Azure"**), verás un aviso que dice:  
*¿No tiene ninguna suscripción? Consulte las opciones siguientes.*

Tienes dos botones azules para activarla:

- **Opción A (Recomendada si tienes correo de universidad):**  
  En la tarjeta **"Microsoft Azure for Students"**, haz clic en el botón azul **"Inicio"**.  
  *(Te dará **$100 USD de crédito anual** y **NO PIDE TARJETA DE CRÉDITO NI DÉBITO**, solo validar tu correo institucional).*
- **Opción B (Con cuenta personal de Hotmail/Outlook):**  
  En la tarjeta **"Empiece con una prueba gratuita de Azure"**, haz clic en el botón azul **"Inicio"**.  
  *(Te dará **$200 USD de crédito gratis** durante 30 días y 12 meses de servicios gratuitos. Solo pide una tarjeta para verificar identidad con $1 USD temporal reembolsable).*

> Una vez completado ese registro, volverás a la página principal de Azure ya con tu suscripción activa.

---

## Paso 1: Ir a "Máquinas virtuales"

1. En la página de inicio de Azure, en la sección **Servicios de Azure**, busca el ícono de una pantalla azul de computadora que dice **"Máquinas virtuales"** (Virtual machines) y haz clic sobre él.  
   *(O escribe `máquinas virtuales` en la barra de búsqueda superior y presiona Enter).*
2. En la barra superior de la pantalla que se abre, haz clic en el botón **"+ Crear"** y selecciona:  
   👉 **"Máquina virtual de Azure"** (Azure virtual machine).

---

## Paso 2: Llenar el Formulario de la Máquina Virtual

Verás un formulario con pestañas en la parte superior. Solo configuraremos lo necesario:

### Pestaña 1: "Aspectos básicos" (Datos generales)

1. **Detalles del proyecto:**
   - **Suscripción:** Selecciona la suscripción que activaste en el Paso 0.
   - **Grupo de recursos:** Haz clic en el enlace azul **"Crear nuevo"**, escribe de nombre `rg-cinev2-azure` y presiona **Aceptar**.
2. **Detalles de la instancia:**
   - **Nombre de máquina virtual:** Escribe `vm-cinev2-auth-node`
   - **Región:** Selecciona **(EE. UU.) Este de EE. UU.** (`eastus`).
   - **Opciones de disponibilidad:** Déjalo en *"No se requiere redundancia de la infraestructura"*.
   - **Tipo de seguridad:** Selecciona **Estándar** (Standard).
   - **Imagen:** Haz clic en el menú desplegable y selecciona:  
     👉 **Ubuntu Server 22.04 LTS - x64 Gen2**
   - **Tamaño:** Haz clic en *"Ver todos los tamaños"* o selecciona:  
     👉 **`Standard_B1s` (1 vcpu, 1 GiB de memoria)** *(Elegible para la capa gratuita de 750h/mes)*  
     *(Si tienes el crédito de $200 USD de bienvenida, también puedes elegir `Standard_B2s` de 2 vcpu y 4 GiB de memoria para mayor velocidad).*
3. **Cuenta de administrador (¿Cómo entrarás al servidor?):**
   - **Tipo de autenticación:** Para que no te compliques con llaves `.pem` de inicio, marca la opción **"Contraseña"** (Password).
   - **Nombre de usuario:** Escribe `ubuntu`
   - **Contraseña:** Escribe una contraseña que recuerdes (ej: `CineBolivia2026!`).
   - **Confirmar contraseña:** Vuelve a escribir la misma contraseña.
4. **Reglas de puertos de entrada:**
   - **Puertos de entrada públicos:** Marca **"Permitir los puertos seleccionados"**.
   - **Seleccionar puertos de entrada:** Marca las casillas:
     - ☑ **SSH (22)**
     - ☑ **HTTP (80)**
     - ☑ **HTTPS (443)**

---

### Pestaña 2: "Discos"

1. En la parte superior, haz clic en la pestaña **"Discos"** (o presiona el botón azul "Siguiente: Discos").
2. **Tipo de disco del SO:** Selecciona **SSD estándar (almacenamiento con redundancia local)** o **SSD Premium**.
3. **Tamaño del disco:** Déjalo en el valor por defecto (30 GB o 64 GB).

---

### Pestaña 3: "Redes" (Networking)

1. Haz clic en la pestaña superior **"Redes"**.
2. Verás que Azure ya crea automáticamente una **Red virtual** (`vnet`), una **Subred** y una **Dirección IP pública**. No necesitas cambiar nada aquí.

---

### Pestaña 4: "Revisar y crear"

1. Haz clic directamente en el botón azul grande que está en la esquina inferior izquierda: **"Revisar y crear"** (Review + create).
2. Azure hará una comprobación automática de 5 segundos. Verás arriba un mensaje en verde que dice:  
   `✔ Validación superada` (Validation passed).
3. Haz clic en el botón azul al fondo: **"Crear"** (Create).
4. Espera entre 1 y 2 minutos mientras Azure provisiona el servidor. Verás el mensaje:  
   *`Se completó la implementación`*.
5. Haz clic en el botón azul **"Ir al recurso"** (Go to resource).

---

## Paso 3: Abrir los Puertos de CineV2 en el Firewall de Azure

Tus microservicios en Azure escuchan en los puertos `5174`, `8081`, `5176` y `8001`. Para abrirlos:

1. Estando en la pantalla de tu máquina virtual `vm-cinev2-auth-node`:
2. En el **menú vertical de la izquierda**, busca la categoría **Configuración** y haz clic en **"Redes"** (Networking).
3. En la parte derecha verás una tabla con las reglas de firewall. Haz clic en el botón **"+ Agregar regla de puerto de entrada"** (Add inbound port rule).
4. En el panel lateral que se abre a la derecha, configura:
   - **Intervalos de puertos de destino:** Escribe `5174,8081,5176,8001`
   - **Protocolo:** Selecciona **TCP**.
   - **Acción:** Asegúrate de que esté en **Permitir** (Allow).
   - **Prioridad:** Déjalo en el número que sugiere (ej: `1010` o `310`).
   - **Nombre:** Escribe `AllowCineV2Auth`
5. Haz clic en el botón azul **"Agregar"** (Add) al fondo.

---

## Paso 4: Dónde ver la IP Pública y Conectarte por SSH

1. En el menú de la izquierda de tu máquina virtual, haz clic arriba en **"Información general"** (Overview).
2. En el panel central derecho verás un campo que dice:  
   👉 **Dirección IP pública:** (Por ejemplo: `20.120.45.89`).  
   ¡Esta es la IP de tu servidor en Azure!
3. **Para conectarte por terminal:**
   - Abre la terminal de tu computadora (PowerShell, CMD o Git Bash) y escribe:
     ```bash
     ssh ubuntu@<TU_IP_PUBLICA_AZURE>
     ```
   - Te preguntará: `Are you sure you want to continue connecting (yes/no/[fingerprint])?` -> Escribe `yes` y presiona Enter.
   - Te pedirá la contraseña: Escribe la contraseña que definiste en el Paso 2 (ej: `CineBolivia2026!`).
   - ¡Listo! Ya estás dentro de tu servidor de Azure listo para correr Docker.
