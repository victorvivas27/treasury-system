# SA-05 — Sesiones de cuentas bloqueadas o desactivadas

**Remediado y validado localmente:** 642 tests backend y 431 frontend aprobados, con 13 pruebas SA-05 sobre PostgreSQL. Cobertura y compilación pasan; PMD conserva 19 incidencias preexistentes. La emisión y renovación de refresh comprueban el estado actual de cuenta y organización; el bloqueo/desactivación administrativa revoca todos los refresh persistidos del usuario dentro de la misma transacción. Desbloquear o reactivar no recupera esas sesiones: se requiere un nuevo login.

La familia de sesión del JWT se consulta junto con el ID de su propietario. Emisión, rotación y administración usan primero el bloqueo de la fila de usuario, evitando que una sesión concurrente quede fuera de la revocación.

Ver el [informe de corrección y validación](SA-05-CIERRE.md). No se ha desplegado SA-05 ni ejecutado su colección Bruno en producción.

## Bruno

La colección `api-tests/sa-05/01-Bloqueo-y-sesiones.yml` requiere un entorno `tesoreria` con `Url_Base`, `Admin_Email`, `Admin_Password`, `User_Email` y `User_Password`. No incluir credenciales en Git ni en reportes de cuerpos/headers.

Desde una colección que tenga esas variables configuradas:

```text
bru run ./sa-05 -r --env tesoreria --disable-cookies
```

Usar exclusivamente un USER dedicado a pruebas, inicialmente activo y desbloqueado. La prueba bloquea temporalmente esa cuenta y revoca todas sus sesiones; intenta restaurar el desbloqueo en `finally`. Si hay un fallo de red durante la restauración, comprobar el estado y desbloquearla manualmente con ADMIN. Los tokens revocados no se restauran. La colección no desactiva USER porque su reactivación requiere el flujo de invitación de SA-02.
