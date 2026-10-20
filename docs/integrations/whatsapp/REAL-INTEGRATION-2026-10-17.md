# Task #34: comprobación previa a la prueba real

Fecha: 2026-10-17 (America/Santiago). Resultado: bloqueada por credencial de Meta vencida. No se enviaron mensajes, no se desplegó ni se habilitó WhatsApp en producción. No se modificaron credenciales, plantilla, código ni base de datos operativa.

## Configuración revisada

Se reutiliza `backend/.env`, importado por Spring; está excluido de Git y no está versionado. Contiene un secreto local en texto plano: la exclusión de Git no acredita cifrado, permisos mínimos del archivo ni almacenamiento en Secret Manager. No se imprimieron valores de secretos ni tokens de activación.

- Emisor: `1355054514362541`.
- API: `v25.0`; plantilla: `invitacion_apoderado`; idioma: `es_CL`.
- `APP_PUBLIC_URL=https://tesoreriaescolar.app`.
- `WHATSAPP_ENABLED=false`, `WHATSAPP_MODE=test`, `APP_PROFILE=dev`.
- WABA y token de acceso presentes. Meta rechazó el token.
- No se encontraron en el archivo ni en el proceso `WHATSAPP_PROVIDER`, `WHATSAPP_TEST_RECIPIENTS`, `WHATSAPP_APP_SECRET` ni `WHATSAPP_VERIFY_TOKEN`. El proveedor efectivo por defecto es `mock`; expiración por defecto: 24 horas.
- Aprobación Marketing y estado «Activa: calidad pendiente»: informados por el administrador; no corroborados en Meta durante esta revisión.

## Comprobaciones externas sin envío

- `GET https://tesoreriaescolar.app/aceptar-invitacion`: HTTP 200, HTML de la aplicación. Chromium a 1216 × 552 confirmó «Aceptar invitación» y el rechazo del token ausente (`must not be blank`). No hubo desborde horizontal. No se utilizó un token de activación real; esto confirma la ruta pública, no la activación completa.
- GET autenticado del emisor, de `message_templates` filtrado por nombre y de `subscribed_apps`: HTTP 401, `OAuthException`, código `190`, subcódigo `463` (token vencido).
- Por ese rechazo no pudo verificarse la URL del botón aprobado, la categoría/estado remoto ni las suscripciones del webhook. No se modificó la plantilla.
- El adaptador existente envía el token como parámetro del botón URL de índice 0. La plantilla remota debe tener `https://tesoreriaescolar.app/aceptar-invitacion#token={{1}}`, botón «Activar mi cuenta» y los dos parámetros de cuerpo esperados. La propuesta local no prueba cómo quedó aprobada en Meta.

## Pruebas locales ejecutadas

Backend:

```powershell
cd backend
.\gradlew.bat test -PexcludeTags=postgres --tests 'messaging.*' --tests user.SA02InvitationIntegrationTest --tests user.AccountRecoveryServiceTest
```

61 pruebas correctas: 37 de integración Spring/MockMvc con H2 y puerto de mensajería simulado, 24 unitarias. Cubren activación por WhatsApp, rechazo de contraseña débil, hash de contraseña, token de un uso, vencimiento forzado, reenvío, permisos, aislamiento por curso, inicio de sesión del flujo compartido de invitaciones, errores sanitizados, firma HMAC, aislamiento de WABA/emisor, idempotencia y estados de entrega. La prueba unitaria verifica duración de 24 horas y envío de 1440 minutos al servicio de invitación. No se esperaron 24 horas reales ni se ejecutó PostgreSQL en esta sesión. La activación WhatsApp y el login compartido se prueban en casos distintos; no constituyen un recorrido real desde un teléfono.

Frontend:

```powershell
cd frontend
node node_modules/vitest/vitest.mjs run src/presentation/pages/apoderado/test/WhatsAppInvitation.test.tsx
node node_modules/vitest/vitest.mjs run src/presentation/pages/auth/AccountFlowPages.test.tsx
```

6 pruebas correctas, con API simulada: controles de invitación y formulario de activación, incluido token en fragmento y rechazo de token usado. No acreditan recepción en WhatsApp.

Los intentos iniciales de red/Gradle/Vite encontraron restricciones del sandbox; se completaron con permisos. `pnpm exec` intentó resolver el entorno y falló; se usó el Vitest ya instalado directamente, sin instalar dependencias. No hubo fallos funcionales en las suites ejecutadas. No se ejecutaron todos los quality gates porque no cambió código.

## Pendientes antes de solicitar confirmación de envío

1. Reemplazar el token vencido en el almacenamiento local seguro, sin enviarlo por chat; repetir consultas de solo lectura. Verificar permisos y vigencia, emisor de prueba y WABA.
2. Configurar `WHATSAPP_PROVIDER=meta`, destinatario autorizado en `WHATSAPP_TEST_RECIPIENTS`, secretos del webhook y endpoint HTTPS del backend de pruebas suscrito a `messages`. Mantener modo `test` y vigencia de 24 horas.
3. Confirmar en Meta el botón dinámico aprobado y su correspondencia con el frontend/backend de pruebas. Una página pública accesible no prueba que use el mismo backend que emitirá el token. No emitir invitaciones locales que abran un frontend conectado a una base distinta.
4. Preparar una fixture de apoderado en una base de pruebas aislada, con teléfono autorizado en Meta, correo de prueba, curso y administrador de prueba, fuente/fecha de consentimiento. No se creó una fixture operativa ni un token real: faltan destinatario e identificación del entorno conectado al frontend público.
5. Habilitar únicamente ese proceso de pruebas y presentar destinatario enmascarado, entorno y acción exacta para solicitar confirmación antes del POST de invitación. Ese endpoint genera el token y envía en la misma transacción; no invocarlo para preparar la invitación.
6. Tras confirmación, enviar una sola invitación, comprobar recepción y botón en el teléfono, establecer contraseña, activar, iniciar sesión, rechazar reutilización y revisar estados/webhooks y errores del entorno de pruebas. `ACCEPTED` no acredita entrega; exigir `delivered`/`read` y confirmación del receptor.

No hay estados ni registros de entrega real nuevos que revisar: no se efectuó un envío. La integración real sigue pendiente; no se solicita todavía autorización de envío porque la preparación no está completa.
