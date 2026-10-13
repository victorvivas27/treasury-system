# Flujo de ramas

`dev` y `main` son ramas permanentes. Todos los PR se integran con **Create a merge commit**.
El repositorio debe tener `allow_merge_commit=true`, `allow_squash_merge=false` y
`allow_rebase_merge=false`. No activar eliminación automática de ramas: `dev` se reutiliza.

Squash y rebase cambian los identificadores de los commits. Reutilizar `dev` después
de un squash hizo que Git comparara versiones antiguas de cambios ya publicados y
produjera conflictos repetidos en las pantallas del horario. Con merge, los commits
de `dev` pasan a formar parte del historial de `main`.

## Sincronización automática

`10-sync-main-dev.yml` integra el SHA actual de `main` en `dev` después de cada push a
`main`. `06-release-please.yml` también llama explícitamente a este flujo después de
publicar una versión, porque los merges con `GITHUB_TOKEN` no disparan workflows de
push. Así regresan a `dev` las versiones y el changelog generados por Release Please.

La sincronización usa un merge normal y confirma que `main` sea ancestro de `dev`.
No reemplaza ramas ni usa force push. Si hay un conflicto real o una protección
bloquea el merge, el job falla. Frontend, backend, versionamiento y contrato API se
validan explícitamente sobre el SHA resultante; no se depende de eventos del bot.

## Trabajo local

Antes de comenzar o retomar trabajo, actualiza la rama de desarrollo:

```powershell
git fetch origin --prune
git switch dev
git pull --ff-only origin dev
```

Si tienes trabajo local sin guardar, haz commit antes de actualizar. Si `--ff-only`
rechaza la actualización porque tienes commits locales, integra `origin/dev` con
`git merge origin/dev`; conserva ambos historiales. Las ramas nuevas de trabajo se
crean desde `dev` actualizado y sus PR apuntan a `dev`. El PR de publicación apunta
de `dev` a `main` y se integra después de pasar CI.

Este flujo elimina la causa de los conflictos repetidos por squash y versiones
desincronizadas. Dos cambios incompatibles sobre las mismas líneas todavía requieren
una decisión humana; la automatización no debe ocultarlos eligiendo una rama entera.

Referencias: [GitHub: ramas permanentes y squash](https://docs.github.com/en/pull-requests/reference/pull-request-merges),
[eventos y GITHUB_TOKEN](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/trigger-a-workflow).
