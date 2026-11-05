# Núcleo SDD

Esta política se aplica al ejecutar un comando SDD. Lee este archivo y solo el
workflow activo. Las instrucciones del usuario y los controles del entorno tienen
precedencia; la jerarquía siguiente organiza los artefactos del proyecto.

## Autoridad y contexto

Constitution → Spec → Plan → Tasks → Code + Tests. La constitución fija invariantes
globales; la spec define comportamiento; el plan decide arquitectura; las tareas
organizan implementación y evidencia. El código existente es evidencia de lo que
funciona hoy, no una autorización para cambiar el comportamiento acordado.

Inspecciona código, dependencias, pruebas y documentación relevantes antes de
preguntar. Conserva requisitos, fórmulas y excepciones mediante IDs y referencias;
evita repetirlos en cada documento. Un resumen enlazado puede ser fiel y breve.
Marca claramente lo observado, lo acordado, lo deducido y lo propuesto.

## Autonomía e inferencia

1. **HECHO**: está en una fuente verificable o ya fue acordado. Aplicarlo y citar
   la ruta o decisión; no volver a preguntar.
2. **DERIVADO**: consecuencia necesaria de requisitos aceptados. Incorporarla,
   registrar el requisito de origen y explicar el razonamiento. Si hay dos
   resultados de negocio válidos, deja de ser una consecuencia necesaria.
3. **TÉCNICO**: decisión reversible dentro del alcance y arquitectura aprobados.
   Resolverla con los patrones existentes y registrar el criterio cuando afecte
   mantenimiento, integración o pruebas. Evitar consultas por detalles rutinarios.
4. **PROPUESTA**: agrega capacidad o elige una política de negocio. Presentar el
   beneficio, coste y alternativas; necesita aceptación explícita para ser requisito.
5. **BLOQUEO**: falta información que cambia alcance, seguridad, contratos públicos,
   datos o comportamiento de negocio. Preguntar lo mínimo para resolverlo.

Ejemplo: evitar doble cobro es una garantía técnica derivada de cobrar una sola
vez. Duración de una reserva, devolución de dinero o envío de notificaciones son
políticas que requieren contexto o aceptación. No convertir preferencias de UI en
reglas universales. Una selección recomendada no equivale a consentimiento.

Ante bloqueos, continuar el análisis independiente y guardar un borrador con
preguntas explícitas. No marcarlo aprobado ni implementar comportamiento pendiente.
Preguntar solo lo que no pueda resolverse con contexto y autorización existentes.

## Profundidad según riesgo

- **Ligero**: cambio pequeño, reversible, sin alterar contratos, permisos ni datos.
  Secciones cortas y tablas compactas; ejecutar especificación, revisión, diseño y
  tareas en una misma sesión si no hay decisiones pendientes.
- **Estándar**: feature con flujo completo. Spec, plan y tareas por slices.
- **Crítico**: dinero, autorización, datos sensibles, migraciones o contratos
  públicos. Añadir amenazas, concurrencia, compatibilidad, rollback y revisión
  humana de las decisiones de impacto que aún no estén autorizadas.

El nivel determina la profundidad, no permite omitir aceptación ni verificación.
Usar `No aplica: motivo` en secciones irrelevantes. Las acciones ya autorizadas no
necesitan otra ronda de permiso por cambiar de fase.

## Escritura y herramientas

En diseño se escriben documentos; en ejecución, código, configuración y pruebas
dentro del alcance. Los borradores pueden persistirse durante el descubrimiento.
No alterar decisiones aprobadas en silencio. Las rutas del plan son una previsión:
un helper o test interno necesario puede añadirse con justificación y registro de
impacto; un cambio de arquitectura o contrato exige revisar el plan antes.

Una regla escrita no es un sandbox. Usar permisos y aislamiento del cliente cuando
estén disponibles. El validador detecta incoherencias documentales; no bloquea
herramientas ni prueba que una evidencia declarada sea auténtica.

Usar solo herramientas disponibles. Sin selección múltiple interactiva, presentar
opciones numeradas y permitir respuesta textual. Sin navegador o runner, registrar
la limitación y dejar la verificación pendiente; no simular resultados.

## Estados y cambios

Usar una línea `Status: VALOR` por documento.

| Artefacto | Estados | Responsable de aprobación |
| --- | --- | --- |
| constitution.md | DRAFT, NEEDS_CLARIFICATION, APPROVED | Constitución/adopción, decisiones confirmadas |
| spec.md | DRAFT, NEEDS_CLARIFICATION, IN_REVIEW, APPROVED | Solo revisión de /sdd-spec-clarify |
| plan.md | DRAFT, NEEDS_CLARIFICATION, APPROVED | Plan técnico, decisiones justificadas |
| tasks.md | READY, IN_PROGRESS, BLOCKED, COMPLETED | Calculado por el verificador |

Cada documento aprobado lleva `Version: N` y referencias a sus entradas. Plan y
tareas registran SHA-256 de sus entradas con el comando `bind` después de su
revisión. Una modificación de entrada invalida esa vinculación aunque alguien
olvide incrementar versión. `bind` registra una revisión ya hecha; no la sustituye.

En una iteración: modificar la spec como IN_REVIEW, revisar, aprobar, actualizar y
aprobar el plan, vincularlo, añadir/revisar tareas y vincularlas. Conservar historial
y evidencia de trabajos previos, indicando qué queda sustituido. Revalidar los
comportamientos afectados; una prueba antigua no verifica un requisito nuevo.

## Producto completo y comprobable

Por cada flujo: entrada → permisos → validación → operación de backend →
persistencia/efectos → respuesta → estado visible en frontend → recuperación.
Incluir carga, vacío, error, concurrencia y retorno/navegación cuando apliquen.
No dar por integrados endpoints que la UI no consume ni pantallas con datos falsos.

Definir qué demuestra éxito antes de implementar: contratos, tests de riesgo,
pruebas de integración y revisión visual para UI. Usar fixtures representativos,
timeouts y limpieza de recursos. Distinguir PASS, FAIL y NOT_RUN. Una limitación de
entorno no es un test pasado. Usar comandos reales descubiertos en el repositorio.

## Tareas y evidencia

La fuente de estado son los bloques detallados `### Tn.n` de tasks.md. El tablero
`Task Progress`, el registro resumido y el checklist inicial son derivados. Tras
cada transición, ejecutar `python3 .sdd/tools/sdd_validate.py progress RUTA/tasks.md`.
Antes de ejecutar o cerrar un módulo: `python3 .sdd/tools/sdd_validate.py check RUTA`.
En Windows puede usarse `py -3` o `python` según el entorno.

COMPLETED exige comando, resultado, código de salida 0 y evidencia concreta. El
porcentaje cuenta tareas completadas; no representa porcentaje de calidad ni de
valor entregado. Registrar también criterios de aceptación aún no verificados.
