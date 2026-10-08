# Auditoría de seguridad — Treasury System

Fecha: **30 de septiembre de 2026**. Revisión base: **34e0fa6**, incluido el estado de trabajo existente. Alcance: frontend, backend, configuración, dependencias, persistencia, Docker y CI/CD del repositorio local.

**No se aplicaron correcciones ni refactors.** Este informe es la única escritura deliberada en documentación/código del proyecto durante la auditoría. Los comandos de diagnóstico regeneraron artefactos ignorados de Gradle; las pruebas adicionales se escribieron en el directorio temporal del sistema. No se imprimieron ni se incluyen secretos, tokens, contraseñas ni hashes de secretos.

La documentación de seguimiento está organizada por hallazgo en [docs/security](docs/security/README.md). Los informes de SA-01 están en [su carpeta](docs/security/sa-01/README.md).

## 1. Resumen ejecutivo

**Se confirmaron fallas importantes de aislamiento entre cursos, autorización y gestión de sesiones.** Las más urgentes son cachés compartidas entre organizaciones, registro público sin comprobación de pertenencia, identidad incorrecta en WebSocket y posibilidad de que el propio usuario revierta su bloqueo administrativo.

El informe contiene **27 hallazgos: 12 ALTA, 10 MEDIA, 4 BAJA y 1 INFORMATIVA**. Nueve hallazgos altos se reprodujeron con código real y datos ficticios. La exposición de una contraseña está confirmada, pero no se comprobó su vigencia ni su alcance productivo. SSRF y explotación de dependencias de transporte son riesgos probables. **No se confirmó una vulnerabilidad CRÍTICA explotable de la aplicación.** Los CVSS críticos del escáner no se trasladan automáticamente a la clasificación del proyecto.

La auditoría incluye verificación local, pero **no es un pentest completo de producción**: no se accedió a IAM, logs cloud, PostgreSQL productivo ni buckets reales. No se probaron credenciales encontradas, no se enviaron mensajes/correos reales ni se ejecutaron ataques de carga.

### Método y límites

- Inventario de **350 clases Java principales, 162 archivos TSX y 106 TS**, además de recursos, migraciones y workflows. Búsquedas transversales y lectura de los flujos de autenticación, autorización, organizaciones, pagos, notificaciones, archivos y cachés. No se afirma lectura exhaustiva línea por línea ni ausencia garantizada de otras fallas.
- Trazado endpoint → servicio → repositorio, incluidos DTO/mappings, Spring Security, filtros HTTP/STOMP y contexto tenant.
- Pruebas existentes y un harness temporal con Spring real, **H2 en memoria**, organizaciones/usuarios ficticios y servidor HTTP/WebSocket local. Correo sustituido por adaptador sin envío; GCS y Web Push deshabilitados. No se usaron datos reales.
- Prueba del interceptor Axios real con almacenamiento ficticio y adaptador sin red para verificar el orden de logout.
- Escaneo de patrones de secretos en archivos rastreados y comparación en memoria con los `.env` locales; búsqueda del historial accesible de rutas `.env`/claves. No se recorrieron todos los blobs históricos, ramas remotas o artefactos publicados.
- `pnpm audit`, `pnpm outdated`, OWASP Dependency-Check, inventario de `runtimeClasspath`, tests, Oxlint y PMD. Gitleaks, Semgrep y Trivy no estaban instalados; no se instalaron herramientas.

### Clasificaciones y prioridades

**Confirmada:** flujo alcanzable demostrado localmente o exposición inequívoca en código. **Riesgo probable:** falta ensayar una condición operativa/concurrente. **Mejora defensiva:** barrera adicional sin cadena explotable encontrada. **Falso positivo/no explotable en el flujo revisado:** el requisito del patrón/aviso no se cumple.

**P0:** resolver o contener antes del próximo despliegue. **P1:** siguiente fase inmediata de seguridad. **P2:** endurecimiento y automatización. **P3:** protección adicional/mantenimiento. Son recomendaciones, no correcciones autorizadas ni realizadas.

## 2. Arquitectura de seguridad detectada

Frontend React 19/Vite/TypeScript/Axios. Backend **Spring Boot 4.0.8**, Java 17, **Spring Security 7.0.7**, JPA/Hibernate, PostgreSQL en producción y H2 para pruebas. Módulos con puertos/adaptadores. Roles USER, ADMIN y SUPER_ADMIN; SUPER_ADMIN también obtiene ROLE_ADMIN.

| Área | Diseño observado |
|---|---|
| Login | BCrypt; selección de organización cuando varias cuentas comparten correo y contraseña válida; límite por correo. |
| JWT | HS256, firma verificada, `jti`, correo como subject, userId, organizationId, tokenFamilyId, emisión y expiración. Clave mínima de 32 bytes. |
| Duración | Access: 15 minutos por defecto; workflow configura 30 minutos. Refresh: 7 días por defecto y vencimiento renovado al rotar. No se observó máximo absoluto de familia. |
| Cliente | Access en memoria JS; usuario/perfil y CSRF en sessionStorage; preferencias y flag de logout en localStorage. Refresh en cookie HttpOnly. |
| Cookies | Refresh con ruta context-path + `/api/v1/auth`; CSRF legible con ruta `/`. Prod: Secure=true, SameSite=None por defecto. Dev: Secure=false, Lax. Cookies productivas no verificadas. |
| CSRF | API general usa Bearer. Refresh/logout exigen header/cookie coincidentes y hash CSRF ligado al refresh persistido. Existe compatibilidad para filas antiguas sin hash CSRF. |
| Refresh | 256 bits aleatorios, SHA-256 en DB, bloqueo pesimista, uso único, familia y gracia de reutilización de 10 segundos. Logout revoca familia persistida. |
| Revocación | HTTP verifica familia activa; revocación adicional de JWT/usuario en mapas locales. WebSocket aplica reglas diferentes. |
| Recuperación | Tokens hasheados; reset 60 minutos; verificación/invitación 24 horas; password actual para cambio y rechazo de reutilización inmediata de la misma contraseña. |
| Autorización | SecurityFilterChain, method security, denyAll final, roles y comprobaciones de pertenencia en servicios. |
| Tenants | `@TenantId`, organization_id inmutable, tenant derivado del principal; usuarios filtrados explícitamente. Sin contexto se usa organización por defecto. Cachés globales sin tenant. |
| Archivos | GCS con Application Default Credentials, allowlists/tamaño/magic bytes/nombres generados y descarga por backend. |
| Pagos | ADMIN revisa transferencias. Mercado Pago verifica HMAC, estado remoto, propietario, collector, monto, moneda y modo; bloqueo de obligación al registrar pago. |
| Infraestructura | Multi-stage Docker, backend no root, Cloud Run y WIF en CI. IAM, edge TLS, backups y políticas cloud fuera de verificación local. |

## 3. Hallazgos ordenados por severidad

| ID | Severidad | Confianza | Clasificación | Prioridad |
|---|---|---|---|---|
| SA-01 Caché sin tenant | ALTA | ALTA | Confirmada | P0 |
| SA-02 Registro sin pertenencia | ALTA | ALTA | Confirmada | P0 |
| SA-03 Identidad STOMP cruzada | ALTA | ALTA | Confirmada | P0 |
| SA-04 Autoactivación/desbloqueo | ALTA | ALTA | Confirmada | P0 |
| SA-05 Sesión de cuenta bloqueada | ALTA | ALTA | Confirmada | P0 |
| SA-06 Refresh tras cambio de contraseña | ALTA | ALTA | Confirmada | P0 |
| SA-07 Rollback de revocación por reutilización | ALTA | ALTA | Confirmada | P0 |
| SA-08 Destinos STOMP sin autorización | ALTA | ALTA | Confirmada | P0 |
| SA-09 WebSocket de familia cerrada | ALTA | ALTA | Confirmada | P0 |
| SA-10 Contraseña versionada | ALTA | ALTA | Exposición confirmada; alcance probable | P0/P1 |
| SA-11 SSRF Web Push | ALTA | MEDIA | Probable | P1 |
| SA-12 Tomcat afectado | ALTA | MEDIA | Dependencia confirmada; explotación probable | P1 |
| SA-13 Correo nuevo mantiene verificación | MEDIA | ALTA | Confirmada | P1 |
| SA-14 Rate limiting y memoria | MEDIA | ALTA | Probable | P1 |
| SA-15 Enumeración por recuperación | MEDIA | ALTA | Confirmada en flujo de código | P1 |
| SA-16 Datos excesivos en cumpleaños | MEDIA | ALTA | Confirmada | P1 |
| SA-17 Carrera aprobar/rechazar | MEDIA | MEDIA | Probable | P1 |
| SA-18 Carrera CSRF de logout | MEDIA | ALTA | Mecanismo confirmado; depende de dominios | P1 |
| SA-19 Dependencias frontend | MEDIA | ALTA | Versiones confirmadas; sin cadena explotable | P2 |
| SA-20 Headers de SPA | MEDIA | ALTA | Mejora defensiva | P2 |
| SA-21 Gates de seguridad CI | MEDIA | ALTA | Mejora defensiva | P2 |
| SA-22 Inyección de secretos runtime | MEDIA | ALTA | Probable según IAM | P2 |
| SA-23 Errores internos Jackson | BAJA | ALTA | Exposición técnica en código | P2 |
| SA-24 Replay de webhook | BAJA | ALTA | Mejora defensiva | P2 |
| SA-25 Endurecimiento operativo | BAJA | ALTA | Mejora defensiva | P2 |
| SA-26 Contenido de archivos | BAJA | ALTA | Mejora defensiva | P2 |
| SA-27 TOTP sin integración | INFORMATIVA | ALTA | Mejora defensiva | P3 |

