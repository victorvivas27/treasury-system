# SA-04: comprobación HTTP en producción

Fecha de ejecución: 2026-10-08.

API: `https://backend-882988140149.southamerica-west1.run.app/tesoreria/api/v1`.

Herramienta: Bruno CLI 3.3.0. Credenciales tomadas del entorno `tesoreria` de la colección WSL; no se incluyen en este informe ni en la colección de pruebas. Las copias temporales del entorno se eliminaron al terminar cada ejecución.

## Estado actual después del despliegue autorizado

**Backend y frontend desplegados; 10/10 comprobaciones Bruno aprobadas. Cierre productivo completo pendiente.** El diagnóstico fallido siguiente se conserva como evidencia anterior al despliegue.

- Backend: [workflow 37808954019](https://github.com/victorvivas27/treasury-system/actions/runs/37808954019), terminado con éxito.
- Frontend: [workflow 37808976314](https://github.com/victorvivas27/treasury-system/actions/runs/37808976314), terminado con éxito.
- Ambos workflows recibieron `release_ref=c22aa551ebe05d6f2e1dd5ac5c814e96b0995a2b`.
- Backend: imagen `tesoreria-backend:c22aa551ebe05d6f2e1dd5ac5c814e96b0995a2b`, revisión lista `backend-00124-j98`, 100 % del tráfico.
- Frontend: imagen `treasury-frontend:c22aa551ebe05d6f2e1dd5ac5c814e96b0995a2b`, revisión lista `treasury-frontend-00069-xxq`, 100 % del tráfico.
- La etiqueta Cloud Run `commit-sha` muestra `1fd3f35285411feefe06f1fd93c97d305e02dfac`, correspondiente al contexto del workflow; para identificar el código seleccionado se registran el input `release_ref` y las imágenes utilizadas.

### Resultado de Bruno posterior al despliegue

Bruno CLI: exit 0, 10/10 tests, 10 863 ms. La CLI cuenta una petición principal, pero su script realiza nueve peticiones adicionales secuenciales.

| Comprobación | Resultado |
|---|---|
| Login administrativo (SUPER_ADMIN) | 200 |
| Login USER | 200 |
| Consulta inicial del USER como administrador | 200 |
| Perfil propio válido con el nombre actual | 200 |
| PUT administrativo como USER | 403 |
| Perfil de otro usuario como USER | 403 |
| Perfil sin nombre válido | 400 |
| Perfil con campos ajenos al contrato | 200; atributos visibles conservados |
| Edición administrativa omitiendo estados | 200; atributos visibles conservados |
| Consulta final como administrador | 200; coincide con la consulta inicial en todos los atributos comparados |

Se compararon `id`, `code`, `nombre`, `correo`, `rol`, `enabled`, `accountNonLocked`, `emailVerifiedAt`, `profileImageType` y `profileImageUrl`. No se cambiaron deliberadamente nombre, correo ni estados; los timestamps de actualización pueden variar por las escrituras legítimas.

Pendientes para completar el cierre: estados inicialmente bloqueados/deshabilitados, aislamiento con ADMIN ordinario de otra organización y comprobación interactiva de la interfaz desplegada. Los atributos internos de tenant no aparecen en UserResponseDTO y no se inspeccionaron mediante SQL en producción.

## Resultado anterior al despliegue

**Validación productiva incompleta y fallida. SA-04 no queda cerrado en producción.**

| Comprobación | Resultado |
|---|---|
| Login administrativo | HTTP 200; rol SUPER_ADMIN |
| Login USER | HTTP 200; rol USER |
| Consulta del USER mediante la cuenta administrativa | HTTP 200; ID coincide con el login USER |
| PUT del perfil propio como USER, enviando únicamente su nombre actual | HTTP 403; esperado 200 |

El HTTP 403 del perfil se observó en dos ejecuciones. La primera terminó al lanzar Bruno una excepción por la respuesta 403; la segunda la capturó y registró el fallo explícito de la expectativa HTTP 200. No se enviaron las peticiones posteriores de edición administrativa ni de inyección de campos.

La petición de perfil utilizó el ID y el token del login USER, con el nombre obtenido por la consulta administrativa. No se solicitó cambiar su nombre ni bloquear/desactivar cuentas. No se verificó el estado persistido después del rechazo.

## Pendientes

- Revisar la versión desplegada y la autorización de `PUT /users/{id}/profile`; la respuesta por sí sola no identifica la causa del 403.
- Repetir la colección `api-tests/sa-04/01-Verificacion.yml` cuando el perfil legítimo funcione.
- Comprobar estados inicialmente bloqueados/deshabilitados; las peticiones con `true` sobre una cuenta activa no demuestran que no pueda restaurar estados.
- Comprobar aislamiento entre organizaciones con ADMIN ordinario. SUPER_ADMIN tiene acceso global y no sirve para demostrar esa restricción.
- Verificar frontend desplegado, versión/commit y funcionamiento de la edición de perfil desde la interfaz.

La colección actual comprueba permisos y conservación de atributos visibles por la API usando nombre/correo actuales. No inspecciona por SQL los campos internos ni cambia deliberadamente estados de cuenta; no sustituye las pruebas de integración de SA-04.

## Diagnóstico de despliegue

Consulta de solo lectura de Cloud Run realizada el 2026-10-08:

- Proyecto: `treasury-system-app-vivas`; servicio: `backend`; región: `southamerica-west1`.
- Revisión lista: `backend-00123-nfw`, con el 100 % del tráfico.
- Imagen: `southamerica-west1-docker.pkg.dev/treasury-system-app-vivas/docker-images/tesoreria-backend:v1.10.1`.
- Etiqueta de commit del servicio y de la plantilla: `11cd33cd3c1b4915324ef817c0cd82ef049623e4`.

El código de ese commit no contiene `PUT /users/{id}/profile`. Su cadena de seguridad permite a USER el PUT anterior `/users/{id}` y reserva las demás rutas `/users/**` a ADMIN. Esto explica el rechazo 403 observado al solicitar la nueva ruta.

La corrección SA-04 está en `c22aa551ebe05d6f2e1dd5ac5c814e96b0995a2b`, disponible en GitHub. No es ancestro del commit etiquetado en producción. No se requiere ampliar permisos ni cambiar la corrección para resolver esta diferencia de despliegue.

### Acción propuesta

Desplegar backend y frontend desde `c22aa551ebe05d6f2e1dd5ac5c814e96b0995a2b` mediante los workflows `07-Deploy Backend to Cloud Run` y `08-Deploy Frontend to Cloud Run`, usando ese SHA como `release_ref`. Después confirmar la nueva revisión de Cloud Run y repetir Bruno. Los clientes anteriores de perfil utilizan el PUT administrativo anterior, que la corrección restringe a ADMIN; por eso ambos despliegues deben coordinarse.

El usuario autorizó después los dos despliegues; su resultado y la repetición de Bruno constan en el estado actual al inicio del documento.

### Revalidación local del commit corregido

Se ejecutó `gradlew.bat test --tests user.SA04ProfileSecurityIntegrationTest --tests user.SA04UserServiceTest --tests user.SecurityConfigTest`: BUILD SUCCESSFUL, 60 pruebas, cero fallos, errores u omisiones. Estos resultados validan la corrección local; no sustituyen la repetición de Bruno después del despliegue.
