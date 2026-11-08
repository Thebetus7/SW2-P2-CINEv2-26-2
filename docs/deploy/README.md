# Arquitectura Multi-Cloud Distribuida — Ecosistema CineV2

Este documento define la arquitectura física, técnica y operativa del ecosistema **CineV2** distribuido entre tres proveedores de nube pública (**Google Cloud Platform**, **Microsoft Azure** y **Amazon Web Services**) para un proyecto de examen universitario de alta especialización.

---

## 1. Distribución Estratégica de Microservicios por Proveedor de Nube

Cada microservicio se aloja en la nube más idónea técnica y financieramente, maximizando el aprovechamiento de las **Capas Gratuitas (Free Tier / Always Free)**:

```mermaid
flowchart TB
    Docente["Docente / Evaluador (Internet)"]

    subgraph AZURE["Microsoft Azure (Nodo de Autenticación, Boletos e IA)"]
        direction TB
        VM_AZURE["Azure VM: Standard_B1s / B2s (Free Tier 12 Meses - eastus)<br/>IP Pública: http://&lt;IP_AZURE&gt;"]
        AuthFE["ms-ticket-auth-frontend<br/>Puerto :5174 (Portal Clientes)"]
        AuthBE["ms-ticket-auth-backend<br/>Puerto :8081 (Spring Boot 3 / Java 21)"]
        IAFE["ms-ia-mcp-frontend<br/>Puerto :5176 (Auditoría IA)"]
        IABe["ms-ia-mcp-backend<br/>Puerto :8001 (FastAPI GrokCloud)"]
        PGAUTH[("PostgreSQL Auth<br/>Puerto :5434")]
        
        AuthFE --> AuthBE
        AuthBE --> PGAUTH
        IAFE --> IABe
    end

    subgraph GCP["Google Cloud Platform (Nodo de Administración y Boleteo)"]
        direction TB
        VM_GCP["Compute Engine: e2-micro (Always Free - us-central1)<br/>IP Pública: http://&lt;IP_GCP&gt;"]
        CoreFE["ms-cinema-core-frontend<br/>Puerto :4200 (Admin Angular 17)"]
        CoreBE["ms-cinema-core-backend<br/>Puerto :3000 (NestJS TypeORM)"]
        BolFE["ms-boleteo-validator-frontend<br/>Puerto :5177 (Lector QR Cámara)"]
        BolBE["ms-boleteo-validator-backend<br/>Puerto :8000 (Laravel 11 PHP)"]
        PGCORE[("PostgreSQL Core<br/>Puerto :5433")]
        
        CoreFE --> CoreBE
        CoreBE --> PGCORE
        BolFE --> BolBE
        BolBE --> CoreBE
    end

    subgraph AWS["Amazon Web Services (Nodo Multimedia y Storage S3)"]
        direction TB
        VM_AWS["EC2: t3.micro (Free Tier 12 Meses - us-east-1)<br/>IP Pública: http://&lt;IP_AWS&gt;"]
        MedFE["ms-multimedia-frontend<br/>Puerto :5175 (Simulador)"]
        MedBE["ms-multimedia-backend<br/>Puerto :3001 (NestJS TensorFlow)"]
        S3Bucket[("Bucket AWS S3 Real<br/>s3://cinev2-media-bucket-prod")]
        
        MedFE --> MedBE
        MedBE --> S3Bucket
    end

    %% Accesos de Usuario
    Docente -->|"http://&lt;IP_AZURE&gt;:5174"| AuthFE
    Docente -->|"http://&lt;IP_GCP&gt;:4200"| CoreFE
    Docente -->|"http://&lt;IP_GCP&gt;:5177"| BolFE
    Docente -->|"http://&lt;IP_AZURE&gt;:5176"| IAFE
    Docente -->|"http://&lt;IP_AWS&gt;:5175"| MedFE

    %% Comunicación Cross-Cloud
    AuthBE -.->|"Consulta Cartelera http://&lt;IP_GCP&gt;:3000"| CoreBE
    IABe -.->|"Inspección MCP http://&lt;IP_GCP&gt;:3000"| CoreBE
    BolBE -.->|"Valida Firma HMAC http://&lt;IP_AZURE&gt;:8081"| AuthBE
    CoreBE -.->|"Carga Posters en S3"| S3Bucket
    MedBE -.->|"Consulta Estado de Sala http://&lt;IP_GCP&gt;:3000"| CoreBE
```

