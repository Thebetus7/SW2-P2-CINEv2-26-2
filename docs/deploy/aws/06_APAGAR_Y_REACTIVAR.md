# Despliegue en Amazon Web Services (AWS) — 06. Apagar y Reactivar

Este documento explica cómo pausar y reanudar el servidor EC2 de AWS desde la **consola web** de AWS para no consumir horas ni memoria innecesariamente cuando no estés presentando o trabajando en el proyecto.

---

## 1. Cómo Detener el Servidor (Consola Web)

1. Ingresa a la consola de AWS: **[https://console.aws.amazon.com/ec2/](https://console.aws.amazon.com/ec2/)**.
2. Asegúrate de estar en la región **us-east-1** (N. Virginia).
3. En el menú izquierdo, ve a **Instancias** (Instances).
4. Selecciona tu máquina `cinev2-aws-multimedia-node` marcando su casilla.
5. En la barra superior, haz clic en el menú desplegable **"Estado de la instancia"** (Instance state).
6. Haz clic en **"Detener instancia"** (Stop instance).
7. Confirma haciendo clic en el botón rojo **"Detener"** (Stop).

> [!NOTE]
> Al estar detenida (*Stopped*), AWS congela la CPU y la memoria RAM, por lo que no se consumen horas del Free Tier. Tus archivos en el disco EBS de 30 GB y en el bucket S3 se mantienen intactos.

---

## 2. Cómo Reactivar el Servidor (Consola Web)

1. En la lista de **Instancias**, selecciona tu máquina `cinev2-aws-multimedia-node`.
2. Haz clic en el botón superior **"Estado de la instancia"** (Instance state) -> **"Iniciar instancia"** (Start instance).
3. Espera 1 minuto mientras el estado cambia a **En ejecución** (Running).
4. ⚠️ **IMPORTANTE:** Al iniciar una instancia detenida en AWS, AWS le asigna una **nueva Dirección IPv4 pública**.
5. Copia la nueva IP pública que aparece en la consola de EC2.
6. Si la IP pública cambió:
   - Actualiza tu archivo `.env` en Azure (`MULTIMEDIA_URL=http://<NUEVA_IP_AWS>:3001`).
   - Accede a tu simulador en: `http://<NUEVA_IP_AWS>:5175`.
7. Conéctate por SSH o EC2 Instance Connect y comprueba que Docker levantó los contenedores:
   ```bash
   cd /home/ubuntu/CINEv2
   docker compose -f docker-compose.aws.yml up -d
   docker compose -f docker-compose.aws.yml ps
   ```
