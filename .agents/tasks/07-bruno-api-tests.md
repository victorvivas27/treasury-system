# 07. Colecciones Bruno

`api-tests/opencollection.yml` contiene `alumno`, `apoderado`, `familia` y `user`, con `environments/tesoreria.yml`.

Alumno, Apoderado y Familia ejecutan primero `00-Authentication/01-Login Admin.yml`: usan `Admin_Email`/`Admin_Password`, llaman `/auth/login`, validan ADMIN y guardan `body.token` en `adminToken`. El `folder.yml` aplica Bearer. `bru.sendRequest()` debe añadir `Authorization` explícitamente.

## Ejecución controlada

Backend aislado, base limpia/controlada y ADMIN efímero. Orden: Alumno, Apoderado, Familia.

```bash
cd api-tests
bru run ./alumno -r --env tesoreria --env-var Url_Base=http://localhost:5055/tesoreria/api/v1 --env-var Admin_Email=<email> --env-var Admin_Password=<password>
bru run ./apoderado -r --env tesoreria --env-var Url_Base=http://localhost:5055/tesoreria/api/v1 --env-var Admin_Email=<email> --env-var Admin_Password=<password>
bru run ./familia -r --env tesoreria --env-var Url_Base=http://localhost:5055/tesoreria/api/v1 --env-var Admin_Email=<email> --env-var Admin_Password=<password>
```

Windows puede usar `bru.cmd`; comprobar `bru --version`. No guardar credenciales.

Usar códigos dinámicos para Alumno/Apoderado; Familia usa IDs dinámicos en cuerpos/rutas propias y códigos al consultar relacionados. Distinguir negativos deliberados (`400/404/409`) de `401/403` inesperados.

Estado validado: Alumno 20/20 requests y 40/40 tests; Apoderado 50/50 y 87/87; Familia 20/20 y 28/28.

`scripts/test-full-flow.sh` usa `pnpm dlx @usebruno/cli` y ejecuta solo Apoderado. Validar con `bash -n`; no ampliar sin tarea.
