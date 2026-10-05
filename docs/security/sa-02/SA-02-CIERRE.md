# SA-02 — Alta segura de apoderados exclusivamente por invitación

Fecha de ejecución: 2026-10-03–04, America/Santiago. Alcance: código y pruebas locales con datos ficticios. No se desplegó ni se consultaron, modificaron o eliminaron datos productivos.

## Arquitectura anterior

`POST /api/v1/auth/register` recibía un curso elegido por el solicitante, creaba un USER pendiente y enviaba EMAIL_VERIFICATION. Consumir ese enlace activaba la cuenta y devolvía acceso JWT y cookies de sesión. El catálogo `GET /api/v1/organizations/login-options` era público. La primera corrección exigió correo normalizado de apoderado activo del mismo curso, pero seguía permitiendo autoinscripción.

También existían creación directa de USER por `POST /users`, activación mediante actualización/estado y un `inviteGuardian(nombre, correo)` sin identidad de apoderado persistida en el token. Estos caminos se revisaron para impedir vías equivalentes al registro público.

## Arquitectura final

El ADMIN o SUPER_ADMIN autenticado identifica un apoderado existente por su código en `POST /api/v1/apoderados/{codigo}/habilitar-acceso`. La identidad administrativa y su organización se derivan de `TenantUserDetails` y se comprueban nuevamente contra el usuario persistido: rol ADMIN o SUPER_ADMIN, organización coincidente, habilitado y no bloqueado. El servicio y el controlador permiten ambos roles. La invitación se limita al curso de la sesión también para SUPER_ADMIN: no se toma un curso distinto de parámetros enviados por el cliente y se comprueba que el apoderado pertenece a ese curso.

El controlador resuelve el apoderado dentro del tenant autenticado; el servicio vuelve a consultar y bloquear su ID **con organization_id explícito**. Exige apoderado activo y organización activa de tipo COURSE; se conserva la compatibilidad con LEGACY cuyo slug es `default`. En este sistema el curso es una organización: no existe una entidad courseId independiente ni se autoriza mediante su nombre de presentación.

La cuenta se crea pendiente, con contraseña temporal aleatoria no entregada al cliente. ACCOUNT_INVITATION conserva userId, guardianId, organizationId y correo normalizado autorizado. La cuenta conserva invitedGuardianId; invitationAcceptedAt se establece únicamente cuando se acepta la invitación. Ningún campo de autorización se incorpora al DTO de creación/actualización pública; UserMapper los ignora expresamente.

El enlace abre `/aceptar-invitacion?token=...`, una pantalla de credenciales sin selector de pertenencia. La aceptación usa el endpoint público existente `POST /api/v1/auth/reset-password`, cuyo DTO solo admite token y newPassword. Si el token es ACCOUNT_INVITATION, se valida su contexto persistido; si es PASSWORD_RESET, se aplica recuperación sin activación. IDs adicionales enviados manualmente no cambian organización, curso, apoderado ni familia.

Al aceptar la invitación se comprueban hash, tipo, expiración, usedAt/revokedAt, usuario esperado, rol USER, cuenta no bloqueada, guardianId esperado, correo, organización/curso activo y apoderado vigente. Una consulta con bloqueo `PESSIMISTIC_WRITE` serializa el consumo del token; la identidad del apoderado también se bloquea mediante `FOR UPDATE`. Se guarda usedAt y se invalidan los otros tokens del mismo usuario/tipo dentro de la transacción. Dos consumidores concurrentes producen exactamente una activación exitosa en las pruebas. Un fallo revierte cambios de credenciales, activación y consumo.

Se utilizan 32 bytes de SecureRandom, codificación Base64 URL y SHA-256 almacenado. La invitación dura 24 horas y una recuperación 60 minutos. No se registran enlaces, passwords ni tokens en la documentación o los resultados de entrega.

No se crean ni reasignan familias durante el alta. Las asociaciones familiares siguen siendo administrativas y `ownFamily` conserva la autorización de recursos de pagos.

## Endpoints eliminados o modificados

Todos los paths siguientes son relativos al context path configurado `/tesoreria`.

