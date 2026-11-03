# SDD-Spec-Anchored: Iteración, Refinamiento y Evolución en Cascada (Spec + Plan + Tasks)

Este workflow gestiona la **evolución, corrección de bugs y refinamiento integral de un módulo existente** en `docs/specs/XX-nombre/`. 

Cuando una funcionalidad implementada no se ajusta con exactitud a la experiencia deseada, presenta bugs en runtime (ej. cámara que no congela la vista, falta de feedback visual, cuelgues o errores no controlados de APIs/IA) o requiere profundizar un flujo omitido, este comando **orquesta en una sola pasada la actualización sincronizada de la tríada documental (`spec.md` + `plan.md` + `tasks.md`)**.

> **Regla de Oro: Estado Final Puro + Trazabilidad en Cola**:
> - `spec.md` y `plan.md` se actualizan in-situ para reflejar la **verdad absoluta y pura del sistema** (incrementando la versión a `v1.1.0`, `v1.2.0`, etc.).
> - `tasks.md` **preserva intacto el historial de tareas previas ya completadas** (`[x]`) y encola al final una nueva sección de tareas para la nueva iteración.
> - La IA **NUNCA asume soluciones a ciegas**: realiza primero una entrevista exhaustiva con preguntas clave y opciones recomendadas antes de tocar los documentos.

---

## 1. Resolución del Módulo a Iterar (`[XX.]`)

Cuando el usuario invoque este workflow (`/sdd-spec-anchored`):
1. **Con Argumento `[XX.]` o `[XX]`** (ej. `/sdd-spec-anchored 01.`):
   - Localiza la carpeta correspondiente en `docs/specs/` (ej. `docs/specs/01-catalogacion-escaneo-crud/`).
2. **Sin Argumento**:
   - Escanea `docs/specs/` y toma automáticamente el último módulo activo con `spec.md`, notificando al usuario.

---

## 2. Protocolo de Diagnóstico y Entrevista en 3 Pasos

El asistente de IA debe ejecutar estrictamente este flujo:

### PASO 1: Diagnóstico Contextual (Síntoma vs. Spec Actual)
1. **Lectura de Entrada**:
   - Lee `docs/specs/XX-nombre/spec.md`, `plan.md` y `tasks.md`.
2. **Análisis de la Desviación**:
   - Contrasta lo que la especificación prometía frente a lo que el usuario reporta que falló o falta en la experiencia real (ej. *la cámara sigue en vivo tras disparar, no hay aviso visual de procesamiento, la app se cuelga si no hay API key de Gemini, faltan mensajes de error amigables ante falta de internet*).

### PASO 2: Cuestionario de Refinamiento (Los 4 Ejes Críticos)
Antes de redactar o modificar cualquier archivo, la IA plantea un cuestionario conciso (2 a 4 preguntas directas) estructurado en estos 4 ejes:

1. **Feedback Visual y Transición de Estado**:
   - *¿Cómo debe percibir el usuario que la acción se ejecutó?* (ej. congelar imagen de la cámara, overlay semitransparente con spinner, navegación inmediata a preview con estado de carga).
2. **Taxonomía y Canal de Notificación de Errores**:
   - *¿Cómo y dónde se notifican los fallos técnicos?* (ej. SnackBar flotante, Banner superior persistente o Diálogo modal con reintento; mensajes amigables como *"No pudimos identificar el producto"* vs. errores técnicos de red/modelo).
3. **Degradación Elegante y Continuidad Operativa**:
   - *¿Qué ocurre si el servicio externo (IA/red) falla por completo?* (ej. permitir continuar manualmente sin bloquear al usuario, guardar borrador local o forzar reintento).
4. **Manejo de Persistencia Temporal y Recursos**:
   - *¿Se conserva la captura/dato en disco temporalmente o solo en memoria hasta confirmación?*

> **Formato Obligatorio de las Preguntas**:
> Cada pregunta debe incluir opciones directas y destacar una opción `(Recomendada)` con criterio de ingeniería. **La IA se detiene y espera la respuesta del usuario antes de proceder.**

---

### PASO 3: Actualización en Cascada a Estado Puro

Una vez resueltas las preguntas con el usuario, la IA aplica la actualización coordinada en los 3 archivos:

#### 1. Actualización In-Situ de `docs/specs/XX-nombre/spec.md` (Estado Puro)
- Incrementa la versión en el encabezado (ej. `> Versión: 1.1.0 | Estado: Iteración Refinada`).
- **Nuevos Requisitos EARS**: Agrega o ajusta los `RF-XX.Y` para contemplar el feedback visual, la degradación elegante y el manejo de errores no deseados (*Unwanted Behavior*).
- **Nuevos Escenarios Gherkin BDD**: Incorpora los escenarios observables para el flujo de carga, el flujo de error de conectividad/API y la continuidad manual.
- **Datos Funcionales**: Añade los nuevos campos de error, flags de conectividad o estados observables.

#### 2. Adaptación Arquitectónica de `docs/specs/XX-nombre/plan.md`
- Actualiza el **Diagrama de Secuencia Mermaid** mostrando el ciclo de feedback visual y captura de excepciones.
- Actualiza los **Contratos Tipados**: nuevos tipos de fallo de dominio (`CameraFailure`, `GeminiVisionTimeoutFailure`, `OfflineFallbackResult`), DTOs y estados de controladores (ej. `isProcessing`, `previewImage`, `errorMessage`).
- Define la **estrategia de degradación elegante** y disposición limpia de recursos (cierre de streams de cámara, cancelación de timers).

#### 3. Encolado de Nuevas Tareas en `docs/specs/XX-nombre/tasks.md`
- **Conserva el 100% de las tareas previas ya marcadas (`[x]`)**.
- **Actualiza la tabla `Task Progress` en la cabecera** incrementando `Total de tareas` y `Tareas por realizar`, recalculando el progreso porcentual.
- Añade al final una nueva sección con el bloque de tareas para la nueva iteración:

```markdown
---

## 3. Iteración 2: [Nombre del Refinamiento / Fix de Experiencia]
*Objetivo: [Descripción concisa del ajuste, feedback visual y blindaje ante fallos]*

### Fase 1: Adaptación de Controladores y Manejo de Errores Tipados
- [ ] `T2.1` `[IMPL: Estados & Dominio]`: Añadir estados de procesamiento visual, congelamiento de captura y tipos de fallo amigables.
- [ ] `T2.2` `[IMPL: UI & Feedback Observable]`: Implementar overlay de carga, captura de excepciones en interfaz (SnackBar/Banner) y flujo de continuidad manual.

### Fase 2: Pruebas de Verificación Fail-Fast (Timeout 5s)
- [ ] `T2.3` `[TEST: BDD de Feedback y Error]`: Test de aceptación que valida el congelamiento visual y la notificación ante fallo de servicio externo con timeout estricto.

### Fase 3: Verificación Final
- [ ] `T2.4` `[VERIFY]`: Ejecutar suite completa, linter y confirmar que no existan bloqueos de cámara ni cuelgues en el runner.
```

---

## 3. Sugerencia del Siguiente Paso

Al concluir la actualización en cascada, la IA resume brevemente los cambios aplicados en `spec.md`, `plan.md` y `tasks.md`, e invita al usuario a iniciar la implementación ejecutando:

```text
/sdd-execution
```
