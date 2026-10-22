# Validar una vez y reutilizar entre capas

## Cadena

1. **PR Validation** selecciona las suites afectadas y conserva el check obligatorio `PR validation result`.
2. Cada suite consulta si existe evidencia vigente de una ejecución exitosa con los mismos archivos de entrada. Si existe, reutiliza ese resultado; si falta, ejecuta sus comprobaciones y guarda evidencia.
3. **Release Please** espera ese check del PR exacto. Ya no lanza otras cuatro suites por su cuenta. Conserva las comprobaciones del SHA, la base de `main` y el merge candidato antes de fusionar.
4. **Sync main into dev** conserva su política: un fast-forward validado no repite suites; una combinación nueva pasa por las suites reutilizables, que vuelven a comprobar sus entradas.
5. **Deploy** mantiene las construcciones Docker con configuración de producción. No ejecuta otra batería de tests.
6. **Coverage Reports** descarga los HTML generados por CI y los publica. No instala dependencias ni ejecuta tests para regenerarlos.

## Qué permite reutilizar

`scripts/ci-validation.cjs` calcula SHA-256 a partir de las rutas, modos y hashes Git de los archivos, sin depender del identificador del commit. Dos commits distintos con las mismas entradas pueden compartir resultado.

| Suite | Entradas propias |
|---|---|
| Frontend | `frontend/` |
| Backend | `backend/` |
| Bruno | `backend/` y `api-tests/` |
| Versioning | `frontend/package.json`, `frontend/.commitlintrc*` y `backend/build.gradle` |

Todas incluyen además los archivos raíz, `.github/`, `scripts/` y los directorios de configuración no clasificados. Se excluyen `docs/` y `.agents/`. Es deliberadamente conservador: los cambios de versión o herramientas también pueden invalidar evidencia. No se presume equivalencia solamente por compartir rama o por haber pasado un check antiguo.

La evidencia son artifacts `SUITE-validation-HASH`, retenidos durante 14 días. Para frontend y backend contienen también el HTML de cobertura. Solo se acepta evidencia no caducada, de workflows conocidos y terminados con éxito, en el mismo repositorio y sin proceder de un fork. Una ejecución fallida, cancelada o todavía pendiente no autoriza omitir tests.

Si falla la consulta de evidencia, CI ejecuta las comprobaciones reales. No transforma una caída de la API en una validación aprobada.

## Primera ejecución y recuperación

La primera ejecución tras introducir este sistema debe generar evidencia nueva. Las ejecuciones anteriores usan otros nombres de artifacts y no se reutilizan. También se valida de nuevo cuando los artifacts caducan o se eliminan.

Si faltan los HTML de cobertura de una release, Reports falla con un mensaje explícito, sin iniciar tests escondidos. Ejecutar **02-Frontend CI** o **03-Backend CI** desde `Run workflow`, con el campo `ref` apuntando al tag de esa release; después ejecutar **09-Publish Coverage Reports** con el mismo `release_ref`. Este procedimiento aplica a refs que contienen el nuevo sistema de validación.

No cambian los secretos, los contratos de la aplicación ni las condiciones de despliegue. Estos cambios de archivos no publican nada por sí solos.

## Comprobaciones locales

Con `RELEASE_TOOLS_DIR` apuntando al directorio temporal de herramientas existente:

```text
node scripts/test-versioning.cjs
node --test scripts/test-auto-release.cjs scripts/test-pr-validation.cjs scripts/test-branch-sync.cjs scripts/test-commit-message.cjs scripts/test-ci-validation.cjs
git diff --check
```

La descarga entre ejecuciones usa los parámetros documentados de [actions/download-artifact](https://github.com/actions/download-artifact#download-artifacts-from-other-workflow-runs-or-repositories); la búsqueda exacta por nombre usa la [API oficial de artifacts](https://docs.github.com/en/rest/actions/artifacts#list-artifacts-for-a-repository).