| Endpoint | Decisión final |
| --- | --- |
| POST `/api/v1/auth/register` | Deshabilitado con denyAll. Anónimo: 401; actor autenticado: 403. El controlador y el servicio también rechazan la operación sin persistencia ni envío. |
| POST `/api/v1/apoderados/{codigo}/habilitar-acceso` | ADMIN o SUPER_ADMIN del tenant, apoderado existente/activo, comprobación de actor persistido y curso activo. Único origen normal de cuentas de apoderado. |
| POST `/api/v1/auth/reset-password` | Público por posesión del token. ACCOUNT_INVITATION autoriza el alta; PASSWORD_RESET no modifica pertenencia ni estados de acceso. |
| POST `/api/v1/auth/verify-email` | Devuelve mensaje; no emite JWT, refresh token ni cookies. No activa cuentas. |
| POST `/api/v1/auth/resend-verification` | Respuesta genérica y rate limiting; solo reenvía para una cuenta previamente aceptada mediante invitación y con buzón pendiente. |
| POST `/api/v1/auth/forgot-password` | No emite PASSWORD_RESET para USER deshabilitado/pendiente. Mantiene respuesta genérica. |
| GET `/api/v1/organizations/login-options` | Ya no es público: requiere SUPER_ADMIN. No tiene consumidores frontend después de retirar el registro. |
| POST `/api/v1/users` | Crear USER directamente está prohibido; conserva creación administrativa de ADMIN. |
| PUT `/api/v1/users/{id}` y PATCH `/api/v1/users/{id}/estado` | No pueden activar ni reactivar USER: requieren una invitación administrativa vigente. Actualizar un USER no puede cambiar su correo autorizado. |
| PATCH `/api/v1/users/{id}/rol` | No puede convertir una cuenta administrativa en USER como vía alternativa de alta. |

El servicio register conserva la comprobación de apoderado activo/correo/organización como defensa adicional, aunque siempre rechaza crear una cuenta. No hay otra escritura de USER nueva accesible por HTTP: ProfileImageService modifica imágenes de cuentas existentes; los endpoints de administradores fuerzan ADMIN y el bootstrap fuerza SUPER_ADMIN y se limita al primer usuario.

## Lista final de permitAll y clasificación

Se auditó SecurityConfig completo. Solo las siguientes entradas son públicas; ninguna permite asignar arbitrariamente membresía USER.

| Matcher público | Autorización o finalidad |
| --- | --- |
| DispatcherType.ERROR | Renderización de errores; no es un alta. |
| `/api/v1/auth/login` | Credenciales válidas de cuenta habilitada; elección entre cuentas existentes con credenciales verificadas. |
| `/api/v1/auth/bootstrap-admin` | Excepción de inicialización: clave bootstrap o modo local explícitamente habilitado, base sin usuarios, rol forzado SUPER_ADMIN. No crea apoderados. |
| `/api/v1/auth/refresh` | Refresh token persistido válido, familia activa y CSRF. |
| `/api/v1/auth/logout` | Revocación/cierre; no crea usuarios ni acceso. |
| `/api/v1/auth/verify-email` | Token EMAIL_VERIFICATION válido, pertenencia y autorización administrativa previa; únicamente buzón. |
| `/api/v1/auth/resend-verification` | Respuesta genérica, limitación de frecuencia y cuenta previamente autorizada. |
| `/api/v1/auth/forgot-password` | Solicitud genérica; recuperación de cuenta existente elegible. |
| `/api/v1/auth/reset-password` | Token persistido de un uso; distingue invitación vinculada de recuperación. |
| `/ws`, `/ws/**` | Transporte WebSocket existente; autenticación STOMP independiente. Sin creación de cuentas. No se amplió su permiso. |
| GET `/api/v1/community/about` | Contenido público de portada existente. Sin alta. |
| POST `/api/v1/tesoreria/pagos/mercado-pago/webhook` | Integración externa existente, con validación propia. Sin alta. |

El catálogo público solo tenía como consumidor `RegisterPage.getLoginOptions()`. Login y ForgotPassword mantienen selección entre cuentas existentes mediante opciones devueltas por sus propios endpoints, sin consultar este catálogo. Se retiró el permitAll del catálogo y su excepción de autorización en OrganizationController; se conservaron las funcionalidades legítimas de selección de cuenta.

## EMAIL_VERIFICATION y enlaces antiguos

Se conserva la comprobación de correo normalizado y apoderado activo en la organización, y se valida el curso activo. Un USER debe tener invitationAcceptedAt persistido para consumir EMAIL_VERIFICATION. Los tokens antiguos de autoinscripción, incluso con apoderado activo, no pueden completar el alta. Los tokens de una cuenta sin apoderado válido son rechazados antes de modificar estado.

Verificar un buzón no establece enabled, no cambia rol ni organización y no inicia una sesión. La pantalla frontend muestra un mensaje y un enlace al login; se retiraron establishSession y el intercambio de sesiones por BroadcastChannel de este flujo.

