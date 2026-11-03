# SDD-Extended: Enriquecimiento Contextual, Calidad de UI/UX y Estándares de Arquitectura

Este workflow define el **Directorio Maestro de Estándares de Enriquecimiento Contextual (/extended)**. Su objetivo es asegurar que toda especificación funcional (`spec.md`), arquitectura técnica (`plan.md`) y plan de tareas (`tasks.md`) desarrolle un software intuitivo, ergonómico, estructurado y modular, eliminando decisiones arbitrarias de diseño y evitando código inflado o verboso.

---

## 0. Propósito y Modo de Operación Dual

`/extended` opera en dos modalidades según el momento del ciclo de vida en que sea invocado:

1. **Modo Inyección Activa (Fase Temprana)**:
   Si se invoca antes o durante la redacción de requerimientos (`/sdd-spec-high` o `/sdd-planning`), el asistente absorbe los principios maestros como restricciones innegociables para guiar cada sección generada.
2. **Modo Auditoría y Enriquecimiento (Post-Spec / Pre-Plan)**:
   Si se invoca sobre un `docs/specs/XX-feature/spec.md` ya redactado, audita el documento, detecta carencias de experiencia de usuario y añade las secciones estandarizadas de UI/UX, modales, navegación móvil, seeders, roles y operaciones antes de pasar al QA Gate (`/sdd-spec-clarify`).

---

## 1. Principios Universales de Enriquecimiento

### 1.1 Principio 1 — Operaciones CRUD con Modales Interactivos
Para toda acción de creación de un registro o detalle antes de guardar, el diseño funcional debe prever un **modal interactivo** (`CreateModal` / `DetailModal` / `FormDialog`). 
- Prohibido navegar a páginas en blanco exclusivamente para un formulario simple de creación.
- La acción de "Nuevo / Crear" debe abrir un modal con overlay, foco automático, validación de inputs y botones de pie.

### 1.2 Principio 2 — Botones de Acción Explícitos en Tablas
Toda tabla de registros debe contar con una columna dedicada a la extrema derecha para **botones de acción visualmente claros**:
- Ver Detalle (icono de visualización / modal de lectura).
- Editar (icono de edición / modal de formulario precargado).
- Cambiar Estado / Toggle (activar, desactivar, archivar).
- Eliminar / Anular (icono de papelera con modal de confirmación destructiva).

### 1.3 Principio 3 — Diseño de Tablas Intercaladas (Zebra Striping)
Toda tabla de datos debe implementar filas con fondo intercalado (alternancia de contraste claro/oscuro adaptada al tema actual) para maximizar la legibilidad de múltiples registros:
- Filas pares e impares con tonos alternados sutiles (ej: fondo base vs fondo 4% más claro o con opacidad diferencial).
- Efecto de iluminación en `hover` sobre la fila activa.
- Bordes horizontales tenues y padding vertical equilibrado.

### 1.4 Principio 4 — Barra de Módulos Superior/Lateral y Menú de Configuración Extremo
La arquitectura visual en escritorio debe contar con una barra de navegación limpia para saltar entre los módulos disponibles del sistema.
- En el extremo superior derecho debe ubicarse un **menú desplegable de configuraciones de usuario**:
  - Información de perfil del usuario autenticado (nombre, email y avatar).
  - Enlace rápido a "Mi Perfil".
  - Interruptor para conmutar entre **Dark Mode y Light Mode**.
  - Botón de cierre de sesión seguro ("Cerrar Sesión").

### 1.5 Principio 5 — Navegación Móvil Estándar con Barra Inferior (Bottom Navigation Bar)
En entornos móviles o resoluciones reducidas (mobile viewport / mobile apps), salvo instrucción explícita en contra:
- **Prohibido menús verticales ocultos o drawers complejos** como único método de navegación.
- **Obligatorio implementar una barra inferior de navegación fija (Bottom Navigation Bar)** ergonómica y táctil:
  - **Primer elemento (extremo izquierdo)**: Inicio / Home / Dashboard.
  - **Elementos centrales**: Módulos o accesos frecuentes de mayor uso (máximo 2 a 3 accesos para evitar sobrecarga visual).
  - **Último elemento (extremo derecho)**: Configuración / Mi Perfil (con acceso directo a ajustes y la opción de cerrar sesión).

### 1.6 Principio 6 — Semáforo de Salud del Backend Multiplataforma (Web y Mobile)
Tanto en la versión web (frontend desktop) como en la versión móvil (mobile app o responsive web), la pantalla de inicio de sesión (`/login`) o pantalla inicial debe incluir un indicador visual discreto (badge o chip tipo ping):
- Consulta de forma no invasiva el endpoint de salud de la API (`/api/health` o similar).
- Muestra visualmente el estado: **Punto verde** ("API Conectada") o **Punto rojo** ("API Desconectada / Sin Conexión").
- Garantiza que cualquier prueba funcional o despliegue permita saber de inmediato si los servicios están comunicándose.

