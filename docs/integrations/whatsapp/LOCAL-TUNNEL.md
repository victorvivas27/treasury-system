# Task #34: entorno local con HTTPS

Preparado el 2026-10-17, sin desplegar servicios ni cambiar producción, credenciales o la plantilla aprobada. No se enviaron mensajes. El túnel usa ngrok ya instalado y su configuración existente; inspección de tráfico deshabilitada con `--inspect=false` para no retener cuerpos de activación en su inspector local. El túnel es un servicio externo de tránsito HTTPS, no infraestructura nueva en Cloud Run.

## Direcciones actuales

- Frontend/activación: `https://paltry-thousand-oval.ngrok-free.dev/aceptar-invitacion`.
- Callback del webhook: `https://paltry-thousand-oval.ngrok-free.dev/tesoreria/api/v1/webhooks/whatsapp`.
- Frontend local: `http://127.0.0.1:5175`.
- Backend local: `http://127.0.0.1:5055/tesoreria/api/v1`.

Un único túnel apunta a Vite, que dirige `/tesoreria/api/v1` al backend de loopback. `VITE_API_URL` es relativo; el teléfono nunca usa su propio localhost ni el backend de Cloud Run. En el teléfono, ngrok puede mostrar una pantalla de aviso antes de abrir el sitio; seleccionar Visit Site. Las comprobaciones automatizadas usan `ngrok-skip-browser-warning`.

PostgreSQL configurado en `.env` fue comprobado en loopback mediante consulta de lectura. El backend arrancó con perfil `dev`, conexión `127.0.0.1:5432`, Flyway V53 al día (sin migraciones pendientes) y Hibernate `validate`. No se utilizó el perfil H2 `test` con `create-drop` ni se creó una base alternativa. No se crearon apoderados ni invitaciones durante la preparación.

## Configuración temporal

`scripts/run-whatsapp-local.ps1` lee las variables existentes sin imprimirlas ni editar `.env`, valida destino PostgreSQL local y exactamente un destinatario. Añade el prefijo `+` en memoria si faltaba, sin ampliar la lista. Los cambios se limitan al proceso y se restauran al terminar:

- perfil `dev`, datasource forzado a loopback y dirección del backend `127.0.0.1`;
- URL pública, frontend y orígenes CORS apuntan al túnel; API frontend relativa;
- WhatsApp habilitado solo en este proceso local, modo `test`, proveedor **`mock`**;
- expiración 24 horas; la selección de una plantilla nueva queda pendiente de autorización y aprobación;
- cookies seguras, bootstrap sin clave deshabilitado, GCS y push deshabilitados;
- SMTP dirigido a loopback:9 para impedir correos reales durante esta prueba.

El proveedor real `meta` **no está habilitado**: el webhook puede verificarse con el proveedor simulado. No cambiarlo hasta tener plantilla local aprobada, consentimiento registrado y autorización expresa para una sola invitación. El nombre de plantilla existente en `.env` se conserva; antes de habilitar Meta habrá que seleccionar la plantilla local aprobada mediante una sobrescritura del proceso, sin cambiar la configuración de producción.

## Botón aprobado: bloqueo y solución

La plantilla aprobada `invitacion_apoderado` fija el dominio `tesoreriaescolar.app`. El parámetro del botón solo sustituye `{{1}}` después de `#token=`. Cambiar `APP_PUBLIC_URL` no cambia el dominio del mensaje de Meta; el adaptador envía un token, no una URL completa. Un token local no existe en la base pública.

Para probar el recorrido completo desde el botón sin tocar producción, se propone **crear otra plantilla de pruebas**, `invitacion_apoderado_local`, con el mismo contrato del adaptador: cuerpo estático y un solo parámetro dinámico en el botón URL de índice 0. El borrador `invitation-template-local.draft.json` apunta al dominio HTTPS actual y contiene únicamente un ejemplo ficticio. No se presentó a Meta y no modifica la plantilla aprobada.

Antes de solicitar su creación, comprobar que el hostname de ngrok pueda conservarse durante aprobación y prueba. Si el túnel cambia de dominio, no enviar con una plantilla que conserve el dominio anterior. No usar redirecciones de producción, DNS/hosts de `tesoreriaescolar.app`, acortadores, ni incrustar una URL local dentro del token.

