# Canal Cliente Móvil (Cine Bolivia PWA / Capacitor Android)

Aplicación móvil para clientes desarrollada con **React 18 + TypeScript + Vite**, empaquetada para dispositivos Android mediante **Capacitor**. Cuenta con capacidades offline mediante IndexedDB, generación y firma criptográfica de códigos QR (HMAC-SHA256), centro de notificaciones, asistente de chat con IA y reconocimiento de voz (Speech-to-Text).

---

## Requisitos Previos

- **Node.js** 18+ o 20+ y **npm**
- **Java JDK** (versión 17 o 21 recomendada para Gradle/Android)
- **Android SDK / Android Studio** (opcional, necesario si deseas usar emuladores o inspección gráfica)

---

## Guía: Cómo Generar el Archivo `app-debug.apk`

Para compilar y obtener el archivo ejecutable `.apk` para instalar en cualquier teléfono o emulador Android, sigue estos sencillos pasos:

### Paso 1: Instalar Dependencias (si es primera vez)

Desde la carpeta raíz de la app móvil (`ms/movil-client`):

```bash
cd ms/movil-client
npm install
```

---

### Paso 2: Compilar el Frontend Web (Vite + TypeScript)

Compila el código fuente y genera los archivos estáticos en la carpeta `dist/`:

```bash
npm run build
```

---

### Paso 3: Sincronizar el Proyecto con Android (Capacitor)

Copia los archivos compilados de `dist/` al contenedor nativo de Android y actualiza los plugins y permisos:

```bash
npx cap sync android
```

---

### Paso 4: Compilar el APK de Debug con Gradle

Entra a la carpeta de Android y ejecuta el ensamblador de Gradle:

- **En Windows (PowerShell / CMD):**
  ```powershell
  cd android
  .\gradlew.bat assembleDebug
  ```

- **En Linux / macOS:**
  ```bash
  cd android
  ./gradlew assembleDebug
  ```

---

### Resumen en un solo comando rápido (Windows)

Si ya tienes las dependencias instaladas, puedes ejecutar todo en una sola línea desde `ms/movil-client`:

```powershell
npm run build && npx cap sync android && cd android && .\gradlew.bat assembleDebug && cd ..
```

---

## ¿Dónde se encuentra el APK generado?

Una vez finalizada la compilación con éxito (`BUILD SUCCESSFUL`), el archivo APK resultante se ubica en:

```text
ms/movil-client/android/app/build/outputs/apk/debug/app-debug.apk
```

### ¿Cómo instalarlo en tu teléfono Android?

1. **Vía USB o WhatsApp/Drive:** Copia el archivo `app-debug.apk` a tu teléfono y ábrelo para instalarlo (habilita la opción *"Permitir instalar aplicaciones de fuentes desconocidas"* si te lo solicita).
2. **Vía ADB (Android Debug Bridge):** Si tienes el celular conectado por cable con depuración USB activa:
   ```bash
   adb install -r android/app/build/outputs/apk/debug/app-debug.apk
   ```

---

## Ejecución en Modo Desarrollo (Navegador)

Para probar la interfaz, el chat con IA y las compras interactivas rápidamente en el navegador:

```bash
npm run dev
```

La aplicación se abrirá en `http://localhost:5173`.

---

## Ejecución de Pruebas Unitarias

Para correr la suite completa de pruebas unitarias y BDD (69 tests):

```bash
npm test
```