Las ACCOUNT_INVITATION antiguas sin el contexto incorporado por V50 también se rechazan. Deben reemitirse por un ADMIN autorizado; no se migran como si hubieran sido comprobadas.

## Recuperación de contraseña

forgot-password no genera tokens de recuperación para USER pendiente/deshabilitado. Un PASSWORD_RESET anterior de esa cuenta tampoco puede consumirse para modificar sus credenciales. Recuperar una cuenta activa cambia solo la contraseña e invalida tokens previos del mismo tipo; no establece invitationAcceptedAt, enabled, accountNonLocked, rol, organizationId ni invitedGuardianId. Los IDs de selección de cuenta no se usan para reasignar pertenencia.

Una invitación rechazada no cambia contraseña, verificación del correo ni enabled; apoderado retirado, cuenta bloqueada o contexto alterado fallan sin efectos persistidos.

## Archivos modificados

| Área | Archivos |
| --- | --- |
| Backend/apoderado | ApoderadoController.java; ApoderadoJpaRepository.java |
| Backend/organización | OrganizationController.java |
| Backend/usuario | AccountRecoveryService.java; UserService.java; SecurityConfig.java; User.java; AuthController.java; UserMapper.java; UserEntity.java; UserTokenEntity.java; UserTokenJpaRepository.java |
| Esquema | `backend/src/main/resources/db/migration/V50__bind_account_invitations.sql` |
| Pruebas backend | AccountRecoveryServiceTest.java; AuthControllerTest.java; UserServiceTest.java; CourseMembershipIntegrationTest.java; SA02InvitationIntegrationTest.java; SA02PostgresInvitationTest.java; TransferPaymentServiceTest.java (solo regresión ownFamily) |
| Frontend/contratos | entities/user/User.ts; repository/auth/IAuthRepository.ts; repositories/auth/AuthRepositoryImpl.ts; repositories/organization/OrganizationRepositoryImpl.ts |
| Frontend/UI | UserForm.tsx; UserTable.tsx; UsersPage.tsx; AccountFlowPages.tsx; LoginPage.tsx; HomeHeader.tsx; HomeHero.tsx; AppRouter.tsx |
| Pruebas frontend | AccountFlowPages.test.tsx; LoginPage.test.tsx |
| Eliminados | RegisterPage.tsx; RegisterPage.test.tsx; llamadas register/getLoginOptions y RegisterPayload |
| Documentación | Este informe; docs/security/sa-02/SA02_HISTORICAL_ACCOUNTS.sql; SA02_QUALITY_BASELINE.md; nota histórica en SA02_VERIFICATION.md |

`SECURITY_AUDIT.md` ya tenía cambios del usuario y se preservó. No se cambiaron reglas financieras, dependencias, calidad mínima ni configuración de despliegue.

## Matriz de pruebas obligatorias

Los casos de SA02InvitationIntegrationTest se ejecutan también, por herencia, en SA02PostgresInvitationTest. MockMvc utiliza los filtros reales de Spring Security, repositorios reales y servicio transaccional; solo el envío de email se sustituye por un mock sin envío externo.

| Requisito | Evidencia principal |
| --- | --- |
| 1–3: anónimo y IDs válidos no permiten alta | anonymousCannotRegisterEvenKnowingCourseOrganizationAndAuthorizedEmail; authenticatedActorsCannotUseRegistrationOrCreateUserViaCrud |
| 4: correo/apoderado no autorizado | register_rejectsOutsiderWithoutSavingOrSendingEmail; oldEmailVerificationWithoutGuardianCannotActivate; adminCanIssueOnlyForActiveGuardianInOwnOrganization |
| 5–6: otro curso/organización | CourseMembershipIntegrationTest; adminCannotInvokeServiceWithForeignGuardianId; changedEmailOrOrganizationCannotChangeInvitationAuthorization |
| 7: apoderado inactivo | adminCanIssueOnlyForActiveGuardianInOwnOrganization; guardianDeactivatedAfterInvitationCannotActivate |
| 8: USER no emite invitación | anonymousAndUserCannotIssueInvitation |
| 9: ADMIN autorizado | adminCanIssueOnlyForActiveGuardianInOwnOrganization |
| 10: ADMIN fuera de organización | adminCanIssueOnlyForActiveGuardianInOwnOrganization; adminCannotInvokeServiceWithForeignGuardianId |
| 11: aceptación válida | invitationAllowsActivationAndIgnoresAllClientMembershipIds |
| 12: inexistente/manipulado | nonexistentAndManipulatedTokensDoNotChangeCredentials |
| 13: vencido | expiredTokenDoesNotChangeCredentials |
| 14: usado | usedAndRevokedTokensAreRejected; successfulInvitationCannotBeReused |
| 15: concurrencia | concurrentReuseAllowsExactlyOneSuccessfulActivation, en H2 y PostgreSQL |
| 16: IDs manipulados | invitationAllowsActivationAndIgnoresAllClientMembershipIds; contexto persistido contrastado después de aceptar |
| 17: desactivado tras emitir | guardianDeactivatedAfterInvitationCannotActivate |
| 18: email no autoriza | emailVerificationCannotAuthorizePendingAccountEvenWithActiveGuardian; verifiedAuthorizedMailboxReturnsNoSessionOrRefreshCookie |
| 19: email antiguo sin pertenencia | oldEmailVerificationWithoutGuardianCannotActivate; verifyEmail_rechecksMembershipBeforeActivatingOldToken |
| 20: recuperación no activa | forgotPasswordAndOldResetCannotActivatePendingAccount; recoveryForActiveAccountChangesPasswordWithoutChangingMembership |
| 21: cuenta activada aislada | activatedUserReadsBirthdaysOnlyFromAuthorizedCourse; login con curso ajeno rechazado en invitationAllowsActivationAndIgnoresAllClientMembershipIds |
| 22: ownFamily | ownFamilyStillAllowsOnlyTheGuardiansOwnObligation; ownFamilyStillRejectsAnotherFamilysObligation y suite TransferPaymentServiceTest existente |

