# SA-04 — Impedir auto-reactivación y auto-desbloqueo

**Estado: remediado en código y validado localmente.** Perfil propio y administración tienen contratos separados; el perfil permite modificar únicamente `nombre`. Despliegue y verificación en producción pendientes.

Validación: 611 tests backend y 431 frontend aprobados; 94 tests PostgreSQL incluidos. JaCoCo pasa. PMD conserva 19 incidencias preexistentes, sin incidencias nuevas.

El [informe de cierre](SA-04-CIERRE.md) reúne la inspección, la solución, las pruebas con H2/PostgreSQL, los resultados y la relación pendiente con SA-05.

Los tests permanecen en `backend/src/test`; los reportes generados por Gradle permanecen en `backend/build`. Las rutas del informe son relativas a la raíz del repositorio.
