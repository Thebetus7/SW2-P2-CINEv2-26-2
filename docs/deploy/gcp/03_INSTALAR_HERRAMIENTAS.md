# Despliegue en Google Cloud Platform (GCP) — 03. Instalar Herramientas

Conéctese a la instancia de GCP mediante `gcloud` o SSH:
```bash
gcloud compute ssh cinev2-production-server --zone=us-central1-a
```

---

## 1. Configuración Obligatoria de 4 GB de Swap

La instancia `e2-micro` de Google Cloud posee 1 GB de RAM física. Para que los 11 microservicios (Java 21 Spring Boot, NestJS, TensorFlow, Laravel, Python) corran sin interrupciones, es **mandatorio** configurar 4 GB de Swap en el disco persistente de 30 GB:

```bash
# 1. Crear el archivo swap de 4 GB
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile

# 2. Formatear y activar swap
sudo mkswap /swapfile
sudo swapon /swapfile

# 3. Registrar en fstab para persistencia tras reinicios
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# 4. Ajustar swappiness a 10 para balancear uso de RAM y disco
sudo sysctl vm.swappiness=10
echo 'vm.swappiness=10' | sudo tee -a /etc/sysctl.conf

# 5. Comprobar memoria y swap activos
free -h
```
Resultado observable esperado: `Swap: Total: 4.0Gi, Used: 0B, Free: 4.0Gi`.

---

## 2. Actualización de Paquetes Base

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl wget git unzip htop ca-certificates gnupg lsb-release
```

---

## 3. Instalación Oficial de Docker y Docker Compose v2

```bash
# 1. Agregar repositorio oficial de Docker
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# 2. Instalar Docker Engine y Compose
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# 3. Asignar permisos al usuario actual de GCP
sudo usermod -aG docker $USER
newgrp docker

# 4. Verificar versiones
docker --version
docker compose version
```

---

## 4. Instalación de Nginx y Certbot (Let's Encrypt)

```bash
sudo apt install -y nginx certbot python3-certbot-nginx
sudo systemctl enable nginx
sudo systemctl start nginx
```
Resultado observable esperado: `Nginx running en puerto 80`.

