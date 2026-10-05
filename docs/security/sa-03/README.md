# SA-03 — Identidad de cuenta en HTTP y WebSocket

**Estado: remediado en código y validado localmente.** La validación del 4 de octubre de 2026 registró 553 tests sin fallos, errores ni omisiones, incluidas 18 pruebas específicas de SA-03 y regresión STOMP real con H2 y PostgreSQL. El despliegue y la verificación en producción siguen pendientes.

El [informe de corrección y verificación](SA-03-CIERRE.md) documenta la causa original, la identidad por `userId`, la validación de organización, el enrutamiento de colas privadas, la autorización de destinos STOMP, los archivos modificados, las pruebas y los riesgos residuales.

Las rutas de código y reportes Gradle del informe son relativas a la raíz del repositorio. Los tests permanecen en `backend/src/test` y los reportes generados en `backend/build`.

PMD mantiene 19 incidencias preexistentes; el informe no declara aprobado el quality gate general ni cerrado el hallazgo en producción.
