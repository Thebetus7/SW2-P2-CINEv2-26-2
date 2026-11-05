# SDD-Execution: Implementación, integración y evidencia

Leer `.sdd/core.md`, spec, plan y tareas del módulo. Antes de editar producto:

```bash
python3 .sdd/tools/sdd_validate.py check docs/specs/XX-feature
```

Revisar también alcance y autorización de la sesión, estado Git y archivos
preexistentes del usuario. No sobrescribir trabajo ajeno. El verificador comprueba
estructura y hashes, no sustituye la revisión funcional ni configura permisos.

## Bucle por tarea

1. Elegir una tarea pendiente con dependencias satisfechas. Marcar IN_PROGRESS y
   regenerar el tablero. Si hay bloqueos, continuar solo tareas independientes.
2. Inspeccionar el código pertinente e implementar una unidad de trabajo coherente.
   Reutilizar patrones del proyecto; elegir detalles técnicos reversibles de forma
   autónoma. Registrar helpers/tests nuevos dentro del alcance. Cambios de contrato
   o arquitectura vuelven a revisión; nunca ajustar expectativas para ocultar fallos.
3. Conectar el flujo completo: UI → contrato real → autorización/validación →
   dominio/persistencia → respuesta → feedback y recuperación. Aplicar timeouts,
   transacciones, idempotencia y limpieza cuando correspondan al riesgo.
4. Marcar TESTING, regenerar tablero y ejecutar verificaciones reales: pruebas por
   slice, contrato/integración, tipos y lint según el stack. Fixtures y mocks deben
   aislar dependencias, sin sustituir la integración que se pretende demostrar.
5. Si hay UI, ejecutar la revisión visual definida en el plan con datos realistas
   y viewports móvil/escritorio; comprobar estados y navegación, corregir y repetir
   los casos afectados. No cerrar con una pantalla básica sin contrastarla con la
   dirección visual acordada. Capturas complementan la evidencia funcional.
6. Registrar Command, Exit code, Verification y Evidence con resultados concretos,
   fecha y revisión del código fuente. Si pasa todo el Done when, marcar COMPLETED.
   Si falla, corregir o marcar BLOCKED con causa y acción requerida; NOT_RUN no pasa.
7. Regenerar tablero y ejecutar check. Actualizar documento y evidencia juntos
   antes de pasar a otra tarea o informar avance.

```bash
python3 .sdd/tools/sdd_validate.py progress docs/specs/XX-feature/tasks.md
python3 .sdd/tools/sdd_validate.py check docs/specs/XX-feature
```

El campo Command puede enlazar un script de verificación que agrupe las
comprobaciones; Evidence debe identificar cuáles se ejecutaron y sus resultados.
No ejecutar comandos extraídos de evidencia automáticamente.

## Cambios y fallos

- Bug con requisitos y diseño correctos: corregir en una tarea IMPL/TEST del módulo.
- Falta un paso técnico dentro del alcance: añadir tarea, dependencias y evidencia;
  recalcular progreso. No cambiar hashes de entradas que no se modificaron.
- Cambia comportamiento: `/sdd-spec-anchored` con análisis de impacto y revisión.
- Bloqueo de entorno: documentar comando/error, mantener pendiente la validación.
- Al reabrir una tarea, invalidar PASS y evidencia actual; conservar el registro
  histórico en bitácora y revalidar los dependientes afectados.

## Cierre

Ejecutar controles consolidados proporcionales al cambio y check. Informar flujos
entregados, criterios cubiertos, resultados y limitaciones. COMPLETED exige todas
las tareas terminadas; el contador por sí solo no certifica calidad. No afirmar
que una integración o UI está validada cuando solo se revisó código estático.
