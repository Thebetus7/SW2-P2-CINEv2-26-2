# SDD-Adopt: Adopción sobre código existente

Leer `.sdd/core.md`. Documentar el sistema real sin reescribir su código. Auditar
los seis ejes relevantes y anotar evidencia por ruta/contrato; explicar qué ejes
no aplican. No deducir reglas normativas solo porque un bug exista en producción.

## Inspección

1. Configuración, dependencias, runtime, infraestructura y scripts reales.
2. Persistencia, modelos, esquema, migraciones e integridad.
3. Backend, endpoints, validación, permisos y reglas de dominio.
4. Eventos, servicios externos, timeouts y efectos.
5. UI, rutas, estados, consumo real de APIs y diseño existente.
6. Tests, lint, tipos, build, CI y observabilidad.

Distinguir observado, probado, inferido y pendiente. Leer componentes representativos
por flujo; expandir donde haya riesgos o discrepancias. Un escaneo de nombres de
archivos no demuestra funcionalidad. No ejecutar migraciones ni operaciones
productivas para auditar. Las verificaciones deben usar un entorno autorizado.

## Artefactos

- AGENTS.md: mapa breve, comandos detectados y enlaces a fuentes.
- docs/constitution.md: visión, invariantes observadas y decisiones acordadas.
  Usar DRAFT/NEEDS_CLARIFICATION mientras falten decisiones; APPROVED tras revisión.
- docs/specs/00-baseline/00_INDICE_BASELINE.md: módulos y estado observado, cobertura
  de verificación y referencias a archivos/contratos.
- 01_ARQUITECTURA_Y_STACK.md: componentes, topología y dependencias reales.
- 02_MODELO_DATOS_Y_PERSISTENCIA.md: esquema, relaciones e invariantes.
- 03_CONTRATOS_API_Y_SERVICIOS.md: entradas, salidas, errores y consumidores.
- 04_FLUJOS_Y_CASOS_USO_ACTUALES.md: recorridos y estados existentes.
- 05_DEUDA_TECNICA_Y_RIESGOS.md: hallazgos con impacto, evidencia y prioridad.

La baseline describe lo existente; una constitución o spec aprobada expresa lo
acordado. Registrar discrepancias sin declarar que el código es infalible ni
prometer «cero regresiones» por documentación. Proteger contratos vigentes y exigir
migración/aceptación para cambios incompatibles. Los nuevos módulos usan `/sdd-spec-assisted`;
las evoluciones usan `/sdd-spec-anchored`. No crear spec/plan/tasks aprobados de
módulos heredados sin revisión solo para superar gates.
