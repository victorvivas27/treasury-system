# Operación de límites compartidos y recuperación

Esta configuración está preparada y probada localmente. No autoriza despliegues, migraciones productivas ni Fase 4. MFA/TOTP sigue pospuesto.

## Contadores

`SharedSecurityLimiter` usa PostgreSQL y un `INSERT ... ON CONFLICT DO UPDATE ... RETURNING` por admisión. La clave contiene únicamente el hash SHA-256 de política e identidad; no se guardan correos, IP o tokens en claro en los contadores. La hora usada es la de PostgreSQL. Las ventanas empiezan en la primera solicitud y las solicitudes rechazadas no prolongan el vencimiento.

La transacción de admisión es independiente de la operación protegida: un rollback posterior no devuelve el presupuesto consumido. Los errores del almacenamiento provocan rechazo; no hay fallback permisivo a memoria. La indisponibilidad de almacenamiento detectada se devuelve como 503. Cada transacción de contador tiene timeout de cinco segundos, además de los límites de conexión de la infraestructura existente. La limpieza horaria elimina vencidos, pero la expiración no depende de esa limpieza.

Las políticas se configuran con `app.security.limits.<política>.max` y `.seconds`, vía configuración Spring o variables de entorno equivalentes, por ejemplo `APP_SECURITY_LIMITS_LOGIN_ACCOUNT_MAX`. Deben coincidir en todas las instancias. Valores inválidos no desactivan los límites. La pausa por fallos de login se acota a 60 segundos incluso si se configura una ventana mayor.

| Política | Identidad | Máximo / segundos por defecto |
| --- | --- | --- |
| `login-ip` | IP resuelta | 120 / 60 |
| `login-account` | Correo normalizado, exista o no | 10 / 60 |
| `login-failures` | Correo + IP | 3 fallos / 60; el siguiente intento se pausa hasta el vencimiento |
| `mail-ip-minute`, `mail-ip-hour` | IP, compartido entre recuperación y reenvío | 60 / 60; 300 / 3600 |
| `password-reset-minute`, `password-reset-hour` | Correo sin particionar por curso | 1 / 60; 5 / 3600 |
| `verification-minute`, `verification-hour` | Correo sin particionar por curso | 1 / 60; 5 / 3600 |
| `refresh-ip` | IP | 600 / 60 |
| `refresh-family` | Familia refresh validada | 60 / 60 |
| `token-ip` | IP, compartido entre validar invitación/verificar correo/reset | 120 / 60 |
| `bootstrap-ip` | IP | 10 / 60 |
| `invitation-actor` | ID del administrador autenticado | 120 / 3600 |
| `invitation-minute` | Correo + curso de la sesión autorizada | 1 / 60 |
| `invitation-hour` | Correo, entre cursos | 5 / 3600 |
| `change-password` | ID autenticado | 5 / 60 |
| `admin-mutations` | ID autenticado | 60 / 60 |

La admisión de login se reserva antes de BCrypt, incluso si se completará correctamente. Un login correcto limpia solo sus fallos por correo/origen, nunca el cupo de solicitudes. La comprobación de contraseñas inexistentes también ejecuta BCrypt para evitar una salida claramente más rápida. No se promete tiempo constante absoluto entre redes, consultas o cuentas multicurso.

Las mutaciones administrativas limitadas son creación/edición de cuentas, cambios de rol/estado, bajas y modificaciones de organizaciones. Consultas, navegación y operaciones normales de tesorería conservan su comportamiento. Los roles y las verificaciones de Fase 1 siguen siendo obligatorios; el límite no concede permisos.

Los 429 incluyen `Retry-After` en segundos, redondeado hacia arriba y mínimo uno. CORS expone esa cabecera para que el frontend pueda leerla. Un 429 de refresh no consume el token que se estaba intentando rotar.

## Proxies

`server.forward-headers-strategy=none` conserva la IP de la conexión. `ClientIpResolver` es el único intérprete de IP reenviada. Por defecto ignora `X-Forwarded-For` y `Forwarded`.

Configurar `SECURITY_TRUSTED_PROXIES` con CIDR explícitos únicamente después de verificar la topología real y el comportamiento del balanceador. No usar `0.0.0.0/0` ni `::/0`. El resolver empieza por el peer de conexión, recorre `X-Forwarded-For` desde la derecha y se detiene en el primer salto no autorizado. No confía en el primer elemento suministrado por el cliente. Rechaza cadenas excesivas, hostnames y formatos inválidos; no resuelve nombres de DNS de esas cabeceras. No usa `Forwarded`, `X-Real-IP` ni `X-Forwarded-Prefix` como identidad.

Sin configurar confianza, las personas detrás de un mismo proxy comparten su presupuesto IP; por eso los límites IP son amplios y se combinan con cuenta/identidad. La configuración productiva del proxy no fue inspeccionada ni modificada remotamente. Debe validarse antes de un despliegue autorizado. Los atributos HTTPS/cookies conservan su configuración explícita; no se cambia la arquitectura JWT/refresh.