Las rutas de archivo de cada hallazgo son relativas a la raíz; los números indican líneas del estado auditado.

### SA-01 — Cachés financieras compartidas entre organizaciones

**Severidad ALTA · Confianza ALTA · Confirmada por ejecución · P0.** Componente: tesorería/multitenancy.

**Archivos y líneas:** [TreasuryService.java](backend/src/main/java/com/tesoreria/treasury/application/usecase/TreasuryService.java):30, 64–74, 296–297, 484–485; [CacheConfig.java](backend/src/main/java/com/tesoreria/shared/infrastructure/cache/CacheConfig.java):21–44.

**Descripción:** las claves de caché son el año o `all`, y el CacheManager es global. Un acierto devuelve el valor antes de consultar los repositorios filtrados por tenant.

**Escenario:** A consulta configuración 2026; B consulta ese año en la misma instancia y recibe la configuración de A. Dashboard y aportes utilizan el mismo patrón.

**Impacto:** exposición de configuración/resúmenes financieros y respuestas inconsistentes de pagos entre cursos. No se demostró escribir registros de A desde B.

**Evidencia:** dos configuraciones diferentes en H2; `getConfig` devolvió el mismo ID en A y B, mientras la consulta directa de B devolvió otro. El proxy de caché elude el aislamiento de Hibernate.

**Recomendación:** incluir organizationId y año en todas las claves e invalidaciones, también listados. Probar ambas direcciones y operaciones de pago con caché caliente.

#### Seguimiento de remediación de SA-01 — 30/09/2026

**Estado: implementada y verificada localmente; no desplegada.** Este seguimiento actualiza exclusivamente SA-01. Las secciones originales conservan la evidencia del estado auditado.

- Cachés cubiertas: `annualFeeConfigurations`, `annualFeeConfigurationByYear`, `contributionConfigurations`, `treasuryDashboardOverview` y `contributionSummary`. El resumen se cachea en `TreasuryController`; sus invalidaciones incluyen `FamiliaService`.
- Las claves son objetos inmutables con `organizationId` explícito y `year`; el listado anual usa una clave por organización sin año. La identidad se obtiene del mismo resolver que Hibernate, pero queda materializada en la clave antes de acceder a CacheManager.
- Se eliminaron claves globales y todas las invalidaciones `allEntries` de estos flujos. Las invalidaciones por año usan la misma clave que la lectura; las que antes borraban todo ahora capturan una organización y eliminan solo sus claves, para todos sus años. La captura permite respetar el tenant incluso en un callback posterior de commit.
- Se mantuvieron contratos HTTP, reglas financieras, TTL, capacidad y proxy transaccional existentes. La instrumentación de dashboard consulta las nuevas claves para medir correctamente caché caliente.

**Archivos de implementación:** `TreasuryService.java`, `TreasuryController.java`, `FamiliaService.java`, `CacheConfig.java`, `DashboardPerformanceProbe.java`; nuevos `TenantCacheKeys.java` y `TenantCaffeineCache.java`, en sus módulos existentes bajo `backend/src/main/java`.

**Pruebas:** se ajustó la configuración Spring de `TreasuryCacheIntegrationTest` (3 pruebas existentes). Se añadieron `TreasuryTenantCacheIntegrationTest` (10 casos, Spring/Caffeine reales y repositorios con datos sintéticos por tenant) y `TreasuryTenantCachePersistenceTest` (2 casos, Hibernate/H2 y transacciones reales, incluida cantidad distinta de familias en el resumen).

Las 15 pruebas de caché pasan. Cubren ambos órdenes de calentamiento A/B, las cinco cachés calientes, invalidaciones de cada organización sin perder la entrada de la otra, todos los años de invalidaciones amplias, commit diferido con identidad capturada, rollback y comprobación de todas las anotaciones de lectura/invalidación.

**Regresión final:** `gradlew.bat --offline test --tests 'treasury.*' --tests 'familia.*' --tests 'com.tesoreria.organization.TenantIsolationIntegrationTest' --tests 'com.tesoreria.treasury.*' --no-daemon`: **131 tests, 0 fallos, 0 errores, 0 omitidos**. Compilación aprobada; `git diff --check` aprobado.

**Gates globales:** se intentó `gradlew.bat --offline check --continue --no-daemon`: 401 tests ejecutados, 400 aprobados; falló únicamente la inicialización de `PostgresPerformanceQueryIntegrationTest` por Docker no disponible. PMD volvió a su resultado previo de 20 observaciones tras corregir tres observaciones de nombres introducidas inicialmente en las nuevas constantes. No se suprimieron reglas ni se cambiaron tests ajenos. El `check` global no está aprobado y la cobertura global no quedó validada por ese comando.

**Riesgos residuales/límites:** falta repetir validación con PostgreSQL en un entorno con Docker y comprobar el despliegue real. Caffeine sigue siendo local a cada instancia; la propagación de cambios entre instancias mantiene el comportamiento existente de TTL, sin introducir lectura cruzada por organización. Los límites de capacidad son compartidos y pueden causar desalojos normales por presión de memoria, distintos de las invalidaciones funcionales ahora aisladas. El resolver conserva su fallback existente de organización por defecto cuando no hay principal tenant: esta remediación no modifica autenticación ni los otros hallazgos.

### SA-02 — Registro público concede acceso sin comprobar pertenencia al curso

**Severidad ALTA · Confianza ALTA · Confirmada por HTTP local · P0.** Componente: registro/autorización.

**Archivos y líneas:** [AuthController.java](backend/src/main/java/com/tesoreria/user/infrastructure/adapter/in/web/controller/AuthController.java):153–172, 210–219; [AccountRecoveryService.java](backend/src/main/java/com/tesoreria/user/application/usecase/AccountRecoveryService.java):91–115, 136–146; [OrganizationController.java](backend/src/main/java/com/tesoreria/organization/infrastructure/web/OrganizationController.java):32–40; [SecurityConfig.java](backend/src/main/java/com/tesoreria/user/config/security/SecurityConfig.java):68–85, 107–108.

**Descripción:** cualquier solicitante selecciona un curso activo. Verificar su correo activa USER sin invitación, aprobación ni vínculo a un apoderado. La lista de cursos es pública.

**Escenario:** un externo registra su correo en un curso, verifica el enlace y consulta cumpleaños/galería/lecturas financieras permitidas a USER.

**Impacto:** acceso horizontal a información escolar y financiera por autoinscripción. `ownFamily` protege mis-pagos, pero no estas otras lecturas.

**Evidencia:** HTTP con correo ficticio y adaptador sin envío: registro 201, verificación 200, cumpleaños 200 y observación ficticia de un alumno en la respuesta; no existía familia asociada al externo.

**Recomendación:** exigir invitación ligada a curso y apoderado o aprobación administrativa antes de conceder acceso; separar cuenta pendiente de miembro autorizado.

### SA-03 — WebSocket identifica al usuario de otra organización con el mismo correo

**Severidad ALTA · Confianza ALTA · Confirmada por ejecución · P0.** Componente: identidad/privilegios de mensajería.

