# SDD-Spec-Anchored-Plan: Adaptación Técnica del Plan ante Cambios de Spec

Este workflow analiza los cambios incorporados en `docs/specs/XX-feature/spec.md` y actualiza el documento de arquitectura técnica `docs/specs/XX-feature/plan.md`.

---

## 1. Protocolo de Modificación
1. Compara las novedades del `spec.md` contra el `plan.md` existente.
2. Identifica nuevos componentes, endpoints, migraciones de base de datos o DTOs requeridos.
3. Actualiza los diagramas de secuencia e invariantes técnicas.
4. Genera o extiende los Vertical Slices para reflejar las nuevas capacidades.
