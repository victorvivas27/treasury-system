# Presentación de plantilla local a Meta

Fecha: 2026-10-17, America/Santiago. Presentación expresamente autorizada por el administrador; no incluye autorización de envío de mensajes.

- Nombre: `invitacion_apoderado_local`.
- ID devuelto por Meta: `1647347050189387`.
- Idioma: `es_CL`; categoría: `MARKETING`.
- Creación mediante `POST /v25.0/{WABA_ID}/message_templates`: HTTP 200, estado inicial `PENDING`.
- Se consultó antes de crear: no existía una plantilla con ese nombre. No se duplicó una plantilla existente.
- Botón URL de índice 0, «Activar mi cuenta»: `https://paltry-thousand-oval.ngrok-free.dev/aceptar-invitacion#token={{1}}`.
- Contrato: cuerpo, cabecera y pie estáticos; un único parámetro dinámico del botón, que recibe el token generado por el backend. Ejemplo presentado ficticio, sin token de activación real.
- Se volvió a consultar la plantilla creada: URL coincidente con el borrador y estado `PENDING`, sin motivo de rechazo (`NONE`).
- La plantilla original `invitacion_apoderado` se consultó antes y después: comparación de sus metadatos y componentes idéntica, continúa `APPROVED`. No se invocaron operaciones para modificarla o eliminarla.

## Aislamiento comprobado

Ngrok sigue publicando `https://paltry-thousand-oval.ngrok-free.dev` hacia `http://127.0.0.1:5175`, con inspector deshabilitado. Backend 5055, frontend 5175 y PostgreSQL 5432 activos. Consulta PostgreSQL de lectura confirmó dirección de servidor loopback y tabla de invitaciones presente.

El frontend utiliza `/tesoreria/api/v1` en el mismo origen HTTPS; Vite dirige esa ruta exclusivamente a `127.0.0.1:5055`. El launcher local fija el datasource de PostgreSQL en loopback y las URLs públicas al túnel. No se cambia el dominio de producción, su frontend ni su base. El proceso local conserva proveedor `mock`; no se habilitó Meta para envíos ni se creó una invitación real.

La configuración y ruta de activación apuntan al entorno local. Esto no acredita todavía la activación con token real ni el botón recibido en un teléfono: esas pruebas siguen sujetas a aprobación de plantilla y confirmación del primer envío.

La nueva comprobación de navegador tuvo timeouts intermitentes; la repetición devolvió HTTP 200 y renderizó «Aceptar invitación» con rechazo del token ausente («no debe estar vacío»). No se usó ningún token real. Las lecturas posteriores de Meta mantuvieron el estado `PENDING`, motivo de rechazo `NONE`. El administrador indicó que la revisión puede tardar aproximadamente 24 horas; se detuvo el sondeo repetido. No se configuró una notificación automática futura.

## Webhook: falta configuración manual

Callback local preparado y verificado por HTTPS:

```text
https://paltry-thousand-oval.ngrok-free.dev/tesoreria/api/v1/webhooks/whatsapp
```

GET con verificador local correcto devolvió HTTP 200 y el challenge exacto. No se imprimieron secretos.

Consultas remotas adicionales:

- El WABA tiene una app suscrita.
- La app asociada al access token actual es distinta de esa app suscrita.
- GET de las suscripciones de la app del token, autenticado mediante su app access token calculado en memoria: HTTP 200 con `data: []`. **El callback no está registrado en esa app.**
- La primera consulta, realizada contra la app suscrita al WABA, fue rechazada con código 190. El intento con token de usuario sobre suscripciones de la app actual devolvió código 104; la consulta con app access token sí funcionó. No se interpretaron esos errores como ausencia de callback de la otra app.

No se modificaron suscripciones ni webhooks en Meta. Se debe identificar en Meta Developers la app de pruebas que corresponde a las credenciales actuales, registrar el callback local y suscribir `messages`, y comprobar que esa misma app quede asociada al WABA de pruebas. No reemplazar un callback productivo ni quitar la app ya suscrita sin revisar su uso.

En WhatsApp > Configuration/Webhooks, ingresar el callback anterior y copiar privadamente `WHATSAPP_VERIFY_TOKEN` desde `backend/.env`; elegir Verify and save y suscribir `messages`. La creación de plantilla no registra el webhook automáticamente. Mantener abiertos los procesos locales y el túnel. Si ngrok cambia de hostname, detener la preparación del envío y revisar la correspondencia con la plantilla.

## Pendiente

Esperar la decisión de Meta y volver a consultar el estado. Solo tras aprobación, configuración coherente del webhook, fixture/consentimiento y confirmación expresa se seleccionará esta plantilla y proveedor `meta` en el proceso local para una única invitación al destinatario autorizado. No se enviaron mensajes, no se editaron credenciales, no se desplegó ni se modificó producción.
