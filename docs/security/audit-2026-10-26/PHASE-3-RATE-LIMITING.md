# Fase 3 — Endpoints sensibles y rate limiting

**Estado: IMPLEMENTADA Y VALIDADA LOCALMENTE.** Sin despliegue ni migraciones productivas. Fase 1 conservada, MFA/TOTP pospuesto y Fase 4 no iniciada.

## Cambios

- `LoginRateLimiter`, `AuthFlowRateLimiter` e `InvitationAttemptFilter` reutilizan un contador común en PostgreSQL. No se introdujeron Redis, dependencias ni servicios nuevos.
- La admisión atómica usa una clave por hash y una ventana con vencimiento fijo, calculada con hora de la base. Las solicitudes rechazadas no prolongan ventanas. Los contadores se confirman en una transacción independiente, incluso si falla la operación protegida. No hay fallback permisivo ante fallos de almacenamiento.
- Login conserva pausa por fallos, acotada a un minuto y ligada a correo/origen, además del cupo previo por correo e IP. Las solicitudes ya en vuelo quedan limitadas por la admisión previa atómica. Un login correcto no restablece el presupuesto general. Correos inexistentes también ejecutan BCrypt; no se promete tiempo de respuesta absolutamente constante.
- Se limitan recuperación/reenvío, refresh por familia e IP, tokens públicos, bootstrap, cambio de contraseña, invitaciones y mutaciones administrativas. Las consultas y funciones normales mantienen su comportamiento. Los valores son configurables y amplios por IP para permitir usuarios con origen compartido.
- Los rechazos devuelven 429 con `Retry-After` en segundos. CORS expone esa cabecera al frontend. Si falla el almacenamiento del limitador, se rechaza la operación; no se emiten sesiones como alternativa.
- La IP se resuelve centralmente, sin confiar en cabeceras de clientes. Solo se interpreta una cadena reenviada desde un peer expresamente autorizado y de derecha a izquierda. Se limita tamaño/saltos y se rechazan hostnames o formatos inválidos. Un filtro separado conserva HTTPS/HSTS desde un terminador TLS autorizado sin reescribir la IP del peer.
- Recuperación/reenvío reservan el presupuesto y registran una solicitud sin consultar cuentas durante la respuesta pública. No se devuelven cursos ni se puede cambiar `organizationId` para eludir el límite. Los errores SMTP no cambian esa respuesta.
- Un worker persistente entrega el resumen multicurso al buzón registrado. Mantiene solicitudes tras fallos/reinicios, usa `FOR UPDATE SKIP LOCKED`, hace backoff y conserva fallos terminales para revisión con logs sin destinatarios ni enlaces. No almacena tokens en claro en la cola.
- El frontend deja de solicitar selección pública de curso en recuperación; conserva formulario, confirmación, errores y cuenta regresiva existentes. No se cambiaron CSS, assets ni diseño.

Los límites exactos, configuración, garantías de entrega y consultas operativas están en [la guía de operación](../RATE-LIMITING-OPERATIONS.md).

## Migración

Nueva **V56 `shared_security_limits_and_mail_requests`**: crea `security_rate_buckets`, índice de expiración, `security_mail_requests` e índice de pendientes. No modifica cuentas, roles, contraseñas, refresh ni permisos. La segunda tabla se agregó para cumplir el requisito de no perder mensajes silenciosamente al reiniciar; una tarea solo en memoria no lo cumpliría. No existe dependencia de infraestructura adicional.

Pruebas sobre PostgreSQL 16.14 aislado: esquema vacío, actualización V55→V56 con cuenta y familia refresh existentes, validación Flyway/Hibernate, idempotencia y dos arranques independientes. No se ejecutaron migraciones en una base persistente ni en producción.

## Archivos de esta fase

Rutas relativas a la raíz. No se incluyen cambios previos ajenos que ya existían en el árbol de trabajo.