Una comprobación manual de la activación mediante un enlace del túnel generado localmente permitiría probar la cuenta por separado, pero **no** valida el botón de la plantilla actual. No abrir el botón actual con un token local. No se generó ni compartió aquí un enlace real de activación.

## Configurar webhook en Meta

1. Mantener ngrok, frontend y backend locales activos.
2. En Meta Developers, abrir la app correcta > WhatsApp > Configuration/Webhooks. Revisar la configuración existente antes de reemplazarla. Si la app/WABA tiene un callback productivo, no sobrescribirlo: usar una app/WABA de pruebas o una configuración de callback aislada autorizada.
3. Registrar como Callback URL:

   `https://paltry-thousand-oval.ngrok-free.dev/tesoreria/api/v1/webhooks/whatsapp`

4. En Verify token, copiar privadamente el valor existente de `WHATSAPP_VERIFY_TOKEN` de `backend/.env`. No usar el access token ni el App Secret y no incluirlo en capturas o enlaces compartidos.
5. Elegir Verify and save: el backend debe devolver HTTP 200 con el `hub.challenge` exacto. El handshake ya fue probado por HTTPS con el valor local. Si Meta falla, comprobar procesos activos, URL y coincidencia del verificador.
6. Suscribir el campo `messages` de `whatsapp_business_account`. Ya se observó una app suscrita al WABA; revisar esa asociación y cualquier override antes de cambiarla. No es necesario enviar un WhatsApp para verificar el webhook.
7. Probar el webhook desde el panel sin pulsar Send Message. La firma debe corresponder al App Secret de la app configurada. Un payload de ejemplo con WABA/emisor ficticio se ignora por diseño; HTTP 200 no acredita entrega de una invitación.

No se escribió en la configuración de Meta durante la preparación. [Referencia oficial del handshake](https://whatsapp.github.io/WhatsApp-Nodejs-SDK/api-reference/webhooks/start/).

## Reiniciar y detener

Desde la raíz del repositorio, tres terminales:

```powershell
ngrok http http://127.0.0.1:5175 --inspect=false
```

Comprobar la URL que ngrok asigne. Si coincide con la actual:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/run-whatsapp-local.ps1 -Component backend -PublicUrl https://paltry-thousand-oval.ngrok-free.dev
```

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/run-whatsapp-local.ps1 -Component frontend -PublicUrl https://paltry-thousand-oval.ngrok-free.dev
```

No iniciar procesos duplicados si los puertos siguen ocupados. Detener cada proceso con Ctrl+C en su terminal; detener ngrok retira la exposición pública. No hay servicios instalados ni archivos de credenciales nuevos. Los procesos iniciados por el agente quedan activos para configurar Meta mientras la sesión y la máquina los mantengan.

## Verificaciones sin envío

- PostgreSQL local: conexión comprobada, tabla de invitaciones presente; backend arrancó correctamente con esquema validado.
- Frontend por HTTPS: HTTP 200.
- Chromium a 1216 × 552 confirmó el formulario «Aceptar invitación» y el rechazo del token ausente. Las peticiones de validación y refresh usaron el origen ngrok y fueron atendidas por el backend local (400/401 esperados, sin token ni sesión). La primera carga tuvo timeout durante la preparación de dependencias de Vite; la repetición terminó correctamente.
- GET webhook por HTTPS con verificador correcto: HTTP 200 y challenge coincidente; verificador incorrecto: HTTP 401.
- POST webhook con HMAC correcto y `entry: []`: HTTP 200; firma incorrecta: HTTP 401. No modifica registros ni envía mensajes.
- Parser PowerShell sin errores; TypeScript de la configuración local correcto. No se instalaron dependencias.

Pendientes antes del envío: elegir y autorizar la solución de plantilla local, obtener aprobación, verificar estabilidad del dominio, confirmar callback aislado de producción y acceso desde el teléfono; después preparar fixture/consentimiento y pedir autorización para una sola invitación. No se da por probado el botón recibido ni la activación con token real.
