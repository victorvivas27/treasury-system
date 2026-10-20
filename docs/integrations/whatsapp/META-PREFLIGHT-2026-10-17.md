# Task #34: continuación de verificaciones con Meta

Fecha: 2026-10-17. Esta revisión actualiza los bloqueos de la comprobación anterior. No se enviaron WhatsApp, no se modificaron credenciales, no se habilitó producción y no se desplegaron cambios.

## Resultado de configuración y Meta

- Secretos de acceso, aplicación y verificación presentes en `backend/.env`, sin imprimir sus valores. Archivo excluido de Git; esto no certifica cifrado ni permisos del almacenamiento local.
- Emisor `1355054514362541`, WABA presente, API `v25.0`, plantilla `invitacion_apoderado`, idioma `es_CL`, URL pública HTTPS correctos.
- `WHATSAPP_ENABLED=false`, `WHATSAPP_MODE=test`; proveedor ausente: valor efectivo `mock`. Expiración no sobrescrita: 24 horas. No hay sobrescrituras WhatsApp en el entorno del proceso de comprobación.
- Un destinatario configurado, pero sin el prefijo `+`. La lista se compara literalmente con el teléfono normalizado; debe ser `+` seguido del código de país y número, sin espacios ni separadores. No se cambió su valor. La autorización en Meta fue informada por el administrador; no se acreditó mediante envío.
- GET del emisor: HTTP 200, ID coincidente, plataforma `CLOUD_API`.
- GET del emisor con `appsecret_proof` calculado en memoria usando el App Secret y el access token: HTTP 200, ID coincidente. La prueba acredita correspondencia de esos secretos sin imprimirlos; no acredita su instalación en Cloud Run.
- GET de plantillas: HTTP 200, una coincidencia `APPROVED`, `es_CL`, `MARKETING`.
- Cabecera, cuerpo y pie aprobados estáticos: cero parámetros de cuerpo. Botón «Activar mi cuenta», URL exacta `https://tesoreriaescolar.app/aceptar-invitacion#token={{1}}`.
- Se corrigió únicamente el payload local del adaptador: antes agregaba dos parámetros de cuerpo incompatibles con la plantilla aprobada; ahora envía solo el parámetro del botón URL de índice 0. Se actualizó su prueba con HTTP simulado. No se modificó la plantilla remota ni se desplegó la corrección.
- GET de suscripciones WABA: HTTP 200, una app suscrita. Esto no acredita por sí solo la URL callback ni el campo `messages` configurados.
- La autenticación y las lecturas funcionan ahora; no se certificó la fecha futura de expiración del token ni el permiso efectivo de envío mediante una solicitud real.

## URL pública del webhook y estado

Ruta del backend público que utiliza actualmente el frontend:

```text
https://backend-882988140149.southamerica-west1.run.app/tesoreria/api/v1/webhooks/whatsapp
```

Se confirmó el backend observando las peticiones de la página pública de activación. GET del webhook sin parámetros: HTTP 400. GET con parámetros completos y verificador deliberadamente inválido: HTTP 401. Esto confirma ruta alcanzable y rechazo, pero no una verificación positiva ni la configuración de secretos remotos. No se envió el secreto real a esta URL: su destino es el backend público actual, no un entorno de pruebas aislado confirmado.

**No registrar todavía esta URL como callback de pruebas ni habilitar el backend público.** El servicio de verificación exige `WHATSAPP_ENABLED=true`. Las variables locales no configuran Cloud Run. Bajo la restricción de mantener producción deshabilitada, hace falta un backend de pruebas público aislado, con la misma ruta `/tesoreria/api/v1/webhooks/whatsapp`. Su dominio exacto no está disponible en el repositorio ni fue proporcionado; no se inventa ni se despliega uno.

Implementación revisada:

- GET público sin JWT: compara `hub.verify_token` en tiempo constante, exige modo `subscribe` y devuelve `hub.challenge` como texto.
- POST público sin JWT, autenticado por `X-Hub-Signature-256`: HMAC-SHA256 del cuerpo original con el secreto de la app.
- Comprueba WABA y `phone_number_id`; procesa `delivered`/`read`/`failed`.
- Estados idempotentes, entrega confirmada no retrocede por fallo tardío, reintento HTTP 503 si el evento reciente precede al commit de la invitación. Errores sanitizados.
- Con WhatsApp deshabilitado, GET y POST se rechazan. No se alteró este comportamiento para habilitar producción.

