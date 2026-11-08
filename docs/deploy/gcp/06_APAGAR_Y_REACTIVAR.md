# Despliegue en Google Cloud Platform (GCP) — 06. Apagar y Reactivar (Servidor de Examen)

Este documento describe cómo pausar y reanudar la máquina virtual en Google Cloud Platform cuando no esté realizando pruebas o para el día de la defensa del examen universitario.

---

## 1. Apagar la Máquina Virtual (Pausa sin Costos)

Cuando termine de hacer pruebas, puede apagar la máquina virtual para que no consuma recursos de cómputo:

```bash
# Detener la máquina desde Google Cloud Shell o terminal local
gcloud compute instances stop cinev2-servidor-examen --zone=us-central1-a
```

O directamente dentro del SSH:
```bash
sudo poweroff
```

Al estar apagada, la máquina no genera ningún cobro de CPU ni memoria RAM. El disco de 30 GB está 100% cubierto por la capa Always Free.

---

## 2. Encender la Máquina para el Día del Examen

El día del examen o de la presentación ante el docente:

```bash
# 1. Iniciar la máquina virtual
gcloud compute instances start cinev2-servidor-examen --zone=us-central1-a

# 2. Obtener la IP pública activa para compartirla con el docente
gcloud compute instances describe cinev2-servidor-examen \
    --zone=us-central1-a \
    --format='value(networkInterfaces[0].accessConfigs[0].natIP)'
```

Docker está configurado para arrancar de forma automática y los contenedores de CineV2 se reanudarán solos en menos de 60 segundos gracias a la política `restart: always`.

---

## 3. Eliminar la Máquina al Finalizar el Semestre

Cuando el examen haya concluido y ya tenga su calificación, puede destruir la infraestructura para dejar su cuenta de Google Cloud totalmente limpia con costo \$0.00:

```bash
# 1. Eliminar la máquina virtual
gcloud compute instances delete cinev2-servidor-examen --zone=us-central1-a --quiet

# 2. Eliminar la regla de firewall
gcloud compute firewall-rules delete allow-cinev2-universidad --quiet
```
