# Fase 1 — Protección de cuentas SUPER_ADMIN

Fecha: 26 de octubre de 2026. Alcance: corrección local del hallazgo AUD-01.

**Estado: COMPLETADA — implementación y validación local, incluida concurrencia en PostgreSQL real. Sin despliegue.**

## Cambios y archivos

| Archivo | Cambio |
| --- | --- |
| `backend/src/main/java/com/tesoreria/user/application/usecase/UserService.java` | Autoriza la eliminación según el rol del objetivo. Añade autorización de método a eliminación y cambio de rol. Protege al último SUPER_ADMIN disponible ante DELETE, cambio de rol, PATCH de estado y PUT que deshabilita o bloquea. Adquiere los bloqueos antes de leer/modificar cuentas y sincroniza la creación de SUPER_ADMIN con las bajas de organizaciones. |
| `backend/src/main/java/com/tesoreria/user/core/port/out/UserRepositoryOutPort.java` | Expone bloqueo transaccional de SUPER_ADMIN y conteo de respaldos disponibles. |
| `backend/src/main/java/com/tesoreria/user/infrastructure/adapter/out/persistence/adapter/JpaUserRepositoryAdapter.java` | Implementa las dos operaciones del puerto. |
| `backend/src/main/java/com/tesoreria/user/infrastructure/adapter/out/persistence/repository/UserJpaRepository.java` | Bloqueo pesimista de SUPER_ADMIN ordenado por ID y conteo que excluye la cuenta objetivo, cuentas deshabilitadas/bloqueadas y organizaciones inactivas. |
| `backend/src/main/java/com/tesoreria/organization/application/OrganizationService.java` | Impide eliminar o desactivar organizaciones que contengan SUPER_ADMIN, evitando bajas indirectas y cascadas. |
| `backend/src/test/java/user/SuperAdminProtectionIntegrationTest.java` | Pruebas con Spring Security, JWT firmado, MockMvc y H2; persistencia intacta ante rechazo, permisos legítimos y concurrencia con transacciones independientes. |
| `backend/src/test/java/user/SuperAdminPostgresProtectionTest.java` | Ejecuta los 27 casos anteriores con PostgreSQL real y añade 13 casos de motor/aislamiento, carreras HTTP, bajas de organizaciones, cascadas, rollback y timeout. Único archivo de código añadido durante el cierre PostgreSQL; no se requirieron correcciones adicionales de producción. |
| `backend/src/test/java/com/tesoreria/organization/OrganizationServiceTest.java` | Adapta la construcción del servicio a su dependencia de usuarios. |
| Este informe | Evidencia, alcance y limitaciones de la entrega. |

Se preservaron los cambios preexistentes del árbol de trabajo. No se modificaron frontend, contratos de autenticación, configuración de seguridad, dependencias ni migraciones en esta fase. No hubo despliegues ni acciones sobre cuentas reales.

## Reglas verificadas

- ADMIN no puede crear/promover ni editar, bloquear, desactivar, degradar o eliminar un SUPER_ADMIN global. Las mutaciones de cuentas de otro curso mantienen el rechazo por ámbito (404).
- La reproducción original `DELETE /api/v1/users/{id}` con JWT de ADMIN contra SUPER_ADMIN global devuelve **403**, con la fila completa intacta. La auditoría histórica registraba **204** y eliminación.
- Debe quedar al menos otro SUPER_ADMIN habilitado, desbloqueado y sin organización inactiva antes de retirar o restringir uno. El rechazo devuelve **409**.
- SUPER_ADMIN conserva la gestión de otra cuenta SUPER_ADMIN cuando queda respaldo disponible; el último conserva la edición legítima de su perfil.
- ADMIN conserva la eliminación de usuarios de su curso y las reglas anteriores sobre el último ADMIN y el propio cambio de rol.
- USER tampoco puede invocar eliminación o cambio de rol mediante el proxy del servicio, aun sin pasar por el controlador.
- Dos eliminaciones simultáneas sobre los dos SUPER_ADMIN se serializan: una finaliza y la otra devuelve conflicto; queda una cuenta. La prueba utiliza dos hilos y transacciones independientes.
- Las organizaciones que contienen SUPER_ADMIN requieren resolver esas cuentas antes de su eliminación o desactivación; no se permite que una cascada eluda las validaciones individuales.

