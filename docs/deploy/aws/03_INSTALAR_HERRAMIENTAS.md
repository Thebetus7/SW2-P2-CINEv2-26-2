# Despliegue en Amazon Web Services (AWS) — 03. Instalar Herramientas (Swap, Docker y Compose)

Conéctate a tu servidor EC2 utilizando **EC2 Instance Connect** (directo en la web de AWS) o desde PowerShell con tu archivo `.pem`:

```bash
ssh -i cinev2-aws-key.pem ubuntu@<IP_PUBLICA_AWS>
```

Una vez dentro de la terminal de Ubuntu (verás `ubuntu@ip-xxx-xx-xx-xx:~$`), ejecuta los siguientes pasos:

---

## 1. Configuración Obligatoria de 4 GB de Memoria Swap

> [!WARNING]
> **¿Por qué este paso es OBLIGATORIO en AWS?**  
> La instancia `t3.micro` o `t2.micro` de la capa gratuita tiene **1 GB de RAM física**. Al compilar el backend de NestJS y descargar los pesos del modelo de visión artificial **TensorFlow COCO-SSD**, el servidor se quedaría sin memoria y el sistema operativo congelaría o apagaría el proceso (*Out Of Memory Killer*).  
> Al crear **4 GB de Swap** en el disco SSD de 30 GB, le damos al servidor un colchón de **5 GB de memoria total** para compilar y funcionar con total fluidez.

Copia y pega este bloque completo en la terminal y presiona `Enter`:

```bash
# 1. Crear el archivo de 4 GB en el disco
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile

# 2. Formatear y activar la memoria Swap
sudo mkswap /swapfile
sudo swapon /swapfile

# 3. Hacer que el Swap se mantenga activo si el servidor se reinicia
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# 4. Optimizar el uso de Swap (swappiness=20)
sudo sysctl vm.swappiness=20
echo 'vm.swappiness=20' | sudo tee -a /etc/sysctl.conf

# 5. Comprobar que esté activo
free -h
```

**Resultado esperado:**  
En la fila `Swap:` verás `Total: 4.0Gi`, indicando que tu servidor ya tiene 5 GB de memoria efectiva.

---

## 2. Actualizar el Sistema Operativo y Paquetes Base

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl wget git unzip htop ca-certificates gnupg lsb-release
```

---

## 3. Instalar Docker y Docker Compose V2

Instalaremos la versión oficial de Docker para Ubuntu:

```bash
# 1. Agregar la clave oficial de seguridad de Docker
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# 2. Agregar el repositorio de Docker a las fuentes de Ubuntu
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# 3. Instalar Docker Engine y Docker Compose Plugin
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# 4. Permitir que el usuario 'ubuntu' ejecute Docker sin escribir 'sudo'
sudo usermod -aG docker $USER
newgrp docker
```

---

## 4. Verificar que las Herramientas Están Listas

Comprueba las versiones instaladas:

```bash
docker --version
docker compose version
```

**Resultado esperado:**
- `Docker version 24.x` o `27.x`
- `Docker Compose version v2.x`

¡Excelente! Tu servidor EC2 de AWS ya tiene toda la infraestructura lista. Continúa con [04_DESPLEGAR_Y_VERIFICAR.md](file:///docs/deploy/aws/04_DESPLEGAR_Y_VERIFICAR.md) para clonar el proyecto y poner en marcha los contenedores.