**Archivos y líneas:** [WebSocketAuthInterceptor.java](backend/src/main/java/com/tesoreria/notification/config/WebSocketAuthInterceptor.java):32–46; [JpaUserRepositoryAdapter.java](backend/src/main/java/com/tesoreria/user/infrastructure/adapter/out/persistence/adapter/JpaUserRepositoryAdapter.java):61–62; [NotificationRealtimePublisher.java](backend/src/main/java/com/tesoreria/notification/infrastructure/web/NotificationRealtimePublisher.java):19–32, 36–58; [V43](backend/src/main/resources/db/migration/V43__scope_users_email_by_organization.sql):1–31.

**Descripción:** CONNECT ignora userId del JWT y carga la primera cuenta con ese correo. La base permite repetir correos entre organizaciones. Las colas de usuario también se dirigen por correo, sin ID/tenant.

**Escenario:** USER en B comparte correo con ADMIN más antiguo en A; su JWT de B crea principal de A con ROLE_ADMIN. Las sesiones homónimas comparten enrutamiento de eventos.

**Impacto:** confusión de identidad, mensajes y privilegios entre cursos. No produce un JWT ADMIN para HTTP: el filtro HTTP sí carga por userId.

**Evidencia:** token de B produjo ID de A y ROLE_ADMIN en el interceptor real. El adaptador selecciona por ID ascendente y los publishers usan correo.

**Recomendación:** autenticar por userId y validar tenant; usar un nombre de principal STOMP único y estable basado en ID/tenant en publishers y consumidores.

### SA-04 — El usuario puede reactivar y desbloquear su propia cuenta

**Actualización 2026-10-08:** remediado en código, validado localmente y desplegado en backend y frontend; 10/10 comprobaciones Bruno productivas aprobadas. Cierre completo pendiente de las verificaciones restantes descritas en la [evidencia productiva](docs/security/sa-04/SA04_PRODUCTION_CHECK.md). Ver [corrección y pruebas de SA-04](docs/security/sa-04/SA-04-CIERRE.md). La descripción siguiente conserva el hallazgo original de la auditoría.

**Severidad ALTA · Confianza ALTA · Confirmada por HTTP local · P0.** Componente: usuarios/mass assignment.

**Archivos y líneas:** [UserController.java](backend/src/main/java/com/tesoreria/user/infrastructure/adapter/in/web/controller/UserController.java):96–105; [UserRequestDTO.java](backend/src/main/java/com/tesoreria/user/infrastructure/adapter/in/web/dto/UserRequestDTO.java):29–35; [UserService.java](backend/src/main/java/com/tesoreria/user/application/usecase/UserService.java):129–144.

**Descripción:** PUT del perfil propio acepta enabled/accountNonLocked y los guarda sin comprobar el rol. isSelf limita el objeto, pero no los campos.

**Escenario:** tras un bloqueo administrativo, con un JWT aún aceptado por SA-05, el usuario pone ambos estados en true.

**Impacto:** evasión del bloqueo y persistencia de acceso.

**Evidencia:** cuenta ficticia desactivada/bloqueada; PUT devolvió 200 y ambos estados quedaron true en H2. El servicio no limita campos según authenticatedEmail.

**Recomendación:** separar DTO/operación de perfil propio de administración de cuentas; reservar cambios de estados a administradores autorizados.

### SA-05 — JWT y refresh admiten cuentas desactivadas o bloqueadas

**Actualización 2026-10-08:** remediado, validado localmente y desplegado en backend desde 902c3aa: estados actuales comprobados en emisión/rotación, revocación persistida al bloquear/desactivar y familia ligada al propietario. 642 tests backend y 431 frontend aprobados; 14/14 Bruno productivos verifican bloqueo, refresh y sesiones anteriores inválidas tras desbloquear. Desactivación y aislamiento con ADMIN ordinario siguen pendientes de comprobación productiva. Ver [corrección y validación de SA-05](docs/security/sa-05/SA-05-CIERRE.md) y [evidencia productiva](docs/security/sa-05/SA05_PRODUCTION_CHECK.md). La descripción siguiente conserva el hallazgo original.

**Severidad ALTA · Confianza ALTA · Confirmada por ejecución · P0.** Componente: autenticación HTTP/renovación.

**Archivos y líneas:** [JwtService.java](backend/src/main/java/com/tesoreria/user/config/security/JwtService.java):95–102; [JwtAuthenticationFilter.java](backend/src/main/java/com/tesoreria/user/config/security/JwtAuthenticationFilter.java):78–91; [RefreshTokenService.java](backend/src/main/java/com/tesoreria/user/application/usecase/RefreshTokenService.java):75–114; [CustomUserDetailsService.java](backend/src/main/java/com/tesoreria/user/application/usecase/CustomUserDetailsService.java):48–60.

**Descripción:** JWT valida nombre, organización activa y expiración, pero no isEnabled/isAccountNonLocked. El filtro construye Authentication directamente. La emisión por refresh tampoco rechaza esos estados.

**Escenario:** el administrador bloquea una cuenta que ya tiene sesión; esta sigue usando access y renovando refresh.

**Impacto:** acceso tras bloqueo, incluso después del vencimiento del access original. Una organización desactivada sí se rechaza por HTTP.

**Evidencia:** detalles disabled/locked, JWT válido y nuevo access por refresh; SA-04 también reprodujo HTTP de una cuenta bloqueada.

**Recomendación:** comprobar todos los estados de cuenta en validación/renovación y revocar familias al bloquear/desactivar; validar coherencia de usuario/tenant/familia.

### SA-06 — Cambiar o recuperar contraseña no revoca refresh tokens

**Severidad ALTA · Confianza ALTA · Confirmada por ejecución · P0.** Componente: recuperación/revocación.

**Archivos y líneas:** [AccountRecoveryService.java](backend/src/main/java/com/tesoreria/user/application/usecase/AccountRecoveryService.java):197–251; [TokenRevocationService.java](backend/src/main/java/com/tesoreria/user/config/security/TokenRevocationService.java):11–12, 31–37; [RefreshTokenService.java](backend/src/main/java/com/tesoreria/user/application/usecase/RefreshTokenService.java):93–114.

**Descripción:** cambiar/resetear password deja filas REFRESH_TOKEN activas. Solo se marca revocación de access por fecha en un mapa local. Renovar después emite un JWT posterior a esa marca.

**Escenario:** una sesión comprometida conserva refresh y CSRF; la víctima cambia password y el atacante renueva sin conocer la nueva.

**Impacto:** persistencia de sesiones comprometidas. Los mapas no se comparten entre instancias ni sobreviven reinicios. La clave por correo también afecta temporalmente cuentas homónimas de otros cursos.

**Evidencia:** se cambió password a través del servicio Spring real y el refresh anterior obtuvo un JWT posterior a la marca de revocación. Reset comparte la omisión, comprobada en código.

**Recomendación:** revocar persistentemente todas las familias por userId de forma atómica en cambio/reset; usar versión de sesión/marca persistida y compartida entre instancias.

### SA-07 — La revocación por reutilización de refresh se deshace por rollback

**Severidad ALTA · Confianza ALTA · Confirmada con transacción real · P0.** Componente: rotación.

**Archivos y líneas:** [RefreshTokenService.java](backend/src/main/java/com/tesoreria/user/application/usecase/RefreshTokenService.java):93–105, 169–176; [UserTokenJpaRepository.java](backend/src/main/java/com/tesoreria/user/infrastructure/adapter/out/persistence/repository/UserTokenJpaRepository.java):27–36; [DomainException.java](backend/src/main/java/com/tesoreria/shared/domain/exception/DomainException.java):5–6.

**Descripción:** rotate ejecuta revokeFamily y después lanza DomainException unchecked dentro de la misma transacción; la revocación se revierte.

**Escenario:** pasado el margen de gracia se reutiliza refresh antiguo con su CSRF; el request falla, pero la familia y el refresh nuevo permanecen activos.

**Impacto:** la detección no contiene la sesión comprometida. El token antiguo sí se rechaza: falla la revocación de familia, no el uso único.

**Evidencia:** bean transaccional real en H2, usedAt 30 segundos atrás: reutilización rechazada y familia activa tras la excepción. Mockito no comprueba commit/rollback.

**Recomendación:** confirmar la revocación en transacción independiente o rediseñar el resultado para persistir antes del rechazo; test de integración que inspeccione DB tras la excepción.

### SA-08 — SEND/SUBSCRIBE permiten destinos arbitrarios del broker STOMP

**Severidad ALTA · Confianza ALTA · Confirmada por WebSocket local · P0.** Componente: autorización de mensajes.

