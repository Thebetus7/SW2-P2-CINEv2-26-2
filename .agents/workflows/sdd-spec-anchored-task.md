# SDD-Spec-Anchored-Task: Adición de Tareas Atómicas por Actualización de Spec

Este workflow analiza las modificaciones en `docs/specs/XX-feature/plan.md` e inserta las nuevas tareas atómicas en `docs/specs/XX-feature/tasks.md` sin alterar las tareas ya completadas, actualizando el resumen de progreso `Task Progress`.

---

## 1. Protocolo de Modificación
1. Lee `docs/specs/XX-feature/tasks.md` y preserva todas las tareas finalizadas (`[x]`).
2. Añade las nuevas tareas bajo la numeración y sección correspondiente (ej. `### Iteración N: [Nombre]`).
3. Asigna a cada tarea su correspondiente verificación con criterios de finalización y evidencia requerida.
4. Recalcula y actualiza la tabla de métricas `Task Progress` en la cabecera del archivo (incrementando `Total de tareas` y `Tareas por realizar`, recalculando el porcentaje de progreso).
5. Deja el checklist listo para ejecutar vía `/sdd-execution`.