> [!NOTE]
> El proyecto `movil-client` (puerto :5173) corresponde a la aplicación móvil PWA orientada a ejecución en dispositivos y se excluye de los servidores en la nube.

---

## 2. Matriz de Asignación por Servidor y Costes

| Proveedor de Nube | Microservicios y Frameworks Asignados | Infraestructura Base | Manifiesto de Despliegue | Costo Mensual |
| :--- | :--- | :--- | :--- | :--- |
| **Microsoft Azure** | **Spring Boot 3 (Java 21)** + **FastAPI (Python)**<br>`ms-ticket-auth` (Portal Clientes :5174 + Backend Java :8081 + PostgreSQL :5434)<br>`ms-ia-mcp` (Auditoría :5176 + FastAPI :8001) | Azure VM `Standard_B1s`<br>Disco 64 GB SSD P6 | `docker-compose.azure.yml` | **$0.00 USD** (Free Tier 12 Meses / $200 crédito) |
| **Google Cloud (GCP)** | **NestJS (Node.js)** + **Angular 17** + **Laravel 11 (PHP 8.2)**<br>`ms-cinema-core` (Admin Angular :4200 + Backend NestJS :3000 + PostgreSQL :5433)<br>`ms-boleteo-validator` (Boletero :5177 + Laravel :8000) | Compute Engine `e2-micro`<br>Disco 30 GB pd-standard | `docker-compose.gcp.yml` | **$0.00 USD** (Always Free de por vida) |
| **Amazon Web Services (AWS)** | **NestJS** + **TensorFlow COCO-SSD**<br>`ms-multimedia` (Simulador :5175 + Backend TensorFlow :3001)<br>Almacenamiento: **Bucket real de AWS S3** | EC2 `t3.micro` + S3 Bucket (5 GB Free Tier) | `docker-compose.aws.yml` | **$0.00 USD** (Free Tier 12 Meses) |
| **TOTAL MULTI-CLOUD:** | **Todo el Ecosistema en Producción** | **3 Servidores + 1 S3 Bucket** | — | **$0.00 USD / mes** |

---

## 3. Matriz de Puertos y Reglas de Firewall Cross-Cloud

Para que los servicios se comuniquen entre servidores mediante sus IPs públicas, cada nube abre exclusivamente los puertos que aloja:

| Servidor / Nube | Puertos Requeridos en Firewall | Servicios Escuchando |
| :--- | :--- | :--- |
| **Azure (NSG nsg-cinev2-auth)** | `22, 5174, 8081, 5176, 8001` | SSH, Portal Clientes, Ticket-Auth API, Consola IA, IA-MCP API |
| **GCP (Regla allow-cinev2-core)** | `22, 4200, 3000, 5177, 8000` | SSH, Admin Angular, Cinema-Core API, Validador Boletero, Boleteo API |
| **AWS (Security Group sg-cinev2)** | `22, 5175, 3001` | SSH, Simulador Multimedia, Multimedia API |

---

## 4. Guías Detalladas por Nube

Cada carpeta contiene las instrucciones de despliegue paso a paso con los comandos CLI para su respectivo servidor:

1. [Guía de Despliegue en Microsoft Azure](azure/00_RESUMEN_GENERAL.md)
2. [Guía de Despliegue en Google Cloud Platform (GCP)](gcp/00_RESUMEN_GENERAL.md)
3. [Guía de Despliegue en Amazon Web Services (AWS)](aws/00_RESUMEN_GENERAL.md)