**Archivos y líneas:** [WebSocketConfig.java](backend/src/main/java/com/tesoreria/notification/config/WebSocketConfig.java):32–41; [WebSocketAuthInterceptor.java](backend/src/main/java/com/tesoreria/notification/config/WebSocketAuthInterceptor.java):32–33.

**Descripción:** solo se inspecciona CONNECT. No existe política de autorización de SEND/SUBSCRIBE ni reserva de `/queue` al servidor.

**Escenario:** una sesión envía directamente a `/queue/...` sin pasar por NotificationService y sus controles de participantes.

**Impacto:** inyección de eventos y evasión del flujo de mensajería. Leer/falsificar una cola privada concreta requiere conocer su destino físico; no se ensayó lectura de víctimas.

**Evidencia:** WebSocket local recibió MESSAGE generado mediante SEND al destino ficticio `/queue/security-audit-only` tras SUBSCRIBE al mismo destino.

**Recomendación:** autorizar tipos/destinos, permitir SEND solo a handlers `/app` autorizados y SUBSCRIBE solo a colas propias `/user`; denegar destinos físicos y lo no permitido.

### SA-09 — WebSocket acepta tokens de familias cerradas y no revalida

**Severidad ALTA · Confianza ALTA · Confirmada por WebSocket local · P0.** Componente: logout/ciclo de vida STOMP.

**Archivos y líneas:** [WebSocketAuthInterceptor.java](backend/src/main/java/com/tesoreria/notification/config/WebSocketAuthInterceptor.java):32–46; [JwtAuthenticationFilter.java](backend/src/main/java/com/tesoreria/user/config/security/JwtAuthenticationFilter.java):67–77.

**Descripción:** HTTP verifica familia activa; STOMP no. Expiración/revocación se revisan solo al conectar, sin política de cierre de conexiones existentes.

**Escenario:** se revoca correctamente una familia y se conecta /ws con su access, no revocado individualmente en el mapa local. Una conexión previa puede permanecer tras logout/expiración.

**Impacto:** sesión de mensajería después de cerrar la sesión persistente. Reconexión reproducida; duración de conexiones abiertas queda como prueba adicional.

**Evidencia:** familia inactiva en DB y respuesta CONNECTED usando su JWT. Se ejercitó revocación de familia sin revocar individualmente el access: esa revocación debería bastar para todos los transportes.

**Recomendación:** política compartida HTTP/STOMP, comprobación de familia en CONNECT y cierre/revalidación de conexiones al revocar/expirar/cambiar estados.

### SA-10 — Contraseña versionada coincide con credencial local

**Severidad ALTA · Confianza ALTA · Exposición confirmada; vigencia/alcance probable · P0 para verificar/contener; P1 para sanear.** Componente: secretos/colección API.

**Archivos y líneas:** [Login Admin](api-tests/user/01-Login%20Admin.yml):23; `frontend/.env`:6.

**Descripción:** una contraseña de la colección de login de administrador coincide exactamente con PERF_PASSWORD local. Se comparó en memoria y no se muestra el valor.

**Escenario:** quien tiene acceso al repositorio intenta esa contraseña en la cuenta o entornos donde se haya reutilizado.

**Impacto:** exposición de una contraseña utilizada por configuración local. No se comprobó cuenta activa, rol productivo ni credencial vigente.

**Evidencia:** comparación de valores de `.env` con archivos rastreados: coincidencia exacta en la línea indicada. `.env` ignorado no evita la exposición en una colección versionada.

**Recomendación:** confirmar alcance con propietario sin copiar el valor, rotar donde siga vigente, parametrizar colección y revisar historial con escáner de secretos; borrar solo la línea actual no basta.

### SA-11 — Destinos HTTPS arbitrarios en Web Push

**Severidad ALTA · Confianza MEDIA · Riesgo probable; no se ejecutó SSRF · P1.** Componente: Web Push/egress.

**Archivos y líneas:** [WebPushSubscriptionService.java](backend/src/main/java/com/tesoreria/notification/application/WebPushSubscriptionService.java):38–53, 63–72; [WebPushSender.java](backend/src/main/java/com/tesoreria/notification/infrastructure/push/WebPushSender.java):34–38; [NotificationPushPublisher.java](backend/src/main/java/com/tesoreria/notification/infrastructure/push/NotificationPushPublisher.java):44–68.

**Descripción:** solo se exige esquema HTTPS y host; no hay allowlist de proveedor, puerto, IP privada, resolución DNS o redirección. El endpoint persistido llega al cliente HTTP cuando hay una notificación.

**Escenario:** suscripción con claves sintácticamente válidas y endpoint controlado/interno; un evento dirigido al usuario provoca un POST del servidor.

**Impacto:** solicitudes desde infraestructura, sondeo HTTPS y consumo de recursos. No se demostró lectura de respuestas ni robo de credenciales; HTTP simple/metadata HTTP no es alcanzable por esta validación.

**Evidencia:** flujo subscribe → DB → PushRequestedEvent → publisher → sender. Workflow habilita push. Alcance depende de claves, egress y tenant en tareas asíncronas.

**Recomendación:** allowlist de proveedores admitidos y políticas de puerto/IP/DNS/redirección/egress; verificar con receptor propio en staging, no servicios ajenos.

### SA-12 — Tomcat runtime afectado por avisos de seguridad

**Severidad ALTA · Confianza MEDIA · Versión afectada confirmada; explotación probable · P1.** Componente: servidor/dependencias backend.

**Archivos y líneas:** [build.gradle](backend/build.gradle):3, 33–37; [WebSocketConfig.java](backend/src/main/java/com/tesoreria/notification/config/WebSocketConfig.java):37–38.

**Descripción:** runtime resuelve Tomcat core/websocket 11.0.24; avisos posteriores cubren esa versión, incluidos DoS WebSocket. Handshake /ws público.

**Escenario:** cliente remoto envía secuencias de transporte que disparen esos defectos; no se realizaron cargas para agotar/tumbar el servidor.

**Impacto:** riesgo de disponibilidad. Avisos críticos de DIGEST/FORM/Realm no demuestran bypass del JWT propio.

**Evidencia:** Dependency-Check y runtimeClasspath confirman versión. La página oficial incluye CVE-2026-77791 y CVE-2026-79677, corregidos en 11.0.26; no aparecieron en la lista principal del escáner.

**Recomendación:** actualizar mediante BOM compatible de Spring Boot con Tomcat corregido, verificar al menos 11.0.26 a esta fecha y repetir HTTP/STOMP; contextualizar cada aviso.

### SA-13 — Cambio de correo conserva la verificación anterior

**Severidad MEDIA · Confianza ALTA · Confirmada · P1.** Componente: perfil e identidad.

**Archivos y líneas:** [UserService.java](backend/src/main/java/com/tesoreria/user/application/usecase/UserService.java):131–144; mapper de usuario:23–36; [TransferPaymentService.java](backend/src/main/java/com/tesoreria/treasury/application/usecase/TransferPaymentService.java):300–312, bajo `backend/src/main/java`.

**Descripción y evidencia:** la actualización modifica correo sin limpiar `emailVerifiedAt` ni verificar el nuevo buzón. La prueba HTTP confirmó que el nuevo correo conserva la marca de verificación. La vinculación familiar de pagos consulta por correo.

**Escenario:** usuario cambia su correo a otro buzón y mantiene identidad aparentemente verificada. El acceso a una familia ajena dependería de que el correo coincida con un apoderado sin cuenta conflictiva; esa consecuencia requiere prueba adicional.

**Impacto:** integridad de identidad y posible vinculación familiar indebida. **Recomendación:** flujo separado de cambio de correo con reautenticación, verificación del nuevo buzón y revisión de asociaciones familiares. **Prioridad:** P1, junto con SA-02 y SA-04.

### SA-14 — Límites de autenticación insuficientes y almacenamiento sin acotación

**Severidad MEDIA · Confianza ALTA · Riesgo probable · P1.** Componente: protección contra abuso.

**Archivos y líneas:** [LoginRateLimiter.java](backend/src/main/java/com/tesoreria/user/application/usecase/LoginRateLimiter.java):17–65; [AuthFlowRateLimiter.java](backend/src/main/java/com/tesoreria/user/application/usecase/AuthFlowRateLimiter.java):15–31; [RegistrationRateLimiter.java](backend/src/main/java/com/tesoreria/user/application/usecase/RegistrationRateLimiter.java):14–35; [AccountRecoveryService.java](backend/src/main/java/com/tesoreria/user/application/usecase/AccountRecoveryService.java):177–187.

