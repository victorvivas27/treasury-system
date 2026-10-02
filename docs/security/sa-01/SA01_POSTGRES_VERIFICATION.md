# SA-01: verificación adicional con PostgreSQL real

Fecha: 2026-10-01. Docker Desktop disponible (servidor 28.4.0). Se retoma exclusivamente la verificación pendiente de SA-01. No se modifica código productivo ni las aserciones existentes.

## Pruebas nuevas

Cuatro variantes heredan las pruebas originales y sustituyen la conexión H2 por un contenedor desechable `postgres:16-alpine` mediante Testcontainers y DynamicPropertySource:

| Clase | Tests | Cobertura |
|---|---:|---|
| SA01PostgresRollbackTest | 2 | Adversarial original sin cambios y comprobación de DB PostgreSQL |
| SA01PostgresTransactionTest | 17 | Cinco cachés; 12 combinaciones commit/rollbackOnly/RuntimeException, fría/caliente y A/B; 800 consultas concurrentes; 3 escenarios de transacciones concurrentes pendientes; comprobación de DB |
| SA01PostgresHttpTest | 2 | Login HTTP real, JWT y 120 respuestas financieras alternadas en cinco rutas; comprobación de DB |
| SA01PostgresPersistenceTest | 3 | Ambos órdenes A/B, caché caliente e invalidaciones confirmadas aisladas; comprobación de DB |

Las cuatro comprobaciones de DB verifican `DatabaseMetaData.getDatabaseProductName() == "PostgreSQL"`. No hay sustitución H2 silenciosa. Spring, Hibernate, CacheManager, beans financieros, transaction manager y filtros de seguridad son reales. Datos sintéticos y usuarios de test; sin conexiones a producción.

Comando inicial: `gradlew.bat --offline test --tests 'treasury.SA01Postgres*' --no-daemon`: **24 tests aprobados, 0 fallos y 0 errores**. Aparecieron advertencias durante el cierre por detener los contenedores antes de cerrar los contextos Spring. Se añadió DirtiesContext(AFTER_CLASS) únicamente a las variantes nuevas para cerrar los contextos al finalizar cada clase; la suite final repite las pruebas con ese ajuste de lifecycle.

La cobertura financiera usa Hibernate create-drop sobre PostgreSQL real con Flyway deshabilitado, igual que el harness H2 original. Esto verifica motor/driver/transacciones y no constituye una prueba financiera específica del esquema migrado. La suite completa incluye separadamente PostgresPerformanceQueryIntegrationTest, que activa Flyway y valida el esquema migrado.

## HTTP y cachés

Las cinco cachés: annualFeeConfigurations, annualFeeConfigurationByYear, contributionConfigurations, treasuryDashboardOverview y contributionSummary.

Cinco rutas GET bajo `/api/v1/tesoreria`: `/configuraciones`, `/configuraciones/2026`, `/aportes/configuraciones?year=2026`, `/dashboard/overview?year=2026`, `/aportes/resumen?year=2026`.

Tomcat en puerto aleatorio, mismo correo con dos usuarios ADMIN de organizaciones distintas, login real seleccionando organizationId, contraseñas BCrypt de test y JWT emitidos por el flujo real. Dos órdenes de calentamiento y consultas repetidas con caché caliente. Se comprueban HTTP 200, IDs de configuración, montos, nombres, movimientos y cantidades de familias. No se afirma cobertura HTTP de todas las operaciones de escritura/pago indirectas.

## Suite final y límites

La suite final se ejecuta sin excluir tags: `gradlew.bat --offline test --no-daemon`, con APP_PROFILE=test y SPRING_APPLICATION_JSON que deshabilita importación de `.env`, GCS y Web Push. Los tests PostgreSQL existentes usan también un contenedor test por ServiceConnection. No se modifica su implementación.

**Resultado final: 453 tests aprobados, 0 fallos, 0 errores, 0 omitidos; BUILD SUCCESSFUL.** Incluye los 422 tests de la ejecución anterior, los 24 nuevos casos PostgreSQL de SA-01 y los 7 tests PostgreSQL existentes que anteriormente estaban excluidos. No se suman ejecuciones repetidas para inflar este total.

PostgresPerformanceQueryIntegrationTest pasó sus 7 casos: su log confirma PostgreSQL **16.14**, aplicación de **48 migraciones Flyway** y esquema en versión v48. Las cuatro variantes financieras pasaron otra vez con el cierre de contexto corregido. El adversarial original también volvió a pasar sobre H2 y PostgreSQL.

Evidencia: `backend/build/test-results/test/TEST-treasury.SA01Postgres*.xml`, `TEST-performance.PostgresPerformanceQueryIntegrationTest.xml`, resto de XML de la suite y `backend/build/reports/tests/test/index.html`. `git diff --check` aprobado.

Se mantienen los riesgos existentes: caché local por instancia, propagación entre instancias por TTL y mayor uso de DB durante transacciones. La lectura transaccional evita llenar caché; la siguiente lectura ordinaria tras commit la llena con datos confirmados. No se validan despliegue productivo ni gate completo PMD/coverage `check`.

Los criterios locales de aislamiento, frío/caliente, invalidación, commit/rollback, HTTP real, PostgreSQL, concurrencia y regresión Treasury quedan aprobados dentro de este alcance. No se encontraron defectos nuevos de SA-01. No se avanzó a SA-02.

| Escenario | Resultado | Evidencia |
|---|---|---|
| Motor PostgreSQL real | Aprobado | 4 comprobaciones JDBC; logs PostgreSQL 16.14 |
| Cinco cachés: aislamiento A/B frío/caliente | Aprobado | Variantes Persistence y Transaction |
| Invalidaciones aisladas tras commit | Aprobado | Persistence en ambos órdenes y Transaction |
| Adversarial original | Aprobado sin modificaciones | Rollback: DB y caché vuelven al monto confirmado |
| RollbackOnly y RuntimeException | Aprobado | 12 combinaciones en Transaction |
| Rollback A conserva B y viceversa | Aprobado | Identidad de las cinco entradas del otro tenant |
| Concurrencia A/B | Aprobado | 8 hilos, 800 consultas en PostgreSQL |
| Transacciones pendientes frente a lectores externos | Aprobado | 3 escenarios commit/rollback/excepción |
| HTTP con login/JWT real | Aprobado | 120 respuestas financieras sobre PostgreSQL, 5 rutas |
| Regresión H2 y Treasury | Aprobado | Incluida en suite final |
| PostgreSQL con migraciones existentes | Aprobado | 7 tests; 48 migraciones Flyway |
| Suite completa backend | Aprobado | 453 tests; 0 fallos/errores/omitidos |
