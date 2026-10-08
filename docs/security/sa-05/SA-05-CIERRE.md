# SA-05 — Corrección de sesiones tras bloqueo/desactivación

Fecha: 2026-10-08. Alcance: aceptación HTTP de JWT, emisión/rotación de refresh y revocación administrativa de sesiones persistidas.

## Estado

| Etapa | Estado |
|---|---|
| REMEDIADO EN CÓDIGO | SÍ |
| VALIDADO EN TESTS | SÍ: 642 backend, 431 frontend, cero fallos/errores/omisiones |
| DESPLEGADO | SÍ: backend 902c3aa, revisión backend-00125-87h, 2026-10-08 |
| VERIFICADO EN PRODUCCIÓN | PARCIAL: 14/14 Bruno; bloqueo, refresh y no recuperación de sesiones tras desbloqueo |
| CERRADO EN PRODUCCIÓN | NO |

Ver [despliegue y evidencia productiva](SA05_PRODUCTION_CHECK.md). La cuenta terminó habilitada/desbloqueada; sus sesiones previas quedaron revocadas. Desactivación y aislamiento con ADMIN ordinario siguen pendientes de comprobación productiva.

Las modificaciones de documentación/Bruno de SA-04 que ya estaban en el árbol de trabajo se conservan; no forman parte de la corrección funcional de SA-05.

## Hallazgo y código recibido

La auditoría original describía JWT y refresh que seguían admitiendo cuentas bloqueadas/desactivadas. SA-03 ya añadió a `JwtService.isTokenValid` comprobaciones de enabled/accountNonLocked, identidad por ID, organización y estado activo de organización.

Persistían dos problemas: `RefreshTokenService.issue` no comprobaba esos estados antes de guardar refresh y generar access; `UserService.update` y `cambiarEstado` no revocaban las familias persistidas. Por eso un refresh podía renovar durante un bloqueo y una sesión podía volver a funcionar después de desbloquear.

## Corrección

- JWT conserva sus comprobaciones existentes y añade los contratos `isAccountNonExpired` e `isCredentialsNonExpired`.
- Emisión y renovación de refresh exigen `TenantUserDetails` coherente con el usuario persistido: ID, organización, rol y correo; cuenta habilitada/desbloqueada y organización activa. La organización nula se admite únicamente para SUPER_ADMIN. USER sin correo verificado se rechaza mediante los detalles existentes.
- La rotación obtiene el propietario mediante una proyección del hash, bloquea su fila y después bloquea el token. Comprueba el estado antes de marcarlo usado o guardar el sustituto.
- Las actualizaciones administrativas bloquean la misma fila de usuario y, si la cuenta queda deshabilitada o bloqueada, marcan todos sus REFRESH_TOKEN no revocados con `revoked_at`. El cambio de estado y la revocación se confirman o revierten juntos.
- La emisión y rotación se serializan con la administración: una sesión emitida antes del bloqueo se incluye en la revocación; una emisión posterior comprueba el estado restringido.
- El filtro HTTP y la autenticación de CONNECT WebSocket consultan familia y `userId` juntos. Un JWT no puede aprovechar la familia activa de otra cuenta. La identidad/organización del JWT sigue validándose contra el usuario actual.

No hay cambios de esquema, migraciones, dependencias, rutas, cuerpos JSON ni cookies. Los constructores previos de UserService permanecen para pruebas unitarias sin Spring; el bean de producción inyecta obligatoriamente RefreshTokenService.

## Pruebas

`SA05SessionSecurityIntegrationTest` usa Spring Security, servicios y repositorios reales, MockMvc y H2. No hay transacción envolviendo el test: las peticiones y las operaciones confirman sus transacciones. `SA05PostgresSessionSecurityTest` ejecuta esos escenarios con PostgreSQL 16 desechable, Flyway y Hibernate validate.

