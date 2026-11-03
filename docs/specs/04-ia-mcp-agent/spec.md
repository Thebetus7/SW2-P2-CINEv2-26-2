# Specification: Módulo 04 - Servidor MCP, Agente Auditor GrokCloud y Automatización n8n (MS IA-MCP)

> **Estado:** APPROVED  
> **Módulo:** 04-ia-mcp-agent  
> **Metodología:** SDD-Spec-Assisted  
> **Subordinación:** Sujeto estrictamente a `docs/constitution.md` (v1.1.0)

---

## 1. Objetivo y Alcance

### 1.1 Objetivo de Negocio
Orquestar la inteligencia artificial autónoma del complejo cinematográfico implementando el protocolo **Model Context Protocol (MCP)** para que agentes inteligentes auditen en tiempo real las operaciones comerciales del cine (ocupación de salas y filas de taquilla), detecten desviaciones críticas y disparen flujos reactivos de contingencia en **n8n**, generando reportes predictivos consolidados en hojas de cálculo Excel (`.xlsx`) y suministrando asistencia conversacional a los clientes en el flujo de compra.

### 1.2 Alcance Funcional (In-Scope)
- **Servidor MCP bajo Estándar JSON-RPC:** Exposición de un manifiesto semántico con tres herramientas obligatorias:
  1. `get_occupancy_metrics()`: Conecta con `MS CINEMA-CORE` para evaluar el aforo de las salas y detectar funciones con baja concurrencia.
  2. `get_line_analytics()`: Conecta con `MS MULTIMEDIA` para leer el conteo de personas de TensorFlow en la fila de taquilla.
  3. `trigger_n8n_contingency()`: Dispara un Webhook estructurado hacia la plataforma de automatización `n8n`.
- **Agente Autónomo Auditor Comercial (GrokCloud):**
  - Inyección de la API Key de GrokCloud (`${GROQ_API_KEY}`).
  - System Prompt especializado con el rol de *Auditor Comercial de Operaciones de Cine*.
  - Ciclo de evaluación dual: ejecución periódica automática cada 60 segundos en background + botón manual en la consola de administración (`[Ejecutar Auditoría MCP Ahora]`) para demostración en vivo.
- **Integración con n8n y Reportes Predictivos en Excel:**
  - Envío de payload tipado: `{ anomaly_type, severity_level, raw_mcp_data, timestamp }`.
  - n8n ensambla un archivo real en formato `.xlsx` (hoja de cálculo binaria con tablas y métricas) y lo pone a disposición del administrador sin usar textos vacíos.
- **Endpoint Conversacional para el Chatbot Deslizable:**
  - Procesamiento de solicitudes de lenguaje natural de los clientes para consultar cartelera, recomendar películas y asistir en la selección de butacas.

### 1.3 Exclusiones Explícitas (Out-of-Scope)
- **Métricas de Confitería:** Exclusión total de cualquier análisis de colas o ventas de dulcería (acorde a `INV-BIZ-01`).
- **Uso de Archivos Excel Dummy o Placeholders:** El archivo `.xlsx` debe compilarse de forma real por n8n con los datos recibidos de las herramientas MCP.

---

## 2. Actores y Permisos en el Módulo

| Actor | Permisos en este Módulo | Restricciones de Acceso |
| :--- | :--- | :--- |
| **Agente Auditor GrokCloud (Sistema)** | Consumir las herramientas MCP en bucle continuo o bajo demanda; razonar sobre las métricas y decidir si gatilla el webhook a n8n. | No puede alterar directamente la base de datos sin pasar por las APIs de los microservicios. |
| **Administrador (`admin`)** | Disparar manualmente la auditoría mediante el botón `[Ejecutar Auditoría MCP Ahora]`; inspeccionar el log de razonamiento del agente; descargar los reportes Excel `.xlsx`. | No puede alterar la API Key de GrokCloud en caliente. |
| **Cliente (`cliente`)** | Interactuar con el endpoint conversacional a través del Chatbot deslizable. | No tiene acceso a las herramientas de auditoría ni a los webhooks de n8n. |
| **Motor de Automatización `n8n`** | Recibir webhooks con anomalías comerciales, procesar reglas y generar reportes Excel. | Servicio de contingencia pasivo. |

---

## 3. Modelo Funcional de Datos y Reglas de Negocio Específicas

### 3.1 Contratos y Herramientas MCP (Manifiesto JSON-RPC)

