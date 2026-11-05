# Doc-Deploy: Documentación operativa del entorno real

Leer `.sdd/core.md`, planes, configuración, scripts e infraestructura existentes.
Este comando genera documentación; no despliega ni provisiona por sí mismo.

## Descubrimiento y decisiones

Identificar runtime, build/start, servicios, puertos, almacenamiento, migraciones,
variables requeridas, proveedor y CI/CD. Citar archivos y comandos verificados.
Preguntar solo decisiones de proveedor, presupuesto, región o dominio que falten
y condicionen la guía. No inventar precios, IPs, servicios ni comandos exitosos.
Se permite una guía DRAFT con pendientes identificados.

Adaptar pasos al proveedor real: hosting estático, PaaS, serverless, contenedores o
VPS. Docker, SSH, proxy, swap, certificados y firewall solo cuando apliquen. No
introducir infraestructura adicional para completar una plantilla.

## Suite documental

Generar en una carpeta acordada y enlazar sus pasos:

1. 00_RESUMEN_GENERAL.md: arquitectura real, prerrequisitos, riesgos y estado.
2. 01_CONFIGURAR_PROYECTO.md: build, configuración y variables sin secretos.
3. 02_CREAR_INFRAESTRUCTURA.md: recursos reales; N/A justificado si ya existen.
4. 03_INSTALAR_HERRAMIENTAS.md: herramientas necesarias y versiones verificables.
5. 04_DESPLEGAR_Y_VERIFICAR.md: procedimiento, salud, integración y persistencia.
6. 05_ACTUALIZAR_PRODUCCION.md: actualización, backup, migración y rollback.
7. 06_APAGAR_Y_REACTIVAR.md: ciclo de vida, recuperación y costes residuales
   documentados por el proveedor; si no se verifican precios, indicar la limitación.
8. 07_FLUJO_VISUAL_DESPLIEGUE.html: opcional, solicitado o útil para el equipo.
   Autocontenido, accesible, con navegación, copiado de comandos y progreso local.

Por paso: propósito, entorno de ejecución, ruta, comando exacto, resultado esperado,
comprobación observable y recuperación. Distinguir «salida esperada» de «resultado
observado». No presentar zero-downtime como garantía sin arquitectura que lo soporte.

No copiar valores de secretos. Usar placeholders inequívocos como <TU_DOMINIO> y
explicar dónde obtener/configurar cada uno. Las cuentas y fixtures de prueba no se
habilitan en producción. Los ejemplos no deben conceder accesos administrativos
públicos por defecto. Si hay HTML, derivarlo del mismo contenido estructurado o
verificar su correspondencia para evitar guías divergentes.

## Cierre

Registrar qué pasos se verificaron y cuáles requieren un entorno externo. Cambios
de código/infraestructura necesarios se llevan a plan/tareas y ejecución. Publicar
solo según la autorización del usuario y la política del proyecto.
