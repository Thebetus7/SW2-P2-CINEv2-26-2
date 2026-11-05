# SDD-Spec: Inferencia proactiva y especificación funcional

Lee `.sdd/core.md` y aplica su matriz de autonomía. Este es el único generador de
especificaciones. No implementa código. Trabaja con el nivel de riesgo adecuado.

## 1. Recuperar intención y contexto

Resolver módulo por argumento o contexto de la sesión. Si hay varios candidatos,
no elegir automáticamente el último por nombre: presentar los candidatos.
Leer constitución, baseline, decisiones previas y código relacionado. Preservar
reglas, fórmulas, ejemplos y restricciones del usuario; enlazar fuentes sin copiar
manuales enteros. Identificar actores, objetivo, límites y criterio de éxito.

## 2. Inferir antes de preguntar

Analizar estas seis dimensiones. No es obligatorio preguntar por cada una:

1. **Dependencias y estados vacíos**: datos previos, catálogos ausentes, primera
   operación, selección dependiente y posibilidad de continuidad.
2. **Límites e integridad**: duplicados, rangos, identidad, pertenencia, borrado,
   carreras y conflictos simultáneos.
3. **Estados y transiciones**: inicio, éxito, cancelación, reintento, acciones
   incompatibles, doble envío y efectos de volver atrás.
4. **Fallos y resiliencia**: desconexión, timeout, dependencia externa, respuesta
   parcial, recuperación e idempotencia cuando hay efectos irreversibles.
5. **Persistencia y recursos**: borrador, recarga, expiración, consistencia entre
   vistas y liberación de archivos, sockets, cámara o procesos si existen.
6. **Actores y recorrido completo**: permisos efectivos, entrada y salida del flujo,
   feedback, accesibilidad, navegación y continuidad entre backend y frontend.

Registrar una tabla compacta: `ID | Hallazgo | HECHO/DERIVADO/TÉCNICO/PROPUESTA |
Origen o razonamiento | Acción`. Incorporar consecuencias necesarias y decisiones
ya autorizadas. Las alternativas de negocio y ampliaciones son propuestas.

Ejemplo: ante «registrar venta y descontar stock», deducir la necesidad de
consistencia para evitar una venta guardada con descuento fallido. Preguntar si
se permite vender sin stock cuando ninguna fuente define esa política.

## 3. Selección asistida con convergencia

Presentar las propuestas de mayor impacto agrupadas por dimensión. Una ronda
normal tiene hasta cinco decisiones; priorizar bloqueos y omitir dimensiones sin
hallazgos. Explicar brevemente beneficio y coste de las recomendadas. Diferenciar
lo obligatorio para cumplir el objetivo de las mejoras opcionales.

Usar selección múltiple solo si la herramienta la soporta; en otro caso, opciones
numeradas con aceptación, rechazo o edición por texto. No inventar nombres de
herramientas ni asumir que marcar «recomendada» obtiene consentimiento.

Reanalizar respuestas. Abrir otra ronda solo por un bloqueo nuevo o una decisión
que cambie materialmente el alcance. Guardar DRAFT/NEEDS_CLARIFICATION y decisiones
pendientes para reanudar; no encadenar inferencias opcionales indefinidamente.
Si el usuario pide generar con dudas pendientes, guardar borrador sin aprobarlas.

## 4. Redactar docs/specs/XX-feature/spec.md

Usar este contrato documental, con extensión proporcional al riesgo:

```markdown
# Specification: Nombre
Status: IN_REVIEW
Version: 1
Risk: ligero | estándar | crítico

## 1. Objetivo, contexto y alcance
Objetivo medible. In scope / Out of scope. Fuentes y decisiones aceptadas.

## 2. Actores y permisos
Acciones permitidas/denegadas, incluyendo protección efectiva en backend.

## 3. Datos funcionales e invariantes
Entradas/salidas, identidad, validaciones, RB-01, relaciones y fórmulas exactas.
Sin imponer ORM, clases o tablas físicas.

## 4. Flujos, estados y comportamiento observable
Flujo principal y alternativos; carga/vacío/error/éxito; navegación y recuperación.
Contratos funcionales entre UI, servicio y persistencia. Si no hay UI, indicarlo.

## 5. Requisitos EARS
RF-01.1: Cuando [evento], el sistema debe [resultado observable].
Cada requisito referencia una HU o un objetivo y sus reglas RB aplicables.

## 6. Criterios de aceptación y escenarios
SC-01.1.1 → RF-01.1
Dado [estado verificable]
Cuando [acción]
Entonces [resultado verificable y efectos]
Cubrir éxito, denegación, fallo y bordes según riesgo; no duplicar escenarios.

## 7. Integraciones, efectos y requisitos de calidad
Consistencia, seguridad, accesibilidad, rendimiento y compatibilidad medibles.

## 8. Registro de inferencias y decisiones
ID, clasificación, origen, decisión y aceptación cuando sea PROPUESTA.

## 9. Trazabilidad y pendientes
HU/objetivo → RF/RB → SC. Pendientes explícitos con impacto y responsable.
```

HU, RF, RB y SC tienen IDs estables y únicos dentro del módulo; no renumerar por
estilo. No inventar precisión, plazos, límites o políticas que no estén acordados.
Marcar secciones irrelevantes con motivo. El diseño visual detallado se define en
el plan; los requisitos de experiencia observables pertenecen a la spec.

## 5. Cierre

Comprobar conservación de requisitos y trazabilidad, pero dejar Status: IN_REVIEW.
Solo `/sdd-spec-clarify` aprueba. Resumir alcance, inferencias incorporadas,
propuestas aceptadas y decisiones pendientes. Continuar con clarificación si ya
está autorizada; no pedir permiso de nuevo por el mero cambio de fase.
