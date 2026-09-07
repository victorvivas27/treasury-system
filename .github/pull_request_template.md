## Cambio e impacto

Describe el problema y el comportamiento resultante.

- Tipo semántico de mayor impacto: `fix` / `perf` / `feat` / `tipo!` / mantenimiento.
- Si hay incompatibilidad, explica la migración y usa `!` en el título o un footer `BREAKING CHANGE:` en el commit final.
- El tamaño del PR no determina la versión.

## Validación

Indica los checks ejecutados y sus resultados.

Antes de squash, revisa que el título y el cuerpo del commit final conserven el cambio de mayor impacto. Ver `docs/VERSIONING.md`.
