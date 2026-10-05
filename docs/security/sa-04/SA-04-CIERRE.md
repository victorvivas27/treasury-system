# SA-04 — Remediación de auto-reactivación y auto-desbloqueo

Fecha: 2026-10-05. Alcance: autorización de campos en actualización de perfil y administración de cuentas.

## Estado

| Etapa | Estado |
|---|---|
| REMEDIADO EN CÓDIGO | SÍ: contratos separados, allowlist de perfil y autorización administrativa en backend |
| VALIDADO EN TESTS | SÍ: 611 tests backend, 0 fallos/errores/omisiones; 431 tests frontend aprobados |
| DESPLEGADO | NO |
| VERIFICADO EN ENTORNO DESPLEGADO | NO |
| CERRADO EN PRODUCCIÓN | NO |

No se modificaron datos productivos, esquema, migraciones ni dependencias. PostgreSQL se probó en contenedores desechables `postgres:16-alpine` con Flyway y Hibernate `validate`.

## 1. Causa raíz y endpoint original

El perfil y la edición administrativa compartían `PUT /api/v1/users/{id}`, `UserRequestDTO`, el mapper `toUpdateDomain` y `UserService.update`. La autorización era `hasRole('ADMIN') or @userAuthorization.isSelf(#id, authentication)`.

`isSelf` verificaba ID y organización del objeto, pero no los campos de la petición. El servicio copiaba `enabled` y `accountNonLocked` del dominio de cambios al registro existente. El argumento `authenticatedUserId` no delimitaba esos campos en `update`. El DTO además inicializaba ambos estados a `true`, por lo que omitirlos podía representar una restauración implícita.

Las protecciones anteriores de SA-02 ya impedían reactivar un USER deshabilitado por actualización ordinaria. SA-03 ya incluía comprobación de estados en la validación JWT. Ninguna sustituía la separación de contratos: el acceso de perfil seguía exponiendo estados administrativos, incluido el desbloqueo. La corrección de SA-04 se verifica sin depender de esos rechazos de autenticación.

## 2. Inspección del contrato y campos sensibles

Antes de modificar código se revisaron `UserController`, `UserRequestDTO`, `UserService.update`, `UserAuthorization`, `User`, `UserEntity`, `UserMapper`, seguridad HTTP, perfil React, formulario administrativo, repositorios TypeScript y tests relacionados.

| Elemento | Resultado de la inspección |
|---|---|
| Perfil propio | Usaba `PUT /users/{id}`. La interfaz solo editaba el nombre, pero enviaba correo, rol y ambos estados |
| Edición administrativa | Usaba la misma ruta. El formulario manejaba nombre, correo y estados; el cambio de rol tenía endpoint propio |
| `UserRequestDTO` anterior | `nombre`, `correo`, `password`, `rol` (USER por defecto), `enabled` y `accountNonLocked` (true por defecto) |
| Vulnerabilidad de escritura efectiva | `enabled` y `accountNonLocked` se copiaban en `update`, sin distinguir perfil de administración |
| Otros campos aceptados | `password` y `rol` eran administrativos; el mapper de update ignoraba password y el servicio no aplicaba rol. No se presenta esa aceptación como una escalada de rol ya reproducida |
| Campos internos del modelo | ID, code, organización, verificación de correo, aceptación de invitación, guardian invitado, password, rol, TOTP, backup codes, fechas e imagen |
| USER sobre sí mismo | Edición del nombre; correo de cuenta USER ligado al flujo de invitación. Avatar/imagen mediante sus operaciones específicas |
| ADMIN | Edición administrativa dentro de su organización, nombre/correo según restricciones existentes, estados y endpoint independiente de rol |
| SUPER_ADMIN | `TenantUserDetails` añade `ROLE_ADMIN`; conserva administración global. La administración de SUPER_ADMIN se reserva a SUPER_ADMIN reutilizando la regla existente de ese rol |

Además del cierre del acceso self a estados, se elimina la restauración por estados omitidos/null en edición administrativa. Nuevos campos de `User` o del DTO de creación no se incorporan automáticamente a ninguno de los contratos de actualización.

## 3. Contratos finales y separación

