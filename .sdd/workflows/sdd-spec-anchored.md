# SDD-Spec-Anchored: Evolución y análisis de impacto

Leer `.sdd/core.md`, constitución, tríada del módulo y código/pruebas relacionados.
Resolver módulo por argumento o contexto; si hay varios candidatos, aclararlo.
Este workflow modifica documentos; implementar después con `/sdd-execution`.

## 1. Diagnóstico

Reproducir o inspeccionar el síntoma y clasificarlo:
- Bug de implementación con contrato correcto: mantener spec/plan y añadir tarea
  de corrección y prueba de regresión. No cambiar requisitos para justificarlo.
- Cambio funcional: revisar spec y sus consumidores.
- Cambio arquitectónico: revisar plan/ADRs conservando comportamiento acordado.
- Cambio global: enmienda constitucional y revisión de módulos afectados.

## 2. Impacto e inferencia

Analizar datos/migraciones, contratos públicos, permisos, integraciones,
concurrencia, UI, navegación y operaciones según el cambio real. No imponer un
cuestionario de cámara o API a todos los dominios. Resolver consecuencias necesarias
con su origen y preguntar solo por bifurcaciones de negocio sin respuesta.

Registrar qué módulos, escenarios, pruebas y tareas quedan afectados; compatibilidad,
rollback y versión del comportamiento. Guardar borrador con pendientes si hace falta.

## 3. Actualización y revisión

1. Modificar spec con versión creciente y Status: IN_REVIEW si cambia comportamiento.
   Conservar IDs vigentes; marcar requisitos retirados con motivo y sustitución.
2. Pasar `/sdd-spec-clarify` antes de diseñar contra el contrato modificado.
3. Actualizar plan, revisar arquitectura e integración, aprobar y ejecutar `bind`
   para plan. Si no cambia comportamiento, usar spec ya aprobado.
4. Preservar tareas y evidencia históricas. Añadir tareas con IDs nuevos, señalar
   Superseded by cuando corresponda y exigir pruebas nuevas para cambios afectados.
   No contar evidencia anterior como verificación del contrato nuevo.
5. Vincular tareas revisadas con `bind --artifact tasks`, generar `progress` y
   ejecutar `check`. Un cambio de entrada sin revisión debe fallar por hash distinto.

Una corrección pura que no modifica entradas no requiere volver a vincularlas.
La bitácora explica el cambio, impactos y validaciones pendientes. Si el usuario
ya autorizó implementar, continuar con ejecución tras superar los controles.
