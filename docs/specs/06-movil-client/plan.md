# Plan Técnico: Módulo 06 - Aplicación Móvil del Cliente (MOVIL CLIENT)

> **Estado:** APPROVED  
> **Versión:** 1.3.0  
> **Módulo:** `docs/specs/06-movil-client/`  
> **Ubicación en Código:** `ms/movil-client/` (Frontend Directo React 18 PWA + Capacitor)  
> **Especificación Base:** `docs/specs/06-movil-client/spec.md`  
> **Constitución Base:** `docs/constitution.md` (v1.3.0)  
> **Metodología:** SDD-Planning

---

## 1. Resumen Arquitectónico y Decisiones de Diseño

- **Objetivo Técnico:** Implementar la aplicación híbrida cliente unificada en React 18, configurada como PWA con Service Workers para ejecución offline y almacenamiento en IndexedDB, empaquetada con Capacitor para capacidades nativas (GPS), con Stepper UI para pago Stripe (60s) y panel deslizable retráctil de Chatbot.
- **Estilo Arquitectónico:**
  - *Frontend Directo (`ms/movil-client`):* React 18 SPA con Vite, Apollo Client (GraphQL), Capacitor Core y Geolocation, Dexie.js (wrapper de IndexedDB) y TailwindCSS. Sin subcarpeta backend.

### 1.1 Matriz de Componentes Técnicos (`PLAN-XX`)

| ID Componente | Nombre / Artefacto Técnico | Capa Arquitectónica | Responsabilidad Técnica | Requisitos que Cubre |
| :--- | :--- | :--- | :--- | :--- |
| **`PLAN-01`** | `OfflineStorageService` (Dexie.js) | Cliente / Almacenamiento | Almacenamiento local de boletos (Blob JPEG y JSON del QR) en IndexedDB. | `INV-BIZ-05`, `RB-MOB-01`, `RF-17.2` |
| **`PLAN-02`** | `ApolloClientConfig`, `ShowtimesClient` | Cliente / Red | Consumo de GraphQL federado de Auth (`IC-06.1`) y REST de Core (`IC-06.2`).| `RF-16.1`, `SC-07.1.1` |
| **`PLAN-03`** | `ChatDrawer.tsx` | Presentación / IA | Panel lateral deslizable retráctil de recomendaciones con IA (`IC-06.4`). | `HU-03`, `RB-MOB-03`, `SC-07.3.1` |
| **`PLAN-04`** | `GpsGuidanceService` (Capacitor) | Cliente / Nativo | Detección de proximidad con API de geolocalización. | `HU-18`, `RF-18.1`, `RF-18.2` |
| **`PLAN-05`** | `SeatSelectionMap`, `StripeCheckoutWrapper`| Presentación / UI | Stepper UI con temporizador de 60s y Stripe Elements. | `HU-16`, `RF-16.2`, `RF-16.3` |

---

## 2. Estructura Física de Archivos del Módulo

```text
ms/movil-client/
├── package.json                                                                      # React 18, @apollo/client, @capacitor/core, @capacitor/geolocation, dexie, tailwindcss
├── vite.config.ts                                                                    # Configuración de Vite + VitePWA plugin
├── capacitor.config.ts                                                               # Configuración de empaquetado nativo Capacitor
├── src/
│   ├── main.tsx
│   ├── App.tsx                                                                       # Enrutamiento principal y Drawer del Chatbot
│   ├── services/
│   │   ├── apollo-client.ts                                                          # Cliente GraphQL hacia ms-ticket-auth (IC-06.1)
│   │   ├── offline-storage.service.ts                                                # Operaciones CRUD en IndexedDB
│   │   └── gps-guidance.service.ts                                                   # API de geolocalización nativa Capacitor
│   ├── components/
│   │   ├── Billboard/
│   │   │   ├── MovieList.tsx                                                         # Catálogo de películas
│   │   │   └── ShowtimeSelector.tsx                                                  # Selección de horario
│   │   ├── Purchase/
│   │   │   ├── SeatSelectionMap.tsx                                                  # Mapa interactivo de butacas
│   │   │   ├── TicketPreviewModal.tsx                                                # Imagen JPEG desde MinIO S3 (IC-06.3)
│   │   │   └── StripeCheckoutWrapper.tsx                                             # Contenedor Stripe con temporizador 60s
│   │   ├── Tickets/
│   │   │   ├── MyTicketsList.tsx                                                     # Vista "Mis Boletos" (Online/Offline)
│   │   │   └── QrCodeViewer.tsx                                                      # Render de QR dinámico con brillo alto
│   │   ├── Navigation/
│   │   │   └── GpsGuidanceCard.tsx                                                   # Tarjeta "Cómo llegar a tu Sala"
│   │   └── Chatbot/
│   │       └── ChatDrawer.tsx                                                        # Panel lateral deslizable retráctil (IC-06.4)
│   └── tests/
│       └── OfflineTickets.spec.tsx                                                   # Test BDD de visualización offline
└── Dockerfile                                                                        # Nginx Alpine para servir PWA
```