| Área | Archivos nuevos o modificados |
| --- | --- |
| `backend/src/main/java/com/tesoreria/user/application/usecase/` | `AuthService.java`, `LoginRateLimiter.java`, `AuthFlowRateLimiter.java`, `AccountRecoveryService.java`, `RefreshTokenService.java`; nuevos `SharedSecurityLimiter.java`, `SecurityMailQueue.java` |
| `backend/src/main/java/com/tesoreria/user/config/security/` | `InvitationAttemptFilter.java`; nuevos `ClientIpResolver.java`, `TrustedProxyRequestFilter.java` |
| `backend/src/main/java/com/tesoreria/user/core/` | Nuevo `exception/SecurityLimitException.java`, nuevo `model/RecoveryLink.java`, `port/out/EmailOutPort.java` |
| `backend/src/main/java/com/tesoreria/user/infrastructure/adapter/in/web/` | `controller/AuthController.java`, `dto/auth/EmailRequestDTO.java` |
| `backend/src/main/java/com/tesoreria/user/infrastructure/adapter/out/` | `email/GmailEmailAdapter.java`, `email/EmailTemplates.java`; nuevas `persistence/entity/SecurityRateBucketEntity.java`, `persistence/entity/SecurityMailRequestEntity.java` |
| `backend/src/main/java/com/tesoreria/shared/infrastructure/` | `exception/GlobalExceptionHandler.java`, `config/CorsConfig.java` |
| Configuración/esquema | `.env.example`, `backend/src/main/resources/application.yml`, `application-prod.yml`, `application-test.yaml`, nueva migración V56 |
| `backend/src/test/java/user/` | Nuevos `Phase3PostgresSecurityTest.java`, `Phase3ForkedServer.java`, `ClientIpResolverTest.java`, `TrustedProxyRequestFilterTest.java`, `SecurityBudgetIsolationListener.java`; cambios en `AuthServiceTest.java`, `LoginRateLimiterTest.java`, `AuthFlowRateLimiterTest.java`, `AccountRecoveryServiceTest.java`, `GmailEmailAdapterTest.java`, `SA02InvitationIntegrationTest.java`, `SA02PostgresInvitationTest.java`, `PostgresInvitationIntegrationTest.java` |
| Otras pruebas backend | `academic/SchedulePostgresTest.java` actualiza esquema esperado; nuevo `backend/src/test/resources/META-INF/spring.factories` registra aislamiento de presupuestos entre pruebas |
| Frontend | `frontend/src/presentation/pages/auth/AccountFlowPages.tsx` y `AccountFlowPages.test.tsx` |
| Documentación | Este informe, `docs/security/RATE-LIMITING-OPERATIONS.md` y evidencias resumidas |

Los servicios de Fase 1 `UserService` y `OrganizationService` y sus reglas de autorización/bloqueo no se modificaron durante esta fase.

## Validación y rendimiento

La ejecución final de `gradlew check` aprobó **979 pruebas backend**, sin fallos ni omisiones, incluidas **221 pruebas con PostgreSQL real**. PMD y el umbral JaCoCo aprobaron. La suite nueva de Fase 3 tiene **20 pruebas PostgreSQL**; las protecciones SUPER_ADMIN conservan **40 pruebas PostgreSQL y 27 de integración H2 aprobadas**. La regresión completa también cubrió invitaciones, sesiones, refresh, contraseña, aislamiento y operaciones de tesorería existentes.

El frontend completo aprobó **859 pruebas en 124 archivos**, sin fallos. Lint y build aprobaron; se conserva el aviso preexistente de `lottie-web` sobre `eval`. `git diff --check` y la comprobación de espacios en archivos nuevos aprobaron. [Evidencia resumida de la ejecución final](evidence/phase-3-final-results.json).

Casos específicos verificados por las pruebas nuevas:

