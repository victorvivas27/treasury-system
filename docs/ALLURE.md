# Allure Report 3 — operación local

La iniciativa se gestiona en [Task 38](../.agents/tasks/38-implementacion-progresiva-allure-report-3.md). Las pruebas siguen usando Vitest y JUnit; la cobertura sigue usando V8 y JaCoCo. Allure muestra sus resultados y adjunta la medición de cobertura de cada ejecución. Las fases CI y publicación privada están implementadas y comprobadas localmente; su validación remota requiere configurar almacenamiento y publicar los cambios autorizados. No hay todavía una publicación remota Allure acreditada.

## Requisitos

- Dependencias frontend del lockfile instaladas: CLI Allure **3.22.1**, `allure-vitest` y `allure-js-commons` **3.14.0**. Backend usa `allure-jupiter` **3.0.0** en un classpath dedicado; Gradle conserva el JUnit gestionado por Spring Boot.
- Node compatible con jsdom instalado: **22.22.2 o posterior en 22.x**, **24.15 o posterior en 24.x**, o **26+**. El Node global 22.20.0 de la máquina de validación es incompatible.
- Java **17** y wrapper Gradle del repositorio.
- Docker operativo para integración backend, que incluye PostgreSQL real mediante Testcontainers. No requiere una base productiva ni datos preexistentes.

En PowerShell, desde la raíz del repositorio, el runtime portable utilizado en la validación se selecciona así:

```powershell
$pilotNode = Join-Path $env:TEMP 'treasury-allure-node-22.22.2/node-v22.22.2-win-x64/node.exe'
& $pilotNode --version
```

La carpeta temporal puede desaparecer. Comprobar su existencia al retomar; también se puede usar `node` si su versión cumple los requisitos. Los comandos siguientes usan `$pilotNode`; no modifican el Node global.

## Ejecutar las cuatro suites

Desde la raíz:

```powershell
& $pilotNode scripts/allure-local.mjs run
```

El comando comprueba Node, Java, Docker y la presencia del CLI antes de iniciar. Ejecuta secuencialmente frontend unitario, frontend integración, backend unitario y backend integración, una vez cada una, con cobertura. Cada suite obtiene un directorio nuevo. Después genera su HTML utilizando esos resultados, sin repetir pruebas.

La consola muestra los conteos, cobertura por suite y comandos de apertura. El manifiesto conjunto queda en:

```text
frontend/build/allure/sessions/<session-id>/session.json
```

El manifiesto identifica las cuatro corridas, revisión Git, cambios locales, métricas y códigos de salida. Cualquier suite fallida, incompleta, vacía, omitida, sin cobertura válida o con conteos distintos en HTML hace fallar la sesión. El comando conserva el resultado de las demás suites y no presenta un porcentaje global de cobertura.

Para consultar una sesión ya terminada:

```powershell
& $pilotNode scripts/allure-local.mjs show '<session-id>'
```

Este comando lee el manifiesto guardado; no vuelve a validar ni actualizar sus corridas.

## Abrir o regenerar una corrida existente

Desde la raíz, sustituir los valores por los que aparecen en la consola o el manifiesto:

```powershell
& $pilotNode scripts/allure-local.mjs open frontend unit '<run-id>'
& $pilotNode scripts/allure-local.mjs open frontend integration '<run-id>'
& $pilotNode scripts/allure-local.mjs open backend unit '<run-id>'
& $pilotNode scripts/allure-local.mjs open backend integration '<run-id>'
```

El servidor imprime una URL local `http://127.0.0.1:<puerto>`. Mantener la terminal abierta y usar `Ctrl+C` para detenerlo. El puerto puede cambiar.

Si falla la generación del HTML, conservar la corrida y regenerarla sin ejecutar sus pruebas:

```powershell
& $pilotNode scripts/allure-local.mjs generate frontend unit '<run-id>'
& $pilotNode scripts/allure-local.mjs generate backend integration '<run-id>'
```