Casos adicionales: apoderado eliminado/recreado con mismo correo, invitación vieja sin contexto, curso inactivo, cuenta bloqueada, ADMIN deshabilitado con JWT previo y activación alternativa por actualización/estado. Una cuenta USER deshabilitada requiere una invitación nueva también para reactivarse; no basta con que tenga invitationAcceptedAt de un alta anterior.

## Ejecución y resultados

La repetición final de la suite backend completa terminó con BUILD SUCCESSFUL en 3m 34s: 79 archivos de resultados y 517 pruebas, cero fallos, cero errores y cero omitidas, sin excluir dependencias externas. Incluye pruebas unitarias, Spring/MockMvc e integración. SA02InvitationIntegrationTest ejecuta 26 casos en H2; SA02PostgresInvitationTest ejecuta esos mismos 26 y tres comprobaciones adicionales en PostgreSQL real: 29 casos. Se comprobaron migración desde base vacía, segundo migrate sin migraciones adicionales, Flyway validate, segundo arranque con Hibernate validate y auditoría histórica READ ONLY.

JaCoCo aprobó el umbral configurado del 70%: cobertura de instrucciones 75,33% (19.232 cubiertas / 25.529), líneas 78,94% (3.500 / 4.434). bootJar aprobó.

Frontend: la repetición final de `pnpm test:run` aprobó 75 archivos y 429 pruebas, en 64,68 segundos. Tras el último ajuste visual de administración también se repitieron las tres suites relacionadas (11 pruebas), lint, TypeScript y build: todos aprobaron. `pnpm lint`, `pnpm exec tsc -b` y `pnpm build` aprobaron. Advertencias ajenas: no-unused-expressions en FamiliaPage, AlumnoPage, ApoderadoPage y NotificationContext; avisos React act en pruebas de AuthContext; eval en lottie-web y tamaños de chunks en build.

Comandos backend finales: `gradlew.bat test jacocoTestCoverageVerification bootJar`, seguido de `gradlew.bat check`. Sin exclusiones de PostgreSQL. Docker estuvo disponible mediante ejecución con permisos. PostgreSQL usa contenedores desechables postgres:16-alpine; nunca conexiones productivas. La consulta histórica se ejecutó en el PostgreSQL de pruebas dentro de una transacción READ ONLY.

`check` no aprobó por PMD. La repetición final de `pmdMain` confirmó 19 infracciones preexistentes, detalladas en [SA02_QUALITY_BASELINE.md](docs/security/sa-02/SA02_QUALITY_BASELINE.md). No se modificaron reglas ni se ocultaron infracciones. Después de retirar un parámetro obsoleto del constructor de AuthController se repitieron las pruebas de controlador e invitaciones H2/PostgreSQL y la suite completa con JaCoCo/bootJar.

## Cuentas históricas y cierre operativo

### Revalidación previa a producción — 2026-10-04

