# Google Cloud Platform (GCP) — 08. Desactivación Total, Cancelación de Capa Gratuita y Reembolso

Este documento está diseñado para estudiantes o desarrolladores que finalizaron sus pruebas/defensa universitaria y necesitan **desactivar todos los recursos, cerrar la cuenta de facturación y recuperar o liberar el cobro de verificación inicial (aproximadamente $30 USD o equivalente local)** que Google Cloud / Google Payments retiene al registrar la tarjeta.

---

## 1. Entendiendo el Cobro Inicial de Verificación de Google ($30 USD)

Cuando registras una tarjeta de débito o crédito en Google Cloud Platform (GCP) o en el Perfil de Pagos de Google (*Google Payments Center*), Google realiza una **retención temporal de fondos** (generalmente entre $1 USD y hasta $30 USD según el país/banco) para verificar que la tarjeta es auténtica y tiene fondos disponibles.

> [!IMPORTANT]
> **Naturaleza de la retención:**  
> - Si fue una **autorización pendiente / retención temporal**: Google no se queda con el dinero. La retención se libera automáticamente por el banco en un plazo de **3 a 14 días hábiles**, siempre que la cuenta no quede con saldos deudores pendientes.
> - Si fue un **depósito o cobro adelantado de saldo de facturación**: Al cerrar la cuenta de facturación y el proyecto, Google procesa el reembolso del crédito remanente no utilizado a la tarjeta de origen dentro de su ciclo de liquidación.

Para garantizar que no haya cobros futuros y que cualquier saldo o retención sea liberado con éxito, se deben seguir estrictamente los siguientes pasos en orden:

---

## Paso 1: Eliminar la Máquina Virtual y los Discos en GCP

Antes de cerrar la cuenta, debes destruir los recursos activos para evitar que sigan acumulando micro-consumos:

