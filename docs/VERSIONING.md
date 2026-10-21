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
api, database, security, ui, ci. Commitlint se ejecuta en GitHub y los hooks locales
`.githooks/commit-msg` y `.githooks/pre-push` aplican las mismas reglas antes de
crear commits y enviarlos. Activarlos una vez en cada clon con
`git config core.hooksPath .githooks`; ver `docs/BRANCHING.md`.

**El tamaño del PR no determina la versión.** Dos archivos con recuperación de
contraseña son MINOR; 40 archivos que corrigen errores sin cambiar contratos pueden
ser PATCH; tres líneas que eliminan API v1 son MAJOR. No se cuentan líneas,
archivos, commits ni horas. Entre cambios acumulados gana MAJOR > MINOR > PATCH.

## PR y conservación del historial

Flujo: rama de trabajo → dev → PR a main → revisión/CI → merge commit → Release PR
→ CI del Release PR → merge automático → tag y GitHub Release → sincronización a dev.

Las ramas permanentes se integran con **Create a merge commit**. Squash y rebase
están deshabilitados para evitar duplicar cambios al reutilizar dev. El título del
PR debe expresar el mayor impacto y conservar los cambios incompatibles con `!` o
`BREAKING CHANGE:`. Los commits convencionales originales permanecen en el historial.

Release Please también utiliza merge commit. `10-sync-main-dev.yml` devuelve a dev
los commits y versiones de main, incluyendo las releases creadas por el bot. Si dev
es antecesora de main, usa fast-forward sin crear un commit de sincronización ni
repetir CI sobre el mismo SHA ya validado. Si hay divergencia, mantiene el merge
normal y ejecuta las cuatro suites sobre el resultado. Ver `docs/BRANCHING.md` para
el flujo, la excepción histórica de commitlint y la propuesta de Ruleset.

## Primera release y operación de Actions

El baseline preparado es `1.0.0`, todavía sin publicar. El manifest empieza vacío:
no afirma que exista una release anterior. `initial-version` fija solamente la
primera propuesta; las siguientes usan SemVer. `bootstrap-sha` apunta al commit
común ya integrado en main al iniciar la implementación, evitando incorporar todo
el historial antiguo. No se usa `release-as`, que forzaría versiones posteriores.

Integrar esta implementación con un mensaje semántico, por ejemplo
`feat(ci): incorpora versionamiento automático`. El workflow en main abre el
primer Release PR para `1.0.0`. Cuando pasan los controles, el bot lo integra y publica `v1.0.0`; las siguientes
releases se generan automáticamente con el mismo flujo. No crear el tag inicial
manualmente ni eliminar/reemplazar tags existentes. `CHANGELOG.md` parte sin una
entrada de publicación ficticia y será actualizado por Release Please.

La release no requiere aprobación humana adicional. `06-release-please.yml` prepara
el PR y ejecuta directamente los workflows reutilizables sobre su SHA exacto:

- Frontend: instalación con lockfile congelado, lint, tests con cobertura y build/TypeScript.
- Backend: compilación, tests y verificación de cobertura JaCoCo, como en Backend CI.
- Versionamiento: schema, YAML, escenarios SemVer y sincronización de versiones.

Solo si todos pasan se integra el PR mediante merge commit. Antes del merge se comprueba
que main no haya cambiado y que el PR siga abierto, pertenezca a este repositorio,
tenga la rama de Release Please y la etiqueta `autorelease: pending`. Ademas espera
hasta 30 minutos a que `PR validation result` de la PR actual termine con `success`,
vuelve a comprobar el check y las referencias de main/PR, y fusiona usando el SHA de
cabeza validado. Si el check falta, falla, o cambia la cabeza/base/merge SHA, no publica.
El Ruleset debe exigir que la rama este actualizada para que una actualizacion
concurrente de main invalide el check y bloquee el merge.

### GitHub App para las PR de Release Please

`06-release-please.yml` usa una instalacion de GitHub App para que las PR creadas o
actualizadas por Release Please disparen los workflows `pull_request` sin aprobacion
manual. El token se limita al repositorio actual, vive durante el job `prepare` y se
revoca al terminar. No necesita ni debe recibir bypass del Ruleset. La fusion y la
publicacion siguen usando el `GITHUB_TOKEN` del workflow, sujetos al PR y a sus checks.

Crear una GitHub App dedicada e instalarla solo en `treasury-system` con estos
permisos de repositorio:

- **Contents: Read and write**, para crear/actualizar la rama de release.
- **Pull requests: Read and write**, para abrir y actualizar la PR.
- **Issues: Read and write**, para administrar la etiqueta `autorelease: pending`.
- **Metadata: Read-only**, permiso obligatorio de GitHub.

Guardar en **Settings -> Secrets and variables -> Actions**:

- Variable `RELEASE_PLEASE_APP_CLIENT_ID`: Client ID de la App (no el App ID).
- Secret `RELEASE_PLEASE_APP_PRIVATE_KEY`: clave privada PEM completa de la App.

No guardar el token de instalacion: Actions lo genera en cada ejecucion mediante
`actions/create-github-app-token`, limitado al repositorio y a esos tres permisos de
escritura. No se necesita un PAT personal ni permiso de la App para modificar
Rulesets o fusionar saltandose protecciones.

## Validación reproducible

```powershell
# Herramientas aisladas; no son dependencias del producto.
npm.cmd install --prefix "$env:TEMP/release-tools" --no-audit --no-fund --ignore-scripts release-please@17.3.0 ajv@8 yaml@2
$env:RELEASE_TOOLS_DIR = "$env:TEMP/release-tools"
node scripts/test-versioning.cjs
node --test scripts/test-auto-release.cjs
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