| Operación | Endpoint | Contrato | Autorización |
|---|---|---|---|
| Perfil propio | `PUT /api/v1/users/{id}/profile` | `SelfProfileUpdateRequest`: únicamente `nombre` obligatorio | Cuenta autenticada con `isSelf(id, authentication)` |
| Administración | `PUT /api/v1/users/{id}` | `AdminUserUpdateRequest`: nombre/correo obligatorios; enabled/accountNonLocked opcionales | `hasRole('ADMIN')`; SUPER_ADMIN conserva ROLE_ADMIN |
| Activación/desactivación administrativa | `PATCH /api/v1/users/{id}/estado` | `EstadoActivoRequest.activo` | ADMIN; reglas de estado existentes |
| Cambio de rol | `PATCH /api/v1/users/{id}/rol` | `RoleRequestDTO.rol` | ADMIN; reglas existentes de propio rol, último ADMIN, invitación y SUPER_ADMIN |

Se añadió una ruta de perfil porque no existía una operación separada para modificar el nombre. La ruta de administración y los endpoints administrativos de estado/rol se reutilizaron.

Ejemplo válido de perfil:

```json
{"nombre":"Juan Pérez"}
```

`UserService.updateSelfProfile` recibe solo ID, nombre e identidad autenticada; comprueba también la igualdad de ID y llama únicamente a `setNombre`. No utiliza un objeto `User` de cambios ni un mapper genérico.

La administración recibe el comando tipado `AdminUserUpdate`. El controlador construye explícitamente sus cuatro atributos. El servicio valida nombre/correo antes de modificar el registro y escribe explícitamente los atributos autorizados. `UserRequestDTO` y `UserMapper.toDomain` quedan para creación/bootstrap; se elimina `toUpdateDomain`.

`isSelf` conserva su responsabilidad de autorización del objeto por ID y organización. No se utiliza para abrir el contrato administrativo. La allowlist del contrato y el servicio decide los campos.

## 4. Autorización administrativa y compatibilidad

La cadena HTTP reserva `/{id}/profile` a cuentas autenticadas USER/ADMIN; la regla general `/users/**` exige ADMIN para edición administrativa. El controlador y el proxy Spring del servicio exigen ADMIN en `update` y `cambiarEstado`. Un USER tampoco puede llamar esas operaciones a través del bean de servicio.

`findById` conserva el ámbito organizacional: un ADMIN de otra organización recibe 404 y no modifica el registro. SUPER_ADMIN conserva el acceso global. Se reutiliza `assertSuperAdminRoleAllowed` en actualización administrativa y estado para impedir que un ADMIN ordinario altere estados de una cuenta SUPER_ADMIN global que el lookup existente pudiera encontrar.

La edición administrativa aplica las mismas comprobaciones de desactivación que el endpoint de estado mediante `validateStateChange`: no desactivar al propio actor, no desactivar al último ADMIN y respetar la activación por invitación de USER. Así, PUT tampoco permite eludir esas reglas por una ruta alternativa.

`enabled` y `accountNonLocked` ausentes o null conservan sus valores persistidos. ADMIN puede habilitar/deshabilitar cuentas administrativas y bloquear/desbloquear cuentas autorizadas mediante las operaciones existentes. Una cuenta USER deshabilitada sigue requiriendo una nueva invitación administrativa para reactivarse, tal como exige SA-02; no se abrió una activación directa adicional.

## 5. Propiedades inesperadas y mass assignment

No se encontró una configuración global explícita de rechazo de propiedades desconocidas en los archivos revisados. Ambos contratos nuevos fijan localmente el comportamiento con `@JsonIgnoreProperties(ignoreUnknown = true)`, sin cambiar Jackson para el resto de la API.

La política es ignorar de forma segura los campos ajenos al contrato. Con `nombre` válido se aplica solo ese atributo de perfil; sin `nombre` válido se devuelve 400 por validación y no se persiste.

Esta petición puede actualizar el nombre, pero nunca los estados ni los roles:

```json
{"nombre":"Juan", "enabled":true, "accountNonLocked":true, "roles":["ADMIN"]}
```

