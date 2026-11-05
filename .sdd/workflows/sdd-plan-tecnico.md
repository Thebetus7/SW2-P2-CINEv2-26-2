# SDD-Plan-Tecnico: Diseño técnico y de producto integrado

Alias: `/sdd-planning`. Leer `.sdd/core.md`, constitución, spec APPROVED, baseline,
ADRs y código relacionado. Si una entrada es ambigua, registrar el problema y
resolverlo en su origen. No escribir código de producción en esta fase.

## Razonamiento técnico autónomo

Diseñar contratos, integridad referencial, transacciones, concurrencia, idempotencia,
validación en límites, errores tipados, timeouts y liberación de recursos según el
riesgo. Reutilizar la arquitectura existente cuando satisfaga los requisitos.
Elegir detalles reversibles sin preguntar; consultar cambios materiales de stack,
contratos, costes o arquitectura que no estén autorizados. No imponer capas,
repositorios o componentes diminutos que el proyecto no necesita.

## Diseño visual cuando exista UI

Inspeccionar el sistema de diseño, pantallas existentes, assets y referencias del
usuario. Aplicar `/extended` como guía de diseño; sus perfiles estéticos son
opcionales. Definir una dirección visual concreta antes de planificar componentes:
jerarquía, tipografía, espaciado, paleta/tokens, composición y densidad. Si no hay
referencias, proponer una dirección coherente con el producto; solo consultar
preferencias que cambien materialmente el resultado.

No considerar «tabla + modal + tema oscuro» un diseño terminado. Elegir patrones
según longitud y complejidad del flujo, dispositivo, accesibilidad y contexto.
Planificar contenido y datos realistas, navegación, foco/teclado, responsive y
estados de carga, vacío, error, éxito y cambios no guardados. Las ilustraciones o
animaciones deben servir al producto, no encubrir flujos incompletos.

## Contrato de docs/specs/XX-feature/plan.md

```markdown
# Plan: Nombre
Status: DRAFT
Version: 1
Spec-SHA256: pendiente
Constitution-SHA256: pendiente

## 1. Arquitectura y decisiones
PLAN-01..., alternativas, razones, compatibilidad y ADRs.
## 2. Alcance físico de cambios
Rutas previstas CREATE/MODIFY/DELETE, componentes reutilizados y dependencias.
Helpers/tests internos pueden añadirse con justificación sin rediseñar el sistema.
## 3. Persistencia e integraciones
Esquema real, migraciones, transacciones, concurrencia, recursos y rollback.
## 4. Contratos frontend/backend
Por operación: método/ruta o interfaz, entrada/salida tipada, validación, permisos,
resultado, error observable, consumidor UI y efecto persistente. Sin UI: N/A.
## 5. Flujos y estados
Secuencia de punta a punta y errores; rutas, historial, retorno y enlaces directos.
## 6. Diseño visual e interacción
Referencias, dirección visual, tokens, composición de pantallas, responsive,
contenido representativo, accesibilidad y matriz de estados por vista.
## 7. Vertical slices
Cada slice entrega un resultado verificable con backend, persistencia y UI
cuando apliquen. Evitar implementar primero todas las capas aisladas.
## 8. Verificación
Comandos reales, escenarios RF/RB/SC, contratos/integración, fixtures, timeouts,
prueba visual en navegador y criterios de aceptación por tamaño de pantalla.
## 9. Trazabilidad y riesgos
RF/RB/SC → PLAN. Decisiones pendientes, límites y observabilidad.
```

## Aprobación y vinculación

Verificar trazabilidad, viabilidad y contratos de integración contra el repositorio.
Aprobar solo sin decisiones de impacto pendientes. Marcar APPROVED y ejecutar:

```bash
python3 .sdd/tools/sdd_validate.py bind docs/specs/XX-feature --artifact plan
```

El comando registra hashes de las entradas actuales; ejecutarlo solo después de
la revisión. Una entrada modificada exige nueva revisión y vinculación. Continuar
con `/sdd-task` si procede según la autorización existente.
