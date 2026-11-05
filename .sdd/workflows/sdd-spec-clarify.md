# SDD-Spec-Clarify: Revisión funcional independiente

Lee `.sdd/core.md`, la constitución y el spec del módulo. Este es el único workflow
que promueve spec.md a Status: APPROVED. No cambia arquitectura ni código.
La independencia significa revisar críticamente, sin asumir que la redacción del
paso anterior es correcta; no garantiza independencia entre modelos o revisores.

## Auditoría

1. **Doble interpretación**: ¿dos implementaciones razonables podrían comportarse
   de forma distinta en una decisión relevante?
2. **Implementador externo**: ¿se puede implementar sin inventar reglas, actores,
   datos, límites, efectos o condiciones de éxito?
3. **Caja negra**: ¿los requisitos describen resultados observables y no confunden
   una preferencia técnica con una necesidad del usuario?
4. **Trazabilidad**: ¿se preservó la intención original y cada RF/RB tiene escenarios
   suficientes según riesgo, sin introducir propuestas no aceptadas?

Examinar permisos, datos, reglas, estados, concurrencia, catálogos vacíos, errores,
recuperación, integraciones, navegación, accesibilidad y compatibilidad cuando
apliquen. Diferenciar consecuencias necesarias de políticas opcionales.

## Hallazgos y actuación

- BLOCKING: cambia negocio, seguridad, contratos o impide verificar el resultado.
- IMPORTANT: riesgo concreto que debe resolverse o aceptarse explícitamente.
- IMPROVEMENT: mejora editorial que no cambia comportamiento.
- CORRECT: dimensión revisada sin hallazgos.

Guardar hallazgos, fuentes y preguntas en spec.md. Si hay bloqueos, dejar
NEEDS_CLARIFICATION y formular preguntas agrupadas por causa raíz. Continuar
análisis independiente. Si la respuesta ya está en el contexto, incorporarla con
referencia en lugar de preguntar. Reauditar tras cada respuesta.

Cuando no haya bloqueos ni riesgos IMPORTANT pendientes, registrar fecha, alcance
y resultado de revisión, y marcar APPROVED. Aprobar significa «no se encontraron
bloqueos en esta revisión», no una garantía de ausencia total de defectos. En
riesgo crítico, registrar también la revisión humana requerida por el proyecto.

Informar hallazgos resueltos, pendientes y próximo paso: `/sdd-plan-tecnico`.
