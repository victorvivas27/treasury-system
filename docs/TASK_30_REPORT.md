# Informe de tarea 30

Implementación local del 7 de septiembre de 2026. La publicación oficial queda
pendiente de integrar los cambios en main y aprobar el primer Release PR.

## Arquitectura y decisiones

Monorepo React/Vite/TypeScript + Spring Boot/Gradle, sin package.json raíz.
Frontend con pnpm 11.5.0 y versión inicial 0.0.0; backend con 0.0.1-SNAPSHOT.
Main es la rama principal remota; dev se usa para desarrollo. No existían tags,
releases ni CHANGELOG. Ya había CI y despliegues independientes a Cloud Run.

Se eligió una release conjunta desde la raíz para incluir cambios de backend y
frontend. `VERSION` es la fuente central y parte en 1.0.0. Las copias de versión
en package.json y Gradle se actualizan automáticamente con Release Please,
manteniendo los builds Docker independientes. El manifest es estado del bot.

Vite inyecta únicamente el campo version del package.json como `__APP_VERSION__`.
HomeFooter muestra esa constante en la portada y el layout autenticado. Cada
build incorpora la versión correspondiente, sin una versión literal en JSX.

Release Please analiza commits integrados en main, prepara un Release PR con
versiones y CHANGELOG y permite agrupar cambios. Su merge crea el tag `vX.Y.Z`
y GitHub Release. La configuración inicial propone 1.0.0 y después aplica
PATCH para fix/perf, MINOR para feat y MAJOR para incompatibilidades (`!` o
BREAKING CHANGE). Docs/test/refactor/chore/ci/build/style/config no generan
release por defecto. Gana el mayor impacto semántico, independientemente del
tamaño del PR. El CHANGELOG se genera con el mismo motor que las notas de release.

## Archivos creados

- `VERSION`.
- `release-please-config.json`.
- `.release-please-manifest.json`.
- `CHANGELOG.md`.
- `.github/workflows/release-please.yml`.
- `.github/workflows/versioning-ci.yml`.
- `.github/pull_request_template.md`.
- `scripts/check-version.cjs`.
- `scripts/test-versioning.cjs`.
- `docs/VERSIONING.md`.
- `docs/TASK_30_REPORT.md`.

## Archivos modificados

- `.commitlintrc.json`: configuración convencional base, tipos perf/build y reglas compatibles con descripciones en español.
- `.github/workflows/commit-lint.yml`: commits y títulos de PR hacia dev/main.
- `.github/workflows/backend-ci.yml`: validación de PR hacia main además de dev.
- `backend/build.gradle`: copia automática de la versión y marca del actualizador.
- `frontend/package.json`: baseline 1.0.0.
- `frontend/vite.config.ts`: inyección de versión durante el build.
- `frontend/src/vite-env.d.ts`: declaración TypeScript de la constante.
- `frontend/src/presentation/pages/home/components/HomeFooter.tsx`: versión visible.
- `README.md`: enlace al flujo de versionamiento.

No se agregaron dependencias al producto ni hooks locales. Los validadores
release-please 17.3.0, Ajv 8 y YAML 2 se instalan en una carpeta temporal y en CI.
Se reutiliza commitlint en Actions y se añade la acción de validación de título.
No se modificaron los workflows de despliegue, Bruno ni reportes.

## Resultados de validación

| Comprobación | Resultado |
|---|---|
| Lockfile: pnpm install --lockfile-only --offline --frozen-lockfile --ignore-scripts | Correcto; ya actualizado |
| Frontend lint | Correcto; 4 advertencias no relacionadas |
| Frontend tests | 72 archivos, 398 tests aprobados |
| TypeScript y build Vite | Correctos; aviso de eval en lottie-web |
| Release Please real | 17 escenarios aprobados |
| Schema de configuración | Válido contra el schema incluido en Release Please |
| Workflows | YAML válido, sin claves duplicadas; triggers/permisos revisados |
| Sincronización | VERSION, package.json y Gradle en 1.0.0; actualizadores probados para nuevas versiones |
| Footer | Constante leída por Vite y sustituida en el bundle construido |
| Backend tests | 353 ejecutados: 352 aprobados y 1 fallido por Docker no disponible |
| Backend PMD | Falla con 15 infracciones en código Java no modificado |
| Backend check | Bloqueado por la prueba de integración fallida; no se declara aprobado |
| git diff --check | Correcto |

Las cuatro advertencias de lint corresponden a expresiones en AlumnoPage,
ApoderadoPage, FamiliaPage y NotificationContext. El test fallido es
`PostgresPerformanceQueryIntegrationTest`: Testcontainers no encuentra un entorno
Docker válido. Las infracciones PMD están en código existente de rendimiento,
autenticación y usuario. No se ajustaron tests, reglas, cobertura ni código ajeno
para ocultar estos fallos.

PnPM intentó reinstalar automáticamente node_modules al ejecutar scripts en este
entorno sin terminal interactiva. Para usar las dependencias instaladas se ejecutó
lint/tests/build con `pnpm_config_verify_deps_before_run=false`, sin persistir esta
opción. El lockfile se validó por separado sin modificar dependencias.

## Activación y pendientes externos

Integrar la implementación mediante PR con un mensaje como
`feat(ci): incorpora versionamiento automático`, ejecutar CI y aprobar el primer
Release PR para publicar v1.0.0. No se realizó push, merge, despliegue ni publicación
durante esta implementación. No se creó un tag que apuntara a código sin integrar.

Con GITHUB_TOKEN, cerrar y reabrir el Release PR como usuario después de su última
actualización dispara los checks. La alternativa automatizada es configurar el
secret opcional RELEASE_PLEASE_TOKEN. Ver [VERSIONING.md](VERSIONING.md) para sus
permisos, protección de main y configuración recomendada del mensaje squash.
La creación de PR por Actions ya está habilitada en GitHub. Los workflows nuevos
requieren integración en el remoto para comprobar su ejecución real.