#### Herramienta 1: `get_occupancy_metrics`
- **Propósito:** Interroga a `MS CINEMA-CORE` y retorna:
  ```json
  {
    "promedioOcupacionGlobal": 45.5,
    "totalFuncionesActivas": 6,
    "funcionesSubocupadas": [
      {
        "showtimeId": "uuid-1",
        "pelicula": "Oppenheimer",
        "sala": "Sala 2",
        "minutosParaInicio": 25,
        "porcentajeAforo": 8.0
      }
    ]
  }
  ```

#### Herramienta 2: `get_line_analytics`
- **Propósito:** Interroga a `MS MULTIMEDIA` y retorna:
  ```json
  {
    "zona": "TAQUILLA_PRINCIPAL",
    "personasEnFila": 45,
    "estadoCongestion": "CONGESTIONADA",
    "umbralPermitido": 40,
    "timestamp": "2026-11-03T00:50:00Z"
  }
  ```

#### Herramienta 3: `trigger_n8n_contingency`
- **Propósito:** Emite la alerta hacia el Webhook de n8n enviando:
  ```json
  {
    "anomaly_type": "TAQUILLA_CONGESTIONADA" | "SALA_SUBOCUPADA",
    "severity_level": "CRITICAL" | "WARNING",
    "raw_mcp_data": {},
    "timestamp": "2026-11-03T00:50:05Z"
  }
  ```

### 3.2 Reglas de Negocio del Módulo (`RB-MCP-XX`)

- **`RB-MCP-01` (Evaluación Dual de Auditoría):** El sistema debe ejecutar el ciclo de auditoría comercial de forma autónoma en segundo plano cada 60 segundos y habilitar un endpoint inmediato `/api/audit/trigger-now` vinculado al botón visual de la consola de administración.
- **`RB-MCP-02` (Criterios de Detección de Anomalías del Agente):**
  - Si `personasEnFila > 40` $\rightarrow$ Clasificar como anomalía `TAQUILLA_CONGESTIONADA` con severidad `CRITICAL`.
  - Si una función tiene menos de 30 minutos para iniciar y su ocupación es $< 15\%$ $\rightarrow$ Clasificar como `SALA_SUBOCUPADA` con severidad `WARNING`.
- **`RB-MCP-03` (Generación de Reporte Real en Excel por n8n):** Al recibir el webhook, n8n debe armar un libro de Excel con dos pestañas:
  1. *Hoja 1 (Resumen Ejecutivo):* Diagnóstico redactado por el agente GrokCloud, nivel de severidad y fecha/hora.
  2. *Hoja 2 (Datos Crudos MCP):* Detalle numérico de afluencia por taquilla y aforo de salas.
  El enlace de descarga directa del `.xlsx` se retorna a la consola administrativa.
- **`RB-MCP-04` (Resiliencia en Llamadas de IA):** Si el servicio de GrokCloud experimenta latencia superior a 5000 ms o una falla temporal, el sistema debe registrar la excepción sin detener el servidor FastAPI y proveer un dictamen heurístico de contingencia local.

---

## 4. Requerimientos Funcionales Estructurados (Patrón EARS)

### Historia de Usuario `HU-09`: Auditoría Comercial Continua con Herramientas MCP y GrokCloud
*Como administrador del cine, quiero que un agente autónomo de IA evalúe periódicamente las operaciones mediante herramientas de software, para detectar cuellos de botella y salas vacías de forma proactiva.*

- **`RF-09.1` (Exposición del Protocolo MCP):** El sistema deberá exponer un servidor MCP compatible con JSON-RPC que publique las tres herramientas de dominio (`get_occupancy_metrics`, `get_line_analytics`, `trigger_n8n_contingency`).
- **`RF-09.2` (Invocación Semántica por GrokCloud):** El Agente Auditor, configurado con la API Key proporcionada, deberá consumir periódicamente las herramientas MCP, interpretar los números resultantes y formular un veredicto operativo en lenguaje natural.
- **`RF-09.3` (Disparo Inmediato de Auditoría para Demostración):** Cuando el administrador pulse el botón `[Ejecutar Auditoría MCP Ahora]` en FrontWeb, el sistema deberá ejecutar el ciclo de auditoría de inmediato, devolver el razonamiento del LLM en menos de 3 segundos y actualizar el estado visual en la consola.

---

