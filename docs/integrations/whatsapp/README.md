# Invitaciones de apoderados por WhatsApp (tarea 34)

El administrador abre **Apoderados > Acceso**, elige WhatsApp y registra autorizacion, fuente y fecha. Crear un apoderado por si solo no envia mensajes: la invitacion es una accion administrativa expresa. No hay envios masivos.

Se reutilizan ACCOUNT_INVITATION, el usuario por correo y curso, la vinculacion al apoderado, la politica de contrasenas y el bloqueo transaccional de la activacion existentes. La cuenta permanece deshabilitada hasta establecer la contrasena. No se generan contrasenas temporales. El token de 32 bytes aleatorios solo se persiste como SHA-256, vence inicialmente a las 24 horas y cada reenvio invalida el anterior. La activacion por WhatsApp no depende de la entrega del correo de aviso de cambio de contrasena.

## Configuracion del backend

| Variable | Valor / uso |
| --- | --- |
| WHATSAPP_ENABLED | `false` por defecto; habilitar solo en el entorno autorizado |
| WHATSAPP_MODE | `test` o `production`; por defecto `test` |
| WHATSAPP_PROVIDER | `mock` o `meta`; por defecto `mock`; mock solo admite modo test |
| WHATSAPP_ACCESS_TOKEN | Secreto del backend con permiso de mensajeria de WhatsApp |
| WHATSAPP_PHONE_NUMBER_ID | Identificador del numero emisor en Meta, no el telefono escrito |
| WHATSAPP_BUSINESS_ACCOUNT_ID | Identificador WABA |
| WHATSAPP_TEMPLATE_INVITATION | Nombre exacto de la plantilla aprobada |
| WHATSAPP_TEMPLATE_LANGUAGE | Idioma exacto aprobado, por defecto `es_CL` |
| WHATSAPP_API_VERSION | Version vigente soportada por la app de Meta, por ejemplo `v25.0`; se exige configurarla |
| APP_PUBLIC_URL | URL HTTPS publica de este frontend, sin query, fragmento ni credenciales |
| WHATSAPP_TEST_RECIPIENTS | Lista separada por comas de numeros E.164 autorizados; obligatoria con proveedor Meta en test |
| WHATSAPP_APP_SECRET | Secreto de la app Meta para verificar HMAC de webhooks |
| WHATSAPP_VERIFY_TOKEN | Secreto aleatorio elegido por el administrador para el handshake |
| WHATSAPP_INVITATION_HOURS | Horas de validez, por defecto `24`, entre 1 y 168 |

Los secretos se configuran en el entorno o Secret Manager; nunca en el frontend, Git ni capturas. No reemplazar las variables existentes de correo o autenticacion. Cambiar a un numero real chileno solo exige modificar las variables de Meta y `WHATSAPP_MODE=production`, una vez autorizado. No hay envio automatico de prueba al arrancar.

## Configurar Meta

1. Crear o seleccionar una app de empresa con WhatsApp Cloud API y asociar su WABA. Para desarrollo usar el numero de prueba de Meta y autorizar cada destinatario tambien en el panel de Meta.
2. Preparar la plantilla propuesta en `invitation-template.json`. Reemplazar `TU-DOMINIO` por el dominio HTTPS de APP_PUBLIC_URL antes de presentarla. El cuerpo usa dos parametros posicionales: nombre y aplicacion. El boton URL de indice 0 usa el token como sufijo dinamico. Debe apuntar a `/aceptar-invitacion#token={{1}}` para que el token no forme parte de la peticion inicial al servidor. Verificar que Meta apruebe exactamente ese boton y el idioma configurado. La categoria solicitada es Utility, sujeta a la decision final de Meta.
3. Someter la plantilla desde WhatsApp Manager o `POST /<WABA_ID>/message_templates`, con autorizacion de administracion de plantillas. Este repositorio entrega el JSON; no presenta ni aprueba plantillas automaticamente.
4. Configurar el webhook publico HTTPS `https://TU-BACKEND/tesoreria/api/v1/webhooks/whatsapp`. Si el despliegue usa otro context path, respetarlo. Copiar WHATSAPP_VERIFY_TOKEN en el panel. Suscribir la app a la cuenta y al campo `messages`.
5. Configurar WHATSAPP_APP_SECRET. El POST solo se procesa si X-Hub-Signature-256 coincide con HMAC-SHA256 del cuerpo original. Ademas se verifican WABA y phone_number_id.
6. En test usar WHATSAPP_PROVIDER=meta, modo test, destinatario autorizado en ambas listas y credenciales de prueba. Invitar un unico apoderado de prueba con consentimiento. Abrir el boton recibido, establecer contrasena, iniciar sesion y verificar que el enlace no pueda reutilizarse.
7. Para produccion, el administrador debe autorizar expresamente el emisor, los destinatarios y los posibles costes. No se contrataron numeros ni se activaron envios reales como parte de la implementacion.