Las pruebas inyectan también `rol`, `authorities`, `organizationId`, `tenantId`, `id`, `userId`, `code`, correo, password, verificación, invitación, guardian invitado, TOTP, backup codes e imagen. Se comparan los valores directamente por SQL. El DTO de perfil carece de esos atributos y el servicio no dispone de parámetros para escribirlos.

El contrato administrativo tampoco admite rol, password, tenant ni campos internos por actualización genérica; los endpoints específicos conservan sus propias autorizaciones.

## 6. Otros flujos inspeccionados

- `POST /users`: creación administrativa; el mapper no toma ID, code, tenant, verificación, invitación ni TOTP del JSON. USER no puede usarla. No se modifica este contrato de creación.
- `POST /organizations/{id}/admins`: reservado a SUPER_ADMIN; crea un ADMIN para la organización seleccionada desde el servidor.
- Bootstrap: acceso inicial controlado y limitado a base sin usuarios; el servidor fija rol y estados.
- Invitación/aceptación: `AccountRecoveryService` establece pertenencia/estado únicamente en el flujo validado de `ACCOUNT_INVITATION`; un `PASSWORD_RESET` ordinario no restaura enabled/accountNonLocked. Se conservan los tests SA-02.
- Password: cambio/reset mediante operaciones propias, validación y revocación existentes; no se admite en actualización genérica.
- Avatar/imagen: selección validada, upload y reset escriben únicamente atributos de imagen mediante su servicio específico.
- Campos TOTP y backup codes: internos del modelo; no expuestos por estos contratos de actualización. No se añadió ni cambió funcionalidad de 2FA.

## 7. Frontend

`ProfilePage` llama a `updateSelfProfile` con únicamente nombre. `SelfProfileUpdatePayload` y `AdminUserUpdatePayload` separan los contratos TypeScript. El repositorio proyecta explícitamente los atributos de cada operación.

El formulario administrativo conserva los controles de estado visibles; al editar omite rol y password, y no envía estados cuando sus controles están ocultos. La seguridad del backend no depende de estos cambios: las pruebas envían JSON manipulado directamente mediante MockMvc.

## 8. Regresión del ataque original sin depender de SA-05

Las fixtures son cuentas nuevas y organizaciones nuevas; cada prueba transaccional se revierte. En el caso crítico se actualiza por SQL `enabled=false` y `account_non_locked=false`, se vacía el contexto JPA y se instala mediante Spring Security Test una autenticación USER ya aceptada con el ID/tenant correctos.

Se usa el controlador, las autorizaciones, el servicio, los mappers y la persistencia reales. Esta autenticación simulada omite deliberadamente la necesidad de que un JWT bloqueado sea aceptado; no simula el servicio ni el repositorio.

La petición original de solo `enabled=true` y `accountNonLocked=true` obtiene 400 en perfil (falta nombre) y 403 en la antigua ruta, ahora administrativa. Con nombre válido y los campos hostiles, perfil devuelve 200 y cambia solo el nombre. SQL verifica en ambos casos que enabled y account_non_locked siguen false y los demás atributos de seguridad permanecen idénticos.

Un caso adicional usa JWT firmado real y JSON manipulado contra una cuenta activa, pasando por el filtro JWT real. Solo cambia el nombre. Son pruebas de integración Spring MVC con MockMvc y base de datos real, no una prueba por red contra producción.

## 9. Pruebas y requisitos

| Cobertura solicitada | Evidencia |
|---|---|
| 1: campo permitido | `signedJwtCanUpdateAllowedProfileField`, unitario de perfil y test React |
| 2–4: enabled, bloqueo y ambos | `acceptedBlockedSessionCannotMassAssign`, casos parametrizados; lectura SQL |
| 5–8: roles, organización, ID/code | Casos parametrizados con snapshots SQL de atributos de seguridad |
| 9: mezcla permitida/privilegiada | Parametrizados y `signedJwtAndManuallyInjectedJsonCannotChangeAccountSecurity` |
| 10: cuenta deshabilitada/bloqueada | `originalAttackWithoutProfileFieldIsRejectedAndNeverRestoresStates`, parametrizados y prueba unitaria directa de servicio |
| 11: ADMIN legítimo | Habilitar/deshabilitar/bloquear/desbloquear ADMIN; bloquear/desbloquear USER activo; preservación de invitación SA-02 |
| 12: USER sin administración | Denegación HTTP de PUT/estado/rol y denegación del proxy de servicio |
| 13: otro tenant | ADMIN ajeno recibe 404 y snapshot permanece idéntico |
| 14: SUPER_ADMIN | Administración global; perfil con la misma allowlist; ADMIN ordinario no altera SUPER_ADMIN |
| Omitidos/null y otros campos | Snapshot sin restauración implícita; TOTP, password, verificación, invitación, correo e imagen |
| Reglas existentes | `SecurityConfigTest`, `UserControllerTest`, `UserServiceTest`, SA-02 y SA-03 en suite completa |