- Admisión concurrente desde dos contextos Spring independientes, servidores HTTP y pools distintos sobre la misma base: cupo exacto y expiración.
- Dos JVM separadas, cada una con un backend HTTP, para comprobar que la protección no depende de memoria compartida del proceso.
- 429 y `Retry-After`, cabeceras falsificadas, proxies autorizados/no autorizados, IPv4/IPv6 y conservación de HTTPS autorizado.
- Cincuenta usuarios legítimos entrando desde una IP compartida.
- Presupuesto de fallos compartido por correo/origen, sin extensión por intentos rechazados, y aislamiento entre orígenes.
- Recuperación uniforme de correo desconocido y multicurso, límite por hora, cambios de curso que no eluden límites y uso legítimo de enlaces recibidos.
- Fallo SMTP persistido, recuperación por otro worker, dos workers concurrentes y conservación de fallos terminales.
- Refresh rotado entre instancias: un 429 no consume el token y la rotación funciona tras expirar el límite.
- Mutaciones administrativas limitadas por identidad, consultas disponibles, tokens y bootstrap limitados.
- Indisponibilidad del contador compartido: 503 sin JWT ni cookies de sesión.
- Rollback de operación que no devuelve presupuesto; limpieza que no borra ventanas vivas.

Las latencias se miden en milisegundos dentro del servicio del contador, con PostgreSQL local y contenedores de prueba. Son muestras de 100 admisiones secuenciales y una carrera de 40 solicitudes; no son un benchmark de capacidad de producción ni incluyen el costo completo de login o SMTP.

| Prueba | Resultado final |
| --- | --- |
| Carrera de 40 solicitudes desde dos instancias, cupo 8 | 8 aceptadas y 32 rechazadas; p50 35 ms, p95 167 ms; cero deadlocks en la comprobación de la carrera |
| Dos procesos JVM separados, 20 solicitudes HTTP, cupo IP 4 | 4 admitidas para comprobar credenciales y 16 respuestas 429; cabeceras IP falsas no eludieron el límite |
| 100 admisiones secuenciales con contador caliente | p50 8 ms, p95 9 ms, máximo 10 ms |
| 50 usuarios distintos detrás de una IP | 50 inicios de sesión legítimos aceptados |
| V55→V56 y segundo arranque | Cuenta, contraseña y refresh existentes conservados; migración idempotente y esquema validado |

No hubo comunicaciones SMTP reales. El fallo y la recuperación del transporte, las entregas concurrentes, los reintentos y el estado terminal se probaron con el puerto de correo simulado y transacciones PostgreSQL reales.

Comandos reproducibles:

```powershell
cd backend
.\gradlew.bat check
cd ../frontend
pnpm test:run
pnpm lint
pnpm build
```

Los errores iniciales de validación se corrigieron sin reducir controles: adaptación de pruebas al envío diferido, espera explícita del cooldown para reenviar una invitación legítima, conservación de invitaciones independientes por curso, restubbing de un mock SMTP que lanzaba excepción y aislamiento del perfil `test` en la prueba multiproceso para no activar inicializadores exclusivos de desarrollo. No se modificaron esos inicializadores.

## Riesgos y condiciones antes de publicar

1. Verificar los peers/proxies reales y que sobrescriban cabeceras antes de configurar confianza. La topología remota no se inspeccionó; por defecto no se confía en ninguna cabecera IP.
2. Validar entrega/spam, remitente y cuotas con un buzón autorizado y configurar supervisión de cola pendiente/fallida y logs del worker. No se enviaron correos reales en estas pruebas.
3. La entrega SMTP es al menos una vez: un fallo entre aceptación SMTP y commit puede generar un reenvío y un enlace previo inválido. No se puede garantizar exactamente una entrega con SMTP y una transacción PostgreSQL sin un protocolo externo adicional. Se preserva la solicitud para reintentar.
4. Las solicitudes agotadas/antiguas requieren revisión del operador y se conservan como fallidas durante la retención documentada. El worker mantiene el lock de su fila durante SMTP; sus lotes/timeouts limitan el costo, pero no se ejecutó carga contra un proveedor real.
5. PostgreSQL es ahora una dependencia explícita de protección: una caída puede impedir operaciones sensibles. Es el comportamiento deliberado para evitar dejar endpoints sin límites. Las pruebas no certifican disponibilidad o capacidad del servicio productivo ni defensa contra DDoS distribuido.

No hay cambios remotos, Redis, MFA/TOTP nuevo ni trabajo de Fase 4.
