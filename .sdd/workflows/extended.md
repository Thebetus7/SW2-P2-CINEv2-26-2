# Extended: Dirección visual y experiencia de producto

Lee `.sdd/core.md`. Esta guía complementa especificación y planificación cuando
hay interfaz. No añade roles, autenticación, notificaciones ni funciones sin
necesidad aceptada. Las decisiones del proyecto prevalecen sobre los perfiles.

## 1. Reconocimiento y dirección visual

Inspeccionar diseño existente, marca, audiencia, plataforma, assets y referencias.
Elegir o proponer una dirección concreta: por ejemplo, herramienta operativa de
alta densidad, producto editorial o experiencia de consumo. Registrar por qué
sirve a la tarea del usuario. Evitar plantillas genéricas aplicadas por defecto.

Definir jerarquía tipográfica, escala de espaciado, ancho/composición, paleta
semántica, bordes, estados de controles e iconografía. Reutilizar componentes y
tokens existentes. Tema claro/oscuro, modales, tablas y barras de navegación son
opciones de diseño, no obligaciones universales.

## 2. Criterios de interacción

- Formularios breves pueden usar modal; flujos largos o con navegación propia
  pueden usar página, panel o pasos. Justificar la elección.
- Listados necesitan acciones descubribles, filtros útiles y comportamiento
  responsive; tabla, tarjetas o combinación según datos y dispositivo.
- Estados de carga, vacío, error, éxito y permisos deben ser legibles y coherentes.
- Teclado, orden de foco, foco visible, etiquetas, contraste y avisos accesibles.
  No depender solo del color ni de iconos sin nombre accesible.
- Recuperación de fallos, reintento seguro y conservación de datos cuando aplique.
- Texto breve y útil, datos realistas y formatos coherentes con el dominio.

## 3. Integración de punta a punta

Por acción visible, enlazar RF/SC, endpoint/servicio, permisos backend, validación,
DTO de respuesta, persistencia y estado de UI. Ocultar un botón no implementa
seguridad. No dar por finalizada una vista con arrays ficticios si requiere datos
reales. Fixtures y mocks pertenecen a desarrollo/pruebas y deben identificarse.

Usuarios/seeders solo si hacen falta; usar credenciales locales configurables,
entornos desechables y guardas que impidan habilitar cuentas de prueba en
producción. Nunca incluir contraseñas compartidas como configuración de despliegue.

## 4. Validación visual durante ejecución

Abrir la aplicación renderizada con datos representativos. Revisar al menos un
viewport móvil y uno de escritorio definidos en el plan, además de los estados
críticos del flujo. Capturar evidencia visual cuando la herramienta esté disponible.
Comprobar jerarquía, alineación, legibilidad, overflow, navegación, teclado y
consistencia. Comparar contra la dirección visual y criterios acordados; corregir
y repetir los casos afectados. Una captura bonita no demuestra integración.

Si no hay navegador, registrar NOT_RUN y la revisión pendiente; no afirmar que la
UI está validada. La verificación visual requiere juicio además de tests.

## 5. Documentación de uso

Actualizar `docs/operations-guide.md` cuando cambie una operación de usuario:
propósito, actores, flujo, resultados, errores y recuperación. Enlazar a las
especificaciones sin duplicarlas. No incluir detalles internos que no ayuden al
usuario a completar su tarea.
