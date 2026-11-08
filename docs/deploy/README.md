# Despliegue de Infraestructura y Operaciones Cloud: Ecosistema CineV2

Guía maestra y matriz de asignación para el despliegue del ecosistema **CineV2** en proveedores de nube pública bajo arquitecturas de **Costo Mínimo** y aprovechamiento máximo de **Capas Gratuitas (Free Tier / Always Free)**.

---

## 1. Matriz de Otorgamiento y Asignación de Roles de Servidor

En cumplimiento del principio de menor privilegio (*Principle of Least Privilege - PoLP*), los accesos a la infraestructura de nube y a las capas del sistema se segregan rígidamente según el rol organizativo:

| Rol Organizativo | Responsabilidades Operativas | Accesos y Credenciales Otorgadas | Restricciones Estrictas |
| :--- | :--- | :--- | :--- |
| **Ingeniero Cloud / DevOps (SysAdmin)** | Provisión de VMs, red, firewall, certificados SSL, scripts de backup de PostgreSQL y monitoreo del host. | Llaves SSH (`id_rsa`), credenciales IAM de consola Cloud (AWS/GCP/Azure), usuario `sudo` en el servidor host. | Sin privilegios comerciales ni operativos sobre venta o anulación manual de boletos en base de datos. |
| **Administrador del Complejo (Gerente)** | Gestión de salas, películas, funciones y programación de cartelera, consulta de métricas de afluencia y reportes predictivos. | Usuario y contraseña web (`admin@cine.local`), acceso a `admin.<TU_DOMINIO>` (FRONTWEB Angular `:4200`) y descarga de reportes Excel. | **Terminantemente prohibido acceso SSH**, terminal de consola o credenciales directas a base de datos. |
| **Boletero de Puerta (Control de Acceso)** | Escaneo continuo de códigos QR dinámicos en accesos a salas y validación criptográfica en tiempo real. | Usuario y contraseña web (`boletero@cine.local`), acceso exclusivo a `boleteo.<TU_DOMINIO>` (Panel de Boleteo `:5177`). | Restringido a la vista de escáner. Sin acceso a edición de salas, cartelera ni base de datos. |
| **Auditor Comercial / Oficial de Seguridad** | Monitoreo de anomalías en taquilla, trazabilidad de firmas HMAC-SHA256 e inspección de reportes generados por n8n y GrokCloud. | Acceso a `ia.<TU_DOMINIO>` (Consola de IA `:5176`) y visor de logs de auditoría comercial. | Sin acceso SSH al servidor ni modificación de precios de entradas. |
| **Cliente Final (Público General)** | Consulta de cartelera, compra asistida por chatbot conversacional y presentación de tickets offline. | Registro público / acceso a `cine.<TU_DOMINIO>` (`:5174`) y aplicación PWA móvil (`:5173`). | Restringido al catálogo y pasarela de checkout. |

---

## 2. Comparativa de Opciones de Nube de Bajo Costo / Free Tier

| Proveedor | Servicio de Cómputo | Capa Gratuita (Free Tier) | Costo Residual Estimado | Enlace a Documentación |
| :--- | :--- | :--- | :--- | :--- |
| **Amazon Web Services (AWS)** | EC2 `t4g.small` (ARM64) o `t3.micro` / Lightsail | 750 horas/mes gratis durante los primeros 12 meses (EC2 `t3.micro` o `t4g.small`), S3 5GB gratis, DynamoDB 25GB siempre gratis. | **$0.00 / mes** (Meses 1-12)<br>o ~$3.50 a $5.00/mes en Lightsail posterior. | [Guía AWS](aws/00_RESUMEN_GENERAL.md) |
| **Google Cloud Platform (GCP)** | Compute Engine `e2-micro` (2 vCPU compartidas, 1 GB RAM) en `us-central1` o `us-east1`. | **Always Free Tier de por vida** (1 instancia `e2-micro` + 30 GB de disco persistente estándar sin costo mensual recurrente). | **$0.00 / mes** (Requiere configuración de 4GB Swap por memoria). | [Guía GCP](gcp/00_RESUMEN_GENERAL.md) |
| **Microsoft Azure** | Virtual Machines `B1s` (1 vCPU, 1 GB RAM) o `B2s` (2 vCPU, 4 GB RAM). | 750 horas/mes gratis durante los primeros 12 meses (VM Linux `B1s` con 64 GB SSD P6) + $200 USD de crédito inicial los primeros 30 días. | **$0.00 / mes** (Mes 1 con crédito y 1-12 con B1s)<br>o ~$7.50/mes con `B1s`. | [Guía Azure](azure/00_RESUMEN_GENERAL.md) |

---

## 3. Estructura de Suites Documentales por Nube

Cada carpeta contiene la suite operativa completa y verificable para el proveedor correspondiente:

```text
docs/deploy/
├── README.md                      # Esta guía maestra y matriz de roles
├── aws/                           # Suite de despliegue en Amazon Web Services
│   ├── 00_RESUMEN_GENERAL.md
│   ├── 01_CONFIGURAR_PROYECTO.md
│   ├── 02_CREAR_INFRAESTRUCTURA.md
│   ├── 03_INSTALAR_HERRAMIENTAS.md
│   ├── 04_DESPLEGAR_Y_VERIFICAR.md
│   ├── 05_ACTUALIZAR_PRODUCCION.md
│   ├── 06_APAGAR_Y_REACTIVAR.md
│   └── 07_FLUJO_VISUAL_DESPLIEGUE.html
├── gcp/                           # Suite de despliegue en Google Cloud Platform
│   ├── 00_RESUMEN_GENERAL.md
│   ├── 01_CONFIGURAR_PROYECTO.md
│   ├── 02_CREAR_INFRAESTRUCTURA.md
│   ├── 03_INSTALAR_HERRAMIENTAS.md
│   ├── 04_DESPLEGAR_Y_VERIFICAR.md
│   ├── 05_ACTUALIZAR_PRODUCCION.md
│   ├── 06_APAGAR_Y_REACTIVAR.md
│   └── 07_FLUJO_VISUAL_DESPLIEGUE.html
└── azure/                         # Suite de despliegue en Microsoft Azure
    ├── 00_RESUMEN_GENERAL.md
    ├── 01_CONFIGURAR_PROYECTO.md
    ├── 02_CREAR_INFRAESTRUCTURA.md
    ├── 03_INSTALAR_HERRAMIENTAS.md
    ├── 04_DESPLEGAR_Y_VERIFICAR.md
    ├── 05_ACTUALIZAR_PRODUCCION.md
    ├── 06_APAGAR_Y_REACTIVAR.md
    └── 07_FLUJO_VISUAL_DESPLIEGUE.html
```

