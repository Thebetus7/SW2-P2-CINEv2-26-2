# Despliegue en Microsoft Azure — 03. Instalar Herramientas

Este documento describe la preparación del sistema operativo Ubuntu 22.04 LTS en la máquina virtual Azure `Standard_B1s`, incluyendo la creación obligatoria de memoria Swap, la instalación del motor Docker y la configuración del servidor web Nginx.

---

## 1. Conexión SSH a la Instancia Azure

Conéctese a la máquina virtual utilizando la IP pública obtenida en el paso anterior (ingrese la contraseña configurada en el portal):

```bash
ssh ubuntu@<TU_IP_PUBLICA_AZURE>
```

---

## 2. Configuración Obligatoria de Memoria Swap (4 GB)

La instancia `Standard_B1s` dispone de 1 GB de memoria RAM física. Para permitir la compilación y ejecución holgada de los 5 contenedores de este nodo (`postgres-auth`, `ms-ticket-auth-backend`, `ms-ticket-auth-frontend`, `ms-ia-mcp-backend`, `ms-ia-mcp-frontend`) sin bloqueos de memoria (OOM), creamos un archivo Swap de 4 GB:

```bash
# 1. Comprobar memoria actual
free -h

# 2. Asignar 4 GB para el archivo Swap en el disco OS
sudo fallocate -l 4G /swapfile

# 3. Restringir permisos de seguridad al root
sudo chmod 600 /swapfile

# 4. Formatear y activar el área de intercambio
sudo mkswap /swapfile
sudo swapon /swapfile

# 5. Hacer persistente el Swap ante reinicios de la VM
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# 6. Ajustar la agresividad del intercambio (swappiness = 20)
sudo sysctl vm.swappiness=20
echo 'vm.swappiness=20' | sudo tee -a /etc/sysctl.conf

# 7. Verificar activación del Swap
free -h
```
Resultado observable esperado: `Swap: 4.0Gi total`.

---

## 3. Actualización de Paquetes del Sistema

```bash
sudo apt-get update && sudo apt-get upgrade -y
sudo apt-get install -y curl wget git unzip ca-certificates gnupg lsb-release
```

---

## 4. Instalación de Docker y Docker Compose (V2)

```bash
# 1. Instalar Docker desde repositorios oficiales de Ubuntu
sudo apt-get install -y docker.io docker-compose-v2

# 2. Habilitar e iniciar el servicio Docker
sudo systemctl enable docker
sudo systemctl start docker

# 3. Otorgar permisos al usuario ubuntu para ejecutar Docker sin sudo
sudo usermod -aG docker ubuntu

# 4. Verificar versiones instaladas
docker --version
docker compose version
```

> [!NOTE]
> Cierre la sesión SSH y vuelva a ingresar (`exit` y luego `ssh ubuntu@<IP>`) para que la pertenencia al grupo `docker` surta efecto sin necesidad de reiniciar la máquina.

---

## 5. Instalación de Nginx y Certbot (SSL Let's Encrypt)

Nginx actuará como Reverse Proxy centralizado y Certbot renovará de forma autónoma los certificados criptográficos para habilitar el protocolo HTTPS:

```bash
# 1. Instalar Nginx y Certbot con plugin para Nginx
sudo apt-get install -y nginx certbot python3-certbot-nginx

# 2. Habilitar e iniciar Nginx
sudo systemctl enable nginx
sudo systemctl start nginx

# 3. Comprobar que Nginx responde en el puerto 80
curl -I http://localhost
```
Resultado observable esperado: `HTTP/1.1 200 OK`.