1. Ingresa a la consola: **[https://console.cloud.google.com](https://console.cloud.google.com)**.
2. Abre el **Menú de navegación `☰`** $\rightarrow$ **Compute Engine** $\rightarrow$ **Instancias de VM**.
3. Selecciona tu máquina (`cinev2-gcp-core-node` o el nombre que le hayas dado) marcando su casilla.
4. En la barra superior, haz clic en el botón de los tres puntos verticales `⋮` o directamente en el ícono de basurero: **"ELIMINAR"** (Delete).
5. Confirma la eliminación escribiendo o aceptando el diálogo emergente.
6. **Verificar Discos Persistentes:**
   - En el menú izquierdo de Compute Engine, haz clic en **Discos** (Disks).
   - Asegúrate de que no haya quedado ningún disco huérfano. Si aparece alguno, selecciónalo y haz clic en **"ELIMINAR"**.
7. **Eliminar Reglas de Firewall:**
   - Ve a **Red de VPC** $\rightarrow$ **Reglas de firewall**.
   - Selecciona `allow-cinev2-core` y elimínala.

---

## Paso 2: Desvincular y Cerrar la Cuenta de Facturación (Cloud Billing)

El candado principal para evitar cualquier cobro presente o futuro es **Cerrar la cuenta de facturación**:

1. En la consola de Google Cloud, abre el Menú `☰` $\rightarrow$ **Facturación** (Billing).
2. Si tienes varias cuentas de facturación, selecciona la cuenta asociada a tu proyecto.
3. En el menú lateral izquierdo de Facturación, haz clic en **"Gestión de cuentas"** (Account management).
4. Verás el estado de la cuenta como **Activa** (Active).
5. En la barra superior, haz clic en el botón **"CERRAR CUENTA DE FACTURACIÓN"** (Close billing account).
6. Te aparecerá un aviso de advertencia indicando que todos los proyectos asociados se detendrán. Haz clic en **"Cerrar la cuenta de facturación"** (Close billing account).

> [!NOTE]
> Una vez cerrada la cuenta de facturación:
> - Google suspende de inmediato cualquier cargo posterior.
> - Ninguna API ni máquina virtual puede generar costo alguno.

---

## Paso 3: Borrar Completamente el Proyecto de Google Cloud

Para dejar tu consola limpia al 100%:

1. En la barra superior de Google Cloud, haz clic en el selector de proyectos (al lado del logo de Google Cloud).
2. En la ventana emergente, busca tu proyecto (ej: `cinev2-universidad` o `My First Project`).
3. Haz clic en **"Configuración del proyecto"** (Project settings) o ve al Menú `☰` $\rightarrow$ **IAM y administración** $\rightarrow$ **Configuración** (Settings).
4. En la parte superior, haz clic en el botón **"CERRAR"** o **"ELIMINAR PROYECTO"** (Shut down).
5. Escribe el ID de tu proyecto en el cuadro de confirmación y presiona **"Cerrar"** (Shut down).
   *(Google pondrá el proyecto en una papelera de reciclaje durante 30 días y luego lo destruirá permanentemente).*

---

## Paso 4: Eliminar la Tarjeta de Google Payments Center (Centro de Pagos)

Para desvincular tus datos bancarios y forzar la liberación de retenciones:

1. Ingresa a la plataforma de pagos de Google:  
   👉 **[https://payments.google.com](https://payments.google.com)**
2. Inicia sesión con la misma cuenta de Gmail que usaste en Google Cloud.
3. Haz clic en la pestaña superior **"Métodos de pago"** (Payment methods).
4. Busca la tarjeta de débito/crédito que registraste.
5. Haz clic en el botón **"Eliminar"** (Remove).
   - *Si te indica que la tarjeta está asociada a un servicio activo, asegúrate de haber cerrado la cuenta de facturación en el Paso 2.*
6. (Opcional recomendado): Ve a la pestaña **"Configuración"** (Settings) $\rightarrow$ baja hasta el final de la página y haz clic en **"Cerrar el perfil de pagos"** (Close payments profile).

---

## Paso 5: Cómo Solicitar el Reembolso a Soporte de Google Cloud / Google Pay

Si tras 7 a 14 días hábiles tu banco no ha liberado el monto o si se cobró una factura indebida antes de cerrar la cuenta, sigue este procedimiento para abrir un caso de reembolso directo con un agente de Google:

### Opción A: Desde el Formulario de Reembolsos de Google Cloud Billing
1. Ingresa al portal de soporte de Facturación de Google Cloud:  
   👉 **[https://cloud.google.com/contact](https://cloud.google.com/contact)** o ve a **[https://support.google.com/cloud/contact/cws_billing](https://support.google.com/cloud/contact/cws_billing)**.
2. Selecciona:
   - **Problema:** *"Consulta sobre cargos o pagos"* / *"Solicitud de reembolso por verificación de prueba gratuita"*.
   - **ID de la cuenta de facturación:** Pega el número que aparece en tu sección de Facturación.
3. En la descripción escribe un mensaje claro y formal como el siguiente:

```text
Estimado equipo de Google Cloud Billing:

He creado una cuenta de prueba para un proyecto universitario académico que ya ha finalizado. 
Durante el registro se realizó una retención/cargo de verificación de fondos en mi tarjeta bancaria terminada en [ÚLTIMOS 4 DÍGITOS].

Ya he eliminado todas las instancias de Compute Engine, borrado el proyecto y cerrado la cuenta de facturación. Solicito formalmente la liberación de la retención o el reembolso del saldo no utilizado a mi método de pago original.

Agradezco de antemano su pronta atención.
```

4. Envía el formulario. Google responderá a tu correo electrónico en un lapso de 24 a 48 horas.

---

### Opción B: Chat en Vivo con Google Payments Support
Si el cargo aparece en tu extracto como `GOOGLE *CLOUD` o `GOOGLE *SERVICES`:
1. Ingresa a: **[https://support.google.com/googlepay/gethelp](https://support.google.com/googlepay/gethelp)**.
2. En la barra de búsqueda escribe: `Reembolso por retención de verificación`.
3. Selecciona la opción más cercana y haz clic en **"Siguiente"**.
4. En el paso de contacto, elige **"Chat"** o **"Correo electrónico"**.
5. Un agente de Google te atenderá en tiempo real. Proporciónale el ID de transacción que aparece en tu banca móvil y confirmará la liberación de los fondos hacia tu entidad financiera.
