# SA-03 — Identidad de cuenta en HTTP y WebSocket

Fecha: 2026-10-04. Identidad canónica: `users.id`, PK global `BIGINT` / Java `Long`.

## Estado

| Etapa | Estado |
|---|---|
| REMEDIADO EN CÓDIGO | SÍ: corrección implementada y revisada |
| VALIDADO EN TESTS | SÍ: 553 tests, 0 fallos, 0 errores, 0 omisiones, incluida regresión STOMP real en H2/PostgreSQL |
| DESPLEGADO | NO: no se desplegó |
| VERIFICADO EN ENTORNO DESPLEGADO | NO |
| CERRADO EN PRODUCCIÓN | NO |

No se modificaron datos productivos, esquema, migraciones, dependencia alguna ni frontend. La prueba PostgreSQL utiliza un contenedor desechable `postgres:16-alpine`.

## 1. Causa original

CONNECT ignoraba `userId` y `organizationId`: resolvía `sub` por correo mediante `loadUserByUsername` → adapter → `findFirstByCorreoOrderByIdAsc`. Con el mismo correo en dos organizaciones, un JWT de B podía recuperar la cuenta/roles de A. La validación solo contrastaba correo, expiración y organización activa.

Además, el Principal y todos los destinatarios STOMP utilizaban correo. Las sesiones de A y B compartían el nombre con el que Spring resuelve los destinos de usuario, incluso si se hubiera corregido únicamente la búsqueda de CONNECT.

## 2. Identidad HTTP anterior/final

Anterior: ID cuando estaba presente, fallback global por correo cuando faltaba, sin contraste explícito de organización.

Final: el filtro exige `userId`, carga exactamente ese registro y valida ID, organización, correo del `sub`, estado habilitado/no bloqueado, organización activa, fechas y revocación. Las authorities proceden de ese registro, no del claim `authorities`.

`Authentication.getName()` HTTP conserva el correo para compatibilidad con consumidores de contacto/auditoría. La cuenta autenticada y las autorizaciones de identidad se obtienen de `TenantUserDetails.userId`; ese nombre textual no se usa para decidir `isSelf`, proteger el propio rol/desactivación ni para enrutar WebSocket.

## 3–4. Identidad WebSocket anterior/final y Principal

Anterior: primer usuario por correo; `Principal.getName()` = correo.

Final: usuario exacto por ID; `StompAccountAuthentication` conserva `TenantUserDetails` y sus authorities y devuelve `String.valueOf(userId)` desde `getName()`. A=10 y B=20, aun con idéntico correo, son Principals `"10"` y `"20"`.

CONNECT rechaza claims incompatibles, cuenta inexistente, ausencia de ID, cuenta/organización inactiva, token inválido/expirado/revocado y familia de refresh revocada. No realiza fallback por correo.

## 5. Publishers y eventos

- `NotificationRealtimePublisher`: creación, respuestas, edición, lectura y borrado usan IDs, convertidos a String únicamente al invocar `convertAndSendToUser`.
- `NotificationWebSocketController`: resuelve el actor desde los detalles del Principal autenticado; publica al ID del otro participante y al ID del actor.
- `RealtimeReply`: `recipientUserId`.
- `NotificationCreatedEvent` y `NotificationReadEvent`: `recipientUserIds`.
- `NotificationReplyCreatedEvent` y `NotificationReplyUpdatedEvent`: `authorUserId`.
- `NotificationReplyDeletedEvent`: `recipientUserId`.
- `NotificationService`: obtiene estos IDs directamente de los usuarios/participantes persistidos, sin resolverlos por correo en el publisher.

Web Push conserva sus datos de contacto y su enrutamiento existente por `recipientUserIds`. Las suscripciones frontend siguen siendo `/user/queue/messages` y `/user/queue/notifications`.

## 6. Correo eliminado de identidad/autorización

Eliminado de búsqueda CONNECT, fallback HTTP del filtro, nombres STOMP, destinatarios de todos los publishers STOMP, eventos de identidad realtime, resolución del actor WebSocket, claves de revocación de cuenta, `isSelf` y protección de propio rol/desactivación.

