# Despliegue en Google Cloud Platform (GCP) — 02. Crear Infraestructura

## 1. Provisión de Recursos mediante Google Cloud SDK (`gcloud`) o Cloud Shell

### Paso 1: Configurar Proyecto y Región de la Capa Always Free
La capa Always Free de Compute Engine aplica exclusivamente en las regiones `us-central1` (Iowa), `us-east1` (South Carolina) o `us-west1` (Oregon).

```bash
# Definir variables de entorno del despliegue
export PROJECT_ID="<TU_ID_DE_PROYECTO_GCP>"
export REGION="us-central1"
export ZONE="us-central1-a"
export INSTANCE_NAME="cinev2-production-server"

# Establecer configuración activa en gcloud
gcloud config set project $PROJECT_ID
gcloud config set compute/region $REGION
gcloud config set compute/zone $ZONE

# Habilitar la API de Compute Engine
gcloud services enable compute.googleapis.com
```

---

### Paso 2: Crear Reglas de Firewall para Puertos 22, 80 y 443

```bash
# Permitir tráfico web HTTP (80) y HTTPS (443) hacia la instancia
gcloud compute firewall-rules create cinev2-allow-web \
    --direction=INGRESS \
    --priority=1000 \
    --network=default \
    --action=ALLOW \
    --rules=tcp:80,tcp:443 \
    --source-ranges=0.0.0.0/0 \
    --target-tags=cinev2-server

# Verificar que exista la regla de acceso SSH (puerto 22)
gcloud compute firewall-rules list --filter="name:default-allow-ssh"
```

---

### Paso 3: Reservar Dirección IP Externa Estática (Gratuita en VM activa)

```bash
gcloud compute addresses create cinev2-static-ip --region=$REGION

# Obtener la IP pública asignada
STATIC_IP=$(gcloud compute addresses describe cinev2-static-ip --region=$REGION --format='value(address)')
echo "Dirección IP Estática Reservada: $STATIC_IP"
```

---

### Paso 4: Crear la Instancia Compute Engine `e2-micro` (Always Free)

```bash
gcloud compute instances create $INSTANCE_NAME \
    --zone=$ZONE \
    --machine-type=e2-micro \
    --network-interface=address=$STATIC_IP,network-tier=STANDARD \
    --image-family=ubuntu-2204-lts \
    --image-project=ubuntu-os-cloud \
    --boot-disk-size=30GB \
    --boot-disk-type=pd-standard \
    --boot-disk-device-name=$INSTANCE_NAME-disk \
    --tags=cinev2-server,http-server,https-server \
    --metadata=enable-oslogin=TRUE

echo "=========================================================="
echo "Instancia GCP creada exitosamente con IP: $STATIC_IP"
echo "Comando de acceso: gcloud compute ssh $INSTANCE_NAME --zone=$ZONE"
echo "=========================================================="
```

