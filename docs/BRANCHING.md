# Flujo de ramas y GitHub Actions

`dev` y `main` son ramas permanentes. Los cambios funcionales entran a `dev` mediante PR; una promoción de `dev` a `main` también usa PR y conserva el historial con **Create a merge commit**. No se deben squash/rebasear las ramas permanentes ni eliminar `dev`.

## Validación

- Al hacer push a `dev`, Frontend CI, Backend CI y Bruno API corren según las rutas modificadas.
- Los PR a `dev` o `main` ejecutan `PR Validation`: valida los mensajes de commits por SHA, el título del PR y las suites aplicables a los archivos cambiados. El check agregado `PR validation result` falla si cualquier validación aplicable falla.
- Las validaciones de push y PR se conservan porque validan dos commits distintos: la rama publicada y el resultado de integrar el PR con su base.
- Release Please ejecuta Frontend, Backend, Versioning y Bruno sobre el SHA exacto de su PR antes de integrarlo. La validación del PR sigue siendo necesaria como estado requerido visible en GitHub; la validación explícita del workflow de release protege el merge automático.

## Sincronización de `main` a `dev`

`10-sync-main-dev.yml` corre en pushes a `main` y también es llamado por Release Please tras publicar, ya que los commits hechos con `GITHUB_TOKEN` no disparan eventos `push`.

1. Si `dev` ya contiene el SHA de `main`, no cambia la rama.
2. Si `dev` es antecesora de `main`, actualiza `dev` por fast-forward (`force: false`), sin crear un commit de sincronización. Un evento `push` sigue ejecutando las cuatro suites, porque hoy `main` aún no está protegido. La llamada explícita tras Release Please las omite porque el mismo candidato ya pasó las cuatro suites antes de publicarse.
3. Si las ramas divergieron, crea un merge normal de `main` en `dev` y valida el SHA resultante con las cuatro suites. Conflictos y cambios concurrentes fallan de forma segura.

Ningún caso reescribe historial ni fuerza una referencia. La concurrencia serializa las ejecuciones; las llamadas duplicadas después de una release terminan como no-op una vez que `dev` incluye `main`.

## Conventional Commits local

Los hooks del repositorio viven en `.githooks`. Actívalos una vez en cada clon:

```powershell
git config core.hooksPath .githooks
```

`commit-msg` revisa el mensaje al crear cada commit. `pre-push` revisa todos los commits que se enviarían, incluidos los creados antes de activar el hook. Así se conserva la validación remota y se detectan mensajes inválidos antes del push. Para desactivar los hooks en un clon, elimina esa configuración local con `git config --unset core.hooksPath`.

Tipos permitidos: `feat`, `fix`, `perf`, `docs`, `style`, `refactor`, `test`, `chore`, `config`, `ci` y `build`. Formato: `<tipo>(<scope opcional>)<opcional !>: <descripción>`, con encabezado de hasta 200 caracteres. Los merges y reverts conservan el comportamiento esperado de commitlint.

Se identificaron dos commits publicados con mensajes no convencionales: `327163e6656aa9a731686545e91ac0849051748a` y la excepción preexistente `115da59914e20c0a53ac8d0909d71d1e1f618b3d`. No se reescriben. El validador local y el remoto exceptúan esos SHA exactos; copiar cualquiera de esos mensajes en un commit nuevo sigue rechazado. La corrección segura es usar mensajes convencionales en commits nuevos y conservar estas excepciones acotadas mientras los commits formen parte del rango validado.

## Flujo diario

```powershell
git fetch origin --prune
git switch dev
git pull --ff-only origin dev
```

Crear cambios desde `dev`, confirmar con mensaje convencional, hacer push y abrir PR a `dev`. Luego promover `dev` a `main` con PR; CI valida la integración. Release Please prepara su PR de versión, ejecuta todas las suites sobre el SHA candidato, publica tag/release y sincroniza el resultado a `dev`. Los despliegues existentes siguen vinculados a los cambios relevantes en `main`.

## Protección propuesta para `main`

Configurar un GitHub Ruleset de rama dirigido a `main` (no aplicado desde este cambio local):

- exigir PR para actualizar la rama y bloquear force-push/eliminación;
- exigir el check agregado estable `PR Validation / PR validation result` (confirmar el nombre exacto que muestra el selector de checks de GitHub antes de guardar);
- no marcar como obligatorios los jobs de frontend/backend/Bruno/versioning por separado: son condicionales por rutas y se omiten legítimamente;
- conservar la política de merge commit;
- comprobar que la automatización de Release Please pueda cumplir el ruleset. No exigir aprobación humana ni añadir bypass hasta acordar una política compatible con su merge automático.

La configuración actual de `main` y `dev` fue consultada durante esta auditoría y ambas estaban sin protección. Aplicar el Ruleset requiere una decisión y acción explícitas en GitHub.