Se comprueba la integridad del snapshot de cobertura y se concilian resultados originales, resumen del runner y resumen HTML. La limpieza de generación solo afecta al HTML de esa corrida. Un fallo original del runner sigue devolviendo error aunque se pueda generar su reporte. Regenerar no cambia el manifiesto histórico de la sesión; el estado actualizado está en `run.json`.

## Ejecutar una suite o una muestra

Frontend, desde `frontend/`:

```powershell
& $pilotNode scripts/run-allure-suite.mjs unit --coverage
& $pilotNode scripts/run-allure-suite.mjs integration --coverage
& $pilotNode scripts/run-allure-suite.mjs unit --coverage src/shared/validation/apoderadoValidation.test.ts
```

También existen `pnpm test:allure:unit` y `pnpm test:allure:integration`; requieren que el Node que utiliza pnpm sea compatible. La ausencia de `--coverage` queda explícita como cobertura no solicitada. La selección de archivos se marca como alcance `partial`, aunque todas las pruebas seleccionadas pasen.

Backend, desde la raíz:

```powershell
& $pilotNode scripts/run-backend-allure.mjs run unit
& $pilotNode scripts/run-backend-allure.mjs run integration
& $pilotNode scripts/run-backend-allure.mjs run unit --tests '*StandProductTest'
```

Backend genera cobertura por defecto. Un filtro `--tests` se identifica como parcial. Integración no omite pruebas PostgreSQL cuando Docker falta: el coordinador rechaza la ejecución. Frontend integración conecta capas internas con transporte HTTP simulado; no acredita conexión a backend real.

## Dónde aparece la cobertura

Dentro del reporte, **Metadata** muestra `coverage_lines`, `coverage_branches` y `coverage_functions` o `coverage_methods`, con porcentaje y fracción cubierta/incluida. `coverage_scope` identifica aplicación, suite y alcance. El porcentaje grande de éxito de Allure corresponde a pruebas aprobadas; la cobertura de código se consulta en esos campos.

En **Global Attachments** se incorporan:

| Adjunto | Contenido |
|---|---|
| `cobertura.md` | Tabla legible, alcance, denominador, revisión y límites. |
| `coverage-summary.json` | Numeradores, denominadores, porcentajes, motor y huella de configuración. |
| `coverage-detail.zip` | Reportes originales, resumen y explicación. Descargar y descomprimir para navegar el HTML completo. |

En el ZIP, frontend abre `coverage/index.html`; backend abre `coverage/html/index.html`.

Los porcentajes se calculan con los contadores originales y se redondean a dos decimales. Vitest puede mostrar en consola una centésima distinta por truncamiento. Frontend considera TypeScript ejecutable de `frontend/src` según los `include` y `exclude` vigentes de `vite.config.ts`; backend considera clases principales con las exclusiones existentes de arranque y `*MapperImpl` de los reportes separados. La huella SHA-256 de la configuración acompaña al snapshot.

**No sumar ni promediar porcentajes entre suites:** pueden ejecutar las mismas líneas. Tampoco combinar frontend y backend en un porcentaje de toda la aplicación. La cobertura mide código ejecutado dentro de ese denominador, no porcentaje de funcionalidades verificadas. Los umbrales existentes y la meta de Task 36 permanecen vigentes; tener reporte no acredita cumplirlos.

## Evidencia y aislamiento

```text
frontend/build/allure/<unit|integration>/<run-id>/
backend/build/allure/<unit|integration>/<run-id>/
  run.json                       # procedencia, códigos, conteos e intentos
  allure-results/                # resultados originales y metadatos
  allure-report/                 # HTML autocontenido y resumen de control
  coverage/
    cobertura.md
    coverage-summary.json
    coverage-detail.zip
    manifest.json                # hashes de los archivos del snapshot
    detail/                      # copia de reportes originales
```

