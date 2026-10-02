# SA-01 — Aislamiento y consistencia de cachés financieras

**Estado: verificado localmente con H2 y PostgreSQL.** La suite final ejecutó 453 tests, sin fallos, errores ni omitidos. No se ha validado el despliegue productivo.

Leer primero el [informe final con PostgreSQL](SA01_POSTGRES_VERIFICATION.md).

| Documento | Contenido |
|---|---|
| [Verificación independiente inicial](SA01_INDEPENDENT_VERIFICATION.md) | Reproducción del defecto de rollback encontrado durante la verificación |
| [Corrección y verificación](SA01_TRANSACTION_FIX_VERIFICATION.md) | Causa raíz, solución y pruebas H2, HTTP y concurrencia |
| [Verificación final con PostgreSQL](SA01_POSTGRES_VERIFICATION.md) | Pruebas PostgreSQL y regresión completa de 453 tests |

Los informes anteriores conservan la evidencia histórica; el último registra el resultado final. Las rutas de código y de reportes Gradle escritas en estos documentos son relativas a la raíz del repositorio.

Los tests de SA-01 permanecen en [backend/src/test/java/treasury](../../../backend/src/test/java/treasury). La implementación de caché está en [backend/src/main/java/com/tesoreria/shared/infrastructure/cache](../../../backend/src/main/java/com/tesoreria/shared/infrastructure/cache).
