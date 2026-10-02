# SA-01: corrección de publicación transaccional y verificación

Actualización posterior: Docker ya está disponible. La validación PostgreSQL y la nueva regresión completa se documentan en [SA01_POSTGRES_VERIFICATION.md](SA01_POSTGRES_VERIFICATION.md). Las menciones de PostgreSQL pendiente abajo describen la ejecución anterior.

Fecha: 2026-10-01. Alcance exclusivo: defecto de consistencia de caché confirmado durante la verificación independiente. Sin cambios a SA-02 ni refactors ajenos.

## Causa y solución

Spring TransactionAwareCacheDecorator difiere put/evict hasta commit, pero delega `get(key, Callable)` directamente a Caffeine. Las cinco lecturas financieras usan `@Cacheable(sync=true)`, por lo que una lectura fría dentro de una transacción podía publicar una instantánea no confirmada. Al hacer rollback, se cancelaba la invalidación, pero permanecía esa instantánea.

Único archivo productivo modificado en esta corrección: `backend/src/main/java/com/tesoreria/shared/infrastructure/cache/TenantCaffeineCache.java`. Se sobrescribe la carga sincronizada: con transacción real activa, ejecutar el loader directamente sin consultar ni llenar la caché compartida. Esto también evita que una caché caliente oculte los cambios propios de la transacción. Fuera de una transacción se conserva la carga atómica original de Caffeine y sync=true.

No se publica una instantánea capturada mediante un callback afterCommit: podría haberse vuelto obsoleta frente a otro commit concurrente. Tras commit, las invalidaciones existentes se ejecutan por tenant y la siguiente lectura ordinaria llena la caché con datos confirmados. Una lectura transaccional por sí sola no calienta la caché, incluso si luego confirma; las pruebas comprueban el llenado posterior al commit. No se apaga caching ni se borran cachés globalmente al hacer rollback.

Se conservan claves tenant-aware, TTL de 30 minutos para configuraciones y 1 minuto para dashboard/resumen, capacidades, anotaciones, contratos HTTP e invalidaciones existentes. Coste: las lecturas dentro de transacciones consultan DB y pueden repetir trabajo; no comparten cargas entre transacciones, porque cada una puede tener una vista diferente de DB. La protección contra stampede de lecturas ordinarias permanece intacta.

## Cobertura

SA01RollbackAdversarialTest se mantuvo intacto y pasa: DB y servicio devuelven 70000 después de rollback, y B conserva su entrada.

Tests nuevos en esta corrección:

- TenantCacheKeysIndependentTest: 4 casos; unicidad entre 100 organizaciones y años límite; separación de listados; nulidad explícita del resolver; fallback existente sin principal/organizationId; IDs negativos/cero distintos pero no validados por la fábrica.
- SA01TransactionIsolationTest: 12 combinaciones commit/rollbackOnly/RuntimeException × fría/caliente × A/B; verifican las cinco cachés, cambios propios dentro de la transacción, ausencia de publicación antes de commit, valores confirmados posteriores y preservación por identidad de todas las entradas del otro tenant.
- La misma clase prueba ocho hilos y 160 rondas de lectura de las cinco cachés (800 consultas), desde frío hacia caliente, sin contaminación A/B.
- La misma clase añade 3 escenarios con transacciones concurrentes abiertas de A y B: lectores externos no reciben las modificaciones pendientes; tras commit, rollbackOnly o excepción, las cinco respuestas mantienen los valores esperados. Coordinación por latches, sin sleeps.
- SA01HttpIsolationTest: servidor Spring/Tomcat real en puerto aleatorio, usuarios ADMIN de organizaciones distintas que comparten correo, contraseñas BCrypt de test y login HTTP real con selección de organizationId. Los JWT proceden del flujo real con refresh/session persistidos; no se fabrican tokens ni se sustituye el filtro de seguridad.

Prueba HTTP: dos órdenes de calentamiento, tres rondas de cuatro identidades alternadas y cinco rutas = **120 respuestas financieras**, todas HTTP 200 con contenidos esperados. Configuración individual/listado comprueban ID y monto; aportes comprueba monto y nombre del tenant; dashboard comprueba ingresos y movimientos; resumen comprueba familias. Los DTO financieros no exponen organizationId; se validan identificadores persistidos y contenido de cada organización.

Rutas bajo `/api/v1/tesoreria`:

| Caché | Endpoint HTTP comprobado |
|---|---|
| annualFeeConfigurations | GET /configuraciones |
| annualFeeConfigurationByYear | GET /configuraciones/2026 |
| contributionConfigurations | GET /aportes/configuraciones?year=2026 |
| treasuryDashboardOverview | GET /dashboard/overview?year=2026 |
| contributionSummary | GET /aportes/resumen?year=2026 |