Frontend conserva además `vitest.json` y `environment.json`. Backend conserva `junit-summary.json`, XML/HTML de JUnit, configuración Allure y, en el flujo Allure, `jacoco.exec` y `coverage-source/` propios de esa corrida. Los comandos Gradle ordinarios conservan sus rutas históricas. El classpath productivo y el JAR no incorporan Allure.

Frontend copia inmediatamente la cobertura recién generada desde `frontend/coverage/<suite>/`. Esa salida compartida puede ser reemplazada por una ejecución posterior; el snapshot por corrida conserva la evidencia histórica. Evitar ejecutar al mismo tiempo dos comandos frontend con cobertura de la misma suite.

Una medición anterior al inicio de la corrida, ausente, inválida o procedente de un runner fallido queda como no disponible. No se sustituye por cero ni se adopta cobertura de otra ejecución. Una corrida histórica sin snapshot tampoco lo obtiene al regenerar: se necesita una nueva ejecución con cobertura. Si se solicitó cobertura y no pudo capturarse, el coordinador devuelve error aunque el HTML de las pruebas exista.

Los archivos del snapshot se verifican mediante SHA-256 al generar y abrir. Ante una alteración, conservar la evidencia y revisar la causa; no editar el manifiesto para aparentar validez. Esta comprobación detecta cambios accidentales, no constituye una firma independiente del repositorio.

No hay borrado automático de corridas. Para una limpieza manual, detener primero su servidor y seleccionar exclusivamente directorios concretos dentro de los dos `build/allure/`; conservar resultados, resumen del runner y snapshot si se desea regenerar. Los artefactos están ignorados por Git. Los reportes son locales: revisar su contenido antes de compartirlos.

## Retomar el trabajo

Leer instrucciones del proyecto, [Task 38](../.agents/tasks/38-implementacion-progresiva-allure-report-3.md), [guía de pruebas](../.agents/tasks/06-testing.md) y [operaciones/calidad](../.agents/tasks/08-quality-operations.md). Revisar Git, runtime y último registro antes de ejecutar. Usar el `session-id` o `run-id` de la evidencia que se desea consultar, sin presentar una corrida parcial como suite completa.

Registrar avances y decisiones en Task 38; usar esta guía para el procedimiento estable. AGENTS.md y las Skills existentes se mantienen intactos. La autorización actual incluye fases 6 y 7 y la sección administrativa. No implica autorización de commit, push ni despliegue de la aplicación.

## CI: una ejecución combinada por aplicación

Los workflows `02-frontend-ci.yml` y `03-backend-ci.yml` usan `scripts/allure-ci.mjs frontend|backend` sobre los coordinadores existentes. Ejecutan la selección combinada histórica, sin volver a ejecutar unitarias e integración por separado para producir otro reporte. Las cuatro suites locales siguen disponibles.

Frontend conserva lint, cobertura combinada y build. Backend ejecuta `check` con PMD main y el gate JaCoCo **70 %** intactos, usando el mismo `jacoco.exec` que genera el reporte. El adaptador Allure continúa fuera del classpath productivo. Backend instala las dependencias frontend del lockfile para reutilizar el CLI ya declarado, sin otro paquete de reporting.

El artefacto de validación conserva `index.html` y los archivos de cobertura en su raíz, y añade `allure/` y `receipt.json`. El recibo identifica aplicación, suite `combined`, revisión probada, huella de entradas, workflow, conteos, cobertura y validez. Los fallos conservan evidencia diagnóstica y código de error; un workflow fallido nunca sirve para reutilizar validación ni publicar.

La huella frontend/backend usa esquema `validation-v2`, invalidando recibos anteriores sin Allure. Backend también incorpora `frontend/package.json` y `frontend/pnpm-lock.yaml` como entradas, ya que suministran su generador. La reutilización conserva la revisión de origen; una publicación de otra revisión con entradas idénticas registra ambos SHA, sin afirmar una nueva ejecución.

