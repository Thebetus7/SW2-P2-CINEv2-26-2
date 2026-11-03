# Plan Técnico: Módulo 04 - Servidor MCP y Agente Auditor GrokCloud (MS IA-MCP)

> **Estado:** APPROVED  
> **Versión:** 1.3.0  
> **Módulo:** `docs/specs/04-ms-ia-mcp/`  
> **Ubicación en Código:** `ms/ms-ia-mcp/backend/` y `ms/ms-ia-mcp/frontend/`  
> **Especificación Base:** `docs/specs/04-ms-ia-mcp/spec.md`  
> **Constitución Base:** `docs/constitution.md` (v1.3.0)  
> **Metodología:** SDD-Planning

---

## 1. Resumen Arquitectónico y Decisiones de Diseño

- **Objetivo Técnico:** Implementar el servidor MCP (Model Context Protocol JSON-RPC) en FastAPI (Python 3.11+), integrando el Agente Auditor GrokCloud (`${GROQ_API_KEY}`), despachador de webhooks hacia n8n y endpoint de chatbot de compra, con una consola de auditoría en React 18.
- **Estilo Arquitectónico:**
  - *Backend (`ms/ms-ia-mcp/backend`):* FastAPI con arquitectura por capas (Domain, MCP, Agent, Infrastructure, Presentation). Servidor JSON-RPC autónomo.
  - *Frontend (`ms/ms-ia-mcp/frontend`):* React 18 SPA con Vite, consola de eventos de auditoría y simulador de chatbot.

### 1.1 Matriz de Componentes Técnicos (`PLAN-XX`)

| ID Componente | Nombre / Artefacto Técnico | Capa Arquitectónica | Responsabilidad Técnica | Requisitos que Cubre |
| :--- | :--- | :--- | :--- | :--- |
| **`PLAN-01`** | `McpServer`, `Manifest`, `Tools` | MCP / Protocolo | Implementación JSON-RPC de las 3 herramientas semánticas. | `HU-09`, `RF-09.1` |
| **`PLAN-02`** | `AnomalyRules`, Esquemas Pydantic | Dominio | Invariantes de umbrales (>40 taquilla, <15% sala) y tipado. | `RB-MCP-02` |
| **`PLAN-03`** | `GrokCloudAgentService`, `AuditCycleScheduler` | Aplicación / IA | Ciclo de auditoría autónoma cada 60s y llamadas MCP. | `RF-09.2`, `RF-09.3` |
| **`PLAN-04`** | `N8NWebhookAdapter`, `MicroservicesClients` | Infraestructura | Clientes HTTP hacia Cinema Core, Multimedia y webhook n8n (`IC-04.1` a `IC-04.3`). | `HU-10`, `RF-10.1` |
| **`PLAN-05`** | `AuditController`, `ChatbotController`, `AuditConsoleUI`| Presentación | Endpoints REST, chatbot (`IC-04.4`) y consola React. | `HU-11`, `RF-11.1` |

---

## 2. Estructura Física de Archivos del Módulo

```text
ms/ms-ia-mcp/
├── backend/
│   ├── pyproject.toml                                                                # FastAPI, uvicorn, pydantic, httpx, apscheduler, pytest
│   ├── requirements.txt
│   ├── main.py                                                                       # Punto de entrada FastAPI (puerto 8001)
│   ├── app/
│   │   ├── config.py                                                                 # GROQ_API_KEY y URLs de n8n
│   │   ├── domain/
│   │   │   ├── models.py                                                             # Esquemas Pydantic de anomalías y métricas
│   │   │   └── anomaly_rules.py                                                      # Invariantes de aforo y afluencia
│   │   ├── mcp/
│   │   │   ├── server.py                                                             # Servidor JSON-RPC MCP
│   │   │   ├── manifest.py                                                           # Manifiesto de las 3 herramientas
│   │   │   └── tools/
│   │   │       ├── occupancy_tool.py                                                 # Tool get_occupancy_metrics (IC-04.1)
│   │   │       ├── line_analytics_tool.py                                            # Tool get_line_analytics (IC-04.2)
│   │   │       └── n8n_contingency_tool.py                                           # Tool trigger_n8n_contingency (IC-04.3)
│   │   ├── agent/
│   │   │   ├── grok_client.py                                                        # Cliente GrokCloud
│   │   │   ├── system_prompt.py                                                      # Prompt de Auditor Comercial
│   │   │   └── auditor_agent.py                                                      # Bucle autónomo de evaluación
│   │   ├── infrastructure/
│   │   │   ├── n8n_client.py                                                         # Despachador de Webhook n8n
│   │   │   └── service_clients.py                                                    # Clientes hacia Core y Multimedia
│   │   └── presentation/
│   │       ├── audit_routes.py                                                       # /api/v1/audit/trigger-now
│   │       └── chatbot_routes.py                                                     # /api/v1/chat (IC-04.4)
│   ├── tests/
│   │   ├── test_mcp_tools.py                                                         # Test de herramientas MCP
│   │   ├── test_anomaly_detection.py                                                 # Test de reglas de detección
│   │   └── test_n8n_webhook.py                                                       # Test de emisión a n8n
│   └── Dockerfile                                                                    # Python 3.11-slim
│
└── frontend/
    ├── package.json                                                                  # React 18, Vite, TailwindCSS
    ├── src/
    │   └── components/
    │       └── AuditMonitorConsole.tsx                                               # Consola con botón [Ejecutar Auditoría MCP Ahora]
    └── Dockerfile
```