### 1.7 Principio 7 — Buscador Rápido Diacrítico Multi-Atributo
Todo listado o tabla debe incluir una barra de búsqueda rápida que filtre en tiempo real:
- Debe evaluar simultáneamente sobre los **dos primeros atributos más relevantes** de la entidad (ej: nombre + documento, código + descripción, título + categoría).
- **Normalización Diacrítica Total**: La búsqueda debe ser `case-insensitive` (ignorar mayúsculas y minúsculas) y `accent-insensitive` (ignorar acentos y tildes). Escribir "cancion", "CANCION" o "Canción" debe arrojar exactamente el mismo resultado.

### 1.8 Principio 8 — Arquitectura de Componentes Atómicos ("Divide y Vencerás")
Queda prohibida la creación de vistas monolíticas extensas:
- Las pantallas deben descomponerse en subcomponentes atómicos, modulares y dinámicos:
  - Header / Breadcrumbs.
  - SearchBar / FiltersBar.
  - TableContainer, TableHeader, TableRow, TablePagination.
  - ActionButtonsDropdown.
  - FormFieldGroup y InputFeedback.
  - StatusBadge contextual.
- Cada componente debe encapsular una única responsabilidad y ser fácilmente testeable.

### 1.9 Principio 9 — Autenticación Obligatoria y Credenciales de Prueba (Seed Users)
Todo sistema con áreas privadas debe contar con autenticación formal:
- En las especificaciones y planes técnicos DEBEN definirse explícitamente las **credenciales de prueba precargadas**:
  - `admin@test.com` / `Password123!` (Rol Administrador).
  - `operador@test.com` / `Password123!` (Rol Operativo / Estándar).
- Debe permitirse iniciar sesión de inmediato en las pruebas sin requerir un registro manual previo.

### 1.10 Principio 10 — Estándar Visual y Ergonómico Abstracto Laravel Jetstream
La referencia de ergonomía se basa en la sobriedad y robustez de Laravel Jetstream:
- Separación limpia entre layouts: `GuestLayout` (pantallas públicas y auth) y `AppLayout` (dashboard privado).
- Formularios divididos con estructura de panel (`FormSection`: título y descripción explicativa a la izquierda o superior; campos de entrada en panel a la derecha).
- Confirmaciones críticas mediante modales de diálogo (`ConfirmationModal` / `DialogModal`).
- Secciones de peligro (`DangerZone`) visualmente delimitadas con confirmación secundaria.

### 1.11 Principio 11 — Modo Oscuro por Defecto (Dark Mode First)
El software debe concebirse, diseñarse y estilizarse con **tema oscuro por defecto**:
- Paleta oscura sofisticada basada en escalas neutras profundas (fondos slate/zinc oscuros, tarjetas elevadas con sutil borde de separación, tipografía en slate claro de alto contraste).
- El soporte para modo claro debe mantenerse como una alternativa complementaria conmutable desde el menú de usuario.

### 1.12 Principio 12 — Anti-Verbosidad y Ahorro de Tokens en la Interfaz (UI Concisa)
Queda prohibido redactar etiquetas, botones o textos de interfaz sobrecargados de palabras obvias:
- Usar nombres concisos: "Guardar", "Cancelar", "Nuevo", "Filtrar", "Eliminar", "Exportar", "Confirmar".
- Prohibidas frases redundantes como "Haga clic aquí para guardar este formulario de registro de usuario".
- La concisión reduce el consumo innecesario de tokens al generar el frontend y ofrece una experiencia de usuario limpia y profesional.

### 1.13 Principio 13 — Documentación Modular Centralizada en docs/operations-guide.md
Al generar o evolucionar módulos en el proyecto, debe actualizarse automáticamente el archivo centralizado `docs/operations-guide.md`:
- Por cada módulo implementado se registrará una ficha con:
  1. Nombre del módulo y propósito.
  2. Rutas y URLs asociadas (frontend, móvil y backend).
  3. Modales o formularios interactivos disponibles.
  4. Campos requeridos para su llenado.
  5. Qué entidad se guarda, persiste o muta.
  6. Roles permitidos y credenciales de prueba para ensayarlo.

### 1.14 Principio 14 — Seeders Base para Pruebas Funcionales Inmediatas
Prohibido entregar el proyecto o módulo con base de datos en blanco:
- Toda feature debe contemplar un seeder de base de datos (`DatabaseSeeder`) que precargue:
  - Roles y permisos iniciales.
  - Usuarios de prueba con roles asignados.
  - Catálogos indispensables y dependencias padre (ej: categorías, tipos, estados).
  - Al menos entre 5 y 10 registros de muestra realistas para que la tabla no se encuentre vacía en la primera ejecución.

### 1.15 Principio 15 — Matriz RBAC de Roles y Acciones Permitidas
Toda especificación funcional debe incluir la tabla formal de control de acceso basada en roles (RBAC Matrix):
- Filas: Acciones concretas (Ver Listado, Ver Detalle, Crear vía Modal, Modificar, Cambiar Estado, Eliminar/Anular).
- Columnas: Roles del sistema (ej: Administrador, Supervisor, Operador, Invitado).
- Celdas: Permitido / Denegado, junto con la regla observable ante acceso denegado (ej: ocultar botón u ofrecer mensaje de permiso denegado).