`NotificationService` exige un `TenantUserDetails` autenticado en el contexto y verifica que el registro sigue perteneciendo a esa organización; no conserva fallback global por correo. El interceptor del executor instala ese contexto para el handler y restaura el contexto previo al finalizar, también ante excepción.

Los métodos auxiliares que aún admiten correo (`CustomUserDetailsService.loadUserByUsername`, emisión antigua de refresh por correo y cambio antiguo de password por correo) rechazan explícitamente resultados inexistentes o ambiguos; ya no eligen silenciosamente la primera cuenta. No se usan como fallback JWT HTTP/STOMP.

No se sustituyeron usos de correo de contacto, presentación, auditoría o asociación con apoderado dentro del tenant. Los fallbacks históricos de perfil, mejoras y suscripción Web Push fuera de un Principal tipado no forman parte del flujo WebSocket; HTTP normal siempre crea el Principal tipado.

## 7. Tratamiento de organización

`JwtService.isTokenValid` exige igualdad exacta `JWT.organizationId == User.organizationId`, además de igualdad de ID. No se concatena organización al nombre STOMP, porque el ID ya es globalmente único.

`organizationId=null` solo se admite cuando el registro también tiene organización null y rol actual `SUPER_ADMIN`. USER/ADMIN sin organización se rechazan. Un SUPER_ADMIN ligado a una organización debe presentar esa misma organización; un token con otra organización o con null no lo convierte en cuenta global.

Se conserva la selección de organización predeterminada existente para operaciones de cuentas globales; null no otorga acceso automático a una conversación ajena.

## 8. JWT antiguos

Los access JWT sin `userId` se rechazan, tanto en HTTP como en CONNECT. No hay compatibilidad mediante búsqueda global por correo. Debe obtenerse un JWT nuevo mediante login o mediante un refresh válido, cuyo registro persistido ya está ligado a un `userId` inequívoco.

No se añade `User.code` al JWT. `sub` conserva correo como atributo contrastado; `userId` es la identidad. Cambiar el correo sigue invalidando un JWT cuyo `sub` ya no coincide.

## 9. Revocación

`TokenRevocationService.revokedUsers` se indexa por `Long userId`, y recuperación/cambio de password revoca por ID. Revocar A no revoca B por compartir correo. HTTP y CONNECT comprueban esa misma clave.

Se mantiene `jti` aleatorio en los JWT y la revocación específica existente por token exacto; no se ha cambiado esta última por una clave de correo. Ambos transportes comprueban la vigencia de `tokenFamilyId` cuando existe.

## 10. Autorización self

`UserAuthorization.isSelf(id, authentication)` compara el ID objetivo con el del actor y confirma su organización contra el registro. El controlador pasa la autenticación completa al evaluador.

`UserService.changeRole` y `cambiarEstado` comparan el ID de la cuenta con el ID del actor, obtenido por `AccountIdentity` en el controlador. Dos cuentas con el mismo correo ya no activan la protección de propia cuenta. Se conservan las reglas de último administrador y permisos de SUPER_ADMIN.

## 11. Seguridad SEND/SUBSCRIBE

`StompDestinationInterceptor` aplica una lista cerrada:

- CONNECT: autenticado por `WebSocketAuthInterceptor`, registrado antes.
- SUBSCRIBE: solo `/user/queue/messages` y `/user/queue/notifications`.
- SEND: solo `/app/notifications.reply`; el servicio comprueba que la cuenta puede acceder a la conversación.
- UNSUBSCRIBE, DISCONNECT y heartbeat: requieren la autenticación STOMP de cuenta.
- Destinos administrativos/desconocidos, `/user/{otroId}/…`, colas físicas `/queue/…` y envío directo al broker: rechazados.

No existen destinos administrativos STOMP habilitados. La restricción también evita inventarlos desde un cliente USER. No se confía en IDs de cuenta enviados por frontend para seleccionar la cola privada; Spring resuelve las sesiones por el Principal del servidor.

## 12. Archivos modificados

Rutas relativas al repositorio:

