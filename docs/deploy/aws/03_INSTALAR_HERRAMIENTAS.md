# Despliegue en Amazon Web Services (AWS) — 03. Instalar Herramientas (Amazon Linux 2023)

Conéctate a tu servidor EC2 utilizando **EC2 Instance Connect** (en la web de AWS con usuario `ec2-user`) o desde PowerShell:

```bash
ssh -i cinev2-aws-key.pem ec2-user@<IP_PUBLICA_AWS>
```

Una vez dentro de la terminal (verás `[ec2-user@ip-xxx-xx-xx-xx ~]$`), ejecuta los siguientes pasos adaptados a **Amazon Linux 2023**:

---

## 1. Configuración Obligatoria de 4 GB de Memoria Swap

> [!WARNING]
> **¿Por qué este paso es OBLIGATORIO en AWS?**  
> La instancia `t3.micro` o `t2.micro` de la capa gratuita tiene **1 GB de RAM física**. Al compilar el backend de NestJS y descargar los pesos de **TensorFlow COCO-SSD**, el servidor se quedaría sin memoria física (*Out Of Memory*). Con **4 GB de Swap** en el disco de 30 GB, el servidor alcanza **5 GB de memoria efectiva**.

En Amazon Linux 2023, creamos el swap con `dd` para compatibilidad completa con el sistema de archivos:

```bash
# 1. Crear archivo swap de 4 GB
sudo dd if=/dev/zero of=/swapfile bs=128M count=32
sudo chmod 600 /swapfile

# 2. Formatear y activar la memoria Swap
sudo mkswap /swapfile
sudo swapon /swapfile

# 3. Hacer permanente el swap tras reinicios en fstab
echo '/swapfile swap swap defaults 0 0' | sudo tee -a /etc/fstab

# 4. Ajustar agresividad a swappiness=20
sudo sysctl vm.swappiness=20
echo 'vm.swappiness=20' | sudo tee -a /etc/sysctl.conf

# 5. Comprobar que esté activo
free -h
```

**Resultado esperado:**  
En la fila `Swap:` verás `total: 4.0Gi`, indicando que tu servidor ya cuenta con el respaldo de memoria necesario.

---

## 2. Actualización del Sistema y Paquetes Base (DNF)

Amazon Linux 2023 utiliza el gestor de paquetes **`dnf`**:

```bash
sudo dnf update -y
sudo dnf install -y git tar gzip curl htop
```

---

## 3. Instalar Docker Engine y Habilitar el Servicio

En Amazon Linux 2023, Docker se instala directamente desde los repositorios optimizados de AWS:

```bash
# 1. Instalar Docker
sudo dnf install -y docker

# 2. Habilitar e iniciar el servicio de Docker
sudo systemctl enable --now docker

# 3. Permitir que el usuario ec2-user ejecute Docker sin sudo
sudo usermod -aG docker ec2-user
```

---

## 4. Instalar Docker Compose V2 Oficial

```bash
# 1. Crear el directorio de plugins CLI para Docker
sudo mkdir -p /usr/local/lib/docker/cli-plugins

# 2. Descargar la versión oficial de Docker Compose v2 para Linux x86_64
sudo curl -SL https://github.com/docker/compose/releases/latest/download/docker-compose-linux-x86_64 \
  -o /usr/local/lib/docker/cli-plugins/docker-compose

# 3. Dar permisos de ejecución
sudo chmod +x /usr/local/lib/docker/cli-plugins/docker-compose

# 4. Crear enlace simbólico para que funcione tanto 'docker compose' como 'docker-compose'
sudo ln -sf /usr/local/lib/docker/cli-plugins/docker-compose /usr/bin/docker-compose
```

---

## 5. Aplicar Permisos y Verificar Versiones

Aplica los permisos de grupo Docker sin tener que cerrar sesión:

```bash
newgrp docker
```

Verifica que ambas herramientas respondan correctamente:

```bash
docker --version
docker compose version
```

**Resultado esperado:**
- `Docker version 25.x` o superior
- `Docker Compose version v2.x`

¡Tu servidor en Amazon Linux 2023 está 100% configurado! Continúa con [04_DESPLEGAR_Y_VERIFICAR.md](file:///docs/deploy/aws/04_DESPLEGAR_Y_VERIFICAR.md) para clonar el repositorio y desplegar los contenedores.
