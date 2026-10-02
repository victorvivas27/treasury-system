# Verificación independiente de SA-01 — 2026-10-01

Este documento conserva la evidencia anterior a la corrección. La corrección y su nueva verificación están en [SA01_TRANSACTION_FIX_VERIFICATION.md](SA01_TRANSACTION_FIX_VERIFICATION.md).

Resultado: **no verificado localmente**. Se detuvo la verificación al reproducir un defecto de rollback, conforme a la instrucción del usuario. No se modificó implementación productiva ni se avanzó a SA-02.

## Defecto reproducible

Nueva prueba: `backend/src/test/java/treasury/SA01RollbackAdversarialTest.java`, método `rollbackMustNotPublishUncommittedFinancialConfiguration`.

Usa Spring completo, Hibernate/H2, CacheManager, proxies y transaction manager reales. Crea dos organizaciones con datos sintéticos distintos: A tiene cuota 70000; B, 80000. No usa infraestructura ni datos productivos.

1. Vaciar las cinco cachés y calentar las de B.
2. Autenticar A en el contexto de test e iniciar una transacción real con TransactionTemplate.
3. Guardar cuota 99000 para A mediante TreasuryUseCase.
4. Consultar getConfig para A dentro de esa transacción, con su caché fría; devuelve 99000.
5. Marcar rollback y terminar la transacción.
6. Consultar directamente el repositorio: A sigue teniendo 70000, como corresponde.
7. Consultar B: conserva la misma entrada cacheada.
8. Consultar A mediante el servicio: **devuelve 99000 en lugar de 70000**.

Reproducción desde `backend`:

```powershell
.\gradlew.bat --offline test --tests 'treasury.SA01RollbackAdversarialTest' --no-daemon
```

Evidencia: `backend/build/test-results/test/TEST-treasury.SA01RollbackAdversarialTest.xml`, fallo en línea 79: `expected: <70000> but was: <99000>`.

## Causa

getConfig usa `@Cacheable(sync = true)`. Esta ruta llena Caffeine mediante `Cache.get(key, Callable)`. El bytecode de TransactionAwareCacheDecorator de Spring 7.0.9 instalado se inspeccionó con javap: ese método delega directamente a la caché subyacente; no difiere la carga hasta commit. En cambio, put y evict registran callbacks transaccionales.

La lectura publica el valor no confirmado. La invalidación solicitada por saveConfig no se ejecuta al hacer rollback, de modo que el valor revertido queda en caché. TenantCaffeineCache solo personaliza evict, sin interceptar la carga sincronizada. Las cinco lecturas financieras usan sync=true; esta reproducción demuestra el fallo específicamente en annualFeeConfigurationByYear, sin afirmar haberlo reproducido en las otras cuatro.

No se observó contaminación A/B en esta prueba: el defecto es consistencia transaccional dentro de A. Impide dar por satisfecho el criterio de funcionamiento después de rollback. El patrón sync=true ya existía antes de SA-01: es una limitación preexistente que la remediación actual conserva, no una colisión nueva introducida por las claves tenant.

## Ejecución y alcance

Comando de regresión ejecutado:

```powershell
.\gradlew.bat --offline test --tests 'treasury.*' --tests 'familia.*' --tests 'com.tesoreria.organization.TenantIsolationIntegrationTest' --tests 'com.tesoreria.treasury.*' --no-daemon
```

**132 tests: 131 aprobados, 1 fallido, 0 errores, 0 omitidos.** Los 131 existentes pasan; el nuevo test adversarial falla. Una primera ejecución no llegó a los tests por BOM UTF-8 en el archivo nuevo; se corrigió únicamente esa codificación y se repitió la ejecución.

Los tests existentes de caché ejecutados son TreasuryCacheIntegrationTest (3), TreasuryTenantCacheIntegrationTest (10) y TreasuryTenantCachePersistenceTest (2). Cubren las cinco cachés: annualFeeConfigurations, annualFeeConfigurationByYear, contributionConfigurations, treasuryDashboardOverview y contributionSummary. Incluyen ambos órdenes A/B, lecturas calientes, invalidaciones aisladas, años adicionales, callbacks de commit y rollback; parte de esa cobertura usa repositorios mock y parte Hibernate/H2. La prueba nueva añade un rollback real con llenado de caché durante la transacción, ausente en la cobertura anterior.

También se ejecutaron TreasuryServiceTest, tests de familia, TenantIsolationIntegrationTest y los tests bajo com.tesoreria.treasury seleccionados por el comando. El reporte HTML de Gradle contiene el detalle de cada clase.

PostgreSQL: bloqueado por infraestructura. `docker info --format '{{.ServerVersion}}'` falló porque no existe el pipe dockerDesktopLinuxEngine. El proyecto dispone de Testcontainers/PostgreSQL, pero no se ejecutó una prueba SA-01 contra PostgreSQL. No se usó un servidor externo como sustituto.

HTTP/API con login/JWT reales: no ejecutado, por detención ante el defecto. Las invocaciones de TreasuryController en los tests existentes son invocaciones de bean, no HTTP; no equivalen a validar autenticación ni endpoints completos.

Concurrencia A/B, tests unitarios nuevos de claves/identidad inválida y suite completa: no ejecutados, por detención ante el defecto. No se atribuyen resultados de ejecuciones históricas a esta verificación.

## Revisión de código y riesgos pendientes

Se leyeron SECURITY_AUDIT.md, cambios SA-01, TenantCacheKeys, TenantCaffeineCache, CacheConfig, resolver tenant y el consumidor de CacheManager DashboardPerformanceProbe. Se buscaron todas las anotaciones de caché y accesos a CacheManager en código principal. Las anotaciones financieras encontradas en TreasuryService, TreasuryController y FamiliaService usan claves tenant; no apareció una invalidación allEntries en estos consumidores. No se completó la revisión posterior a todas las capas porque se encontró el defecto antes.

El resolver conserva fallback a organización por defecto cuando no hay principal tenant o su organizationId es nulo. TenantCacheKeys exige resolver no nulo, pero no valida positividad del ID y sus records públicos permiten construcción directa. Estos comportamientos requieren pruebas pendientes; no se declaran vulnerabilidades demostradas. La capacidad compartida y la caché local por instancia siguen siendo límites existentes.

| Escenario | Resultado | Evidencia |
|---|---|---|
| Cinco cachés A/B frías y calientes | Aprobado en cobertura existente | 15 tests de caché existentes |
| Invalidaciones aisladas A/B y commit | Aprobado en cobertura existente | TreasuryTenantCacheIntegrationTest / PersistenceTest |
| Rollback sin lectura que llene caché | Aprobado en cobertura existente | deferredInvalidationDoesNotRunOnRollback |
| Lectura fría dentro de transacción revertida | **Fallido** | SA01RollbackAdversarialTest:79; DB=70000, caché=99000 |
| B conserva entrada tras rollback de A | Aprobado en prueba nueva | assertSame previo al fallo |
| Regresión Treasury/familia/tenant | 131 existentes aprobados | Reportes XML/HTML Gradle |
| PostgreSQL real | Bloqueado por infraestructura | Docker pipe ausente |
| HTTP real con JWT A/B y todos los endpoints | No ejecutado | Detención solicitada al encontrar defecto |
| Concurrencia A/B | No ejecutado | Detención solicitada al encontrar defecto |
| Claves e identidades inválidas, pruebas nuevas | Pendiente | Detención solicitada al encontrar defecto |
| Suite completa y revisión final integral | Pendiente | Detención solicitada al encontrar defecto |