Referencias oficiales: [plantillas y boton dinamico](https://www.postman.com/meta/whatsapp-business-platform/request/lwtlz1k/send-message-template-interactive), [parametros de boton](https://whatsapp.github.io/WhatsApp-Nodejs-SDK/api-reference/types/button_parameter_object/), [verificacion de webhooks](https://whatsapp.github.io/WhatsApp-Nodejs-SDK/api-reference/webhooks/start/).

## API y estados

- `POST /api/v1/apoderados/{codigo}/invitacion-whatsapp`: genera o reenvia. Cuerpo `{"authorized":true,"source":"Formulario firmado","authorizedAt":"2026-01-01T10:00:00"}`. ADMIN o SUPER_ADMIN, solo el curso actual.
- `GET` en esa misma ruta: estado de la ultima invitacion. No devuelve el token, el telefono ni credenciales de Meta.
- `POST /api/v1/auth/validate-invitation`: `{ "token": "..." }`, valida antes de mostrar el formulario.
- `POST /api/v1/auth/reset-password`: contrato existente `{ "token": "...", "newPassword": "..." }`, activa la cuenta y consume el token bajo bloqueo.
- `GET/POST /api/v1/webhooks/whatsapp`: handshake y notificaciones verificadas.

Estado de invitacion: NONE, PENDING, EXPIRED, SUPERSEDED o ACTIVATED. Estado de transporte: PENDING, SEND_REQUESTED, ACCEPTED, DELIVERED, FAILED o SIMULATED. ACCEPTED no significa entregado. Solo el webhook delivered/read confirma entrega. Si un webhook reciente llega antes del commit de la invitacion, se responde 503 para que Meta reintente; los IDs desconocidos antiguos se ignoran. Webhooks repetidos no duplican cambios y un fallo tardio no revierte una entrega confirmada.

La migracion `V53__create_guardian_whatsapp_invitations.sql` agrega el canal de la invitacion a user_tokens y una tabla con hash, referencias a usuario/apoderado/curso, telefono normalizado, consentimiento, administrador que lo registro, fechas de creacion, solicitud, aceptacion, vencimiento y entrega, ID del mensaje y codigo de error sanitizado. Activacion y reemplazo se resuelven usando los registros existentes de usuario y token. Hay indices por curso/apoderado e ID de mensaje unico, con borrado en cascada de las referencias del curso.

Los reenvios por WhatsApp tienen un minuto de espera persistido bajo bloqueo del apoderado. Validacion y activacion publicas tienen un limite de 20 peticiones por IP/minuto por instancia, con cache acotada. Antes de escalar horizontalmente, complementar ese limite con el del proxy de confianza. No confiar en X-Forwarded-For sin configurar el proxy. No registrar cuerpos de estas rutas, fragmentos de enlaces ni errores completos del cliente HTTP; mantener analitica y servicios externos fuera de la pagina de activacion. El frontend elimina el token de la URL tras capturarlo y usa no-referrer.

## Pruebas locales

Con WHATSAPP_ENABLED=true, WHATSAPP_MODE=test, WHATSAPP_PROVIDER=mock y APP_PUBLIC_URL=https://app.example se simula la aceptacion sin red. La respuesta se identifica como SIMULATED y no afirma entrega real. El token no se publica en logs ni respuestas administrativas; las pruebas automatizadas capturan el puerto simulado en memoria para ejercitar la activacion.

```powershell
cd backend
.\gradlew.bat test -PexcludeTags=postgres pmdMain check
```

Para PostgreSQL aislado propio, el test SA34PostgresWhatsAppTest requiere una base vacia y desechable, con autenticacion local de pruebas sin contrasena. Nunca apuntarlo a una base productiva: crea fixtures.

```powershell
$env:WHATSAPP_TEST_POSTGRES_URL='jdbc:postgresql://127.0.0.1:55434/treasury_task34'
$env:WHATSAPP_TEST_POSTGRES_USER='treasury_test'
.\gradlew.bat test --tests user.SA34PostgresWhatsAppTest
```

La variante existente SA02PostgresInvitationTest permite ejecutar la misma regresion en PostgreSQL 16 con Testcontainers/Docker. Ambas verifican migraciones y segundo arranque con Hibernate validate.

La prueba con Meta Test Number, la presentacion/aprobacion de plantilla y las confirmaciones reales requieren la cuenta y configuracion del administrador; quedan pendientes hasta contar con ese acceso y autorizacion. No se prueban con destinatarios reales de produccion.

Bruno: `api-tests/whatsapp/01-Estado.yml` consulta el estado con adminToken y Guardian_Code de una fixture de prueba. `02-Invitar.yml` esta bloqueado salvo WhatsApp_Test_Send_Allowed=true y exige WhatsApp_Consent_Source / WhatsApp_Consent_At. Usar solo el entorno mock o Meta Test Number autorizado. No se agrego a scripts/test-full-flow.sh ni se ejecutaron envios desde Bruno.
