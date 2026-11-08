# Despliegue en Amazon Web Services (AWS) — 03. Instalar Herramientas

Conéctese a la instancia EC2 mediante SSH como el usuario `ubuntu`:
```bash
ssh -i cinev2-key.pem ubuntu@<TU_IP_PUBLICA>
```

---

## 1. Configuración Obligatoria de 4 GB de Swap

Dado que una instancia `t3.micro` cuenta con 1 GB de RAM física y el ecosistema alberga Spring Boot 3 (Java 21), NestJS, Laravel y TensorFlow, es **mandatorio** crear 4 GB de memoria de intercambio (Swap) en el disco EBS gp3 para evitar que el kernel ejecute el *OOM Killer*:

```bash
# 1. Crear archivo swap de 4 Gigabytes
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile

# 2. Formatear y activar swap
sudo mkswap /swapfile
sudo swapon /swapfile

# 3. Hacer permanente el swap tras reinicios
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# 4. Ajustar agresividad de swap (swappiness=10) para optimizar rendimiento de RAM
sudo sysctl vm.swappiness=10
echo 'vm.swappiness=10' | sudo tee -a /etc/sysctl.conf

# 5. Comprobar que el espacio Swap esté activo
free -h
```
Resultado observable esperado: `Swap: Total: 4.0Gi, Used: 0B, Free: 4.0Gi`.

---

## 2. Actualización del Sistema Operativo

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl wget git unzip htop ufw ca-certificates gnupg lsb-release
```

---

## 3. Instalación Oficial de Docker y Docker Compose v2

```bash
# 1. Agregar la llave GPG oficial de Docker
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# 2. Configurar el repositorio estable
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# 3. Instalar Docker Engine y el plugin Docker Compose
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# 4. Habilitar ejecución de Docker sin sudo para el usuario ubuntu
sudo usermod -aG docker $USER
newgrp docker

# 5. Verificar versiones instaladas
docker --version
docker compose version
```
Resultado observable esperado: `Docker version 24.x o superior` y `Docker Compose version v2.x`.

---

## 4. Instalación de Nginx y Certbot (Let's Encrypt)

Nginx actuará como el Reverse Proxy frontal del servidor, gestionando la terminación SSL y enrutando cada subdominio hacia el contenedor Docker correspondiente:

```bash
sudo apt install -y nginx certbot python3-certbot-nginx
sudo systemctl enable nginx
sudo systemctl start nginx
sudo systemctl status nginx --no-pager
```
Resultado observable esperado: `Active: active (running)`.