```text
backend/src/main/java/com/tesoreria/notification/
  application/NotificationCreatedEvent.java
  application/NotificationReadEvent.java
  application/NotificationReplyCreatedEvent.java
  application/NotificationReplyUpdatedEvent.java
  application/NotificationReplyDeletedEvent.java
  application/RealtimeReply.java
  application/NotificationService.java
  config/WebSocketAuthInterceptor.java
  config/WebSocketConfig.java
  config/StompAccountAuthentication.java [nuevo]
  config/StompDestinationInterceptor.java [nuevo]
  infrastructure/web/NotificationRealtimePublisher.java
  infrastructure/web/NotificationWebSocketController.java
backend/src/main/java/com/tesoreria/user/
  application/usecase/AccountRecoveryService.java
  application/usecase/AuthService.java
  application/usecase/CustomUserDetailsService.java
  application/usecase/RefreshTokenService.java
  application/usecase/UserService.java
  config/security/AccountIdentity.java [nuevo]
  config/security/JwtService.java
  config/security/JwtAuthenticationFilter.java
  config/security/TokenRevocationService.java
  config/security/UserAuthorization.java
  core/port/in/UserUseCase.java
  infrastructure/adapter/in/web/controller/AuthController.java
  infrastructure/adapter/in/web/controller/UserController.java
backend/src/test/java/notification/
  NotificationServiceTest.java
  WebSocketAuthInterceptorTest.java
  SA03WebSocketAuthTest.java [nuevo]
  SA03RealtimePublisherTest.java [nuevo]
  SA03StompConsumerTest.java [nuevo]
  SA03StompIntegrationTest.java [nuevo]
  SA03PostgresStompTest.java [nuevo]
backend/src/test/java/user/
  SA03AccountSecurityTest.java [nuevo]
  AuthControllerTest.java
  AuthServiceTest.java
  CustomUserDetailsServiceTest.java
  JwtServiceTest.java
  RefreshTokenServiceTest.java
  SA02InvitationIntegrationTest.java
  SecurityConfigTest.java
  UserControllerTest.java
  UserServiceTest.java
SA-03-CIERRE.md [nuevo]
```

La fixture de seguridad ahora crea una organización real y verifica el email de USER, en lugar de depender de cuentas sin organización/no verificadas. La prueba SA-02 de actor deshabilitado pasa a esperar 401: se rechaza en autenticación antes de llegar a la autorización de invitación.

## 13. Tests y resultados

Validación final ejecutada desde `backend/`:

| Comando | Resultado |
|---|---|
| `gradlew.bat test jacocoTestReport jacocoTestCoverageVerification --console=plain` | EXIT 0, BUILD SUCCESSFUL; 553 tests, 0 fallos/errores/omisiones |
| `gradlew.bat pmdMain --console=plain` | EXIT 1: exactamente las 19 incidencias preexistentes, sin incidencias añadidas por SA-03 |
| `git diff --check` | EXIT 0 |

La suite incluye tests unitarios afectados, seguridad HTTP, notificaciones, WebSocket/STOMP y PostgreSQL. La ejecución final incluye la respuesta real del consumer STOMP y ambas protecciones de propia cuenta con correo compartido. Las 18 pruebas de las seis clases `SA03*` pasan.

JaCoCo: instrucciones **76,19%**, líneas **79,67%**, ramas **53,23%**. La verificación existente del mínimo 70% pasa. No se han rebajado reglas PMD, cobertura ni exclusiones, y no se han omitido tests.

Incidencias PMD preexistentes, separadas de SA-03 (mismos archivos/reglas del reporte previo a esta tarea):

| Archivo bajo `backend/src/main/java/com/tesoreria/` | Cantidad | Reglas |
|---|---:|---|
| `shared/infrastructure/config/CorsConfig.java` | 1 | UseVarargs |
| `shared/infrastructure/performance/DashboardDataSourceInstrumentation.java` | 9 | UseProperClassLoader (4), LiteralsFirstInComparisons (3), UseVarargs (2) |
| `shared/infrastructure/performance/DashboardPerformanceProbe.java` | 2 | GuardLogStatement, CompareObjectsWithEquals |
| `treasury/application/usecase/TreasuryService.java` | 1 | AvoidDuplicateLiterals |
| `treasury/infrastructure/adapter/out/MercadoPagoHttpGateway.java` | 3 | GuardLogStatement |
| `user/application/usecase/AccountRecoveryService.java` | 1 | AvoidLiteralsInIfCondition: selección de organización del reset, anterior a SA-03 |
| `user/application/usecase/AuthService.java` | 1 | AvoidLiteralsInIfCondition: selección de organización del login, anterior a SA-03 |
| `user/config/security/JwtAuthenticationFilter.java` | 1 | AvoidDuplicateLiterals: fase de instrumentación `auth`, anterior a SA-03 |