### 1.16 Principio 16 — Banners y Toasts de Notificación Integrados al Tema
El feedback visual de operaciones debe realizarse mediante banners o toasts alineados con la identidad visual:
- Banners de éxito (`toast-success`), error (`toast-error`), advertencia (`toast-warning`) e información.
- Estilo visual consistente con la paleta oscura (bordes sutiles, fondos con opacidad controlada, iconos representativos).
- Prohibido el uso de ventanas nativas del navegador (`window.alert()` o `window.confirm()`).

### 1.17 Principio 17 — Página de Bienvenida Pública Inteligente
La página pública o landing page (`/` o `/welcome`) debe mantener un diseño inteligente y coherente:
- **No debe mostrar los módulos internos protegidos del dashboard** ni tablas de administración a usuarios anónimos.
- Presenta la propuesta de valor del sistema y los accesos a Iniciar Sesión / Registrarse.
- Una vez iniciada la sesión, la navegación redirige automáticamente al Dashboard con la barra de módulos completa.

### 1.18 Principio 18 — Pipeline de Actividades Cerrado (Sin Cabos Sueltos)
Cada entidad o proceso debe resolver su ciclo de vida de punta a punta:
- Definición clara de la creación, transición de estados, finalización y anulación.
- Toda acción que mute el estado de un registro debe registrar su rastro observable (fecha de cambio, autor o motivo si aplica).
- Prohibido dejar flujos huérfanos donde un registro quede en un estado irrecuperable sin acción disponible.

---

## 2. Secciones Requeridas a Inyectar en spec.md

Cuando se audite o enriquezca un `docs/specs/XX-feature/spec.md`, deben incorporarse las siguientes subsecciones formalizadas:

```markdown
## 3.X Requisitos de Experiencia de Usuario e Interfaz (UI/UX Jetstream & Mobile)
- RF-UX-01: Barra de navegación desktop con selector de módulos y menú superior derecho (perfil, Dark Mode y logout).
- RF-UX-02: En entorno móvil, barra inferior fija (Bottom Navigation Bar) con Home, módulos clave y Configuración/Salir.
- RF-UX-03: Formulario de creación desplegado mediante modal interactivo con validación visual.
- RF-UX-04: Tabla con filas intercaladas (zebra striping) y columna de botones de acción explícitos.
- RF-UX-05: Buscador en tiempo real que filtre por los 2 atributos clave sin distinguir mayúsculas ni acentos.
- RF-UX-06: Indicador visual de conexión con backend (punto verde/rojo) presente en Login tanto en web como en móvil.
- RF-UX-07: Sistema de notificaciones mediante banners/toasts acordes al tema oscuro.

## 3.Y Matriz de Roles y Permisos (RBAC)
| Acción | Administrador | Operador | Invitado |
| :--- | :---: | :---: | :---: |
| Ver Listado | Permitido | Permitido | Denegado |
| Crear (Modal) | Permitido | Permitido | Denegado |
| Editar | Permitido | Denegado | Denegado |
| Eliminar/Anular | Permitido | Denegado | Denegado |

## 3.Z Semilla de Datos y Credenciales de Prueba (Seeders)
- Usuarios preconfigurados:
  - admin@test.com / Password123! (Rol: Admin)
  - operador@test.com / Password123! (Rol: Operador)
- Datos semilla mínimos: Al menos 5 registros precargados en la entidad principal.
```

---

## 3. Estructura del Archivo docs/operations-guide.md

Todo módulo debe registrarse en la guía centralizada con este esquema:

```markdown
# Guía Operativa de Módulos del Sistema

## Módulo: [Nombre del Módulo]
- **Ruta Principal**: `/modulo`
- **Modal de Creación**: Botón "Nuevo" abre `Create[Modulo]Modal`
- **Navegación Móvil**: Acceso desde Bottom Navigation Bar (icono representativo)
- **Campos Requeridos**: `campo1` (texto), `campo2` (selector con catálogo)
- **Efecto de Guardado**: Inserta el registro en la base de datos, emite banner de éxito y actualiza la tabla de inmediato.
- **Acceso Permitido**: Roles con acceso y credenciales de prueba correspondientes.
```

---

## 4. Checklist de Validación del Asistente

Al finalizar la auditoría o enriquecimiento con `/extended`, la IA debe verificar:
- [ ] ¿Los formularios de creación usan modales en lugar de páginas desiertas?
- [ ] ¿Las tablas tienen diseño cebra y botones de acción a la derecha?
- [ ] ¿En móvil existe Bottom Navigation Bar con Home al inicio y Configuración al final?
- [ ] ¿El indicador de conexión backend (verde/rojo) está presente en web y móvil?
- [ ] ¿El buscador ignora acentos y mayúsculas en los 2 atributos principales?
- [ ] ¿La interfaz está en modo oscuro por defecto y los botones son concisos?
- [ ] ¿Existen seeders con usuarios de prueba y datos de muestra listos para correr?
- [ ] ¿La página de bienvenida oculta los módulos privados?
- [ ] ¿Se actualizó `docs/operations-guide.md` con las instrucciones del módulo?