Retención de artefactos CI: hasta **14 días**, acotados por la política del repositorio. Si expiraron, ejecutar explícitamente el CI de la revisión elegida; publicación no reconstruye evidencia ni ejecuta pruebas. La carpeta `build/allure/ci-evidence` requiere un checkout limpio y no fusiona evidencia anterior.

Para abrir una corrida combinada local existente:

```powershell
# Desde frontend/
& $pilotNode scripts/run-allure-suite.mjs open combined '<run-id>'
# Desde la raíz
& $pilotNode scripts/run-backend-allure.mjs open combined '<run-id>'
```

## Sección administrativa y almacenamiento privado

La app incorpora **Home → Administrar → Reportes de calidad**, ruta `/admin/reportes-calidad`. Reutiliza `AdminRoute`, el encabezado del home y los estilos del proyecto. Las herramientas globales usan `AdministrationLayout`, separado del sidebar del curso. Tanto ADMIN como SUPER_ADMIN pueden consultar; USER y anónimos quedan rechazados por backend, aunque conozcan una URL.

API con la autenticación existente:

| Ruta GET | Resultado |
|---|---|
| `/api/v1/admin/quality-reports` | Catálogo con aplicación, suite, fecha, revisión, conteos y métricas. |
| `/api/v1/admin/quality-reports/{id}/content` | HTML autenticado de una entrada del catálogo, comprobado con SHA-256 y `Cache-Control: no-store`. |

La descarga usa el cliente Axios autenticado; el visor recibe el contenido en un iframe con `sandbox="allow-scripts allow-downloads"`, sin acceso al origen de la app. La CSP bloquea conexiones externas y la analítica incluida por el generador. Allure 3.22.1 necesita una base URL válida y almacenamiento de preferencias: el visor adapta su inicializador y proporciona almacenamiento efímero propio dentro del iframe; no expone cookies, JWT ni el almacenamiento de la aplicación. Esta adaptación debe revisarse al actualizar Allure.

Cada HTML debe pesar como máximo **30 MB**, por el límite de lectura/entrega fijado para la API. Si crece por adjuntos, revisar el formato y límites antes de ampliar el tamaño. Un ID inexistente o cuyo objeto expiró devuelve 404; snapshot inválido al ensamblar o HTML alterado se rechaza. El listado no acepta URLs arbitrarias ni rutas suministradas por el navegador.

Configuración backend:

| Variable | Uso |
|---|---|
| `ALLURE_REPORTS_BUCKET` | Bucket dedicado privado; producción lee `allure/v1/catalog.json` y `allure/v1/reports/<id>/index.html`. |
| `GCS_ENABLED=true` | Activa el cliente GCS existente. |
| `ALLURE_REPORTS_DIRECTORY` | Carpeta local con `catalog.json` y `reports/`; en perfil `dev` su valor predeterminado es `build/allure/local-reports`, relativo al directorio de ejecución backend. No se usa cuando hay bucket configurado. |