Clases nuevas: `SA04ProfileSecurityIntegrationTest` (H2), `SA04PostgresProfileSecurityTest` (hereda los mismos escenarios contra PostgreSQL) y `SA04UserServiceTest` (unitarios). Los tests standalone del controlador prueban contrato/mapeo; la seguridad se verifica en las integraciones Spring completas.

## 10. Validación ejecutada

Comandos backend ejecutados desde `backend/`; comandos frontend desde `frontend/`:

| Validación | Resultado |
|---|---|
| `gradlew.bat test --tests user.UserServiceTest --tests user.UserControllerTest --tests user.SecurityConfigTest --tests 'user.SA04*' --console=plain` | Validación inicial: EXIT 0, 96 tests, sin fallos/errores/omisiones |
| `gradlew.bat test jacocoTestReport jacocoTestCoverageVerification --console=plain` | Validación final: EXIT 0, BUILD SUCCESSFUL; 611 tests, 0 fallos, 0 errores, 0 omisiones |
| PostgreSQL dentro de la suite final | 94 tests, todos aprobados; incluye los 25 escenarios de SA-04 contra PostgreSQL 16 |
| Clases `SA04*` | 57 tests: 25 H2, 25 PostgreSQL y 7 unitarios, todos aprobados |
| JaCoCo | Instrucciones 76,51%; líneas 79,89%; ramas 54,09%. Verificación del mínimo existente de 70% aprobada |
| `pmdMain` dentro de `gradlew.bat test jacocoTestReport jacocoTestCoverageVerification pmdMain --console=plain --continue` | EXIT 1 exclusivamente por 19 incidencias PMD preexistentes; sin incidencias nuevas |
| `pnpm exec vitest run src/core/C-infra/repositories/user/userService.test.ts src/presentation/pages/user/ProfilePage.test.tsx src/presentation/pages/user/UsersPage.test.tsx` | Validación inicial frontend: EXIT 0, 17 tests aprobados |
| `pnpm test:run` | EXIT 0; 75 archivos, 431 tests aprobados |
| `pnpm lint` | EXIT 0, cuatro avisos en archivos ajenos al cambio |
| `pnpm build` | EXIT 0; TypeScript y build Vite aprobados |
| `git diff --check` | EXIT 0 |

La ejecución final incluye todos los tests de autorización, HTTP, invitaciones, STOMP, aislamiento y rendimiento del repositorio. No se omitieron tests ni se rebajaron reglas de calidad/cobertura. La última ampliación fue un caso adicional de JSON manipulado con JWT firmado, validado de nuevo en toda la suite backend.

Los reportes generados permanecen en:

- `backend/build/reports/tests/test/index.html`
- `backend/build/reports/jacoco/test/html/index.html`
- `backend/build/reports/pmd/main.html`

## 11. Problemas preexistentes

PMD registra 19 incidencias preexistentes. Se comparó el reporte final con el reporte anterior del 4 de octubre: mismos archivos, reglas y líneas, sin diferencias. No se cambiaron reglas ni exclusiones.

