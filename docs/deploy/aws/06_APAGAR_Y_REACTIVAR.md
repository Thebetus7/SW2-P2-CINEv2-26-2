# Despliegue en Amazon Web Services (AWS) — 06. Apagar y Reactivar

## 1. Procedimiento de Parada para Prevenir Costes Residuales

Cuando el proyecto no esté en uso (fines de semana, vacaciones o pausas de desarrollo), puede detener la instancia para pausar el consumo de horas de cómputo:

### Detención Ordenada de Contenedores y Sistema
```bash
# 1. Conectarse a la instancia
ssh -i cinev2-key.pem ubuntu@<TU_IP_PUBLICA>

# 2. Detener de forma limpia los contenedores para preservar estados en volúmenes
cd /home/ubuntu/CINEv2
docker compose down

# 3. Cerrar sesión SSH y detener la instancia desde AWS CLI o Consola
exit

# Desde su terminal local:
aws ec2 stop-instances --instance-ids <INSTANCE_ID> --region us-east-1
```

> [!WARNING]
> **Coste de Elastic IP cuando la instancia está detenida:**  
> AWS cobra aproximadamente **$0.005 USD por hora** (~$3.60 USD al mes) por una dirección Elastic IP asignada que no esté asociada a una instancia en ejecución.  
> **Recomendación para Coste Cero Total:** Si va a detener la instancia por varios días, libere la Elastic IP (`aws ec2 release-address --allocation-id <ALLOC_ID>`) y solicite una nueva al reactivar el servidor.

---

## 2. Reactivación del Servidor y Servicios

```bash
# 1. Iniciar la instancia EC2
aws ec2 start-instances --instance-ids <INSTANCE_ID> --region us-east-1

# 2. Esperar a que esté en ejecución
aws ec2 wait instance-running --instance-ids <INSTANCE_ID> --region us-east-1

# 3. Conectarse vía SSH
ssh -i cinev2-key.pem ubuntu@<TU_IP_PUBLICA>

# 4. Iniciar Docker Compose (si no tiene reinicio automático)
cd /home/ubuntu/CINEv2
docker compose up -d

# 5. Comprobar que Nginx y Certbot renueven el tráfico
sudo systemctl restart nginx
docker compose ps
```
Todos los datos de películas, compras y boletos se restaurarán automáticamente a partir de los volúmenes persistentes en `/var/lib/docker/volumes/`.