Estas son las cinco rutas que exponen directamente las lecturas corregidas. No se afirma cobertura HTTP de cada ruta de escritura/pago que usa indirectamente configuración. La regresión incluye los tests existentes de TransferPaymentService.

## Regresión e infraestructura

Comando final: `gradlew.bat --offline test -PexcludeTags=postgres --no-daemon`. **422 tests aprobados, 0 fallos, 0 errores, 0 omitidos entre los seleccionados; BUILD SUCCESSFUL.** Son 400 existentes más 22 de esta verificación/corrección, incluido el adversarial original. XML/HTML en `backend/build/test-results/test` y `backend/build/reports/tests/test`.

Incluye TreasuryServiceTest, 15 tests existentes de caché, TreasuryTenantCachePersistenceTest/H2, TenantIsolationIntegrationTest, familia, controllers/API existentes y demás suite disponible. No se repiten resultados históricos como evidencia de esta ejecución.

PostgreSQL real **pendiente**: Docker vuelve a fallar porque no existe el pipe dockerDesktopLinuxEngine. Se excluye explícitamente el tag postgres del comando; ese filtro excluye la clase Testcontainers existente PostgresPerformanceQueryIntegrationTest, que contiene 7 métodos. Los tests excluidos por selección no figuran como skipped en los XML. No se ejecutó una validación PostgreSQL SA-01 ni se usó infraestructura externa/productiva.

Durante la primera regresión ampliada pasó el adversarial y la cobertura transaccional/concurrente; falló un montaje nuevo de null (Mockito devolvía 0 para Long). Se añadió thenReturn(null) explícito para ensayar la condición solicitada. No se cambió implementación para acomodar esa prueba. Una invocación de Gradle usó un flag incorrecto (--exclude-tags) y falló antes de ejecutar tests; se corrigió al parámetro -PexcludeTags del proyecto.

## Revisión y límites

Se revisaron TenantCacheKeys, TenantCaffeineCache, CacheConfig, TreasuryService, TreasuryController, FamiliaService y DashboardPerformanceProbe, más las referencias a las cinco lecturas en todo el código principal. No hay otros @Cacheable ni productores directos vía CacheManager encontrados. DashboardPerformanceProbe consulta presencia/estadísticas de la caché nativa, sin escribir. TransferPaymentService consume getConfig del proxy real; la política de bypass transaccional también lo cubre. Las llamadas internas de TreasuryService no atraviesan el proxy de caché.

No se encontraron claves por año solamente, `all` global ni allEntries en estos consumidores. Las invalidaciones usan tenant capturado y mantienen el comportamiento transaccional existente.

Riesgos residuales: PostgreSQL sin verificar; Caffeine local por instancia y propagación entre instancias por TTL; capacidad compartida; fallback a organización por defecto e IDs inválidos no rechazados por TenantCacheKeys, conservados por alcance. La corrección protege las rutas síncronas productivas actuales; introducir en el futuro cargas asíncronas, putIfAbsent o escrituras directas a la caché nativa requeriría revisar su seguridad transaccional. No se ejecutó el gate PMD/coverage `check`; el resultado de la suite test no equivale a ese gate.

SA-01 no se declara completamente cerrado mientras PostgreSQL siga pendiente.

| Escenario | Resultado | Evidencia |
|---|---|---|
| Adversarial original sin cambios | Aprobado | SA01RollbackAdversarialTest: 1/1 |
| Cinco cachés, fría/caliente, commit | Aprobado; calentamiento posterior al commit | SA01TransactionIsolationTest |
| Cinco cachés, rollbackOnly y RuntimeException | Aprobado | 12 combinaciones A/B/fría/caliente/resultado |
| A rollback preserva B y viceversa | Aprobado | assertSame de las cinco entradas del otro tenant |
| Concurrencia de lecturas A/B | Aprobado | 8 hilos, 800 consultas |
| Transacciones A/B pendientes frente a lectores externos | Aprobado | 3 escenarios coordinados por latches |
| Claves por tenant/año/listado e identidad límite | Aprobado; fallback e IDs sin validar documentados | TenantCacheKeysIndependentTest: 4/4 |
| HTTP real, login/JWT, mismo correo en A/B | Aprobado | 2 logins y 120 respuestas financieras, 5 rutas |
| Regresión disponible, incluida Treasury | Aprobado | 422 tests, 0 fallos/errores |
| PostgreSQL real | Pendiente por infraestructura | dockerDesktopLinuxEngine ausente |
| Claves, TTL e invalidaciones aisladas | Conservados | Revisión de código y tests existentes de caché |