`TrustedProxyRequestFilter` conserva el reconocimiento de conexión segura (incluido HSTS de Spring Security) cuando un peer autorizado entrega un único `X-Forwarded-Proto: https`. No reescribe la IP del peer ni confía en ese dato desde conexiones no autorizadas. El proxy debe sobrescribir esa cabecera; valores ambiguos se ignoran.

## Correo persistente sin enumeración

Recuperación y reenvío validan formato y presupuesto, y registran una solicitud en `security_mail_requests`. No consultan usuarios durante la respuesta pública. Correos desconocidos, cuentas únicas y multicurso reciben el mismo cuerpo. `organizationId` se acepta por compatibilidad pero no selecciona cuentas, revela cursos ni cambia la clave del contador.

El worker consulta las cuentas después, en otra transacción. La recuperación multicurso envía un resumen a ese mismo buzón con los enlaces de sus cuentas recuperables. Los cursos y enlaces no se devuelven al navegador. El transporte y los tokens de recuperación existentes se conservan. No se guardan enlaces ni secretos de recuperación en la cola; se generan durante el intento de entrega y se persisten por hash en la tabla de tokens.

Cada instancia procesa lotes de hasta diez solicitudes, cada diez segundos por defecto. `FOR UPDATE SKIP LOCKED` evita que dos workers entreguen a la vez la misma fila. La transacción mantiene el lock durante SMTP, con timeout de 60 segundos; los timeouts SMTP existentes siguen aplicando. Si falla el envío, se revierten los tokens creados y la solicitud permanece con backoff creciente, hasta ocho intentos. Un reinicio conserva la solicitud pendiente en PostgreSQL.

Una solicitud de más de 24 horas o con ocho fallos queda `FAILED`, registra un error sin correo/token y requiere revisión del operador. Los `FAILED` se conservan hasta siete días desde su creación; una solicitud `PENDING` no se elimina silenciosamente por el trabajo de limpieza. Los envíos completados se eliminan. Configuración del worker: `app.security.mail-worker-enabled` y `app.security.mail-worker-delay-ms`; las pruebas lo deshabilitan y ejecutan cada paso de forma controlada.

La garantía de entrega es **al menos una vez**, no exactamente una vez: si SMTP acepta el correo y el proceso cae antes del commit, puede reenviarse. Los enlaces del intento revertido pueden ser inválidos; el reintento emite nuevos enlaces utilizables. No se pierde la solicitud de forma silenciosa. Las operaciones manuales de revisión deben conservar la identidad del destinatario y no modificar usuarios ni tokens como bypass.

Supervisar los logs `Security mail worker unavailable`, `retained for retry`, `expired` y `exhausted retries`, y los siguientes agregados (sin extraer destinatarios ni tokens):

```sql
SELECT status, count(*), min(created_at) AS oldest
FROM security_mail_requests GROUP BY status;
SELECT count(*) AS live_buckets FROM security_rate_buckets
WHERE expires_at > CURRENT_TIMESTAMP;
```

Antes de publicar, comprobar entrega/spam y remitente con un buzón autorizado, configurar supervisión de pendientes/fallos y verificar acceso del runtime a ambas tablas. Estas pruebas locales simulan SMTP; no envían mensajes reales ni configuran alertas remotas.

## Migración y límites de la solución

Desde producción V54, V58 crea solo `security_rate_buckets`, su índice de vencimiento, `security_mail_requests` y su índice de pendientes. Conserva `user_tokens.invitation_channel` y `guardian_whatsapp_invitations` para permitir rollback del código. V55 y V56 se conservan como archivos históricos fuera de `db/migration`; V57 pertenece a la fase retirada y no se publica. No modifica cuentas, roles ni sesiones existentes. La segunda tabla responde al requisito de entrega fiable: una tarea solo en memoria podría perder solicitudes al reiniciar. No requiere Redis, broker, dependencias nuevas ni infraestructura adicional.

La prueba `ProductionBridgePostgresTest` requiere PostgreSQL 18.6 aislado y acceso a la imagen privada e inmutable de v1.34.0. Vive en `src/productionBridge/java` y se ejecuta explícitamente con `./gradlew productionBridgeTest`; no depende de una variable de entorno ni se cuenta como omitida en la suite normal. El CI normal conserva las demás pruebas PostgreSQL y la exigencia de cero omisiones; no necesita credenciales de producción ni acceso a esa imagen. Mantener `ACCOUNT_LINK_USE_FRAGMENT=false` hasta publicar el frontend compatible. El push a `dev` ejecuta CI; no promover a `main` hasta coordinar backend puente, frontend y activación posterior de fragmentos.

Esta protección es proporcional a una aplicación de unos 50 usuarios; no sustituye controles de red contra una denegación de servicio distribuida. Una caída de PostgreSQL puede impedir operaciones sensibles: se prioriza rechazar antes que dejar de proteger. Las mediciones de pruebas locales no constituyen una capacidad garantizada en producción.
