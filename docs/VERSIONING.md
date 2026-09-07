# Versionamiento de Treasury System

## Arquitectura y auditoría inicial

Auditoría del 7 de septiembre de 2026: monorepo con backend Spring Boot/Gradle
y frontend React/TypeScript/Vite. No hay `package.json` raíz. El frontend usa
`frontend/package.json`, pnpm 11.5.0 y `pnpm-lock.yaml`; su versión era `0.0.0`.
Gradle declaraba `0.0.1-SNAPSHOT`. No había CHANGELOG, tags locales/remotos ni
GitHub Releases. La rama predeterminada remota es `main`; el desarrollo usa `dev`.

Los workflows existentes cubren backend, frontend, Bruno, validación de commits,
reportes en Pages y despliegues separados a Cloud Run desde `main`. Se conservan.
La validación de commits ahora cubre `dev` y `main`, incluidos títulos de PR.
Backend CI también valida PR hacia `main`.

## Una versión de producto

`VERSION` es la fuente central. Release Please actualiza en el mismo Release PR:

- `VERSION`.
- `frontend/package.json` (campo `version`).
- `backend/build.gradle` (línea marcada `x-release-please-version`).
- `.release-please-manifest.json` (estado interno de la automatización).
- `CHANGELOG.md` (notas generadas).

Las versiones de frontend y backend son copias generadas, nunca decisiones
independientes. Esto permite conservar los contextos Docker separados: ninguno
necesita copiar archivos fuera de su directorio. No editar números manualmente.
`node scripts/check-version.cjs` rechaza discrepancias y Versioning CI lo ejecuta.

Vite lee solamente `version` del package.json e inyecta `__APP_VERSION__` durante
el build. `HomeFooter`, compartido por la portada y `MainLayout`, muestra
`© año Tesorería Escolar · vX.Y.Z`. No se incorporan secretos ni el package.json
completo al navegador. Una versión nueva requiere construir/desplegar de nuevo;
los despliegues actuales ya reaccionan a cambios en frontend/backend en `main`.
Producción sigue desplegándose en cada push relevante a main: el número indica
la última versión preparada, no identifica cada commit entre releases.

## Reglas semánticas

| Cambio | Commit | Release |
|---|---|---|
| Bug o corrección visual compatible | `fix:` | PATCH |
| Optimización compatible | `perf:` | PATCH |
| Nueva funcionalidad, sección, módulo o capacidad compatible | `feat:` | MINOR |
| Incompatibilidad pública | `feat!:`, `fix!:` o cualquier tipo con `!` | MAJOR |
| Incompatibilidad descrita en footer | `BREAKING CHANGE: descripción` | MAJOR |
| Documentación | `docs:` | Sin release por defecto |
| Tests | `test:` | Sin release por defecto |
| Refactor interno compatible | `refactor:` | Sin release por defecto |
| Mantenimiento | `chore:` | Sin release por defecto |
| CI | `ci:` | Sin release por defecto |
| Build | `build:` | Sin release por defecto |
| Formato de código | `style:` | Sin release por defecto |
| Configuración interna (tipo histórico permitido) | `config:` | Sin release por defecto |

Un breaking change prevalece sobre cualquier tipo. Los tipos internos sin cambios
incompatibles quedan ocultos en el changelog y no abren releases por sí solos.
Un refactor que corrige un bug público debe describir ese resultado con `fix:`.

```bash
git commit -m "fix(sidebar): corrige animación"                    # PATCH
git commit -m "feat(reports): agrega exportación"                  # MINOR
git commit -m "feat(api)!: reemplaza contrato de autenticación"     # MAJOR
```

Formato: `<tipo>(<scope opcional>): <descripción>`. Scopes sugeridos: auth,
sidebar, admin, administrations, reports, users, notifications, frontend, backend,
api, database, security, ui, ci. Commitlint se ejecuta en GitHub; no se agregan hooks.

**El tamaño del PR no determina la versión.** Dos archivos con recuperación de
contraseña son MINOR; 40 archivos que corrigen errores sin cambiar contratos pueden
ser PATCH; tres líneas que eliminan API v1 son MAJOR. No se cuentan líneas,
archivos, commits ni horas. Entre cambios acumulados gana MAJOR > MINOR > PATCH.

## PR, squash y conservación de la intención

