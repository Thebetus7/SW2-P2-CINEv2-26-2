# SDD-Constitution-Trial: Visión, invariantes y evolución global

Lee `.sdd/core.md`. Opera sobre `docs/constitution.md` y, si hace falta, actualiza
el mapa o comandos de AGENTS.md. No implementa código ni crea módulos vacíos.

## Descubrimiento

Inspeccionar documentos y código relevantes. Clasificar hechos, consecuencias
necesarias, decisiones técnicas, propuestas y bloqueos. Preservar todas las reglas
originales mediante IDs y fuentes, incluyendo fórmulas y excepciones. Los detalles
específicos de futuros módulos se guardan como semillas enlazadas, no como leyes
universales para todo el producto.

Cubrir misión, actores, permisos, flujos entre módulos, datos conceptuales,
integraciones, stack, entorno, calidad y restricciones de operación. Proponer
alternativas solo cuando falte una decisión de impacto. No preguntar por lo ya
acordado. Se permiten borradores con pendientes explícitos.

## Contrato de docs/constitution.md

```markdown
# Constitution: Proyecto
Status: DRAFT
Version: 1

## 1. Propósito y alcance
Problema, usuarios, éxito medible y límites.
## 2. Lenguaje del dominio y actores
Glosario, roles, autorización global y propiedad de datos.
## 3. Invariantes de negocio
INV-BIZ-01..., fórmulas y reglas transversales con fuentes.
## 4. Flujos y modelo conceptual
Relaciones, dependencias entre módulos y efectos globales.
## 5. Stack y arquitectura macro
Stack real/acordado, plataformas, integraciones, límites y ADRs.
## 6. Calidad y operación
Seguridad, accesibilidad, resiliencia, observabilidad, rendimiento y datos.
## 7. Verificación
Comandos existentes, estrategia de pruebas por riesgo y limitaciones.
## 8. Mapa de módulos y semillas
Objetivos y detalles originales enlazados al módulo correspondiente.
## 9. Decisiones, pendientes e historial
Origen, aceptación, impacto y motivo de cada cambio global.
```

Aprobar cuando no queden decisiones globales bloqueantes y las propuestas de
negocio/arquitectura de impacto estén aceptadas. Usar Status: APPROVED y Version
entera creciente. No inventar comandos ejecutables para un stack aún no instalado.

## Enmienda

Si ya existe constitución, analizar módulos, datos y contratos afectados antes de
cambiarla. Registrar compatibilidad, migración y decisiones que requieren revisión.
No sobrescribir decisiones válidas por preferencia personal. Los módulos afectados
vuelven a revisión; no afirmar que siguen compatibles sin comprobarlo. Volver al
workflow que originó el cambio una vez resuelta la enmienda.