Después de corregir la autorización de SUPER_ADMIN y los mensajes de rechazo, se ejecutó nuevamente `gradlew.bat test jacocoTestCoverageVerification bootJar`: BUILD SUCCESSFUL, 533 pruebas en 79 suites, sin fallos, errores ni omisiones. La suite SA02PostgresInvitationTest ejecutó 37 casos en PostgreSQL, incluida la invitación y aceptación emitida por SUPER_ADMIN, el aislamiento entre cursos y las comprobaciones de migración V50. Las invitaciones independientes con el mismo correo en dos cursos también aprobaron. La cobertura exigida y el paquete backend aprobaron.

Frontend: `pnpm test:run` aprobó 75 archivos y 429 pruebas; `pnpm build` aprobó. `pmdMain` sigue fallando por las mismas 19 infracciones preexistentes documentadas en SA02_QUALITY_BASELINE.md; no se omitieron ni deshabilitaron reglas.

Esta revalidación comprueba el código local, no un despliegue productivo. Se deben publicar backend y frontend incluyendo V50, comprobar la entrega real del correo y la aceptación de una invitación en el entorno publicado, y efectuar la revisión histórica descrita abajo.

La migración V50 agrega metadatos y una restricción de integridad del contexto de invitación. No modifica el enabled, las credenciales o los roles de ninguna cuenta histórica. La ausencia de invitationAcceptedAt en cuentas antiguas **no prueba** que su alta fuera indebida: la autorización histórica debe confirmarse administrativamente.

Procedimiento de revisión:

1. Después de aplicar V50 en el entorno autorizado, ejecutar [SA02_HISTORICAL_ACCOUNTS.sql](docs/security/sa-02/SA02_HISTORICAL_ACCOUNTS.sql) con acceso de lectura y preservar el resultado en un soporte de acceso administrativo restringido.
2. Revisar USER activos sin apoderado del mismo curso, apoderados inactivos, organización inexistente/inactiva/no curso, correos presentes solo en otro tenant, identidad invitedGuardianId inconsistente y asociaciones familiares inconsistentes o faltantes.
3. Revisar también los USER con pertenencia estructural válida pero origen histórico sin metadatos: contrastar registros administrativos y verificar quién autorizó el acceso. Un vínculo familiar ausente no significa automáticamente una cuenta indebida, pero impide recursos protegidos por ownFamily.
4. Mantener separado el inventario ADMIN/SUPER_ADMIN. Confirmar sus roles con registros administrativos; no tratarlos como autoinscripciones de apoderados ni convertirlos en USER para resolver alertas.
5. Una administración autorizada decide caso por caso las medidas y la reemisión de invitaciones. Esta tarea no ejecuta deshabilitaciones ni otras mutaciones productivas.

## Riesgos residuales y pendientes

Las cuentas históricas ya activadas conservan su estado: podrían seguir accediendo hasta completar la revisión operativa. SA-02 preventivo no demuestra que esos usuarios fueran legítimos. Las invitaciones antiguas sin contexto deben reemitirse; las cuentas pendientes no completan el alta con EMAIL_VERIFICATION ni PASSWORD_RESET.

Los enlaces de invitación son credenciales de portador. La entrega debe llegar al buzón registrado administrativamente; no se realizó prueba de envío SMTP real. Los tests comprueban destino y contexto con un adaptador sin envío.

Se observó un comportamiento preexistente de revocación: un JWT nuevo emitido en el mismo segundo de un cambio de contraseña puede ser rechazado porque iat usa segundos y la revocación milisegundos. Los tests de acceso esperan un token realmente posterior; no se alteró ni simuló ese control para ocultarlo. Los otros hallazgos de SECURITY_AUDIT (incluidos estado de JWT y WebSocket) permanecen en su alcance separado; la emisión de invitaciones comprueba por sí misma el estado actual del administrador.

Pendientes productivos: autorización y despliegue de backend/frontend/V50; pruebas PostgreSQL y HTTP sobre el entorno desplegado; comprobación de entrega de invitaciones con la configuración real; revisión de cuentas históricas y registro de decisiones administrativas.

## Estado final

| Estado | Situación |
| --- | --- |
| REMEDIADO EN CÓDIGO | Sí. Registro USER bloqueado, alta mediante invitación administrativa y defensas de pertenencia conservadas. |
| VALIDADO EN ENTORNO DE PRUEBAS | Sí, localmente: backend completo, H2/PostgreSQL, frontend y JaCoCo aprobados. El check de calidad global conserva el bloqueo PMD preexistente documentado. |
| DESPLEGADO | No. |
| CUENTAS HISTÓRICAS AUDITADAS | No en producción. Mecanismo de lectura creado y comprobado con fixtures. |
| CERRADO EN PRODUCCIÓN | No. Requiere despliegue, comprobación HTTP/PostgreSQL desplegada y auditoría histórica. |
