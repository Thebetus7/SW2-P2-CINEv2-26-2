# Guía Operativa y Manual de Uso: Consola Frontend IA-MCP (`ms-ia-mcp-frontend`)

La aplicación **Consola de Auditoría y Monitor Inteligente** de `ms-ia-mcp` (puerto `http://localhost:5176`) es una interfaz web desarrollada en React 18, TypeScript y TailwindCSS. No es un simple visor de logs: es el **panel de control administrativo** que permite orquestar auditorías autónomas con el protocolo MCP (Model Context Protocol), evaluar aforos y taquilla en tiempo real, interactuar con el agente GrokCloud (LLM) y monitorear la contingencia reactiva con n8n.

---

## 1. Fin y Propósito de Uso

1. **Supervisión Comercial Autónoma:**  
   Verificar el estado del cine (concurrencia de taquillas mediante visión artificial y ocupación de salas).
2. **Disparo Manual / Simulación de Contingencias:**  
   Probar cómo reacciona el sistema ante saturación de taquilla (> 40 personas) o salas subocupadas.
3. **Descarga de Reportes Predictivos:**  
   Generar y descargar reportes oficiales en formato Excel `.xlsx`.
4. **Playground del Chatbot Asistente:**  
   Probar los algoritmos de recomendación de funciones y selección de butacas centrales en un entorno aislado.

---

## 2. Pestaña 1: "Consola Auditoría" (`activeTab = 'audit'`)

Esta es la vista principal para administradores y auditores de operaciones.

### A. Elementos de Entrada (Inputs y Controles)

| Control / Input | Tipo | Acción / Qué escribir o seleccionar |
| :--- | :--- | :--- |
| **Botón `[Ejecutar Auditoría MCP Ahora]`** | Botón interactivo | Dispara una llamada inmediata al endpoint `POST http://localhost:8001/api/v1/audit/trigger-now`. |
| **Botón `45 personas (Crítico > 40)`** | Botón de simulación | Envía un `line_override` forzando que la taquilla tiene **45 personas** (estado crítico de saturación). |
| **Botón `18 personas (Normal)`** | Botón de simulación | Envía un `line_override` forzando que la taquilla tiene **18 personas** (flujo normal). |

### B. Salidas y Respuestas del Frontend (Outputs Visuales)

#### 1. Tarjeta "Veredicto del Agente GrokCloud"
* **Badge de Estado:**
  * `ANOMALÍA DETECTADA` (en color rojo/rose): Si se detectan más de 40 personas en taquilla o salas con < 20% de ocupación próximas a comenzar.
  * `OPERACIÓN NORMAL` (en color verde/emerald): Si todos los parámetros están dentro del rango operativo.
* **Caja de Texto del Veredicto:**
  * Muestra el razonamiento emitido por el modelo LLM en tiempo real.
  * *Ejemplo Crítico:*  
    `"Alerta Crítica: Saturación en taquilla principal (45 personas detectadas). Se recomienda abrir taquilla auxiliar y emitir promociones flash. Flujo de contingencia en n8n activado exitosamente."`
  * *Ejemplo Normal:*  
    `"Auditoría comercial completada. Parámetros de aforo y taquilla dentro de los rangos normales. Ocupación promedio: 65%."`

#### 2. Banner de Contingencia n8n y Descarga Excel
* Se activa automáticamente solo cuando `n8n_dispatched === true`.
* **Texto:** `"Flujo de Contingencia n8n Activado - Reporte predictivo en hoja Excel .xlsx generado"`.
* **Botón `[Descargar Reporte Predictivo.xlsx]`:**  
  Abre y descarga directamente el archivo Excel generado desde `http://localhost:8001/api/v1/audit/reports/latest.xlsx`.

#### 3. Panel Lateral "Historial de Eventos"
* Muestra las últimas 20 auditorías registradas.
* Cada tarjeta indica:
  * **Hora del evento:** Ej. `10:45:12 p. m.`
  * **Tiempo de respuesta:** Ej. `320ms`.
  * **Resumen del veredicto:** Breve descripción del resultado.
  * **Badge `n8n Webhook Sent`:** En caso de que se haya disparado la notificación a n8n.

---

## 3. Pestaña 2: "Chatbot Asistente" (`activeTab = 'chatbot'`)

Esta vista es una consola de prueba interactiva para experimentar con la inteligencia conversacional del cine.

### A. Elementos de Entrada (Inputs)

| Control / Input | Tipo | Qué escribir / Enviar |
| :--- | :--- | :--- |
| **Campo de Texto Inferior** | Input de texto | Preguntas sobre la cartelera, horarios o recomendaciones: <br>• *"Recomiéndame una película para esta tarde"* <br>• *"¿Qué películas tienen en sala IMAX?"* <br>• *"Quiero ver una película con asientos centrales"* |
| **Botón de Enviar (Ícono Avión de Papel) / Tecla Enter** | Botón / Submit | Envía el payload `{ userId: 'demo-user-web', message: '...' }` a `POST http://localhost:8001/api/v1/chat`. |

### B. Salidas y Respuestas del Chatbot (Outputs Visuales)

1. **Burbuja de Respuesta del Asistente:**
   * Texto explicativo y cordial generado por el LLM respondiendo a la consulta del usuario.
   * *Ejemplo de respuesta:*  
     `"¡Hola! Te recomiendo ver 'Avatar: El Sentido del Agua' en Sala 1 a las 18:00 o 'Dune: Parte Dos' a las 20:30. He seleccionado butacas centrales para una óptima visión."`
2. **Tarjetas Interactivas de Funciones Sugeridas:**
   * Si la consulta solicita funciones, debajo del mensaje se renderizan tarjetas con:
     * **Título de la Película:** Ej. *Avatar: El Sentido del Agua*.
     * **Horario:** Ej. *18:00*.
     * **Butaca Recomendada por Algoritmo:** Ej. *Butaca: C-8* (calculada con algoritmo de butaca central óptima).
     * **Botón `[Comprar]`:** Permite seleccionar la función sugerida.
3. **Indicador de Pensamiento:**
   * Muestra el ícono de robot animado: `"Asistente pensando..."` mientras espera la inferencia del backend.

---

## 4. Resumen de Puertos y Enlaces del Microservicio

| Componente | Dirección URL | Función |
| :--- | :--- | :--- |
| **Frontend de la Consola** | `http://localhost:5176` | Interfaz interactiva descrita en esta guía. |
| **Backend API (FastAPI)** | `http://localhost:8001` | Servidor REST y JSON-RPC de IA y MCP. |
| **Documentación Swagger** | `http://localhost:8001/docs` | Catálogo de endpoints del backend para pruebas directas en OpenAPI. |
| **Descarga Directa de Excel** | `http://localhost:8001/api/v1/audit/reports/latest.xlsx` | Enlace para obtener el último reporte generado. |
