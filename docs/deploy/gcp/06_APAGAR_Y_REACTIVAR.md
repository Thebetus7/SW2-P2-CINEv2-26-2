# Despliegue en Google Cloud Platform (GCP) — 06. Apagar y Reactivar

Este documento describe la gestión del ciclo de vida de la infraestructura en Google Cloud Platform, optimizada para no generar costos inesperados durante periodos de inactividad.

---

## 1. Consideración Crítica de Costos en GCP (IP Estática Inactiva)

> [!WARNING]
> En Google Cloud Platform, las direcciones IP externas estáticas son **gratuitas mientras la instancia asociada esté encendida (RUNNING)**.  
> Sin embargo, si detiene la instancia (`STOPPED`) y mantiene la IP externa reservada sin uso, Google factura aproximadamente **$0.010 USD por hora (~$7.20 USD al mes)** por "Static IP reserved but unused".
>
> Para evitar cualquier cargo durante pausas prolongadas:
> - Si va a apagar la máquina por pocas horas: El costo es insignificante (< $0.05 USD).
> - Si va a apagar la máquina por semanas: Libere la IP estática con `gcloud compute addresses delete cinev2-static-ip --region=us-central1`.

---

## 2. Apagar la Instancia (Pausa Temporal)

### Opción A: Desde la consola local del desarrollador (Google Cloud CLI)
```bash
# Detener la máquina virtual
gcloud compute instances stop cinev2-vm-prod --zone=us-central1-a
```

### Opción B: Desde el interior de la propia máquina virtual
```bash
# Apagar el sistema operativo de forma ordenada
sudo poweroff
```

Una vez apagada, la instancia no consume vCPU ni RAM, quedando únicamente el coste del disco persistente de 30 GB (el cual está cubierto 100% por el Always Free Tier en us-central1).

---

## 3. Reactivar la Instancia y Reanudar Servicios

### Paso 1: Iniciar la máquina virtual
```bash
gcloud compute instances start cinev2-vm-prod --zone=us-central1-a
```

### Paso 2: Conectarse y verificar arranque de Docker
Docker y Nginx están configurados como servicios de `systemd` para iniciar automáticamente con el sistema operativo:

```bash
# Conectar por SSH
gcloud compute ssh cinev2-vm-prod --zone=us-central1-a

# Comprobar que todos los contenedores hayan reiniciado (política restart: always)
docker compose -f /home/ubuntu/CINEv2/docker-compose.yml ps

# Si los contenedores no estuvieran activos, iniciarlos manualmente:
cd /home/ubuntu/CINEv2
docker compose up -d
```

---

## 4. Desmantelamiento Total (Destrucción de Recursos)

Si el proyecto finaliza y desea eliminar todos los recursos para asegurar costo $0.00:

```bash
# 1. Eliminar la instancia virtual
gcloud compute instances delete cinev2-vm-prod --zone=us-central1-a --quiet

# 2. Eliminar la IP externa reservada
gcloud compute addresses delete cinev2-static-ip --region=us-central1 --quiet

# 3. Eliminar la regla de firewall
gcloud compute firewall-rules delete allow-cinev2-http-https-ssh --quiet
```

