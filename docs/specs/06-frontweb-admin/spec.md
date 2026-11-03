# Specification: Módulo 06 - FrontWeb de Administración y Operaciones Cinematográficas (FRONTWEB ADMIN)

> **Estado:** APPROVED  
> **Módulo:** 06-frontweb-admin  
> **Metodología:** SDD-Spec-Assisted  
> **Subordinación:** Sujeto estrictamente a `docs/constitution.md` (v1.1.0)

---

## 1. Objetivo y Alcance

### 1.1 Objetivo de Negocio
Proveer la interfaz web administrativa de control total para la gestión del complejo de cines, estructurada de manera modular con carga diferida (Lazy Loading) en Angular e integrando inteligencia artificial local en el navegador (WebLLM / Transformers.js), que permita al administrador configurar la infraestructura de salas y butacas, programar carteleras, monitorear KPIs en tiempo real, ejecutar consultas analíticas offline en lenguaje natural y orquestar las pruebas de defensa del sistema.

### 1.2 Alcance Funcional (In-Scope)
- **Arquitectura Modular e Independiente con Lazy Loading:**
  - *Módulo de Salas y Butacas:* Interfaz gráfica para diseño matricial paramétrico de salas y tipificación de asientos.
  - *Módulo de Catálogo y Cartelera:* Alta de películas, carga de portadas y calendario de programación sin solapamientos.
  - *Módulo de Dashboard y KPIs:* Cuarteto de indicadores (ocupación, recaudación, mapa de calor y alertas de baja concurrencia).
  - *Módulo de Auditoría Comercial y Reportes:* Panel de control del agente MCP y centro de descargas de reportes Excel `.xlsx` de n8n.
- **Asistente Analítico Offline de IA en el Navegador (WebLLM / Transformers.js):**
  - Motor de lenguaje natural que corre directamente en el hilo del navegador (Web Workers / WebGPU / WASM).
  - Permite al administrador formular preguntas en lenguaje natural sobre datos del negocio (*"¿Cuál sala tiene menor ocupación hoy?"*, *"Dime los ingresos acumulados"*) respondiendo de forma autónoma sin conexión a internet utilizando los datos cacheados localmente.
- **Centro de Control de Demostración para Defensa Académica:**
  - Botón interactivo `[Ejecutar Auditoría MCP Ahora]` para disparar en vivo la evaluación de `MS IA-MCP` ante el jurado.
  - Botones `[Simular Fila Normal]` y `[Simular Fila Congestionada]` para alimentar a TensorFlow en `MS MULTIMEDIA`.
  - Visualizador en vivo del estado del flujo de contingencia y enlace de descarga inmediata del archivo `.xlsx` generado por n8n.
- **Protección de Navegación (Route Guards):** Intercepción obligatoria de cualquier intento de navegación sin sesión de administrador activa, redirigiendo al portal único `/login`.

### 1.3 Exclusiones Explícitas (Out-of-Scope)
- **Operaciones de Compra de Clientes:** La venta de entradas se reserva a los canales de cliente.
- **Escaneo de Boletos en Puerta:** Reservado exclusivamente al `PANEL DE BOLETEO`.

---

## 2. Actores y Permisos en el Módulo

| Actor | Permisos en este Módulo | Restricciones de Acceso |
| :--- | :--- | :--- |
| **Administrador (`admin`)** | Acceso irrestricto a todos los submódulos; creación y edición de salas y películas; ejecución de consultas a la IA local; disparo de pruebas de auditoría y descarga de reportes. | Requiere autenticación previa con credenciales válidas o botón de acceso demo. |
| **Cliente / Boletero / Anónimo** | Ninguno. Acceso estrictamente bloqueado. | Redirección forzosa al `/login` centralizado. |

---

## 3. Modelo Funcional de Datos y Reglas de Negocio Específicas

### 3.1 Vistas y Componentes Clave

#### Vista 1: Diseñador de Salas y Butacas
- Cuadrícula interactiva con representación gráfica de cada asiento según su tipo (`ESTANDAR` en gris, `VIP` en dorado, `DISCAPACIDAD` en azul, `PASILLO` en vacío).
- Panel de propiedades para inactivar salas o butacas preservando el historial.

#### Vista 2: Tablero de Cartelera Horaria
- Vista de calendario o línea de tiempo por sala que visualiza bloques de proyección de 20 minutos de limpieza para impedir solapamientos.

#### Vista 3: Centro de Auditoría y Reportes Predictivos
- Visualizador de logs del Agente GrokCloud en tiempo real.
- Tarjeta de alerta de contingencia que habilita el botón `[Descargar Reporte Predictivo.xlsx]`.

#### Vista 4: Consola de IA Local Offline
- Cuadro de diálogo interactivo donde el administrador interactúa con el modelo local WebLLM / Transformers.js.

### 3.2 Reglas de Negocio del Módulo (`RB-FW-XX`)