**Descripción y evidencia:** límites locales por identificador y mapas sin limpieza/acotación general. El login permite tres fallos antes de una restricción de un minuto; no se encontró una defensa global/distribuida contra credential stuffing. La rama de selección de curso de recuperación precede al límite.

**Escenario:** distribuir intentos entre correos e instancias; generar muchos identificadores para aumentar el estado residente. **Impacto:** ataques de credenciales y presión de memoria. No se ejecutó carga de denegación de servicio.

**Recomendación:** límites por cuenta e IP con TTL y capacidad máxima, coordinación entre instancias, límites globales y tratamiento uniforme de ramas. El uso de X-Forwarded-For en logging no se considera aquí un bypass confirmado. **Prioridad:** P1.

### SA-15 — Recuperación permite enumerar cuentas y organizaciones

**Severidad MEDIA · Confianza ALTA · Confirmada en código · P1.** Componente: recuperación/registro.

**Archivos y líneas:** [AccountRecoveryService.java](backend/src/main/java/com/tesoreria/user/application/usecase/AccountRecoveryService.java):177–187; [AuthController.java](backend/src/main/java/com/tesoreria/user/infrastructure/adapter/in/web/controller/AuthController.java):221–229; registro público y manejo de duplicados.

**Descripción y evidencia:** cuenta inexistente devuelve una estructura distinta de una cuenta presente en varios cursos, que recibe `requiresSelection` y opciones con identificadores/nombres. Registro duplicado también tiene respuesta diferenciada.

**Escenario:** consultar una lista de correos para reconocer cuentas y pertenencia a cursos sin contraseña. **Impacto:** privacidad y preparación de ataques dirigidos.

**Recomendación:** respuesta externa uniforme; entregar selección de organización mediante enlace verificado o después de demostrar control del buzón; limitar todas las ramas. La selección del login que exige contraseña no se clasifica como este hallazgo. **Prioridad:** P1.

### SA-16 — Cumpleaños expone el DTO completo del alumno

**Severidad MEDIA · Confianza ALTA · Confirmada · P1.** Componente: API de alumnos/dashboard.

**Archivos y líneas:** [AlumnoController.java](backend/src/main/java/com/tesoreria/alumno/infrastructure/adapter/in/web/controller/AlumnoController.java):61–66; mapper de alumnos:12–25; DTO de respuesta:9–24.

**Descripción y evidencia:** el endpoint devuelve también observación, fecha de nacimiento completa, género, identificadores y metadatos. Una cuenta sintética recién registrada recibió una observación privada sintética en la prueba HTTP.

**Escenario:** cualquier USER autorizado al endpoint obtiene datos no necesarios para una tarjeta de cumpleaños; SA-02 amplía quién puede alcanzar ese permiso. **Impacto:** exposición de información de menores, cuya sensibilidad concreta depende del contenido real de observaciones.

**Recomendación:** DTO específico y mínimo, política explícita sobre fecha/edad y permisos independientes para observaciones. **Prioridad:** P1.

### SA-17 — Aprobación y rechazo de transferencia pueden competir

**Severidad MEDIA · Confianza MEDIA · Riesgo probable · P1.** Componente: integridad financiera.

**Archivos y líneas:** [TransferPaymentService.java](backend/src/main/java/com/tesoreria/treasury/application/usecase/TransferPaymentService.java):242–266; [TreasuryService.java](backend/src/main/java/com/tesoreria/treasury/application/usecase/TreasuryService.java):222–250.

**Descripción y evidencia:** aprobación/rechazo no comparten un bloqueo o control de versión sobre la transferencia. El registro de pago sí bloquea la obligación y comprueba actividad, por lo que no se afirma un doble cobro confirmado.

**Escenario:** dos administradores aprueban y rechazan simultáneamente; el rechazo podría restablecer una obligación a pendiente después de registrarse el pago. **Impacto:** estados financieros contradictorios y conciliación incorrecta. No se reprodujo la carrera con PostgreSQL.

**Recomendación:** transición atómica bajo bloqueo consistente de transferencia y obligación, versión/estado esperado e idempotencia. **Prioridad:** P1; verificar intercalaciones antes de elegir la corrección.

### SA-18 — Logout puede perder el encabezado CSRF antes de enviar la solicitud

**Severidad MEDIA · Confianza ALTA · Confirmada en ejecución del cliente; despliegue condicionado · P1.** Componente: frontend/sesiones.

**Archivos y líneas:** [AuthContext.tsx](frontend/src/presentation/context/AuthContext.tsx):118–127, 256–263; repositorio de autenticación:31–38; [axiosInterceptor.ts](frontend/src/core/D-config/axiosInterceptor.ts):35–40, 94–105, bajo `frontend/src`.

**Descripción y evidencia:** logout lanza la solicitud y limpia inmediatamente el estado, incluido el token CSRF. El interceptor asíncrono lo lee después. Un arnés con el interceptor real y adaptador sin red confirmó ausencia del encabezado cuando `document.cookie` no ofrece el token.

**Escenario:** frontend y backend en orígenes donde el frontend no puede leer la cookie del backend: logout recibe 403 y el error se omite, aunque la interfaz parezca desconectada. **Impacto:** refresh/familia permanecen activos hasta su expiración u otra revocación.

**Recomendación:** capturar CSRF antes de limpiar, esperar/gestionar resultado del logout y garantizar revocación del lado servidor. Verificar dominios reales y atributos de cookie. **Prioridad:** P1.

### SA-19 — Dependencias frontend con avisos pendientes

**Severidad MEDIA · Confianza ALTA sobre versiones; MEDIA sobre explotabilidad · Riesgo contextual · P1.** Componente: dependencias cliente/desarrollo.

**Archivos:** `frontend/package.json`, `frontend/pnpm-lock.yaml`.

**Descripción y evidencia:** `pnpm audit` detectó 23 avisos: 12 en axios 1.19.0 y 11 en undici 8.10.0. Undici llega por jsdom de desarrollo; avisos de adaptadores Node de axios no implican SSRF del navegador. No se encontró una cadena propia de contaminación de prototipos que pruebe todos los avisos.

**Escenario e impacto:** condicionado al adaptador y a entradas que alcancen la función vulnerable; riesgo de entorno de tests o de funcionalidades específicas del cliente. **Recomendación:** actualizar axios a versión corregida y resolver undici mediante actualización compatible del árbol de desarrollo; repetir auditoría/tests. No usar la severidad del escáner como prueba de explotación. **Prioridad:** P1/P2 según alcance.

### SA-20 — SPA sin política explícita de seguridad de contenido

**Severidad MEDIA · Confianza ALTA · Mejora defensiva · P2.** Componente: nginx/frontend.

**Archivos y líneas:** `frontend/nginx.conf`:1–22; [SecurityConfig.java](backend/src/main/java/com/tesoreria/user/config/security/SecurityConfig.java):124–132; configuración Vite.

**Descripción y evidencia:** nginx configura caché, pero no una CSP ni el conjunto de headers defensivos para el documento SPA. Los headers de Spring no protegen automáticamente respuestas servidas por nginx.

**Escenario:** una futura inyección o recurso comprometido tendría menos barreras de ejecución. **Impacto:** aumento del impacto de XSS; no se confirmó XSS propio.

**Recomendación:** CSP inicialmente en modo report-only, política de frames, nosniff, referrer y permisos; verificar compatibilidad con handlers inline generados en build y HTTPS del borde. **Prioridad:** P2.

### SA-21 — CI/CD no exige auditoría de dependencias para publicar

**Severidad MEDIA · Confianza ALTA · Mejora defensiva · P2.** Componente: cadena de entrega.

**Archivos y líneas:** workflows frontend:56–68; backend:45–52; despliegue:19–29, 47–74, bajo `.github/workflows`; `backend/build.gradle`.

**Descripción y evidencia:** no se observó un gate de auditoría en los flujos revisados. `check` no incluye Dependency-Check; la imagen backend se construye omitiendo tests. Las acciones usan etiquetas mutables y no SHA. No se verificaron reglas de protección de ramas externas.

**Escenario:** un commit o actualización vulnerable alcanza publicación sin ese control; un tag externo alterado modifica comportamiento de CI. **Impacto:** riesgo de suministro y despliegue.

**Recomendación:** publicar el mismo artefacto/ref validado, incluir auditorías contextualizadas y política de excepciones, fijar acciones por SHA y verificar protección de ramas/permisos. **Prioridad:** P2.