| Archivo bajo `backend/src/main/java/com/tesoreria/` | Incidencias |
|---|---|
| `shared/infrastructure/config/CorsConfig.java` | 1 UseVarargs |
| `shared/infrastructure/performance/DashboardDataSourceInstrumentation.java` | 9: UseProperClassLoader (4), LiteralsFirstInComparisons (3), UseVarargs (2) |
| `shared/infrastructure/performance/DashboardPerformanceProbe.java` | 2: GuardLogStatement, CompareObjectsWithEquals |
| `treasury/application/usecase/TreasuryService.java` | 1 AvoidDuplicateLiterals |
| `treasury/infrastructure/adapter/out/MercadoPagoHttpGateway.java` | 3 GuardLogStatement |
| `user/application/usecase/AccountRecoveryService.java` | 1 AvoidLiteralsInIfCondition |
| `user/application/usecase/AuthService.java` | 1 AvoidLiteralsInIfCondition |
| `user/config/security/JwtAuthenticationFilter.java` | 1 AvoidDuplicateLiterals |

El quality gate general permanece fallando por PMD. Frontend emite avisos en archivos ajenos: `act(...)` en AuthContext, cuatro avisos de expresiones no usadas, `eval` de lottie-web y chunks grandes de Vite; tests/lint/build terminan con exit 0. No se mezclaron esas correcciones con SA-04.

## 12. Archivos modificados

Rutas relativas a la raíz del repositorio:

```text
backend/src/main/java/com/tesoreria/user/
  application/usecase/UserService.java
  config/security/SecurityConfig.java
  core/model/AdminUserUpdate.java [nuevo]
  core/port/in/UserUseCase.java
  infrastructure/adapter/in/web/controller/UserController.java
  infrastructure/adapter/in/web/dto/AdminUserUpdateRequest.java [nuevo]
  infrastructure/adapter/in/web/dto/SelfProfileUpdateRequest.java [nuevo]
  infrastructure/adapter/in/web/mapper/UserMapper.java
backend/src/test/java/user/
  UserServiceTest.java
  UserControllerTest.java
  SecurityConfigTest.java
  SA04UserServiceTest.java [nuevo]
  SA04ProfileSecurityIntegrationTest.java [nuevo]
  SA04PostgresProfileSecurityTest.java [nuevo]
frontend/src/
  core/A-domain/entities/user/User.ts
  core/A-domain/repository/user/IUserRepository.ts
  core/B-application/use-cases/user/UserUseCases.ts
  core/C-infra/repositories/user/UserRepositoryImpl.ts
  core/C-infra/repositories/user/userService.test.ts
  presentation/hooks/user/useUsers.ts
  presentation/features/user/UserForm.tsx
  presentation/features/user/UserForm.test.tsx
  presentation/pages/user/ProfilePage.tsx
  presentation/pages/user/ProfilePage.test.tsx
docs/security/sa-04/README.md [nuevo]
docs/security/sa-04/SA-04-CIERRE.md [nuevo]
docs/security/README.md
SECURITY_AUDIT.md [anotación del estado de SA-04]
```

Los movimientos previos de documentación SA-02/SA-03 ya presentes en el working tree no forman parte de la implementación SA-04.

## 13. Riesgos residuales y despliegue

- Backend y frontend deben desplegarse coordinadamente: clientes USER antiguos que usen PUT `/users/{id}` recibirán 403 y deben usar `/{id}/profile`.
- La política de ignorar desconocidos evita escrituras privilegiadas, pero no notifica al cliente un typo si también envía un nombre válido. Añadir campos al perfil requiere decisión explícita en DTO, servicio y pruebas.
- La administración mantiene sus restricciones existentes de invitación, propio usuario, último ADMIN y tenant. No se cambia el ciclo de vida de autenticación, revocación ni sockets.
- Antes del cierre productivo, comprobar peticiones manuales de perfil, denegación de la ruta administrativa para USER, administración legítima y aislamiento de organizaciones en el entorno desplegado.

## 14. Relación pendiente con SA-05

SA-05 no se implementó ni se declara cerrado en esta tarea. No se modificaron `JwtAuthenticationFilter`, `JwtService`, revocación, refresh ni autenticación WebSocket.

Aunque el código recibido ya verifica enabled/accountNonLocked en JWT como parte de SA-03, la revisión independiente de aceptación/revocación y ciclo de vida de sesiones sigue correspondiendo a SA-05. SA-04 no depende de esa comprobación: las pruebas suministran una sesión USER aceptada para una cuenta realmente bloqueada/deshabilitada y demuestran que el perfil no puede restaurar estados, roles, pertenencia ni atributos internos.

SA-04 está remediado y validado localmente; no está cerrado en producción.