Flujo: branch → commits → push → PR → revisión/CI → merge a main → Release PR
→ revisión humana → merge del Release PR → tag y GitHub Release.
Push a una rama u abrir un PR no incrementa la versión. Se pueden acumular fixes;
si entra un feat antes de aprobar la release, Release Please recalcula MINOR.

GitHub permite merge, squash y rebase. En la auditoría, squash usaba
`COMMIT_OR_PR_TITLE` + `COMMIT_MESSAGES`: un único commit puede aportar el título,
y varios commits conservan sus mensajes en el cuerpo. Se validan ambos, pero
antes de confirmar el merge hay que revisar el mensaje final, que se puede editar.
El título del PR debe expresar el mayor impacto. Si hay una incompatibilidad,
usar `!` en el título y conservar su descripción/migración en el cuerpo.
Si se usa `BREAKING CHANGE:`, debe sobrevivir en el commit final. Nunca reemplazar
los mensajes por un texto genérico como «cambios». Release Please admite varios
mensajes convencionales separados por líneas vacías dentro del commit squash.

Recomendado en Settings → General: configurar squash con título del PR y mensajes
de commits. En Rulesets, exigir revisión y checks de CI, Conventional Commits y
Versioning CI para main; estas políticas remotas no se cambian con este trabajo.

## Primera release y operación de Actions

El baseline preparado es `1.0.0`, todavía sin publicar. El manifest empieza vacío:
no afirma que exista una release anterior. `initial-version` fija solamente la
primera propuesta; las siguientes usan SemVer. `bootstrap-sha` apunta al commit
común ya integrado en main al iniciar la implementación, evitando incorporar todo
el historial antiguo. No se usa `release-as`, que forzaría versiones posteriores.

Integrar esta implementación con un mensaje semántico, por ejemplo
`feat(ci): incorpora versionamiento automático`. El workflow en main abre el
primer Release PR para `1.0.0`. Revisar y hacer merge publica `v1.0.0`; las siguientes
releases se generan automáticamente con el mismo flujo. No crear el tag inicial
manualmente ni eliminar/reemplazar tags existentes. `CHANGELOG.md` parte sin una
entrada de publicación ficticia y será actualizado por Release Please.

`release-please.yml` usa permisos contents/pull-requests/issues write para crear
PR, etiquetas, tags y releases; los workflows de validación solo necesitan lectura.
Su concurrencia evita carreras y workflow_dispatch permite reintentar en main.
GitHub tenía habilitada la creación de PR por Actions en la auditoría.

Por defecto se usa GITHUB_TOKEN. Los PR creados/actualizados con ese token **no
disparan otros workflows**. Para ejecutar los checks, una persona puede cerrar y
reabrir el Release PR después de su última actualización, sin hacer merge antes
de que pasen. Alternativamente configurar el secret opcional `RELEASE_PLEASE_TOKEN`
con un token de bot limitado a este repositorio (contents, pull requests e issues:
write), para que los eventos del bot disparen CI. No agregar el valor al YAML.
No hacer auto-merge. Al hacer merge una persona, el push a main dispara los
despliegues existentes. No se depende de un evento `release` generado por el bot.

## Validación reproducible

```powershell
# Herramientas aisladas; no son dependencias del producto.
npm.cmd install --prefix "$env:TEMP/release-tools" --no-audit --no-fund --ignore-scripts release-please@17.3.0 ajv@8 yaml@2
$env:RELEASE_TOOLS_DIR = "$env:TEMP/release-tools"
node scripts/test-versioning.cjs
node scripts/check-version.cjs
```

El test usa el motor real de Release Please, su schema y sus actualizadores.
Comprueba PATCH/MINOR/MAJOR, prioridad de cambios, mensajes squash, tipos sin
release, primera versión, sincronización de archivos y sintaxis YAML sin claves
duplicadas. Versioning CI repite estas pruebas sin acceder a GitHub para publicar.
El frontend mantiene `pnpm lint`, `pnpm test:run` y `pnpm build` (incluye TypeScript).

Referencias oficiales: [Release Please Action](https://github.com/googleapis/release-please-action#readme),
[configuración manifest](https://github.com/googleapis/release-please/blob/main/docs/manifest-releaser.md),
[estrategias y archivos adicionales](https://github.com/googleapis/release-please/blob/main/docs/customizing.md).