### Historia de Usuario `HU-10`: Automatización de Contingencias y Reporte en Excel vía n8n
*Como administrador, quiero que ante cualquier problema detectado se dispare un flujo automatizado en n8n que compile un informe en Excel, para contar con un reporte formal descargable de la contingencia.*

- **`RF-10.1` (Emisión de Webhook hacia n8n):** Cuando el Agente Auditor determine una anomalía crítica o de advertencia, el sistema deberá invocar `trigger_n8n_contingency()` enviando el payload estandarizado al webhook configurado en n8n.
- **`RF-10.2` (Compilación de Hoja de Cálculo Excel):** El flujo en n8n deberá procesar la información y ensamblar un archivo binario `.xlsx` consolidado.
- **`RF-10.3` (Disponibilidad de Descarga en FrontWeb):** Tras la finalización del flujo en n8n, el sistema deberá exhibir en el panel administrativo la notificación con el enlace de descarga: *"Nuevo Reporte Predictivo de Contingencia generado: [Descargar Reporte.xlsx]"*.

---

### Historia de Usuario `HU-11`: Procesamiento de Diálogo para el Chatbot de Compra
*Como cliente que interactúa con el panel deslizable, quiero que el asistente responda mis dudas de cartelera y me sugiera funciones disponibles, para agilizar mi proceso de compra.*

- **`RF-11.1` (Endpoint de Chat de Compra):** El sistema deberá proveer un canal de comunicación para el Chatbot deslizable de la aplicación cliente, recibiendo el texto del usuario e interpretando su intención de búsqueda.
- **`RF-11.2` (Recomendación con Selección Directa):** El asistente deberá consultar las funciones activas de `MS CINEMA-CORE` y devolver respuestas que incluyan tarjetas de butacas seleccionables para activar el Stepper de pago.

---

## 5. Comportamiento Observable y Criterios de Aceptación (Escenarios BDD Gherkin)

### Escenario 1: Disparo Manual de Auditoría con Detección de Taquilla Saturada (`SC-04.1.1`)
```gherkin
Given que la cámara de taquilla registra 45 personas en fila en MS MULTIMEDIA
When el administrador presiona el botón "[Ejecutar Auditoría MCP Ahora]" en la consola FrontWeb
Then el servidor FastAPI ejecuta la herramienta MCP "get_line_analytics()"
And el Agente GrokCloud interpreta que 45 personas supera el aforo crítico de 40
And el agente invoca la herramienta "trigger_n8n_contingency()" con anomaly_type = "TAQUILLA_CONGESTIONADA" y severity_level = "CRITICAL"
And el webhook se despacha hacia n8n
And en la pantalla administrativa se despliega el dictamen: "Alerta Crítica: Saturación en taquilla principal (45 personas). Flujo de contingencia en n8n activado."
```

### Escenario 2: Generación Exitosa de Reporte Excel (.xlsx) por n8n (`SC-04.2.1`)
```gherkin
Given que n8n recibe el payload de webhook de anomalía desde MS IA-MCP
When el flujo de n8n procesa los datos y compila el libro de cálculo
Then genera un archivo binario válido con extensión ".xlsx" con las dos hojas estructuradas
And la consola FrontWeb actualiza la sección de reportes mostrando el botón "[Descargar Reporte Predictivo.xlsx]"
When el usuario hace clic en el enlace, el navegador descarga el archivo Excel real
```

### Escenario 3: Consulta al Chatbot de Compra (`SC-04.3.1`)
```gherkin
Given que el cliente escribe en el Chatbot deslizable "Recomiéndame una película para esta tarde"
When el endpoint de MS IA-MCP procesa la solicitud
Then consulta las funciones de hoy en MS CINEMA-CORE
And devuelve un mensaje conversacional amigable destacando las 2 funciones con mejor aforo
And adjunta tarjetas interactivas que permiten seleccionar la butaca con un solo toque
```

---

## 6. Efectos Secundarios e Integraciones

### 6.1 Dependencias con otros Microservicios
* **Con `MS CINEMA-CORE`:** Consulta para `get_occupancy_metrics()`.
* **Con `MS MULTIMEDIA`:** Consulta para `get_line_analytics()`.
* **Con `n8n`:** Emisión de Webhooks con contingencias.
* **Con `FRONTWEB` y `MOVIL APP`:** Entrega de dictámenes de auditoría y respuestas de chat.

