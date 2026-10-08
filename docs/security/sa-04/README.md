# SA-04 — Impedir auto-reactivación y auto-desbloqueo

**Estado: remediado, validado localmente y desplegado en producción el 2026-10-08.** Perfil propio y administración tienen contratos separados; el perfil permite modificar únicamente `nombre`. Bruno aprobó 10/10 comprobaciones productivas. Estados inicialmente bloqueados/deshabilitados, aislamiento con ADMIN ordinario y comprobación interactiva del frontend siguen pendientes para el cierre completo. Ver [evidencia productiva](SA04_PRODUCTION_CHECK.md).

Validación: 611 tests backend y 431 frontend aprobados; 94 tests PostgreSQL incluidos. JaCoCo pasa. PMD conserva 19 incidencias preexistentes, sin incidencias nuevas.

El [informe de cierre](SA-04-CIERRE.md) reúne la inspección, la solución, las pruebas con H2/PostgreSQL, los resultados y la relación pendiente con SA-05.

Los tests permanecen en `backend/src/test`; los reportes generados por Gradle permanecen en `backend/build`. Las rutas del informe son relativas a la raíz del repositorio.
