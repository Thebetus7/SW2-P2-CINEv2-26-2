# SDD-Spec-Anchored-Spec: Actualización Específica del Documento de Especificación

Este workflow actualiza de manera aislada y atómica el archivo `docs/specs/XX-feature/spec.md` cuando se agregan nuevos requerimientos EARS, contratos o escenarios Gherkin a un módulo ya existente.

---

## 1. Protocolo de Modificación
1. Identifica el módulo destino en `docs/specs/XX-feature/`.
2. Lee el `spec.md` actual para preservar las invariantes previas.
3. Incorpora las nuevas cláusulas EARS y escenarios BDD de Caja Negra.
4. Avisa al usuario para proceder a la adaptación del plan técnico vía `/sdd-spec-anchored-plan`.
