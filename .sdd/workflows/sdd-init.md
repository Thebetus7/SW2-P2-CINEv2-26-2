# SDD-Init: Gobernanza y mapa del proyecto

Lee `.sdd/core.md`. Inspecciona README, AGENTS.md, reglas de agente, stack, scripts y
estructura reales. Este comando prepara gobernanza, no genera código de producto.

## Operación

1. Detectar si el proyecto es nuevo o existente. Para código existente, recomendar
   `/sdd-adopt` y conservar instrucciones útiles del equipo.
2. Crear o actualizar una sección SDD en AGENTS.md sin sustituir políticas ajenas.
   Resolver contradicciones con la autorización de la sesión; consultar únicamente
   decisiones materiales sin resolver.
3. Mantener AGENTS.md como mapa breve (objetivo orientativo: 100 líneas para la
   sección SDD). No copiar el contenido de todos los workflows.
4. Registrar comandos reales de desarrollo, test individual, suite, lint, tipos y
   build. Si un runner aún no existe, escribir «no configurado».

## Contenido de la sección SDD de AGENTS.md

- Misión y enlaces al README, `.sdd/core.md` y constitución si existe.
- Jerarquía por ámbito y matriz HECHO/DERIVADO/TÉCNICO/PROPUESTA/BLOQUEO.
- Convenciones particulares que no sean evidentes en el código.
- Mapa de módulos activos y fuentes de verdad; cargar solo contexto pertinente.
- Comandos de verificación y limitaciones del entorno.
- Ruta de tareas y comandos `progress`/`check` del verificador instalado.
- Alcance de cambios, tratamiento de secretos y política real de publicación.

## Catálogo disponible

| Comando | Resultado |
| --- | --- |
| /sdd-init | AGENTS.md con mapa y comandos |
| /sdd-adopt | Constitución de facto y baseline de código existente |
| /sdd-constitution-trial | Invariantes, visión y decisiones globales |
| /sdd-spec-assisted | Especificación con inferencia proactiva, IN_REVIEW |
| /sdd-spec-clarify | Auditoría funcional y aprobación de spec |
| /sdd-plan-tecnico | Arquitectura, integración y diseño visual; APPROVED |
| /sdd-planning | Alias de /sdd-plan-tecnico |
| /sdd-task | Backlog y tablero inicial verificable |
| /sdd-execution | Implementación y evidencia por slice |
| /sdd-spec-anchored | Evolución con revisión de impacto |
| /extended | Perfil opcional de diseño y calidad de UX |
| /doc-deploy | Guías operativas según infraestructura real |

No recomendar comandos que no estén instalados. En un bug de implementación,
reproducirlo y usar ejecución con una tarea de corrección; si cambia el contrato,
usar evolución. Las decisiones arquitectónicas relevantes pueden documentarse
como ADR enlazadas desde el plan, sin requerir un comando adicional.

## Salida

Indicar archivos modificados, contexto encontrado, comandos detectados y siguiente
paso pertinente. No declarar que las restricciones del prompt son un sandbox.