Los escenarios cubren múltiples sesiones, bloqueo y desactivación por PUT, desactivación por PATCH, rechazo de JWT/refresh/login, estado persistido por SQL, sesiones revocadas después de reactivar, nuevo login permitido, cuenta USER verificada, correo duplicado entre tenants, rechazo de administración cruzada, operación rechazada sin revocación del actor, familia perteneciente a otro usuario, organización inactiva, USER no verificado y SUPER_ADMIN global.

Se recrea el servicio de refresh y se consulta la revocación desde la base, sin depender de mapas locales de revocación. Las pruebas concurrentes coordinan dos transacciones con latches: emisión o rotación retiene la fila del usuario, el bloqueo administrativo espera y, al completarse, revoca también la sesión recién creada.

`RefreshTokenServiceTest` añade comprobaciones unitarias de estados restringidos, identidad/organización incoherentes y propiedad de familia.

La colección Bruno de SA-05 se ejecutó después del despliegue autorizado: 14/14 comprobaciones productivas aprobadas. Ver la evidencia productiva para su alcance y los pendientes.

### Resultados finales

| Control | Resultado |
|---|---|
| Suite completa backend | 642 tests en 90 suites, 0 fallos, 0 errores, 0 omitidos |
| SA-05 integración H2 | 13/13 |
| SA-05 integración PostgreSQL 16 | 13/13 |
| RefreshTokenService unitario | 14/14 |
| PostgreSQL de toda la suite | 107 tests incluidos en los 642 |
| JaCoCo gate | Aprobado; cobertura de instrucciones 76,69 %, mínimo 70 % |
| bootJar | Aprobado |
| PMD main / check | Falla por 19 incidencias preexistentes, sin incidencias nuevas |
| Frontend tests | 431/431, 75 archivos |
| Frontend lint / build | Aprobados con avisos preexistentes |

Comandos ejecutados:

```text
backend/gradlew.bat test jacocoTestCoverageVerification bootJar pmdMain --continue
backend/gradlew.bat check --continue
pnpm test:run
pnpm lint
pnpm build
git diff --check
```

Los comandos Gradle combinados terminan con error únicamente por PMD. `check` reutiliza la suite y la cobertura ya aprobadas. Las 19 incidencias coinciden con la línea base documentada en SA-04: CorsConfig (1), DashboardDataSourceInstrumentation (9), DashboardPerformanceProbe (2), TreasuryService (1), MercadoPagoHttpGateway (3), AccountRecoveryService (1), AuthService (1) y el literal `auth` preexistente en JwtAuthenticationFilter (1). No se suprimen reglas ni se reduce la cobertura.

Frontend conserva avisos `act(...)` en tests de AuthContext, cuatro expresiones no usadas y `eval` de lottie-web. No se modifica código frontend en SA-05.

Los reportes reproducibles permanecen en `backend/build/test-results/test`, `backend/build/reports/tests/test`, `backend/build/reports/jacoco/test` y `backend/build/reports/pmd`. No se versionan binarios ni resultados con secretos.

## Límites y tareas relacionadas

- SA-06 (cambio de contraseña) y SA-07 (rollback de revocación por reutilización) no se corrigen ni se declaran cerrados aquí. La política de gracia y `detectReuse` se conserva.
- El alcance es sesiones HTTP y refresh. La comprobación de propietario también se aplica a nuevos CONNECT WebSocket; cerrar/revalidar conexiones ya establecidas corresponde a SA-09.
- La revocación persistida cubre los JWT de sesión emitidos por el login/refresh HTTP, que incluyen familia. JWT internos sin familia conservan la compatibilidad previa y las comprobaciones de estado en cada petición; no adquieren revocación durable por familia.
- Desactivar una organización impide aceptar access y renovar refresh mientras esté inactiva; no se añade una revocación masiva por organización.
- Antes del cierre productivo, desplegar el código corregido y comprobar con cuentas dedicadas que bloquear/desactivar rechaza access, refresh y login; desbloquear/reactivar no revive sesiones anteriores; un nuevo login funciona y las otras cuentas/organizaciones no cambian.
