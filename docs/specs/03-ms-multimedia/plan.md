# Plan Técnico: Módulo 03 - Servicios Multimedia y Visión Artificial (MS MULTIMEDIA)

> **Estado:** APPROVED  
> **Versión:** 1.3.0  
> **Módulo:** `docs/specs/03-ms-multimedia/`  
> **Ubicación en Código:** `ms/ms-multimedia/backend/` y `ms/ms-multimedia/frontend/`  
> **Especificación Base:** `docs/specs/03-ms-multimedia/spec.md`  
> **Constitución Base:** `docs/constitution.md` (v1.3.0)  
> **Metodología:** SDD-Planning

---

## 1. Resumen Arquitectónico y Decisiones de Diseño

- **Objetivo Técnico:** Implementar el microservicio de generación gráfica en JPEG con firma HMAC-SHA256, inferencia de visión artificial con TensorFlow COCO-SSD, persistencia local en MinIO S3 y DynamoDB, acompañado de un simulador en React 18.
- **Estilo Arquitectónico:**
  - *Backend (`ms/ms-multimedia/backend`):* NestJS 10 modular con adaptadores para AWS SDK Local (`@aws-sdk/client-s3` en `localhost:9000` y `@aws-sdk/client-dynamodb` en `localhost:8002`), motor de imágenes Sharp, generación QR y TensorFlow.js (`@tensorflow/tfjs-node`).
  - *Frontend (`ms/ms-multimedia/frontend`):* Aplicación React 18 con botones de simulación interactiva `[Simular Fila Normal]` y `[Simular Fila Congestionada]`.

### 1.1 Matriz de Componentes Técnicos (`PLAN-XX`)

| ID Componente | Nombre / Artefacto Técnico | Capa Arquitectónica | Responsabilidad Técnica | Requisitos que Cubre |
| :--- | :--- | :--- | :--- | :--- |
| **`PLAN-01`** | `BootstrapStorageService` | Infraestructura / Storage | Creación inicial de buckets S3 y tablas en DynamoDB. | `INV-ARCH-02`, `RF-07.3` |
| **`PLAN-02`** | `CryptoSignatureService`, `LineCongestionVO` | Dominio | Algoritmo HMAC-SHA256 e invariantes de umbral > 40 personas. | `RB-MEDIA-01`, `RB-MEDIA-04` |
| **`PLAN-03`** | `GenerateTicketJpegUseCase`, `AnalyzeQueueImageUseCase`| Aplicación | Composición de la imagen del ticket y orquestación de inferencia TensorFlow. | `HU-07`, `HU-08`, `RF-07.2` |
| **`PLAN-04`** | `MinioS3Adapter`, `DynamoDbAdapter`, `TensorFlowCocoService`| Infraestructura | Clientes AWS SDK locales y ejecución de la red neuronal. | `RB-MEDIA-03`, `RB-MEDIA-05` |
| **`PLAN-05`** | Controladores REST y Simulador React | Presentación | Endpoints HTTP (`IC-03.1`, `IC-03.2`) e interfaz web de prueba. | `HU-08`, `RF-08.3` |

---

## 2. Estructura Física de Archivos del Módulo

```text
ms/ms-multimedia/
├── backend/
│   ├── package.json                                                                  # NestJS, @aws-sdk, @tensorflow/tfjs-node, @tensorflow-models/coco-ssd, sharp, qrcode
│   ├── tsconfig.json
│   ├── src/
│   │   ├── app.module.ts
│   │   ├── config/
│   │   │   ├── aws-local.config.ts                                                   # Endpoints fijos localhost:9000 y localhost:8002
│   │   │   └── bootstrap-storage.ts                                                  # Creación de buckets y tablas DynamoDB al arrancar
│   │   ├── modules/
│   │   │   ├── crypto/
│   │   │   │   ├── domain/crypto-signature.vo.ts                                     # Lógica pura HMAC-SHA256
│   │   │   │   └── application/crypto.service.ts                                     # Firma con clave clave_secreta_universitaria_mcp
│   │   │   ├── tickets-media/
│   │   │   │   ├── application/generate-ticket-jpeg.use-case.ts                      # Ensamble de portada, datos y QR en JPEG
│   │   │   │   ├── infrastructure/minio-s3.adapter.ts                                # Subida a MinIO S3
│   │   │   │   ├── infrastructure/dynamodb-ticket.adapter.ts                         # Persistencia en TicketMetadata
│   │   │   │   └── presentation/tickets-media.controller.ts                          # Endpoint para MS TICKET-AUTH (IC-03.1)
│   │   │   └── vision-analytics/
│   │   │       ├── domain/line-congestion.vo.ts                                      # Invariante umbral > 40 personas
│   │   │       ├── application/analyze-queue-image.use-case.ts                       # Inferencia y conteo COCO-SSD
│   │   │       ├── infrastructure/tensorflow-coco.service.ts                         # Wrapper TensorFlow.js
│   │   │       ├── infrastructure/dynamodb-analytics.adapter.ts                      # Persistencia en LineAnalytics
│   │   │       └── presentation/line-analytics.controller.ts                         # Endpoint para MS IA-MCP (IC-03.2)
│   │   └── test/
│   │       ├── crypto-signature.spec.ts                                              # Test de firma HMAC-SHA256
│   │       ├── ticket-jpeg-generation.spec.ts                                        # Test de composición y subida S3
│   │       └── tensorflow-detection.spec.ts                                          # Test de inferencia con imágenes demo
│   └── Dockerfile                                                                    # Multi-stage tfjs-node Alpine
│
└── frontend/
    ├── package.json                                                                  # React 18, Vite, TailwindCSS
    ├── src/
    │   └── components/
    │       └── QueueSimulatorView.tsx                                                # Botones [Simular Fila Normal] y [Fila Congestionada]
    └── Dockerfile
```

---

## 3. Modelo Físico de Persistencia (MinIO S3 + DynamoDB Local)

- **MinIO S3 (`http://localhost:9000`):** Buckets `cine-posters` y `cine-tickets`.
- **DynamoDB Local (`http://localhost:8002`):**
  - Tabla `LineAnalytics`: `cameraZoneId (S, PK)`, `timestamp (S, SK)`, `personCount (N)`, `congestionStatus (S)`.
  - Tabla `TicketMetadata`: `ticketId (S, PK)`, `seatId (S)`, `showtimeId (S)`, `cryptoSignature (S)`, `s3JpegUrl (S)`.