- **`RB-FW-01` (Soberanía Offline de la IA Local):** El asistente de analítica en el navegador debe funcionar al 100% aun cuando el administrador desconecte su cable de red o apague el Wi-Fi; debe consultar la memoria en caché del navegador (IndexedDB / LocalStorage) y emitir la respuesta en lenguaje natural sin mostrar errores de conexión.
- **`RB-FW-02` (Aislamiento de Carga por Módulos):** Cada submódulo funcional debe cargarse bajo demanda (Lazy Loading). El peso inicial de la aplicación no debe penalizarse con librerías de visión o modelos de lenguaje hasta que el administrador ingrese a sus respectivas pestañas.
- **`RB-FW-03` (Sincronización Reactiva de KPIs):** Cuando se complete una compra en `MS TICKET-AUTH` o se valide un boleto en el `PANEL DE BOLETEO`, el dashboard debe actualizar sus gráficos de ocupación en un tiempo no mayor a 3 segundos.

---

## 4. Requerimientos Funcionales Estructurados (Patrón EARS)

### Historia de Usuario `HU-13`: Gestión Integral de Salas y Cartelera con Lazy Loading
*Como administrador, quiero navegar de forma fluida entre la configuración de salas y la cartelera mediante módulos desacoplados, para operar el complejo sin sobrecargar el navegador.*

- **`RF-13.1` (Navegación Modular):** El sistema deberá cargar los submódulos de Salas, Películas y Reportes de forma diferida mediante rutas protegidas de Angular.
- **`RF-13.2` (Diseño Visual de Butacas):** El sistema deberá permitir al administrador modificar el tipo de asiento haciendo clic directamente sobre la cuadrícula visual de la sala.

---

### Historia de Usuario `HU-14`: Asistente de Negocio Offline con IA en Navegador
*Como administrador, quiero consultar dudas operativas del cine en lenguaje natural sin depender de internet, para obtener resúmenes inmediatos en cualquier circunstancia.*

- **`RF-14.1` (Carga del Modelo Ligero en Navegador):** Al acceder por primera vez a la consola de analítica, el sistema deberá inicializar el modelo de lenguaje cuantizado (WebLLM o Transformers.js) en segundo plano sin congelar la interfaz.
- **`RF-14.2` (Procesamiento Analítico Local):** Cuando el usuario escriba preguntas operativas (ej. *"¿Qué película recaudó más?"*), el modelo local deberá procesar la información de la memoria caché y retornar la respuesta explicativa de inmediato.

---

### Historia de Usuario `HU-15`: Demostración Interactiva de Contingencias y Descarga de Excel
*Como administrador en defensa académica, quiero disparar auditorías y simulaciones de cámara con un solo clic, para exhibir la integración completa del sistema ante el jurado.*

- **`RF-15.1` (Gatillado de Auditoría MCP en Vivo):** Al pulsar `[Ejecutar Auditoría MCP Ahora]`, el sistema deberá invocar a `MS IA-MCP`, mostrar el diálogo del agente GrokCloud en pantalla y actualizar el centro de descargas con el archivo `.xlsx` compilado por n8n.
- **`RF-15.2` (Descarga Real de Reporte Excel):** Cuando el usuario haga clic en `[Descargar Reporte Predictivo.xlsx]`, el sistema deberá iniciar la descarga del archivo binario legítimo generado por n8n.

---

## 5. Comportamiento Observable y Criterios de Aceptación (Escenarios BDD Gherkin)

### Escenario 1: Consulta Analítica Offline con IA en el Navegador (`SC-06.1.1`)
```gherkin
Given que el administrador se encuentra en FrontWeb y se desconecta completamente el acceso a internet
When abre el panel de IA Local y escribe "¿Cuál es la función con menor aforo hoy?"
Then el modelo local en el navegador analiza los datos de cartelera cacheados
And responde en menos de 2 segundos: "La función de Oppenheimer en Sala 2 a las 18:00 tiene solo un 8% de ocupación."
And no emite ninguna solicitud de red externa fallida
```

### Escenario 2: Demostración Completa de Auditoría y Descarga de Excel (`SC-06.2.1`)
```gherkin
Given que el administrador está autenticado en la consola FrontWeb
When pulsa el botón "[Simular Fila Congestionada]" y luego "[Ejecutar Auditoría MCP Ahora]"
Then la interfaz muestra el spinner de análisis del agente GrokCloud
And despliega el texto de diagnóstico: "Alerta Crítica: 45 personas en fila de taquilla. Contingencia disparada a n8n."
And aparece de inmediato el botón activo "[Descargar Reporte Predictivo.xlsx]"
When el administrador presiona el botón de descarga
Then el navegador guarda localmente el archivo Excel generado por n8n con las analíticas consolidadas
```

---

## 6. Efectos Secundarios e Integraciones

### 6.1 Dependencias con otros Microservicios
* **Con `MS TICKET-AUTH`:** Validación de sesión y rol de administrador.
* **Con `MS CINEMA-CORE`:** Operaciones CRUD de salas, películas, carteleras y KPIs.
* **Con `MS MULTIMEDIA`:** Botones de simulación de cámara de taquilla y visualización de portadas.
* **Con `MS IA-MCP` y `n8n`:** Disparo manual de auditoría y descarga de reportes Excel.