## Cómo configurarlo en Meta cuando exista el entorno de pruebas

1. Preparar backend público HTTPS de pruebas y base aislada. Configurar sus secretos en el entorno de ese servicio. Mantener modo `test`, proveedor `meta` y un solo destinatario autorizado con formato E.164; habilitar WhatsApp únicamente allí. No hay envíos automáticos al arrancar.
2. En Meta Developers, seleccionar la misma app que contiene WhatsApp, abrir WhatsApp > Configuration/Webhooks y editar Callback URL. Usar la URL del backend **de pruebas** más `/tesoreria/api/v1/webhooks/whatsapp`, sin query ni fragmento.
3. En Verify token copiar de forma privada el valor de `WHATSAPP_VERIFY_TOKEN` del servicio de pruebas. No usar el access token ni el app secret en ese campo. Elegir Verify and save. Meta debe recibir HTTP 200 con el challenge exacto; si recibe 401, revisar habilitación y coincidencia del verificador. No incluir el secreto en capturas, comandos o informes.
4. Suscribir el campo `messages` de `whatsapp_business_account`. Comprobar que la app y WABA sean las previstas; ya existe una suscripción, por lo que no crear otra sin revisar la existente. Revisar cualquier override del callback y no sustituir una integración productiva.
5. Verificar recepción y firma de un evento de prueba del webhook, sin pulsar acciones de envío de mensajes. Los ejemplos de Meta pueden usar WABA/emisor ficticios y ser ignorados por el aislamiento del servicio: un HTTP 200 no prueba actualización de una invitación real.
6. Después de confirmar URL, handshake, firma y aislamiento, preparar fixture y consentimiento. Solicitar autorización expresa para una sola invitación; aún no se solicita porque la preparación está incompleta.

Referencias de Meta: [handshake del webhook](https://whatsapp.github.io/WhatsApp-Nodejs-SDK/api-reference/webhooks/start/), [suscripciones WABA](https://www.postman.com/meta/whatsapp-business-platform/folder/ozgs3jn/webhook-subscriptions).

## Activación y pendientes

Chromium a 1216 × 552: URL de activación HTTP 200, renderiza «Aceptar invitación», rechaza token ausente (`must not be blank`) y no presenta desborde horizontal. El primer intento de navegador tuvo timeout; la repetición completó la comprobación. El botón remoto coincide exactamente con el fragmento que consume el frontend; no se pulsó un botón recibido por WhatsApp ni se emitió un token real.

El frontend público llama al backend Cloud Run indicado arriba; el frontend local está configurado con `http://localhost:5055/tesoreria/api/v1`. Un token generado en una base local no funcionará en el backend público. Antes del envío hace falta una URL de activación que use el mismo backend/base de pruebas y sea compatible con el botón aprobado. Resolver ese enrutamiento sin modificar la plantilla aprobada ni producción requiere definir el entorno de pruebas; no basta con cambiar `.env` local.

Pendiente: corregir el formato del destinatario por el administrador, seleccionar proveedor Meta solo en pruebas, definir entorno público aislado y su URL callback/activación, comprobar handshake positivo y campo `messages`, y aplicar la corrección del payload al entorno elegido con autorización si requiere despliegue. Luego se podrá solicitar confirmación para una sola invitación de prueba.

## Validación local

Se repitieron 61 pruebas backend dirigidas sin envío real: integración Spring/MockMvc con H2 y mensajería simulada, más unitarias de mensajería y recuperación. También pasaron 6 pruebas frontend de controles WhatsApp y formulario de activación, con API simulada. No equivalen a recepción en un teléfono ni a una prueba end-to-end real.

Después de corregir el payload: `gradlew.bat test -PexcludeTags=postgres pmdMain check` terminó correctamente: 580 pruebas, cero fallos/errores/omitidas en las suites ejecutadas; PostgreSQL excluido explícitamente. PMD, cobertura mínima JaCoCo y `check` correctos. `git diff --check` correcto. Advertencias de deprecación existentes y avisos CRLF/LF sin errores.
