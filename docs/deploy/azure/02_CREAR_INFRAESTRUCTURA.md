# Despliegue en Microsoft Azure — 02. Crear Infraestructura

Este documento describe la secuencia exacta de comandos mediante **Azure CLI (`az`)** para provisionar toda la infraestructura necesaria dentro del nivel gratuito (Free Tier).

---

## 1. Prerrequisitos en su Máquina Local

Instale y autentique Azure CLI:

```bash
# 1. Iniciar sesión en Microsoft Azure
az login

# 2. Verificar la suscripción activa
az account show --output table

# 3. Si tiene múltiples suscripciones, seleccionar la suscripción de Free Account:
az account set --subscription "<NOMBRE_O_ID_DE_SUSCRIPCION>"
```

---

## 2. Variables de Configuración

Defina las variables operativas en su terminal Bash o PowerShell:

```bash
RESOURCE_GROUP="rg-cinev2-prod"
LOCATION="eastus"              # Región elegible para B1s Free Tier
VNET_NAME="vnet-cinev2"
SUBNET_NAME="subnet-cinev2"
NSG_NAME="nsg-cinev2"
PUBLIC_IP_NAME="pip-cinev2-prod"
NIC_NAME="nic-cinev2-prod"
VM_NAME="vm-cinev2-prod"
VM_SIZE="Standard_B1s"         # 1 vCPU, 1 GB RAM (Free Tier 750h/mes)
ADMIN_USER="ubuntu"
```

---

## 3. Creación Paso a Paso de la Infraestructura

### Paso 1: Crear el Grupo de Recursos (Resource Group)
```bash
az group create \
  --name $RESOURCE_GROUP \
  --location $LOCATION
```

### Paso 2: Crear el Grupo de Seguridad de Red (NSG) y Reglas de Tráfico
```bash
# 1. Crear el NSG
az network nsg create \
  --resource-group $RESOURCE_GROUP \
  --name $NSG_NAME \
  --location $LOCATION

# 2. Permitir acceso SSH (Puerto 22)
az network nsg rule create \
  --resource-group $RESOURCE_GROUP \
  --nsg-name $NSG_NAME \
  --name AllowSSH \
  --protocol Tcp \
  --direction Inbound \
  --priority 1000 \
  --source-address-prefix '*' \
  --source-port-range '*' \
  --destination-address-prefix '*' \
  --destination-port-range 22 \
  --access Allow

# 3. Permitir tráfico web HTTP (Puerto 80)
az network nsg rule create \
  --resource-group $RESOURCE_GROUP \
  --nsg-name $NSG_NAME \
  --name AllowHTTP \
  --protocol Tcp \
  --direction Inbound \
  --priority 1010 \
  --source-address-prefix '*' \
  --source-port-range '*' \
  --destination-address-prefix '*' \
  --destination-port-range 80 \
  --access Allow

# 4. Permitir tráfico web seguro HTTPS (Puerto 443 - Requerido para la Cámara)
az network nsg rule create \
  --resource-group $RESOURCE_GROUP \
  --nsg-name $NSG_NAME \
  --name AllowHTTPS \
  --protocol Tcp \
  --direction Inbound \
  --priority 1020 \
  --source-address-prefix '*' \
  --source-port-range '*' \
  --destination-address-prefix '*' \
  --destination-port-range 443 \
  --access Allow
```

### Paso 3: Crear Virtual Network (VNet) y Subred
```bash
az network vnet create \
  --resource-group $RESOURCE_GROUP \
  --name $VNET_NAME \
  --address-prefix 10.0.0.0/16 \
  --subnet-name $SUBNET_NAME \
  --subnet-prefix 10.0.1.0/24 \
  --network-security-group $NSG_NAME \
  --location $LOCATION
```

### Paso 4: Reservar Dirección IP Pública Estática
```bash
az network public-ip create \
  --resource-group $RESOURCE_GROUP \
  --name $PUBLIC_IP_NAME \
  --sku Standard \
  --allocation-method Static \
  --location $LOCATION
```

### Paso 5: Crear la Interfaz de Red (NIC)
```bash
az network nic create \
  --resource-group $RESOURCE_GROUP \
  --name $NIC_NAME \
  --vnet-name $VNET_NAME \
  --subnet $SUBNET_NAME \
  --network-security-group $NSG_NAME \
  --public-ip-address $PUBLIC_IP_NAME \
  --location $LOCATION
```

### Paso 6: Crear la Máquina Virtual Linux B1s (Free Tier)
```bash
az vm create \
  --resource-group $RESOURCE_GROUP \
  --name $VM_NAME \
  --nics $NIC_NAME \
  --image Ubuntu2204 \
  --size $VM_SIZE \
  --os-disk-size-gb 64 \
  --storage-sku StandardSSD_LRS \
  --admin-username $ADMIN_USER \
  --generate-ssh-keys \
  --location $LOCATION
```

---

## 4. Obtención de la IP Pública y Verificación de Conexión

Una vez provisionada la máquina virtual, obtenga su dirección IP pública asignada:

```bash
# Obtener la IP pública
AZURE_IP=$(az network public-ip show \
  --resource-group $RESOURCE_GROUP \
  --name $PUBLIC_IP_NAME \
  --query ipAddress \
  --output tsv)

echo "IP Pública de CineV2 en Azure: $AZURE_IP"

# Probar conexión SSH inmediata
ssh -i ~/.ssh/id_rsa ubuntu@$AZURE_IP
```

