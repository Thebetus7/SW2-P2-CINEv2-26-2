# Despliegue en Google Cloud Platform (GCP) — 03. Instalar Herramientas en la Terminal SSH

Este paso se realiza **dentro de la ventana negra de la terminal SSH** que se abrió en tu navegador al hacer clic en el botón **"SSH"** en Google Cloud Console.

> [!TIP]
> **¿Cómo pegar texto en la ventana SSH de Google Cloud?**  
> Puedes presionar `Ctrl + V` (o clic derecho en la pantalla negra y seleccionar *Paste* o *Pegar*). Si el navegador te pregunta *"¿Permitir que console.cloud.google.com acceda al portapapeles?"*, haz clic en **Permitir**.

---

## 1. Crear Memoria Swap (4 GB) — Obligatorio para no saturar la máquina

La máquina virtual gratuita de Google tiene 1 GB de memoria RAM. Como Spring Boot (Java 21) y Docker consumen memoria al arrancar, debemos activar 4 GB de memoria virtual de intercambio (Swap) para que no se congele:

Copia y pega este bloque completo en la terminal negra y presiona `Enter`:

```bash
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
sudo sysctl vm.swappiness=20
echo 'vm.swappiness=20' | sudo tee -a /etc/sysctl.conf
free -h
```

**Resultado esperado en pantalla:**  
Al final verás una línea que dice:  
`Swap: 4.0Gi total`  
¡Eso significa que la memoria virtual ya está lista!

---

## 2. Instalar Docker y Docker Compose (V2)

Copia y pega este bloque en la terminal y presiona `Enter`:

```bash
# 1. Actualizar repositorios e instalar Docker y Git
sudo apt-get update
sudo apt-get install -y git curl docker.io docker-compose-v2

# 2. Habilitar el servicio Docker
sudo systemctl enable docker
sudo systemctl start docker

# 3. Otorgar permisos a tu usuario para usar Docker sin escribir 'sudo'
sudo usermod -aG docker $USER
newgrp docker
```

---

## 3. Verificar que Docker esté Funcionando

Escribe en la terminal:

```bash
docker compose version
```

**Resultado esperado:**  
`Docker Compose version v2.x.x`

¡Tu servidor de Google Cloud ya tiene todas las herramientas listas para recibir el proyecto! Ahora pasa al archivo `04_DESPLEGAR_Y_VERIFICAR.md`.
