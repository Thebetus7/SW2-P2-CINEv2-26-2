# Despliegue en Amazon Web Services (AWS) — 02. Crear Infraestructura

## 1. Provisión de Recursos mediante AWS CLI o Consola Web

### Paso 1: Crear el Security Group (`cinev2-sg`)
Permitiremos tráfico únicamente para SSH (22), HTTP (80) y HTTPS (443):

```bash
# 1. Crear el grupo de seguridad
aws ec2 create-security-group \
    --group-name cinev2-sg \
    --description "Security Group para el Ecosistema CineV2" \
    --region us-east-1

# 2. Obtener el GROUP_ID generado y autorizar puertos públicos
VPC_ID=$(aws ec2 describe-vpcs --filters "Name=isDefault,Values=true" --query "Vpcs[0].VpcId" --output text --region us-east-1)
SG_ID=$(aws ec2 describe-security-groups --group-names cinev2-sg --query "SecurityGroups[0].GroupId" --output text --region us-east-1)

# Permitir SSH (administración DevOps)
aws ec2 authorize-security-group-ingress \
    --group-id $SG_ID \
    --protocol tcp \
    --port 22 \
    --cidr 0.0.0.0/0 \
    --region us-east-1

# Permitir HTTP (Nginx / Certbot challenge)
aws ec2 authorize-security-group-ingress \
    --group-id $SG_ID \
    --protocol tcp \
    --port 80 \
    --cidr 0.0.0.0/0 \
    --region us-east-1

# Permitir HTTPS (Tráfico web seguro y cámara en boletero)
aws ec2 authorize-security-group-ingress \
    --group-id $SG_ID \
    --protocol tcp \
    --port 443 \
    --cidr 0.0.0.0/0 \
    --region us-east-1
```

---

### Paso 2: Crear el Par de Llaves SSH (`cinev2-key`)

```bash
aws ec2 create-key-pair \
    --key-name cinev2-key \
    --query 'KeyMaterial' \
    --output text \
    --region us-east-1 > cinev2-key.pem

# Asignar permisos seguros al archivo de la llave (Unix / WSL / Git Bash)
chmod 400 cinev2-key.pem
```

---

### Paso 3: Lanzar la Instancia EC2 (Ubuntu 22.04 LTS en Free Tier)

Utilizaremos la AMI oficial de Ubuntu 22.04 LTS x86_64 con instancia `t3.micro` o `t4g.small` (elegible en Free Tier) y disco EBS gp3 de 30 GB (límite máximo gratuito):

```bash
# Obtener el ID de la última AMI de Ubuntu 22.04 en us-east-1
AMI_ID=$(aws ssm get-parameter \
    --name /aws/service/canonical/ubuntu/server/22.04/stable/current/amd64/hvm/ebs-gp2/ami-id \
    --query "Parameter.Value" \
    --output text \
    --region us-east-1)

# Lanzar la instancia
INSTANCE_ID=$(aws ec2 run-instances \
    --image-id $AMI_ID \
    --count 1 \
    --instance-type t3.micro \
    --key-name cinev2-key \
    --security-group-ids $SG_ID \
    --block-device-mappings '[{"DeviceName":"/dev/sda1","Ebs":{"VolumeSize":30,"VolumeType":"gp3","DeleteOnTermination":true}}]' \
    --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=CineV2-Production-Server}]' \
    --region us-east-1 \
    --query 'Instances[0].InstanceId' \
    --output text)

echo "Instancia creada con ID: $INSTANCE_ID"
```

---

### Paso 4: Asignar y Enlazar una Elastic IP (IP Pública Fija)

```bash
# Asignar IP elástica
ALLOC_ID=$(aws ec2 allocate-address --domain vpc --region us-east-1 --query 'AllocationId' --output text)
PUBLIC_IP=$(aws ec2 describe-addresses --allocation-ids $ALLOC_ID --query 'Addresses[0].PublicIp' --output text --region us-east-1)

# Esperar a que la instancia pase a estado 'running'
aws ec2 wait instance-running --instance-ids $INSTANCE_ID --region us-east-1

# Asociar la IP elástica a la instancia
aws ec2 associate-address --instance-id $INSTANCE_ID --allocation-id $ALLOC_ID --region us-east-1

echo "=========================================================="
echo "Servidor listo en IP Pública: $PUBLIC_IP"
echo "Comando de acceso SSH: ssh -i cinev2-key.pem ubuntu@$PUBLIC_IP"
echo "=========================================================="
```