### SA-22 — Secretos de despliegue se inyectan como variables literales

**Severidad MEDIA · Confianza ALTA sobre configuración; MEDIA sobre exposición · Riesgo probable · P2.** Componente: Cloud Run/CI.

**Archivos y líneas:** workflow de despliegue bajo `.github/workflows`:76–104.

**Descripción y evidencia:** valores de GitHub Secrets se pasan mediante `env_vars` al servicio, en lugar de referencias a Secret Manager. No se constató lectura pública de esos valores ni permisos IAM reales.

**Escenario:** un principal con capacidad de consultar configuración de revisiones puede acceder a material sensible según permisos efectivos. **Impacto:** mayor superficie de acceso y rotación más difícil.

**Recomendación:** referencias de secretos administrados, identidad de servicio mínima y revisión de IAM de configuración/secretos. La federación WIF ya evita una llave JSON persistente de CI. **Prioridad:** P2.

### SA-23 — Errores de deserialización revelan detalles e input

**Severidad BAJA · Confianza ALTA · Confirmada en código · P2.** Componente: respuestas de error.

**Archivos y líneas:** [GlobalExceptionHandler.java](backend/src/main/java/com/tesoreria/shared/infrastructure/exception/GlobalExceptionHandler.java):60–79.

**Descripción y evidencia:** se usa `getOriginalMessage()` de Jackson en respuestas de errores de formato. **Escenario:** enviar valores incompatibles para obtener información técnica y parte del dato recibido. **Impacto:** exposición de implementación; no se demostró stack trace completo ni secretos.

**Recomendación:** mensajes externos estables por campo/código y diagnóstico interno redactado. **Prioridad:** P2.

### SA-24 — Firma del webhook sin ventana temporal explícita

**Severidad BAJA · Confianza ALTA · Mejora defensiva · P2.** Componente: Mercado Pago.

**Archivos y líneas:** controlador webhook:48–67; [MercadoPagoService.java](backend/src/main/java/com/tesoreria/treasury/application/usecase/MercadoPagoService.java):103–130.

**Descripción y evidencia:** valida firma y formato numérico de timestamp, pero no antigüedad ni deduplicación del evento firmado. Consulta el pago remoto y valida sus datos; existen controles de idempotencia.

**Escenario:** repetir una solicitud válida capturada provoca procesamiento/consultas repetidos. **Impacto:** consumo de recursos; no se confirma pago falso o doble cobro.

**Recomendación:** ventana compatible con reintentos legítimos, deduplicación durable e idempotencia de extremo a extremo. **Prioridad:** P2.

### SA-25 — Defaults y endurecimiento de producción requieren control operativo

**Severidad BAJA · Confianza ALTA · Mejora defensiva · P2.** Componente: perfiles, DB y contenedores.

**Archivos y líneas:** [application.yml](backend/src/main/resources/application.yml):8–9, 42–52; configuración dev:15–34; prod:22–38; compose:7–18, 34–45; `frontend/Dockerfile`:16–22.

**Descripción y evidencia:** perfil por defecto dev con fallback de clave JWT y bootstrap local; producción exige secretos y usa validación de esquema. TLS DB exige cifrado con `require`, sin verificación completa del hostname. nginx conserva master root. Compose publica backend 5055; no publica PostgreSQL.

**Escenario:** desplegar sin perfil explícito activa opciones de desarrollo; acceso privilegiado al contenedor o intermediario de DB aumenta impacto. **Impacto:** condicionado a infraestructura real, no producción insegura confirmada.

**Recomendación:** fallar cerrado sin perfil/secretos de producción, DB `verify-full` con CA adecuada, contenedores sin root cuando viable y restricciones de ingreso. **Prioridad:** P2.

### SA-26 — Inspección de archivos limitada a formato/tamaño

**Severidad BAJA · Confianza ALTA · Mejora defensiva · P2.** Componente: documentos/perfil.

**Archivos y líneas:** servicio de documentos de ingresos:115–159; gastos:123–168; [TransferPaymentService.java](backend/src/main/java/com/tesoreria/treasury/application/usecase/TransferPaymentService.java):345–360; servicio de imagen de perfil:118–139.

**Descripción y evidencia:** comprueba extensiones, tamaño y firmas iniciales, con controles de pertenencia. Una cabecera ZIP/PK no valida íntegramente un documento Office. No se observó antivirus/CDR.

**Escenario:** archivo estructuralmente malicioso pero con cabecera permitida queda disponible para un lector externo. **Impacto:** riesgo para quien abre el documento; no se confirma ejecución en servidor, traversal ni descarga ajena.

**Recomendación:** validación estructural, cuarentena/escaneo según riesgo, descarga como adjunto y política de formatos. **Prioridad:** P2.

### SA-27 — Implementación TOTP sin integración activa demostrada

**Severidad INFORMATIVA · Confianza ALTA · Mejora defensiva · P3.** Componente: MFA/dependencias.

**Archivos y líneas:** [AuthService.java](backend/src/main/java/com/tesoreria/user/application/usecase/AuthService.java):47–65, 89–131; [TwoFactorService.java](backend/src/main/java/com/tesoreria/user/application/usecase/TwoFactorService.java):25–105; [UserEntity.java](backend/src/main/java/com/tesoreria/user/infrastructure/adapter/out/persistence/entity/UserEntity.java):63–71.

**Descripción y evidencia:** hay servicio/campos TOTP, pero no se encontraron invocaciones o endpoints que integren el desafío en el login. El almacenamiento previsto de secreto y códigos de respaldo debe revisarse antes de activarlo.

**Escenario e impacto:** presentar esta funcionalidad como MFA operativo daría una garantía incorrecta; no se afirma bypass de MFA habilitado. **Recomendación:** retirar lo innecesario o diseñar el flujo completo, cifrar secretos, hashear códigos y probar recuperación/revocación. **Prioridad:** P3.

## 4. Problemas que corregir primero

1. **Aislamiento y acceso:** cachés con tenant (SA-01), pertenencia comprobada antes de registrar (SA-02), identidad por userId+organización y autorización de destinos STOMP (SA-03/08).
2. **Bloqueos administrativos:** impedir autoactivación y aplicar estado de cuenta a HTTP, refresh y WebSocket (SA-04/05/09).
3. **Revocación durable:** invalidar familias al cambiar/restablecer contraseña y hacer que la revocación por reutilización sobreviva al rollback (SA-06/07).
4. **Credencial expuesta:** verificar alcance por procedimiento interno y rotar/revocar lo afectado; eliminar el material sensible del historial mediante un cambio aprobado (SA-10). No basta borrar el archivo actual.
5. **Superficie externa:** contener egress de Web Push, actualizar transporte y dependencias afectadas (SA-11/12/19).
6. **Identidad/privacidad:** cambio de correo verificado, DTO mínimo de cumpleaños, límites y recuperación uniforme (SA-13/14/15/16).
7. **Integridad de pagos y logout:** probar/consolidar transiciones concurrentes y asegurar envío del CSRF capturado (SA-17/18).

## 5. Controles ya correctamente implementados

- Contraseñas con BCrypt; complejidad exigida también en backend y contraseña actual requerida al cambiarla. Los DTO públicos de usuario no incluyen contraseña ni secreto TOTP.
- Firma y expiración JWT verificadas; backend reconstruye roles desde DB, verifica organización activa y no confía en roles editables del frontend. Registro público fuerza USER.
- Refresh aleatorio de alta entropía, hash persistido y bloqueo en rotación. La ruta normal de logout revoca la familia cuando recibe los requisitos correctos. Recuperación usa tokens hasheados, con expiración y consumo.
- Rutas cerradas por defecto; operaciones administrativas protegidas; Swagger restringido a ADMIN. Operaciones de organizaciones requieren SUPER_ADMIN según el flujo revisado.
- Aislamiento Hibernate por tenant y filtros explícitos de usuarios; migraciones añaden restricciones organizacionales. Tests de aislamiento existentes pasan. SA-01 y SA-03 son vías concretas que eluden ese diseño, no una ausencia general de aislamiento.
- Consultas JPA/SQL parametrizadas. No se confirmó SQL injection. La construcción dinámica de identificadores en migraciones usa catálogo y formato de identificadores, no input HTTP.
- Documentos comprueban pertenencia y relación con el recurso padre; privilegio administrativo deriva de autenticación. Nombres generados, límites y listas de formatos reducen traversal y abuso de uploads.
- JSX escapa texto; no se encontró una cadena explotable de HTML arbitrario. La escritura de documentos de informes escapa valores inspeccionados.
- Mercado Pago usa host fijo e identificadores validados, consulta estado remoto y verifica datos financieros. La obligación se bloquea y se evita registrar nuevamente un pago activo. Checkout del frontend limita dominios/HTTPS.
- Caché PWA excluye API/orígenes sensibles; cachés de imagen en memoria se limpian al salir. No se detectó almacenamiento del access/refresh token en localStorage.
- `.env` excluidos de Git y del contexto Docker; producción exige configuración JWT, valida esquema, desactiva H2 y usa TLS SMTP. Backend Docker usa usuario no root. CI usa federación WIF.