## Validaciones

Primera ejecución dirigida:

```powershell
cd backend
.\gradlew.bat test --tests user.SuperAdminProtectionIntegrationTest --tests user.UserServiceTest --tests com.tesoreria.organization.OrganizationServiceTest
```

Resultado: aprobada. Después se amplió la matriz con PUT de desactivación y concurrencia.

Regresión backend:

```powershell
.\gradlew.bat test pmdMain -PexcludeTags=postgres
```

Resultado de pruebas: **747 pruebas, 0 fallos, 0 errores, 0 omitidas**; 24 casos de la suite nueva. PMD detectó duplicación de la expresión de autorización; se centralizó en una constante sin suprimir reglas. Se añadieron dos casos de regresión adicionales.

Gate de implementación, previo al cierre PostgreSQL:

```powershell
.\gradlew.bat check -PexcludeTags=postgres
```

Resultado de ese gate: **BUILD SUCCESSFUL**, **750 pruebas, 0 fallos, 0 errores, 0 omitidas**. Incluye **27 casos** de `SuperAdminProtectionIntegrationTest`, la prueba concurrente y la creación legítima de otro SUPER_ADMIN. PMD y verificación de cobertura JaCoCo aprobados, sin reducir umbrales ni excluir código. `pmdTest` permanece deshabilitado por la configuración preexistente del proyecto.

`git diff --check` aprobado sobre los archivos versionados de esta fase; los dos archivos nuevos también se comprobaron sin espacios finales. No se ejecutaron pruebas frontend porque no se modificaron sus archivos ni contratos de respuesta exitosos.

## Cierre de validación PostgreSQL

Se utilizó **PostgreSQL 16.14**, imagen local `postgres:16-alpine`, mediante Testcontainers. La suite nueva usa la base desechable `phase1_superadmin_isolated`; las suites de regresión también crean contenedores independientes. No se consultó ni conectó producción. PostgreSQL 16 es la versión principal configurada en el proyecto; no se verificó el parche exacto del servidor productivo.

El esquema de cada contenedor vacío se preparó con los scripts Flyway ya existentes hasta V55 y se comprobó con Hibernate `validate`, incluidas las FK reales de eliminación en cascada. **No se crearon ni modificaron migraciones; no se aplicó ninguna sobre bases persistentes o producción.** La exclusión de PostgreSQL indicada en la validación inicial queda resuelta por esta ejecución complementaria.

Comando final, desde `backend`:

```powershell
.\gradlew.bat test --tests user.SuperAdminPostgresProtectionTest --tests user.SA04PostgresProfileSecurityTest --tests user.SA05PostgresSessionSecurityTest --tests user.SA06PostgresPasswordSessionTest --tests user.SA07PostgresRefreshReuseTest
```

| Suite PostgreSQL | Pruebas | Fallos / errores / omitidas |
| --- | ---: | --- |
| Protección SUPER_ADMIN | 40 | 0 / 0 / 0 |
| Perfiles y autorización SA-04 | 27 | 0 / 0 / 0 |
| Seguridad de sesiones SA-05 | 13 | 0 / 0 / 0 |
| Contraseñas y sesiones SA-06 | 6 | 0 / 0 / 0 |
| Refresh y reutilización SA-07 | 4 | 0 / 0 / 0 |
| **Total** | **90** | **0 / 0 / 0** |

Resultado: **BUILD SUCCESSFUL**. La primera ejecución PostgreSQL también aprobó 39 casos; la definitiva añade el timeout controlado y las cuatro suites de regresión. Los resultados finales se conservan resumidos en [evidencia PostgreSQL](evidence/phase-1-postgres-results.json); los XML completos quedan en `backend/build/test-results/test/`.

