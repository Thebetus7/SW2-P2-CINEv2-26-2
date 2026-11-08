# Despliegue en Amazon Web Services (AWS) — 02. Crear Infraestructura (Nodo Multimedia + S3)

Este documento describe la creación del bucket de almacenamiento en AWS S3 y el aprovisionamiento de la instancia EC2 para el nodo de multimedia.

---

## 1. Crear el Bucket Real de AWS S3 para Posters

Ejecute desde su consola local con AWS CLI:

```bash
# Definir nombre del bucket (debe ser globalmente único)
BUCKET_NAME="cinev2-media-bucket-prod"
REGION="us-east-1"

# 1. Crear el bucket en AWS S3
aws s3api create-bucket \
  --bucket $BUCKET_NAME \
  --region $REGION

# 2. Desactivar el bloqueo de acceso público para permitir que los navegadores lean los posters
aws s3api put-public-access-block \
  --bucket $BUCKET_NAME \
  --public-access-block-configuration "BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false"

# 3. Aplicar política de lectura pública para las imágenes de cartelera
cat <<EOF > /tmp/s3-policy.json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::$BUCKET_NAME/*"
    }
  ]
}
EOF

aws s3api put-bucket-policy --bucket $BUCKET_NAME --policy file:///tmp/s3-policy.json
echo "Bucket AWS S3 creado y configurado exitosamente: s3://$BUCKET_NAME"
```

---

## 2. Crear Security Group y Llaves SSH para la Instancia EC2

Solo abrimos los puertos del nodo AWS:
- `22`: SSH
- `5175`: Simulador Multimedia (Frontend React)
- `3001`: Backend Multimedia (API TensorFlow)

```bash
# 1. Crear Security Group
SG_ID=$(aws ec2 create-security-group \
  --group-name "sg-cinev2-multimedia" \
  --description "Security Group para Nodo Multimedia CineV2" \
  --query 'GroupId' --output text)

# 2. Abrir puertos de entrada
aws ec2 authorize-security-group-ingress --group-id $SG_ID --protocol tcp --port 22 --cidr 0.0.0.0/0
aws ec2 authorize-security-group-ingress --group-id $SG_ID --protocol tcp --port 5175 --cidr 0.0.0.0/0
aws ec2 authorize-security-group-ingress --group-id $SG_ID --protocol tcp --port 3001 --cidr 0.0.0.0/0

# 3. Crear par de llaves SSH (si no tiene una)
aws ec2 create-key-pair --key-name cinev2-aws-key --query 'KeyMaterial' --output text > ~/.ssh/cinev2-aws-key.pem
chmod 400 ~/.ssh/cinev2-aws-key.pem
```

---

## 3. Lanzar Instancia EC2 `t3.micro` (Free Tier)

```bash
# AMI oficial de Ubuntu 22.04 LTS en us-east-1
AMI_ID=$(aws ssm get-parameters --names /aws/service/canonical/ubuntu/server/22.04/stable/current/amd64/hvm/ebs-gp2/ami-id --query 'Parameters[0].Value' --output text)

# Lanzar la instancia EC2
INSTANCE_ID=$(aws ec2 run-instances \
  --image-id $AMI_ID \
  --instance-type t3.micro \
  --key-name cinev2-aws-key \
  --security-group-ids $SG_ID \
  --block-device-mappings "[{\"DeviceName\":\"/dev/sda1\",\"Ebs\":{\"VolumeSize\":30,\"VolumeType\":\"gp3\"}}]" \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=cinev2-aws-multimedia-node}]' \
  --query 'Instances[0].InstanceId' --output text)

echo "Esperando que la instancia EC2 esté en ejecución..."
aws ec2 wait instance-running --instance-ids $INSTANCE_ID

# Obtener la IP pública de la instancia EC2
IP_AWS=$(aws ec2 describe-instances --instance-ids $INSTANCE_ID --query 'Reservations[0].Instances[0].PublicIpAddress' --output text)

echo "=========================================================="
echo "IP Pública del Nodo AWS: $IP_AWS"
echo "Simulador Multimedia: http://$IP_AWS:5175"
echo "=========================================================="
```