Reportes generados: `backend/build/reports/tests/test/index.html`, `backend/build/reports/jacoco/test/html/index.html` y `backend/build/reports/pmd/main.html`. No se declara aprobado el quality gate general mientras PMD siga fallando.

Cobertura de requisitos obligatorios:

| Requisitos | Evidencia |
|---|---|
| 1–4: mismo email, IDs distintos, cuenta/roles/organización exactos | `SA03StompIntegrationTest`, heredado por `SA03PostgresStompTest`; registros SQL reales 10/20, ADMIN/USER |
| 5–7: claims cruzados, inexistente, JWT antiguo | `SA03WebSocketAuthTest`, `SA03AccountSecurityTest` |
| 8–11: entrega exclusiva y múltiples sesiones | Integración STOMP real: A, segunda sesión de A y B; envío a 10/20 y publisher de creación |
| 12–13: destinos manipulados y cola ajena | Integración STOMP y `SA03StompConsumerTest`, con ERROR/cierre ante destinos prohibidos |
| 14: creación, respuesta, edición, lectura, borrado | `SA03RealtimePublisherTest`, `NotificationServiceTest`, `SA03StompConsumerTest`; respuesta real por STOMP en integración |
| 15: revocación separada | `SA03AccountSecurityTest.revokingADoesNotRevokeB` |
| 16: self separado | `SA03AccountSecurityTest.selfUsesAccountIdAndOrganizationNotEmail`, `UserServiceTest` |
| 17–18: HTTP cruzado rechazado y HTTP normal | `SA03AccountSecurityTest`, `SecurityConfigTest` y suite HTTP/invitaciones existente |
| 19: SUPER_ADMIN/null | Casos HTTP y CONNECT de `SA03AccountSecurityTest` / `SA03WebSocketAuthTest` |

La prueba HTTP específica usa el filtro real, JWT firmado real y repositorio simulado; no se presenta como integración de red. La regresión STOMP usa servidor, conexiones WebSocket, broker, registro de usuarios y persistencia reales.

## 14. PostgreSQL

Docker disponible. La ejecución final aprobó la regresión STOMP contra PostgreSQL 16 con Flyway habilitado y Hibernate `validate`, incluida la respuesta persistida con ID/tenant B. También pasaron las clases PostgreSQL de rendimiento, SA-01 y SA-02: **69 tests PostgreSQL en total**, ninguno omitido. No se emplearon datos productivos.

No quedan pruebas PostgreSQL pendientes por indisponibilidad local. Las comprobaciones en el entorno desplegado siguen pendientes.

## 15. Riesgos residuales y verificación desplegada

- PMD preexistente puede mantener bloqueado el quality gate general; se documentará separado de los resultados SA-03.
- La revocación por cuenta/token sigue en memoria por instancia. No se ha introducido persistencia ni sincronización entre réplicas.
- La expiración/revocación/familia se valida al CONNECT. No se implementó desconexión forzada de sockets ya abiertos ante revocación posterior. La identidad y las colas siguen separadas por ID; esto no constituye una validación de ciclo de vida de sesiones en producción.
- Nuevos destinos STOMP deberán incorporarse explícitamente junto con sus autorizaciones y pruebas. El broker simple existente es local a la instancia; distribución entre réplicas queda fuera de esta corrección.
- La PK garantiza unicidad entre filas actuales. No hay una garantía histórica SQL contra reinserción manual de IDs eliminados; la aplicación no los recicla.
- Despliegue pendiente: coordinar reinicio de sockets y obtención de JWT nuevos; comprobar con cuentas reales de prueba homónimas, tenants/roles distintos y múltiples sesiones. Validar proxy/orígenes, entrega A→A y B→B y denegaciones en el entorno desplegado antes de declarar cierre productivo.

SA-03 no se declara cerrado en producción por el resultado de los tests locales.