### Concurrencia, transacciones y bloqueos

- Aislamiento JDBC comprobado: **READ COMMITTED**. Las solicitudes HTTP concurrentes no tienen una transacción envolvente del test: cada servicio confirma o revierte su propia transacción y las verificaciones posteriores leen el estado confirmado.
- **18 carreras de cuentas**: DELETE/DELETE, PATCH estado/PATCH estado, PUT desactivación/PUT desactivación, PUT bloqueo/PUT bloqueo, DELETE/PATCH estado y DELETE/PUT bloqueo. Cada combinación se ejecutó tres veces con dos SUPER_ADMIN y objetivos cruzados, respetando la prohibición existente de autodesactivación. En cada carrera hubo un éxito (200 o 204) y un conflicto (409); quedó exactamente un SUPER_ADMIN disponible.
- **Tres carreras de organizaciones**: eliminación de organización contra eliminación de cuenta global, desactivación de organización contra eliminación de cuenta global, y eliminación/desactivación simultáneas de la organización del único SUPER_ADMIN. Las operaciones sobre organizaciones protegidas devolvieron 409 y preservaron el respaldo o la única cuenta disponible.
- En esas **21 carreras / 42 solicitudes**, una conexión de control mantuvo los bloqueos hasta observar **dos transacciones esperando** mediante `pg_stat_activity` y `pg_blocking_pids`. Al hacer rollback de la conexión de control, las solicitudes avanzaron y terminaron dentro de sus límites. Esto prueba contención efectiva, no solo inicio simultáneo de hilos.
- Se comprobó que un rollback forzado después de editar una cuenta no confirma el nombre temporal y libera los bloqueos. Una solicitud independiente posterior confirmó la edición legítima con 200.
- Se forzó un timeout local de bloqueo de 300 ms: SQLSTATE **55P03**, rollback sin cambios y solicitud posterior con 200. No quedaron conexiones `idle in transaction` en los escenarios de rollback/timeout.
- **Cero deadlocks observados**: contador `pg_stat_database.deadlocks` sin incremento y sin `deadlock detected` en logs del contenedor. Se activaron `deadlock_timeout=200ms` y `log_lock_waits` para la instrumentación de pruebas. Los límites de bloqueo de 8 s y sentencia de 12 s también son exclusivos de estas pruebas; no alteran la configuración productiva.
- Las bajas legítimas de organizaciones sin SUPER_ADMIN se confirmaron: desactivación, reactivación y eliminación con cascada del ADMIN del curso, conservando el SUPER_ADMIN global. La regresión de roles, perfiles, sesiones, contraseñas y refresh aprobó todos sus casos. La reproducción original sigue rechazada con 403 y persistencia intacta sobre PostgreSQL.

## Riesgos y límites pendientes

- La evidencia acredita PostgreSQL local real, no el binario ni la configuración desplegados. No hubo despliegues ni uso de datos reales.
- Los bloqueos de SUPER_ADMIN se comparten entre las mutaciones administrativas de cuentas y las bajas de organizaciones. Su espera y liberación quedaron verificadas, pero no se hizo una prueba de carga ni se garantiza ausencia de deadlocks ante cualquier futura combinación de operaciones.
- Las escrituras SQL directas y operaciones externas al backend no pasan por estas validaciones. La solución no añade restricciones de esquema.
- La regla conserva cuentas disponibles según su estado persistido; no garantiza disponibilidad de credenciales, correo o recuperación de una persona administradora.
- Los otros hallazgos de la auditoría, incluido MFA, permanecen fuera del alcance. **La Fase 2 no se inició y requiere autorización expresa.**

**Conclusión para MFA/TOTP:** no se detectó un riesgo pendiente de la Fase 1 que impida avanzar con su integración. La futura implementación deberá conservar el orden de adquisición de bloqueos y las reglas de revocación de sesiones verificadas. Esto no certifica MFA ni cierra los demás hallazgos de la auditoría.