Estos controles fueron inspeccionados en los flujos indicados; no equivalen a certificación de todos los endpoints/configuraciones.

## 6. Dependencias: resultados y explotabilidad

### Frontend

`pnpm audit --json`: **23 avisos, 10 high, 10 moderate, 3 low, 0 critical**, sobre 276 dependencias analizadas. Son avisos, no 23 fallas de negocio confirmadas. El comando terminó con código 1 por los avisos. `pnpm outdated --json` señaló **17 paquetes**; antigüedad por sí sola no es vulnerabilidad y los upgrades mayores requieren pruebas.

| Dependencia | Versión resuelta | Alcance | Acción sugerida |
|---|---|---|---|
| axios | 1.19.0 | Cliente runtime; 12 avisos con requisitos diferentes | Actualizar a 1.20.0 o posterior corregida; revisar cambios y adaptador browser. |
| undici | 8.10.0 | Transitiva de jsdom, entorno de desarrollo; 11 avisos | Resolver a 8.10.2 o posterior corregida mediante árbol compatible. |
| React/Vite/Vitest/jsdom | Ver lockfile | Versiones nuevas disponibles; no prueba automática de inseguridad | Planificar actualización por compatibilidad y alcance. |

Fuentes primarias de clasificación: [avisos de axios](https://github.com/axios/axios/security/advisories) y [avisos de undici](https://github.com/nodejs/undici/security/advisories). Los riesgos de SSRF de adaptadores Node no se atribuyen a la SPA sin demostrar uso de ese adaptador.

### Backend

`./gradlew --offline dependencyCheckAnalyze --no-daemon`: **84 ocurrencias / 34 CVE únicos**, reporte generado el 30/09/2026, motor 12.2.2. Falló el umbral CVSS≥7. `--offline` controla la resolución Gradle; el plugin obtuvo datos de vulnerabilidades. Se usó el reporte recién generado, no el archivo anterior presente en build.

| Dependencia resuelta | Clasificación contextual |
|---|---|
| Tomcat core/websocket 11.0.24 | Versión afectada. Prioridad por transporte WebSocket expuesto; verificar SA-12. Avisos de DIGEST, FORM, Realm, RewriteValve, socket Unix y role-ref no prueban explotación cuando esas funciones no están configuradas. |
| AsyncHttpClient 2.12.4 | CVE-2026-45300: cookies entre orígenes en redirect. Llega por biblioteca TOTP sin integración encontrada; no se identificó un flujo propio que configure esas cookies. Actualizar/retirar; no SSRF confirmado de la aplicación. |
| Netty 4.2.17.Final | CVE-2026-89044, HTTP request smuggling. API entrante usa Tomcat; no se encontró servidor HTTP Netty expuesto. Alcance no demostrado. |
| OpenTelemetry Java 1.55.0 | CVE-2026-54285 describe ecosistema JavaScript: asociación errónea, no vulnerabilidad Java demostrada. |
| OpenTelemetry GCP 1.37.0-alpha | CVE-2026-29181, 39883, 24051, 39882, 41178 describen Go o plataformas distintas: falsos positivos de asociación para estos artefactos Java. |
| PMD 6.55.0 | CVE-2026-28338 afecta renderizadores legacy vbhtml/yahtml. Build usa html/xml; no se encontró salida vulnerable expuesta. Dependencia de desarrollo. |
| Swagger UI 5.32.2 / DOMPurify 3.3.2 embebido | 14 CVE únicos repetidos entre artefactos. Requieren modos/gadgets/inputs concretos; Swagger exige ADMIN. No se confirmó XSS remoto por un esquema controlado por atacante. Actualizar y verificar configuración. |

Tomcat: CVE escaneados **2026-65637, 65905, 65182, 68525, 65183, 66422, 68569, 65927, 68763, 73180, 66299**. El ejemplo chat de 66299 no está en el servidor embebido; HTTP/2 de 68763 no está habilitado en la configuración observada. 65637 necesita evaluación adicional del flujo aplicable. La revisión oficial añadió los avisos WebSocket **77791 y 79677**, corregidos en 11.0.26. [Fuente oficial Tomcat](https://tomcat.apache.org/security-11.html).

DOMPurify: CVE-2026-49978, 49458, 49459, 41240, 65902, 65898, 65899, 65900, 65901, 65903, 66010, 41238, 41239, 75838. Se requiere contrastar modo IN_PLACE, hooks, contaminación de prototipos o contexto de plantillas con uso real; no trasladar automáticamente todos los avisos a un XSS confirmado. [Avisos del mantenedor](https://github.com/cure53/DOMPurify/security/advisories).

Fuentes adicionales: [AsyncHttpClient](https://github.com/AsyncHttpClient/async-http-client/security/advisories), [OpenTelemetry Java](https://github.com/open-telemetry/opentelemetry-java/security/advisories). Las dependencias aparentemente innecesarias de TOTP/AsyncHttpClient requieren decidir si se activa o se retira la funcionalidad, sin cambios durante esta auditoría.

## 7. Secretos y configuración sensible — sin valores

| Ubicación | Tipo | Situación/riesgo |
|---|---|---|
| `api-tests/user/01-Login Admin.yml`:23 | Contraseña de login | Versionada; coincide con una contraseña local de pruebas de rendimiento. Exposición confirmada, vigencia/alcance no ensayados. SA-10. |
| `frontend/.env`:6 | Contraseña de pruebas de rendimiento | Archivo ignorado, valor presente. No prueba de que Vite lo publique: no es variable VITE pública. |
| `backend/.env`:5,7,11,19,25 | Credencial DB, secreto JWT, credencial SMTP, token de pago, secreto webhook | Presentes localmente e ignorados. No se comprobaron autenticidad/vigencia ni acceso remoto. Proteger permisos y backups. |
| `backend/.env`:18 | Clave pública del proveedor de pagos | No clasificada como secreto privado por su nombre/uso. |
| `.pnpm-store/v11/projects/…/.env` | Copia de archivo de entorno en store local | Ruta detectada; contenido no inspeccionado. Riesgo de copias accidentales en backups/contextos. Store ignorado. |
| Workflow de despliegue | Referencias a GitHub Secrets | Sin valores impresos; revisar IAM e inyección runtime, SA-22. |

No se encontraron matches de llaves privadas PEM o patrones de claves de proveedores en el conjunto rastreado buscado. La búsqueda de historial de rutas `.env`/claves no mostró esos archivos; **no es un escaneo completo de todos los blobs históricos**. Los ejemplos/placeholders no se clasificaron automáticamente como credenciales reales. No se probó ningún secreto encontrado.

Los logs de login enmascaran correos y no imprimen JWT en el flujo revisado. Otros logs pueden contener correos, nombres de objetos o mensajes de excepciones; revisar políticas y logs reales. La redacción por regex de Mercado Pago no garantiza cubrir todo formato posible.

## 8. Cobertura de los riesgos solicitados y falsos positivos

| Área | Resultado de la revisión |
|---|---|
| Login/logout/sesiones | SA-04–09 y SA-18; flujo normal de cookies/CSRF inspeccionado. Revocación local no coordina instancias. Rotación renueva expiración sin máximo absoluto observado. |
| Recuperación/fuerza bruta | SA-06/14/15. Tokens de recuperación hasheados y expirables; enumeración no atribuida a selección de login que exige contraseña. |
| Roles/IDOR/BOLA | Roles backend y pertenencia presentes. Fallas concretas SA-01/02/03/04. No se encontró una vía general de cambiar rol mediante el DTO de autorregistro. Matriz completa de objetos necesita pruebas adicionales. |
| SQL injection | Consultas parametrizadas; no explotación confirmada. SQL dinámico de migraciones trabaja con catálogo/identificadores, no input HTTP. |
| Command injection/deserialización | No se identificó ejecución de comandos desde input ni deserialización nativa Java controlada por atacante. Jackson con DTO no es por sí solo deserialización insegura. |
| Path traversal/archivos | Nombres generados y controles de pertenencia; SA-26. No se confirmó traversal ni acceso ajeno por rutas de almacenamiento. |
| SSRF | Web Push SA-11 probable. Mercado Pago usa host fijo; no se clasificó como SSRF por usar HTTP saliente. |
| XSS | Sin cadena propia confirmada; React escapa texto e informes escapan interpolaciones inspeccionadas. Avisos DOMPurify condicionados; SA-20 es endurecimiento. |
| CSRF/CORS | Bearer en API y comprobación ligada a refresh. Desactivar CSRF global no demuestra por sí solo vulnerabilidad. CORS dev admite patrones de túnel; prod por defecto no. Configuración cloud real pendiente. SA-18. |
| Mass assignment | SA-04 por campos de estado aceptados en autoservicio. Roles del autorregistro no son libres. |
| Datos/errores/rate limiting | SA-14/15/16/23. No se confirmó stack trace completo público. |
| Frontend/redirects | Tokens no persistidos en localStorage; perfil/CSRF en sessionStorage sí accesibles a JS. Roles locales no conceden permisos backend. URLs de checkout restringidas. Destinos de notificación observados no permiten input libre que pruebe open redirect. |
| DB/migraciones | Tenant y restricciones observados; sin RLS no es vulnerabilidad automática. No se garantizó que todos los FK impidan relaciones entre tenants. Credenciales y TLS en SA-25/tabla de secretos. |
| Infraestructura | Docker, nginx y workflows revisados, SA-20/21/22/25. Publicación local de backend no prueba exposición pública de producción; DB no publicada en Compose. IAM/buckets/backups sin acceso. |
| Lógica de negocio | Pertenencia a curso, correlación por correo, cachés financieras y carrera de transferencias revisadas. No se efectuaron pagos reales ni se confirmó doble cobro. |

## 9. Verificación ejecutada

| Diagnóstico | Resultado |
|---|---|
| Tests backend seleccionados: usuarios, interceptor WS, aislamiento tenant y Mercado Pago | **115 tests / 22 suites; 0 fallos, errores o skips.** Los casos existentes no cubren las fallas nuevas reproducidas. |
| Vitest: interceptor Axios, AuthContext, LoginPage, AccountFlowPages | **32 tests aprobados**; warnings React act, sin fallos. |
| `pnpm lint` | Exit 0; cuatro warnings no-unused-expressions. |
| PMD main | Exit 1; 20 observaciones de estilo/calidad; no clasificadas automáticamente como seguridad. |
| Auditorías de dependencias | Resultados y contextualización en sección 6. |
| Harness temporal Spring/H2/HTTP/WS | Reproducciones sintéticas siguientes; finalizó correctamente. |
| Harness Node/Axios sin red | Encabezado CSRF ausente después de limpieza inmediata de sesión. |

Resultados del harness, sin tokens ni datos reales:

```text
JWT aceptado con usuario deshabilitado y bloqueado: sí
Refresh de usuario deshabilitado emite access: sí
Reutilización antigua rechazada, familia aún activa después: sí
Refresh previo a cambio de contraseña emite JWT aceptado: sí
Logout normal deja familia inactiva: sí
Token de usuario B con correo compartido obtiene principal ADMIN A en WS: sí
WS acepta conexión con token de familia cerrada: sí
SEND/SUBSCRIBE directo a queue sintética entrega MESSAGE: sí
Caché de A entregada en contexto B con DB diferente: sí
Registro ajeno 201 → verificación 200 → cumpleaños 200: sí
Observación sintética privada visible a ese usuario: sí
Autoservicio de cuenta bloqueada 200 → enabled/unlocked: sí
Cambio de correo conserva verificación: sí
```

La reutilización se ensayó fuera de la gracia de 10 segundos con un proxy transaccional real; la revocación desaparece al lanzarse una excepción RuntimeException. [Semántica oficial de rollback de Spring](https://docs.spring.io/spring-framework/reference/data-access/transaction/declarative/rolling-back.html). La prueba STOMP no leyó datos de una víctima ni atacó destinos productivos. Las reglas de autorización de mensajes son distintas de la autorización del handshake HTTP. [Referencia Spring Security WebSocket](https://docs.spring.io/spring-security/reference/servlet/integrations/websocket.html).

Los arneses están fuera del repositorio, en el directorio temporal `treasury-security-probe`; los reportes Gradle están bajo `backend/build/reports`, ignorados. H2 demuestra los flujos probados, pero no sustituye pruebas de concurrencia y esquema en PostgreSQL.

## 10. Riesgos que requieren pruebas manuales adicionales

1. **Matriz de autorización/tenants:** dos cursos, roles distintos y todos los tipos de objetos, combinando identificadores válidos ajenos, listados, exportaciones, archivos, cachés calientes e invalidaciones.
2. **WebSocket:** destinos privados reales, colisión de correo, renovación/revocación durante una conexión abierta, expiración, cambio de rol y múltiples instancias. Ya se confirmó nueva conexión tras cerrar familia; continuidad de una sesión existente no se ensayó.
3. **Sesiones distribuidas:** logout/cambio de contraseña en una instancia y uso en otra, persistencia tras reinicio, compatibilidad de refresh antiguo sin hash CSRF y máximo absoluto de familia.
4. **Navegador/despliegue:** headers y cookies en los dominios reales, preflight CORS, logout CSRF y fallo de red. No ensayar con credenciales de terceros.
5. **Pagos:** intercalaciones aprobar/rechazar y reintentos en PostgreSQL con sandbox; comprobar estado final de obligación, transferencia, ledger y notificaciones. Sin dinero real.
6. **Web Push:** receptor controlado en red de ensayo para verificar destinos privados, puertos, redirects y DNS rebinding. No consultar metadata ni servicios internos reales sin autorización. Revisar contexto tenant de ejecución asíncrona y fallback por defecto.
7. **Dependencias:** validar requisitos específicos de avisos Tomcat/Swagger en laboratorio; no ejecutar DoS contra producción. Revisar paquetes efectivamente incluidos en imagen/bundle, no solo lockfiles.
8. **Secretos e infraestructura:** auditoría interna de IAM, revisiones Cloud Run, logs y backups, acceso GCS, escaneo completo del historial/artifacts y rotación de credenciales expuestas. No hace falta mostrar valores para verificar cumplimiento.
9. **Documentos y datos:** validadores estructurales, escaneo, headers de descarga, retención de observaciones/DOB, contenido de logs y cifrado/backups DB.

## 11. Plan de remediación por fases

| Fase | Trabajo propuesto después de aprobación | Criterio de salida |
|---|---|---|
| 0 — Revisión/contención | Validar alcance, asignar responsables; tratar credencial expuesta; decidir restricciones temporales de autorregistro/WebSocket/push. | Alcance de exposición registrado sin secretos y controles temporales probados. |
| 1 — Autorización y tenant | SA-01/02/03/04/08: claves/invalidation con tenant, pertenencia explícita, identidad por ID, DTO de autoservicio acotado, autorización SEND/SUBSCRIBE. | Pruebas negativas entre cursos/roles y validación de rutas normales, incluyendo caché caliente. |
| 2 — Ciclo de sesión e identidad | SA-05/06/07/09/13/18: estado de cuenta, familias revocadas durablemente, transacciones de revocación, WS, cambio de correo y CSRF del logout. | Access/refresh/WS rechazados tras bloqueo, reset, logout y reutilización, incluso entre instancias. |
| 3 — API y negocio | SA-11/14/15/16/17: egress seguro, límites acotados/distribuidos, privacidad y transiciones financieras atómicas. | Pruebas de abuso y carrera en entorno de ensayo; estados y respuestas coherentes. |
| 4 — Dependencias y producción | SA-12/19–26: updates compatibles, gates, headers, secretos administrados, TLS DB, errores y documentos. | Builds reproducibles, auditorías contextualizadas, políticas desplegadas verificadas y regresiones aprobadas. |
| 5 — Validación continua | Matriz completa de autorización, pentest de staging, observabilidad de revocaciones y decisión sobre MFA/SA-27. | Evidencia de cierre por hallazgo, sin suprimir avisos sin justificación; responsables y frecuencia de revisión. |

No se implementó ninguna de estas fases. Las recomendaciones quedan pendientes de revisión y aprobación del informe.