En perfiles sin configuración, el catálogo indica `configured: false` y la pantalla lo informa. En desarrollo, importar primero los archivos al directorio local predeterminado. Con destino configurado pero sin catálogo, muestra que aún no hay publicaciones. Backend y workflow exigen **public access prevention = enforced**, incluso si una política heredada podría proteger el bucket. No usar un bucket público ni una URL firmada para el HTML. [Referencia oficial de prevención de acceso público](https://docs.cloud.google.com/storage/docs/using-public-access-prevention).

La identidad runtime necesita lectura de objetos y `storage.buckets.get` para verificar esa protección. La identidad publicadora necesita leer/crear objetos, actualizar el catálogo y leer metadatos del bucket; debe usar la federación WIF existente, sin claves JSON. Mantener estas identidades restringidas al bucket de reportes. No se crean buckets, identidades o concesiones IAM automáticamente.

Para importar una corrida local completa ya validada, sin repetir pruebas:

```powershell
& $pilotNode scripts/assemble-allure.mjs local frontend combined '<run-id>' frontend/build/allure/private-preview
& $pilotNode scripts/assemble-allure.mjs local backend combined '<run-id>' frontend/build/allure/private-preview
$env:ALLURE_REPORTS_DIRECTORY = Join-Path (Get-Location) 'frontend/build/allure/private-preview'
```

Iniciar el backend con esa variable en su proceso. Para usar el valor predeterminado persistente de `dev`, importar en cambio a `backend/build/allure/local-reports` desde la raíz y ejecutar el backend desde `backend/`; no hace falta definir la variable. IntelliJ debe usar ese mismo directorio de trabajo. Los dos reportes combinados del 24/10/2026 ya se importaron allí y el backend local fue reiniciado para servirlos. Recargar Home → Administrar → Reportes de calidad con una sesión administradora.

La importación comprueba integridad, conteos y ausencia de fallos/omisiones; admite `unit`, `integration` o `combined`. Identifica los reportes como locales; no fabrica recibos de GitHub. `gradlew clean` elimina los artefactos bajo `backend/build/`: conservar/exportar los originales antes de limpiar y volver a importar después. La vista de revisión aislada usada durante implementación está en `frontend/build/allure/quality-preview.html`; utiliza esos archivos locales y no sustituye las pruebas de autorización de la aplicación.

## Publicación privada y conservación

Workflow manual: `.github/workflows/11-publish-allure.yml`, entrada `release_ref`. No ejecutarlo hasta que los cambios estén en GitHub y existan validaciones exitosas correspondientes.

Preparación remota pendiente:

1. Seleccionar un bucket privado con prevención pública explícita y preparar los permisos mínimos de runtime/publicador.
2. Definir variable de repositorio **`ALLURE_REPORTS_BUCKET`**, también consumida por el workflow backend de despliegue.
3. Definir **`ALLURE_PUBLISH_SERVICE_ACCOUNT`** junto a los secretos WIF existentes (`GCP_PROJECT_ID`, `WIF_PROVIDER`); configurar su identidad federada. No guardar claves JSON.
4. Crear/configurar el environment **`quality-reports`** con las restricciones de ramas/aprobación apropiadas para la publicación manual. Esa política se administra en GitHub; el archivo YAML no garantiza por sí solo revisores obligatorios.
5. Publicar los cambios mediante el flujo autorizado del repositorio; ejecutar CI sobre la revisión elegida, publicar sus reportes y desplegar la aplicación actualizada mediante su proceso habitual.
6. Verificar en entorno desplegado: ADMIN/SUPER_ADMIN abren los dos reportes, USER recibe 403, anónimos 401 y acceso directo público al bucket resulta denegado.

El ensamblador verifica esquema, huella, SHA del workflow original, suite completa, integridad, conteos y ausencia de cambios locales en evidencia CI. Publica objetos de HTML con ID de publicación/aplicación, sin sobrescribir IDs con contenido distinto. Sube primero los HTML y después reemplaza el catálogo; un fallo intermedio conserva el catálogo anterior. La concurrencia del workflow serializa las publicaciones. No subir reportes de pruebas fallidas a este catálogo de evidencia validada.

El catálogo conserva las **200 entradas más recientes**. Los objetos antiguos no se borran automáticamente; siguen sujetos a la política del bucket. Definir ciclo de vida/retención del bucket al habilitarlo, considerando costo y necesidad de auditoría. Si el objeto desaparece, su lectura informa 404. Los snapshots completos y resultados originales se conservan en el artefacto CI durante su retención; el HTML autocontenido incluye los adjuntos necesarios para consulta posterior. Regenerar pasado ese plazo requiere conservar/exportar el artefacto original previamente.

GitHub Pages mantiene exclusivamente la cobertura pública existente: `09-reports-pages.yml` descarga a `evidence/` y `scripts/assemble-public-coverage.mjs` excluye `allure/` y `receipt.json` al formar `public/`. **No publicar el artefacto expandido completo en Pages.**
