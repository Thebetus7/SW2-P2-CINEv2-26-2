# SDD-Task: Backlog ejecutable y progreso generado

Leer `.sdd/core.md`, constitución, spec y plan APPROVED. Verificar que el plan esté
vinculado a sus entradas actuales. Si faltan decisiones, registrar el bloqueo en
su origen; no inventar tareas vagas para ocultarlo. Este workflow edita tasks.md.

## Diseño del backlog

Crear tareas coherentes por vertical slices, cada una con resultado comprobable.
Tipos: SETUP, IMPL, TEST y VERIFY. Una tarea puede cubrir varios requisitos. No
fragmentar imports/archivos en microtareas ni encadenar dependencias artificiales.
Incluir validación de integración y UI renderizada cuando corresponda.

Usar IDs únicos y estables T1.1, T1.2, T2.1... ordenados por dependencia. En una
regeneración conservar historial y evidencia; ajustar solo trabajo afectado. Las
tareas completadas que describan un estado anterior se identifican como históricas
con **Superseded by:** y nuevas tareas de implementación/regresión, sin falsear la
evidencia antigua. Mantener el DAG y explicar dependencias externas.

## Contrato de tasks.md

Una única fuente editable de estado: el campo Status de cada bloque detallado.
El tablero, registro y checklist inicial se generan con `progress`. No mantener
casillas adicionales en los títulos detallados ni editar contadores a mano.

```markdown
# Tasks: Nombre
<!-- sdd:progress:start -->
<!-- sdd:progress:end -->

Version: 1
Spec-SHA256: pendiente
Plan-SHA256: pendiente

## 1. Trazabilidad y estrategia
RF/RB/SC → PLAN → tareas de implementación y validación.
Describir slices, riesgos, criterios de aceptación y revisión visual si aplica.

## 2. Tareas detalladas

### T1.1 [IMPL] Completar un flujo verificable
**Status:** PENDING
**Depends on:** —
**Traceability:** PLAN-01, RF-01.1, SC-01.1.1
**Files:** rutas previstas CREATE/MODIFY/DELETE
**Objective:** Resultado concreto.
**Work:** Acciones, contratos y límites del trabajo.
**Done when:** Resultado observable y comprobaciones requeridas.
**Verification:** NOT_RUN
**Command:** pendiente
**Exit code:** pendiente
**Evidence:** pendiente

### T1.2 [TEST] Validar el flujo y sus errores
**Status:** PENDING
**Depends on:** T1.1
**Traceability:** PLAN-01, SC-01.1.1
**Files:** ruta de pruebas
**Objective:** Verificar comportamiento e integración.
**Work:** Casos principales y de riesgo sin duplicación innecesaria.
**Done when:** Escenarios cubiertos con resultados reproducibles.
**Verification:** NOT_RUN
**Command:** pendiente
**Exit code:** pendiente
**Evidence:** pendiente

## 3. Bitácora
Registrar transiciones relevantes, comandos, fecha, revisión de código fuente,
resultados y límites. Enlazar logs/capturas cuando existan sin incluir secretos.
```

Estados de tareas: PENDING, IN_PROGRESS, TESTING, COMPLETED, BLOCKED. Si se bloquea,
añadir **Blocker:** causa, **Source:** origen y **Required action:** desbloqueo.
COMPLETED requiere PASS, comando real, salida 0 y evidencia específica. Para
verificación visual, registrar además entorno, viewports y observaciones humanas
cuando el runner no pueda evaluar un criterio estético.

## Generación y cierre

Después de crear/revisar tareas, ejecutar en orden:

```bash
python3 .sdd/tools/sdd_validate.py bind docs/specs/XX-feature --artifact tasks
python3 .sdd/tools/sdd_validate.py progress docs/specs/XX-feature/tasks.md
python3 .sdd/tools/sdd_validate.py check docs/specs/XX-feature
```

`progress` coloca al inicio métricas, registro resumido con evidencia y checklist.
`check` verifica sincronización, IDs, dependencias, evidencia y hashes de entradas.
Si Python no está disponible, informar el requisito; no afirmar validación
mecánica. Guardar el documento y señalar qué revisión queda pendiente.
