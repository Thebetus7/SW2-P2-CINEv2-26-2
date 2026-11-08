# Despliegue en Microsoft Azure — 06. Apagar y Reactivar

Este documento describe el control del ciclo de vida de la máquina virtual en Microsoft Azure, alertando sobre la diferencia técnica y financiera entre detener y desasignar una instancia.

---

## 1. Advertencia Crítica de Facturación en Azure (Stop vs Deallocate)

> [!CAUTION]
> En Microsoft Azure existen dos estados de detención con implicaciones financieras opuestas:
>
> 1. **Stopped (Allocated):** Ocurre si ejecuta `sudo poweroff` dentro de Linux o `az vm stop`. En este estado, la máquina virtual libera el sistema operativo pero los núcleos de CPU y memoria física permanecen reservados en el datacenter de Azure. **Azure CONTINÚA FACTURANDO por cómputo** en este estado.
> 2. **Stopped (Deallocated):** Ocurre únicamente cuando ejecuta `az vm deallocate`. En este estado, Azure libera el hardware físico y **EL COBRO DE CÓMPUTO SE DETIENE COMPLETAMENTE ($0.00 USD)**.
>
> **Regla de Oro:** Siempre que vaya a pausar la máquina virtual, utilice `az vm deallocate`.

---

## 2. Pausar la Infraestructura (Desasignación Total)

Ejecute desde su consola local con Azure CLI:

```bash
RESOURCE_GROUP="rg-cinev2-prod"
VM_NAME="vm-cinev2-prod"

# Desasignar la máquina virtual para detener el cobro de cómputo
az vm deallocate \
  --resource-group $RESOURCE_GROUP \
  --name $VM_NAME
```

Verifique el estado:
```bash
az vm get-instance-view \
  --resource-group $RESOURCE_GROUP \
  --name $VM_NAME \
  --query "instanceView.statuses[?starts_with(code, 'PowerState/')].displayStatus" \
  --output tsv
```
Resultado esperado: `VM deallocated`.

---

## 3. Reactivar la Infraestructura y Reanudar Servicios

### Paso 1: Iniciar la máquina virtual
```bash
az vm start \
  --resource-group $RESOURCE_GROUP \
  --name $VM_NAME
```

### Paso 2: Verificar la dirección IP pública
Al tener una IP pública estática (`pip-cinev2-prod` tipo Standard), la dirección IP se conserva idéntica tras la desasignación.

### Paso 3: Conectar y comprobar contenedores
Docker y Nginx se iniciarán automáticamente gracias a la directiva `systemd` y la política `restart: always` de Docker Compose:

```bash
# Conectar por SSH
ssh -i ~/.ssh/id_rsa ubuntu@<TU_IP_PUBLICA_AZURE>

# Comprobar estado de los 11 contenedores
docker compose -f /home/ubuntu/CINEv2/docker-compose.yml ps
```

---

## 4. Desmantelamiento Total (Destrucción de Recursos)

Al concluir el ciclo de vida del proyecto o al finalizar la evaluación académica, elimine todos los recursos con un solo comando para garantizar \$0.00 de facturación posterior:

```bash
az group delete \
  --name rg-cinev2-prod \
  --yes \
  --no-wait
```
Este comando elimina la máquina virtual, la interfaz de red, la IP pública, el NSG, la VNet y los discos de almacenamiento de forma inmediata e irreversible.

