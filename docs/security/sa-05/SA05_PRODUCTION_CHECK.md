# SA-05 — Despliegue y comprobación productiva

Fecha: 2026-10-08.

## Despliegue

- Corrección: `902c3aa063fbeec15e01c2906ed0e88381350372`, subida a la rama `dev` con autorización del usuario.
- [GitHub Actions 37820810281](https://github.com/victorvivas27/treasury-system/actions/runs/37820810281): terminado con éxito; input `release_ref` igual al SHA de la corrección.
- Cloud Run: proyecto `treasury-system-app-vivas`, región `southamerica-west1`, servicio `backend`.
- Imagen activa: `southamerica-west1-docker.pkg.dev/treasury-system-app-vivas/docker-images/tesoreria-backend:902c3aa063fbeec15e01c2906ed0e88381350372`.
- Revisión creada y lista: `backend-00125-87h`, con el 100 % del tráfico.
- API comprobada: `https://backend-882988140149.southamerica-west1.run.app/tesoreria/api/v1`.

El frontend conserva la versión desplegada de SA-04; SA-05 no cambia sus contratos ni requiere un despliegue frontend.

## Bruno

Bruno CLI 3.3.0, colección `api-tests/sa-05/01-Bloqueo-y-sesiones.yml`, entorno `tesoreria` de la colección WSL. Ejecución con `--disable-cookies --noproxy --bail`; las cookies de cada sesión se enviaron explícitamente, junto con su CSRF correspondiente. No se incluyen credenciales, tokens, cookies ni identidades personales en este informe. Las copias temporales del entorno se eliminaron al terminar.

**Resultado: exit 0, 14/14 tests aprobados, 12 708 ms.** Bruno cuenta una petición principal; su script envía 17 peticiones adicionales de forma secuencial.

| Comprobación | Resultado |
|---|---|
| Login administrativo | 200, SUPER_ADMIN |
| Login USER y dos sesiones de prueba | 200 |
| Refresh previo al bloqueo con CSRF válido | 200 |
| Bloqueo del USER por PUT administrativo | 200 |
| Access de las dos sesiones mientras está bloqueado | 401, ambos |
| Refresh de las dos sesiones mientras está bloqueado | 401, ambos |
| Nuevo login mientras está bloqueado | 401 |
| Desbloqueo con la misma sesión administrativa, en finally | 200; accountNonLocked=true |
| Access anterior después del desbloqueo | 401, ambos |
| Refresh anterior después del desbloqueo | 401, ambos |
| Nuevo login después del desbloqueo | 200 |
| Consulta administrativa final | 200; perfil y estados coinciden con la consulta inicial |

Se compararon `id`, `code`, `nombre`, `correo`, `rol`, `enabled` y `accountNonLocked`. La cuenta terminó habilitada y desbloqueada. Los timestamps pueden variar por los PUT legítimos. Las sesiones anteriores quedaron revocadas, incluido cualquier acceso previo de esa cuenta; el usuario debe iniciar sesión de nuevo.

El primer intento se detuvo antes del bloqueo porque el parser de cookies del script no logró extraer la sesión. Se ajustó la lectura para admitir nombres de header con distinta capitalización, espacios y cookies combinadas, sin imprimir sus valores. La segunda ejecución completó toda la prueba y confirmó la restauración.

## Alcance de la verificación

El despliegue y el comportamiento de bloqueo/desbloqueo con sesiones HTTP reales están verificados en producción. No se desactivó USER en producción porque su reactivación requiere el flujo de invitación de SA-02. Tampoco se comprobó administración entre organizaciones con un ADMIN ordinario; la cuenta configurada es SUPER_ADMIN.

Desactivación por PUT/PATCH, aislamiento de organizaciones, persistencia de revocación y concurrencia se validaron con las 642 pruebas backend, incluidas las 13 de SA-05 sobre PostgreSQL desechable. Para declarar cierre productivo completo siguen pendientes las comprobaciones productivas de desactivación y aislamiento con cuentas dedicadas.

SA-06, SA-07 y SA-09 siguen fuera de este cierre.
