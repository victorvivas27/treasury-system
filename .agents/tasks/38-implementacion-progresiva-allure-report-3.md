# Tarea 38 — Implementación progresiva de Allure Report 3

## Estado general

**Fases 6–7 implementadas, pendientes de validación remota.** El usuario autorizó ambas fases y la sección administrativa. CI combinado comprobado localmente: 837/837 frontend y 877/877 backend, con gates preservados. Publicación privada y pantalla ADMIN/SUPER_ADMIN implementadas; falta definir/configurar destino remoto, publicar cambios y comprobar el entorno desplegado. La pantalla queda pendiente de aprobación visual. Fases 1–5 conservan su evidencia histórica, incluido el fallo intermitente frontend documentado.

Este archivo es la fuente de seguimiento de la iniciativa. El archivo `38-Creación-del-plan-maestro-de-Allure-Report-3.md` conserva el encargo de creación; ambos pertenecen a la misma iniciativa 38. No representan dos implementaciones distintas.

Cada futura sesión debe leer esta Task antes de implementar cambios.

## Objetivo y alcance

Incorporar progresivamente Allure Report 3 para consultar resultados de pruebas de Treasury System, manteniendo las suites y herramientas existentes y sin duplicar ejecuciones ni estructuras de gestión.

El alcance local contempla backend unitario, backend de integración, frontend unitario y frontend de integración. La cobertura continúa a cargo de JaCoCo y Vitest; los reportes Allure complementan esa información. La incorporación a CI y la publicación son fases futuras opcionales que requieren autorización específica.

Bruno y E2E se evaluarán como extensiones posteriores; no forman parte de los criterios de cierre local iniciales. No presentar transporte HTTP simulado como integración con backend real.

## Referencias y responsabilidades

- [Instrucciones de entrada](../../AGENTS.md) y [reglas centrales](../AGENTS.md).
- [01 — Visión general](01-project-overview.md): arquitectura y lectura inicial.
- [06 — Pruebas](06-testing.md): clasificación y comandos de las suites.
- [08 — Quality operations](08-quality-operations.md): verificaciones y restricciones.
- [Allure — guía operativa local](../../docs/ALLURE.md): requisitos, comandos, cobertura, evidencia y recuperación.
- [32 — Mejora CI/CD](32-mejora-ci-cd.md): arquitectura general del pipeline; no duplicar su backlog.
- [36 — Cobertura y confiabilidad](36-mejorar-cobertura-pruebas.md) y [registro de progreso](36-progreso-cobertura.md): metas, clasificación y evidencia de pruebas; no trasladar esas obligaciones a esta Task.
- [Reutilización de validaciones](../../docs/ci-validation-reuse.md) y [validación de PR](../../docs/PR_VALIDATION.md): contratos existentes que deben preservarse en cualquier fase futura de CI.

Consultar código, configuración y documentación oficial vigente antes de cambiar versiones o adaptadores. La compatibilidad validada corresponde a las versiones y evidencias registradas aquí.

## Restricciones y autorización

La autorización actual cubre las fases 1–7 solicitadas por el usuario, incluida la sección de reportes solo para administradores. Permite workflows, configuración, API, interfaz y pruebas necesarias. La prohibición previa de commit/push permanece; no se ha autorizado ni realizado despliegue de la aplicación. La elección/configuración del bucket remoto sigue pendiente.

- Instalar únicamente dependencias de pruebas/reporting autorizadas, con versiones exactas; conservar el lockfile frontend y la gestión de JUnit de Spring Boot.
- Modificar configuración, scripts, documentación y código necesarios para las suites y la sección administrativa autorizadas; referencias operativas en guías 06/08 y `docs/ALLURE.md`. No modificar otras iniciativas ni AGENTS.md.
- No crear Skills.
- No realizar commits, push ni despliegues de la aplicación. La publicación privada de reportes está autorizada, pendiente de destino y configuración; no se ha ejecutado remotamente.
- Durante la implementación futura, preservar contratos, reglas financieras, autorización, clasificación, umbrales y exclusiones existentes; no omitir pruebas para producir reportes aparentemente satisfactorios.
- No registrar secretos, datos productivos ni información sensible en resultados o adjuntos.
- Mantener los resultados generados fuera de la documentación versionada; definir sus rutas y política de limpieza durante el diagnóstico.

## Estados permitidos

Pendiente · En progreso · Implementado, pendiente de validar · Validado · Bloqueado.

No marcar una fase como validada sin evidencia reproducible. Una fase implementada no se considera validada automáticamente. Las fases opcionales permanecen pendientes y fuera del cierre local mientras no se autoricen.

## Checklist de fases

Las cinco primeras fases son locales. Las dos últimas son futuras y opcionales. Esta distribución concreta el encargo de siete fases; no supone que existan decisiones previas sobre adaptadores, versiones o rutas de salida.

| Fase | Alcance | Estado | Validación |
|---|---|---|---|
| 1. Diagnóstico y diseño técnico | Local | Validado | [x] |
| 2. Piloto reproducible | Local | Validado | [x] |
| 3. Extensión backend | Local | Validado | [x] |
| 4. Extensión frontend | Local | Validado | [x] |
| 5. Consolidación y operación local | Local | Validado | [x] |
| 6. Integración con CI | Autorizado | Implementado, pendiente de validar | [ ] |
| 7. Publicación y conservación | Autorizado | Implementado, pendiente de validar | [ ] |

### Fase 1 — Diagnóstico y diseño técnico

- [x] Inventariar versiones, suites, comandos y salidas reales de Gradle/JUnit y Vitest.
- [x] Verificar en documentación oficial la compatibilidad con Allure Report 3 y los requisitos de los adaptadores candidatos.
- [x] Elegir una suite para el piloto y justificar la elección.
- [x] Proponer cambios mínimos, dependencias, rutas separadas de resultados/reportes y limpieza para evitar datos antiguos.
- [x] Definir identificación de ejecución, suite, fecha y revisión Git, incluyendo cambios locales cuando existan.
- [x] Registrar decisiones, incertidumbres y autorizaciones necesarias antes de instalar.

Criterio de aceptación: diseño respaldado por configuración real y fuentes oficiales, con alcance del piloto y validación definidos; sin afirmar integración implementada.

### Evidencia y diseño de fase 1 — 24/10/2026

Base Git: `e2a1557`. Al comenzar, los dos archivos de la iniciativa 38 estaban sin seguimiento; no había cambios de código informados por `git status --short`. Las lecturas de reportes existentes son inventario, no ejecuciones nuevas.

#### Inventario comprobado

| Elemento | Configuración o versión observada | Evidencia |
|---|---|---|
| Node local | 22.20.0 | `node --version` |
| pnpm | 11.5.0 | `pnpm --version`, ambos `package.json` |
| Java local/toolchain | Temurin 17.0.16 / Java 17 | `java -version`, `backend/build.gradle` |
| Gradle wrapper | 9.4.0 | `backend/gradle/wrapper/gradle-wrapper.properties`; no se ejecutó Gradle |
| Spring Boot | 4.0.8 | `backend/build.gradle` |
| JUnit Jupiter | 6.0.3 gestionado por Boot | POM local de `spring-boot-dependencies/4.0.8` en caché Gradle y artefacto `junit-jupiter-api/6.0.3` presente; no se regeneró el grafo de dependencias |
| Vitest / cobertura V8 | 4.1.11 / 4.1.11 | `frontend/package.json`, `frontend/pnpm-lock.yaml` y manifests instalados |
| Vite / jsdom | 8.2.2 / 30.0.1 | Manifests instalados y configuración frontend |
| Ejecución frontend | jsdom, un worker, reporter `dot`, setup `src/setupTests.ts` | `frontend/vite.config.ts`; setup actual importa jest-dom |
| Cobertura backend | JaCoCo 0.8.12; gate histórico 70 % | `backend/build.gradle`; no cambiar exclusiones ni gate |

La guía 01 contiene versiones anteriores de Boot/TypeScript; la guía 06 dice JUnit 5. Para esta decisión se usa la configuración real y no se modifican esas guías en esta fase.

**Prerrequisito detectado:** el manifest instalado de jsdom 30.0.1 exige Node `^22.22.2 || ^24.15.0 || >=26.0.0`; Node local 22.20.0 no satisface ese rango. Vite exige `^20.19.0 || >=22.12.0` y Vitest `^20.0.0 || ^22.0.0 || >=24.0.0`. Antes del piloto debe seleccionarse un Node que satisfaga la intersección y los requisitos de las versiones Allure finalmente elegidas. No se actualizó Node ni se comprobó funcionalmente jsdom; esta incompatibilidad declarada es previa a Allure.

| Suite | Comando existente, desde su aplicación | Selección | Salida existente |
|---|---|---|---|
| Backend unitario | `.\gradlew.bat unitTest jacocoUnitTestReport` | Excluye tags `integration`, `postgres` | `backend/build/test-results/unitTest/`, `backend/build/reports/tests/unitTest/`, `backend/build/reports/jacoco/jacocoUnitTestReport/` |
| Backend integración | `.\gradlew.bat integrationTest jacocoIntegrationTestReport` | Incluye `integration`, `postgres`; respeta `excludeTags` | Directorios equivalentes `integrationTest` y `jacocoIntegrationTestReport` |
| Frontend unitario | `pnpm test:unit` o `pnpm test:coverage:unit` | `TEST_SUITE=unit`; excluye `*.integration.test.{ts,tsx}` | Consola; con cobertura, `frontend/coverage/unit/` |
| Frontend integración | `pnpm test:integration` o `pnpm test:coverage:integration` | `TEST_SUITE=integration`; incluye ese patrón | Consola; con cobertura, `frontend/coverage/integration/` |

`frontend/scripts/run-test-suite.mjs` propaga argumentos y el código de salida del runner. Se observaron 119 archivos de pruebas frontend, 11 con patrón de integración: es un conteo de archivos, no de pruebas ni de aprobaciones. La integración frontend simula HTTP; PostgreSQL backend requiere Docker para los escenarios correspondientes, cuya disponibilidad no se comprobó en este diagnóstico.

Los comandos conjuntos permanecen: frontend `pnpm test:coverage` escribe `coverage/combined`; backend `test` y `jacocoTestReport` tienen su reporte histórico, mientras `jacocoCombinedTestReport` combina los datos de las dos suites separadas. CI sigue usando cobertura conjunta (`02-frontend-ci.yml`, `03-backend-ci.yml`); no se cambiará ahora. `09-reports-pages.yml` ensambla evidencia existente, sin ejecutar tests.

#### Fuentes oficiales y compatibilidad documental

Fuentes consultadas el 24/10/2026. Las versiones de ramas `main` son candidatos de investigación, no prueba de publicación en un registro ni versiones aprobadas para instalar.

- [Instalación de Allure Report 3](https://allurereport.org/docs/v3/install/): el generador se distribuye como paquete npm `allure`. Usar instalación local reproducible; no confundirlo con `allure-commandline` de Allure 2.
- [Allure Vitest](https://allurereport.org/docs/vitest/): integración mediante setup y reporter adicionales; declarar `@vitest/runner` con la misma versión que Vitest. Conservar `dot` y jest-dom; usar setup Node/jsdom, no Browser Mode.
- [Manifest oficial de allure-vitest](https://raw.githubusercontent.com/allure-framework/allure-js/main/packages/allure-vitest/package.json): rama consultada en 3.14.0, peers Vitest y runner `>=1.3.0`, desarrollo sobre 4.1.11. Compatibilidad declarada con el Vitest actual; no equivale a validación local.
- [Manifest oficial del CLI](https://raw.githubusercontent.com/allure-framework/allure3/main/packages/cli/package.json): rama consultada en 3.22.0. Revalidar publicación, engines y dependencias transitivas antes de fijar versión.
- [Allure JUnit Jupiter](https://allurereport.org/docs/junit-jupiter/): soporta JUnit 5 y 6; coordenada vigente `io.qameta.allure:allure-jupiter`, con BOM; documentación ejemplifica Allure Java 3.0.0 y exige Java 17. No copiar automáticamente recetas antiguas de `allure-junit5`.
- [Configuración Jupiter](https://allurereport.org/docs/junit-jupiter-configuration/): permite `allure.results.directory` y etiquetas globales. Proponer propiedades por tarea para separar resultados.
- [Generación de reportes v3](https://allurereport.org/docs/v3/generate-report/) y [configuración v3](https://allurereport.org/docs/v3/configure/): separar ejecución del runner y transformación de resultados ya existentes; configurar destino explícito.

Conclusión: hay adaptadores oficiales documentalmente adecuados para ambos stacks y Java cumple el requisito de Allure Java 3. El generador Report 3 y los adaptadores tienen ciclos de versiones independientes. Queda por comprobar su combinación real, resolución de dependencias y reporte en el piloto; no se promete compatibilidad ejecutada.

#### Piloto elegido y cambios propuestos

Elegir **frontend unitario**: evita Docker, Spring y agentes JVM, y reutiliza el selector y wrapper existentes. Primero comprobar una muestra aislada existente (`src/shared/validation/apoderadoValidation.test.ts`); después ejecutar la suite unitaria completa con cobertura. Son comprobaciones de alcance creciente; nunca volver a ejecutar pruebas solo para transformar los mismos resultados en HTML.

Cambios previstos para fase 2, ninguno realizado:

1. `frontend/package.json` y `frontend/pnpm-lock.yaml`: añadir devDependencies con versiones exactas verificadas de `allure` y `allure-vitest`, más `@vitest/runner@4.1.11`. `allure-js-commons` directo solo si se utiliza su API; el reporte básico no necesita instrumentar cada test. Mantener el lockfile raíz ajeno al piloto frontend.
2. `frontend/vite.config.ts`: reporter y setup Allure condicionados a una activación explícita, preservando reporter `dot`, jest-dom, filtros, worker y cobertura. El flujo ordinario y CI no deben generar Allure por defecto durante el piloto.
3. `frontend/scripts/run-allure-suite.mjs`, si resulta necesario: un único coordinador local que reutilice `run-test-suite.mjs`, prepare metadatos y rutas, invoque el runner una vez y genere el HTML. Si fallan tests, intentar generar evidencia pero conservar el fallo; si falla solo el reporte, devolver error de reporting, sin aparentar éxito. No añadir un framework de orquestación.
4. `frontend/allurerc.mjs`, si es necesario para fijar destino y desactivar publicación: configuración mínima del generador local. Confirmar sintaxis con la versión instalada; no copiar opciones de CLI 2.
5. Actualizar exclusivamente esta Task con evidencia. La guía `docs/ALLURE.md` continúa pospuesta.

Para fase 3 se propone BOM y `allure-jupiter` solo en dependencias de tests de `backend/build.gradle`, con activación y directorio por tarea `Test`. Evitar inicialmente plugin Gradle y AspectJ: los resultados básicos no requieren anotaciones `@Step`/`@Attachment`; si se solicitan después, evaluar el agente sin reemplazar el de JaCoCo. Verificar dependencias resueltas de Jupiter antes de fijar el BOM; no cambiar JUnit para acomodar Allure.

#### Rutas, limpieza e identificación propuestas

Todas las rutas siguientes son propuestas, todavía inexistentes por esta iniciativa. No usar `coverage/` para resultados Allure porque Vitest limpia sus directorios.

| Aplicación | Directorio base por ejecución |
|---|---|
| Frontend | `frontend/build/allure/<suite>/<run-id>/` |
| Backend | `backend/build/allure/<suite>/<run-id>/` |

En cada directorio: `allure-results/` para datos originales, `allure-report/` para HTML y `run.json` para el registro de ejecución. Ambos `build/` están ignorados por `.gitignore`; no se requiere cambiarlo. Las suites serán `unit`, `integration` y, solo para ejecuciones conjuntas explícitas, `combined`; una muestra llevará además su selector y alcance parcial.

- `run-id`: timestamp UTC más UUID; no incorporarlo al identificador estable de cada test.
- `run.json`: SHA completo, estado dirty al inicio, lista de rutas modificadas sin contenidos, suite, comando/selector, versiones, tiempos UTC, código de salida del runner y generador, alcance parcial/completo, conteos y limitaciones. No volcar variables de entorno ni comandos con credenciales. SHA sin indicador dirty no basta para describir cambios locales.
- Copiar al entorno del reporte una lista permitida de metadatos (suite, ejecución, fecha, SHA, dirty y versiones); etiquetas para aplicación y tipo de suite. No utilizar IDs de prueba aleatorios como etiquetas de agrupación ni modificar su identidad por ejecución.
- Crear un directorio nuevo para cada ejecución; abortar ante colisión. El generador recibirá exclusivamente el `allure-results/` de esa ejecución, nunca un glob que mezcle históricos. Si faltan resultados o la suite está vacía, informar error/validación incompleta.
- No borrar ejecuciones previas automáticamente durante el piloto. Una limpieza posterior debe actuar solo sobre directorios resueltos y verificados dentro de los dos `build/allure/`; no tocar cobertura, datos de JaCoCo ni evidencia de otras suites.
- Para conteos reproducibles usar salida legible por máquina del runner cuando se necesite (reporter JSON Vitest adicional, XML JUnit existente). Reintentos y contenedores no se cuentan como pruebas nuevas; documentar cualquier diferencia de estados.
- El piloto debe comprobar resultados correctos, un fallo controlado sin dejarlo permanente, regeneración sin rerun, ejecución nueva sin datos antiguos y conservación del código de salida. Reportar evidencia de la suite completa antes de validar fase 2.

#### Incertidumbres y autorización siguiente

No se instalaron ni resolvieron paquetes nuevos. Versiones publicadas exactas, engines transitivos, API de configuración, metadatos finales y tratamiento de fallos se confirmarán al implementar. El requisito Node/jsdom debe resolverse antes de ejecutar el piloto; no se autoriza cambiar dependencias para ocultarlo. Docker y la integración PostgreSQL se verificarán en su fase.

El siguiente alcance a autorizar es fase 2: selección de runtime compatible, instalación local de las dependencias verificadas, cambios frontend mínimos listados y ejecución del piloto. CI, publicación, backend y documentación operativa quedan fuera de ese alcance.

### Fase 2 — Piloto reproducible

- [x] Con autorización técnica, integrar únicamente la suite elegida y las dependencias aprobadas.
- [x] Generar resultados y abrir un reporte local desde una ejecución limpia.
- [x] Contrastar conteos, estados y errores con la salida original del runner.
- [x] Comprobar que una prueba fallida conserva el fallo y su código de salida; usar un escenario controlado sin dejar fallos artificiales permanentes.
- [x] Registrar comandos, archivos modificados, resultados y límites.

Criterio de aceptación: piloto repetible, reporte atribuible a su ejecución y resultado original del runner preservado.

#### Operación del piloto frontend

Dependencias exactas verificadas en npm e instaladas: `allure@3.22.1`, `allure-vitest@3.14.0`, `allure-js-commons@3.14.0` y `@vitest/runner@4.1.11`. El CLI y el adaptador conservan sus versiones independientes. El lockfile raíz no se modifica.

Node 22.22.2 portable se descargó desde nodejs.org al directorio temporal y su ZIP se contrastó con `SHASUMS256.txt`. El Node global continúa en 22.20.0. Los manifests instalados, incluidos transitivos, no declararon engines incompatibles con el runtime portable al verificarlos. No se instaló Node como dependencia del proyecto.

Comandos desde `frontend/`, con Node compatible activo:

```powershell
pnpm test:allure:unit src/shared/validation/apoderadoValidation.test.ts
pnpm test:allure:unit --coverage
pnpm allure:generate <run-id>
pnpm exec allure open build/allure/unit/<run-id>/allure-report
```

Para usar el runtime portable de esta entrega sin cambiar el Node global:

```powershell
$pilotNode = Join-Path $env:TEMP 'treasury-allure-node-22.22.2/node-v22.22.2-win-x64/node.exe'
& $pilotNode scripts/run-allure-suite.mjs unit --coverage
& $pilotNode scripts/run-allure-suite.mjs generate <run-id>
& $pilotNode node_modules/allure/cli.js open build/allure/unit/<run-id>/allure-report
```

Los `<run-id>` son marcadores a sustituir. El runtime temporal puede desaparecer por limpieza del sistema; futuras sesiones deben comprobar su disponibilidad y compatibilidad antes de usarlo.

El coordinador acepta únicamente `unit`, `--coverage` y selectores explícitos `src/...test.ts(x)` o `src/...spec.ts(x)`; otras opciones se rechazan para conservar filtros y reporters. El modo `generate` solo transforma resultados existentes. `run.json` conserva resultado del runner, intentos del generador, conteos originales y conteos del HTML. Si fallan los tests, el resultado final mantiene ese fallo aunque el HTML se genere; si falla únicamente generación o conciliación, el resultado final también falla.

El HTML se regenera con `--clean` solo después de verificar el destino resuelto dentro de la corrida; no se eliminan resultados originales, cobertura ni otras corridas. No existe limpieza automática de ejecuciones antiguas. Cada corrida nueva tiene otro UUID y directorio.

Los comandos ordinarios conservan su reporter `dot` y no activan Allure; el coordinador activa `TREASURY_ALLURE_RUN_DIR` exclusivamente para sus procesos hijos. Las pruebas y cobertura se ejecutan una sola vez por corrida; generar o abrir HTML no las repite.

**Identidad de casos parametrizados:** el primer reporte completo produjo 707 archivos originales, pero el HTML agrupó cinco casos de títulos repetidos en tres grupos y mostró 702 resultados. No se considera una validación final. Se incorporó `scripts/allure.setup.mjs`, activado solo en el piloto, que añade un parámetro oculto `vitest.caseId` a `test.each`. Es el ID determinista de Vitest, no el UUID de la corrida. Los 68 casos de los tres archivos afectados se verificaron contra resultados originales y HTML, sin modificar sus pruebas.

La [documentación de Vitest](https://vitest.dev/api/advanced/test-case.html#id) describe que ese ID depende del archivo/proyecto y orden del test; reordenar casos puede cambiarlo. La [API de parámetros de Allure](https://allurereport.org/docs/vitest-reference/) permite distinguir casos mediante parámetros. Este compromiso de identidad debe revisarse si en futuras fases se requiere historial estable frente a reordenamientos. No se habilitan reintentos para encubrir colisiones.

### Fase 3 — Extensión backend

- [x] Incorporar las suites backend unitaria y de integración, reutilizando el piloto si ya cubrió una de ellas.
- [x] Mantener clasificación y salidas diferenciadas, sin repetir pruebas solo para generar el reporte.
- [x] Verificar escenarios de integración PostgreSQL con Docker disponible; registrar cualquier validación incompleta.
- [x] Confirmar que JaCoCo y las verificaciones existentes mantienen su comportamiento.

Criterio de aceptación: ambas suites backend identificables y reproducibles, conteos contrastados y ninguna omisión presentada como validación completa.

#### Operación backend validada

Se reutiliza el CLI npm `allure@3.22.1` ya instalado en frontend. No se añaden paquetes npm para backend. `backend/build.gradle` define `allureTestRuntime`, extendida de `testRuntimeClasspath`, con BOM `io.qameta.allure:allure-bom:3.0.0` y adaptador `allure-jupiter`. Gradle verificó resolución efectiva de Allure 3.0.0 y JUnit Jupiter 6.0.3. Allure solicita transitivamente JUnit 6.1.0, pero la gestión existente de Boot mantiene 6.0.3; las dos suites completas funcionaron con ese grafo. No se cambió JUnit ni se añadieron plugin Allure Gradle o AspectJ.

La activación exige conjuntamente `-PallureSuite=unit|integration` y `-PallureRunDir=<ruta>`. Gradle comprueba que la ruta es un hijo directo existente de `backend/build/allure/<suite>/`. Solo la tarea elegida recibe el classpath Allure y propiedades del adaptador. La tarea activada no reutiliza resultados de caché ni `UP-TO-DATE`; cada corrida explícita ejecuta sus pruebas. Los comandos ordinarios no resuelven Allure ni cambian su classpath. Los tags existentes se conservan; el coordinador no admite filtros de tags ni opciones que oculten pruebas.

Comandos desde la raíz del repositorio:

```powershell
$pilotNode = Join-Path $env:TEMP 'treasury-allure-node-22.22.2/node-v22.22.2-win-x64/node.exe'
& $pilotNode scripts/run-backend-allure.mjs run unit
& $pilotNode scripts/run-backend-allure.mjs run integration
& $pilotNode scripts/run-backend-allure.mjs run unit --tests stand.StandProductTest
& $pilotNode scripts/run-backend-allure.mjs generate unit <run-id>
& $pilotNode scripts/run-backend-allure.mjs open unit <run-id>
& $pilotNode scripts/run-backend-allure.mjs open integration <run-id>
```

Los marcadores `<run-id>` deben sustituirse por la corrida elegida. `run integration` comprueba Docker antes de iniciar la suite; si no está disponible, falla sin omitir PostgreSQL. El wrapper Java del repositorio se invoca directamente mediante `org.gradle.wrapper.GradleWrapperMain`, sin shell, y respeta la distribución Gradle 9.4.0 fijada en el repositorio.

Cada corrida guarda `run.json`, `allurerc.json`, `junit-summary.json`, `junit-xml/`, `junit-html/`, `allure-results/` y `allure-report/`. Incluye SHA, dirty, rutas modificadas, selector/alcance, fecha UTC, versiones y códigos del runner/generador. La lista permitida de metadatos se entrega a Allure mediante `environment.properties`; no se vuelcan variables de entorno. El resumen de JUnit procede del resultado raíz de Gradle, no de reportes anteriores.

Las salidas JaCoCo por suite continúan en sus rutas existentes bajo `backend/build/jacoco` y `backend/build/reports/jacoco`; son salidas de la última ejecución correspondiente, no un archivo histórico por corrida. Los selectores parciales también generan cobertura parcial y no acreditan la suite completa. Las evidencias finales siguientes corresponden a suites completas, ejecutadas después de las comprobaciones temporales.

`generate` limpia únicamente el HTML de la corrida elegida tras verificar la ruta real y no inicia Gradle. `open` exige un HTML y resumen existentes, carga explícitamente la configuración JSON de esa corrida y sirve en `127.0.0.1`; no depende de la variable del piloto frontend. La apertura real de integración fue comprobada en esta entrega.

### Fase 4 — Extensión frontend

- [x] Incorporar las suites frontend unitaria y de integración, reutilizando el piloto si corresponde.
- [x] Conservar los límites de integración con transporte simulado y las salidas de cobertura independientes.
- [x] Contrastar resultados y comprobar que no se mezclan ejecuciones ni se sobrescriben resultados de otra suite.
- [x] Verificar las comprobaciones de pruebas, tipado, lint y build pertinentes al cambio.

Criterio de aceptación: ambas suites frontend identificables y reproducibles, con resultado del runner y cobertura preservados.

#### Operación frontend tras fase 4

Se reutilizan versiones y setup del piloto; no se instalaron dependencias ni se cambió el lockfile en esta fase. El mismo coordinador admite `unit` e `integration`. Vite exige una ruta de corrida perteneciente a la suite seleccionada y mantiene los patrones, worker único, reporter `dot`, jest-dom y exclusiones existentes.

Desde `frontend/`, con runtime Node compatible:

```powershell
pnpm test:allure:unit --coverage
pnpm test:allure:integration --coverage
pnpm allure:generate integration <run-id>
pnpm allure:open integration <run-id>
pnpm allure:generate <run-id-unitario>
```

Con el runtime portable existente:

```powershell
$pilotNode = Join-Path $env:TEMP 'treasury-allure-node-22.22.2/node-v22.22.2-win-x64/node.exe'
& $pilotNode scripts/run-allure-suite.mjs integration --coverage
& $pilotNode scripts/run-allure-suite.mjs generate integration <run-id>
& $pilotNode scripts/run-allure-suite.mjs open integration <run-id>
```

Los marcadores se sustituyen por corridas reales. `generate <run-id>` conserva su significado anterior de suite unitaria; también admite `generate unit <run-id>`. `open` sigue esa misma convención y valida identidad y ruta antes de abrir. Las nuevas corridas se guardan bajo `frontend/build/allure/unit/` o `integration/`, con UUID distinto. No se admite Allure combinado implícito ni se alteran los comandos ordinarios.

La cobertura permanece independiente en `coverage/unit`, `coverage/integration` y `coverage/combined`. Los modos `generate` y `open` no ejecutan pruebas ni cobertura. La integración conecta capas internas con HTTP controlado y no acredita conexión a backend real; esa limitación se muestra también en los metadatos del reporte.

El reporte frontend usa ahora `awesome.options.singleFile: true`: HTML autocontenido con los JSON de control de Allure conservados al lado. Evita el movimiento de directorios de datos que falló durante la generación multifichero. No se modificó el generador ni la configuración backend. Mantener toda la carpeta `allure-report/` para usar los comandos de apertura, que verifican `index.html` y `summary.json`.

### Fase 5 — Consolidación y operación local

- [x] Comprobar el flujo local de las cuatro suites sin ejecuciones duplicadas para reporting.
- [x] Verificar limpieza, regeneración, atribución de resultados y tratamiento explícito de suites fallidas, vacías o no ejecutadas.
- [x] Documentar requisitos, comandos, rutas, diagnóstico y limitaciones en `docs/ALLURE.md`.
- [x] Incorporar referencias operativas mínimas autorizadas en las guías 06 y 08.
- [x] Registrar evidencia final y pendientes ajenos al alcance local.
- [x] Incorporar el resumen de cobertura de Vitest/JaCoCo y su detalle en Allure. Identificar aplicación, suite, ejecución y denominador; distinguir cobertura de código de porcentaje de pruebas aprobadas, sin sumar porcentajes entre suites.

Criterio de aceptación: operación local documentada y reproducible para las cuatro suites, sin confundir resultados de pruebas con cobertura ni atribuir reportes antiguos a una ejecución nueva.

Operación vigente: [docs/ALLURE.md](../../docs/ALLURE.md). Desde la raíz, con Node compatible: `node scripts/allure-local.mjs run`; consultar con `show <session-id>`, regenerar o abrir con `generate/open <frontend|backend> <unit|integration> <run-id>`. Cada generación utiliza resultados ya existentes. La sesión conserva su estado histórico; una recuperación posterior se consulta en `run.json` y no reescribe el manifiesto de sesión.

En el flujo Allure backend, fase 5 sustituye las salidas compartidas descritas en fase 3 por `jacoco.exec` y `coverage-source/` dentro de cada corrida. Los comandos Gradle ordinarios mantienen sus rutas anteriores. Ambos backends generan ahora HTML autocontenido, igual que frontend. Las decisiones históricas de fases 3/4 describen el estado validado entonces.

La cobertura se congela en `coverage/` con resumen, detalle original, ZIP y manifiesto SHA-256. Allure muestra porcentajes y fracciones en Metadata y tres adjuntos globales. No se certifica cobertura de runners fallidos, ni se reutilizan mediciones antiguas o de otra corrida. No se calcula un porcentaje global entre aplicaciones o suites.

### Fase 6 — Integración con CI, autorizada

Implementación y comprobación local realizadas; no declarar validación GitHub antes de publicar cambios y ejecutar sus workflows.

- [x] Reutilizar ejecuciones y evidencia existentes; evitar pipelines paralelos o nuevas ejecuciones solo para Allure.
- [x] Definir artefactos, metadatos, retención y tratamiento de fallos sin alterar indebidamente los checks obligatorios.
- [x] Revisar huella de entradas: esquema v2 frontend/backend y lockfile CLI incluido en backend.
- [x] Vincular resultados con la revisión validada y documentar equivalencia por entradas al reutilizar evidencia.
- [x] Comprobar YAML y comportamiento local con pruebas de selección/reutilización/ensamblado.
- [ ] Publicar cambios autorizados y comprobar ejecución/reutilización/artefactos reales en GitHub.

Criterio de aceptación: evidencia Allure recuperable y atribuible, sin duplicación de pruebas ni pérdida de señales de fallo.

### Fase 7 — Publicación y conservación, autorizada

El usuario solicitó consultar Allure desde una sección solo para administradores y autorizó las dos fases. El diseño evita publicar esos HTML en Pages.

- [x] Reutilizar artefactos CI y conservar Pages de cobertura, excluyendo evidencia privada Allure.
- [x] Implementar sección ADMIN/SUPER_ADMIN, API protegida, almacenamiento privado e historial de 200 entradas.
- [x] Ensamblar reportes ya generados sin ejecutar pruebas al publicar; verificar procedencia e integridad.
- [x] Documentar acceso, retención de 14 días CI, objetos conservados, recuperación y límites.
- [x] Comprobar visor aislado con reportes reales y actualizar guía operativa.
- [ ] Configurar bucket privado, identidad publicadora WIF, permisos runtime y environment GitHub.
- [ ] Publicar/deplegar mediante flujo autorizado y verificar permisos, enlaces y recuperación en remoto.
- [ ] Obtener aprobación visual de la sección administrativa.

Criterio de aceptación: publicación autorizada, verificable y recuperable, preservando los reportes existentes y la correspondencia con la evidencia original.

## Registro cronológico de avances

### 24/10/2026 — Creación del plan

- Alcance: documentación de la iniciativa y sus siete fases.
- Archivo creado: `.agents/tasks/38-implementacion-progresiva-allure-report-3.md`.
- Comprobaciones: lectura de instrucciones, consulta de estado Git, comprobación de que la ruta destino no existía y revisión documental del plan.
- Pruebas técnicas: ninguna; no se instaló ni ejecutó Allure.
- Resultado: plan documentado; integración técnica pendiente.
- Pendiente: autorización para iniciar la fase 1.

En cada entrega futura añadir fecha, revisión Git/base local, fase y estado, archivos modificados, comandos y pruebas realizados, resultados, limitaciones y pendientes. Distinguir evidencia nueva de resultados anteriores no reejecutados.

### 24/10/2026 — Fase 1, diagnóstico validado

- Autorización: solicitud del usuario de avanzar con fase 1; sin autorización de instalación o piloto.
- Base: `e2a1557`, con ambos archivos 38 sin seguimiento al inicio.
- Único archivo editado: este plan maestro.
- Comprobaciones: lectura de Gradle, wrapper, Vite, manifests, lockfile frontend, selector de suites, setup, ignores, workflows y POM Boot en caché; consultas oficiales Allure; comandos `node --version`, `pnpm --version`, `java -version`, `git status --short` y `git rev-parse --short HEAD`.
- Resultado: diseño documentado, piloto frontend unitario seleccionado y requisito previo Node/jsdom identificado. Fase 1 validada como diagnóstico; no como integración ejecutada.
- Pruebas: no se ejecutaron suites, Gradle, build ni Allure; no eran necesarias para la revisión documental y no se presentan resultados previos como evidencia nueva.
- Pendientes: autorización de fase 2, runtime compatible y verificación de versiones publicadas antes de instalar.

### 24/10/2026 — Fase 2, implementación del piloto

- Autorización: el usuario pidió avanzar con fase 2. Se autorizaron además las operaciones fuera del sandbox necesarias para descargar Node portable, instalar en el almacén pnpm existente y crear subprocesos de validación.
- Base: `e2a1557`, conservando los dos archivos 38 que ya estaban sin seguimiento.
- Archivos modificados: `frontend/package.json`, `frontend/pnpm-lock.yaml`, `frontend/vite.config.ts` y este plan. Archivos creados: `frontend/allurerc.mjs`, `frontend/scripts/run-allure-suite.mjs`, `frontend/scripts/allure.setup.mjs`.
- Dependencias: versiones exactas del piloto y runtime descritos en Operación. No se modificó el lockfile raíz ni se instaló Node global.
- Primera muestra: 3/3 aprobadas; reporte abierto en Chromium a 1216 × 552, sin errores JavaScript.
- Primera ejecución completa: 707/707 aprobadas en 108 archivos; sus resultados originales coincidían con Vitest, pero el HTML agrupaba casos parametrizados y mostraba 702. La evidencia de esa corrida es exploratoria y no acredita cierre del piloto.
- Corrección: parámetro estable para `test.each`, sin editar pruebas de negocio. Pruebas dirigidas: 68/68 aprobadas en tres archivos y 68/68 en HTML. Corrida: `2026-10-24T12-40-37-639Z-d780ecfb-682a-429e-80b2-9c86709404b3`.
- Fallo controlado: fixture temporal con una aserción fallida; runner 1, generador 0, coordinador 1 y reporte con un fallo. La fixture se eliminó en `finally`; no queda una prueba artificial fallida en el repositorio. Corrida: `2026-10-24T12-38-51-239Z-c8c341a5-9f53-4587-88bc-5d9bb1831051`.
- Aislamiento: muestra posterior de 3/3 en otro directorio, sin arrastrar ese fallo. Regeneración sin cambiar hashes originales ni fecha de `vitest.json`; archivo HTML obsoleto de comprobación eliminado por la limpieza. Corrida: `2026-10-24T12-38-57-232Z-a0dfc5ff-cc2e-44c1-a9bb-cce776b8116c`.
- Suite vacía: runner y coordinador devolvieron 1, sin aparentar éxito. Corrida: `2026-10-24T12-39-05-676Z-789cb36b-c1f8-40d6-b2b8-2acf6ba4e872`.
- Comando ordinario: muestra 3/3 aprobadas con el wrapper existente sin crear otra corrida Allure. Node global incompatible y sobrescritura de reporter rechazados por el coordinador.
- Generación fallida: al regenerar la primera corrida completa, el CLI devolvió `EPERM` en un rename interno de directorios bajo OneDrive; runner original 0 y coordinador 1. No se ocultó ese fallo ni se consideró aprobada la regeneración. La regeneración de los 68 casos corregidos terminó después con 0 y conciliación de HTML correcta. No se atribuye una causa definitiva al bloqueo de archivos.
- Comprobaciones de código: Oxlint, tokens de color y `tsc -b` aprobados; build Vite aprobado con los avisos existentes de `eval` en Lottie. Se revisaron sintaxis de scripts y diff. Las suites backend, integración frontend, Bruno y E2E no se ejecutaron en esta fase.
- Validación completa corregida: **707 pruebas aprobadas en 108 archivos, cero fallos, errores u omisiones**. Corrida final: `2026-10-24T12-41-27-364Z-a6587eca-e6d0-4e4b-a54e-7030f399c57d`. Runner, 707 resultados originales y 707 resultados del HTML conciliados; códigos finales 0. Cobertura: líneas **60,13 %**, ramas **57,16 %**, funciones **48,60 %**, statements **58,41 %**, iguales a la primera corrida de esta entrega. No se cambian denominadores ni umbrales y no se alcanza la meta de Task 36.
- Evidencia final: `frontend/build/allure/unit/2026-10-24T12-41-27-364Z-a6587eca-e6d0-4e4b-a54e-7030f399c57d/`, con `run.json`, `vitest.json`, `allure-results/`, `allure-report/` y `report-preview.png`. La regeneración final con el coordinador actualizado conservó hashes de resultados originales y fecha del JSON de Vitest, y terminó con `reportMatches: true`. Chromium a 1216 × 552 mostró 707 aprobadas, sin reintentos ni errores JavaScript. Servidor de comprobación y navegador cerrados al terminar.
- Cierre: fase 2 **Validada**. Únicamente el piloto unitario frontend está integrado. No se modificaron backend, workflows, otras Tasks, AGENTS.md, Skills ni código productivo; no se creó `docs/ALLURE.md`, ni se realizaron commits, push o publicaciones.

### 24/10/2026 — Fase 5, operación local y cobertura validadas

- Autorización: solicitud del usuario de avanzar con fase 5, incluida la incorporación de cobertura conversada. Base `e2a1557`, con cambios locales previos conservados y `frontend/cd` intacto. No se instalaron dependencias en esta fase.
- Archivos nuevos: `scripts/allure-local.mjs`, `scripts/allure-coverage.mjs`, `scripts/allure-coverage.test.mjs` y `docs/ALLURE.md`. Archivos modificados: coordinadores frontend/backend existentes, `frontend/allurerc.mjs`, `backend/build.gradle`, este plan y referencias mínimas en guías 06/08. Sin cambios productivos ni en pruebas de negocio.
- Flujo conjunto: `node scripts/allure-local.mjs run`, usando Node portable compatible, ejecutó las cuatro suites una vez cada una. Sesión `2026-10-24T13-58-10-078Z-3ee9dd80-6aad-44bc-b554-6a4b24a6913e`, manifiesto en `frontend/build/allure/sessions/<session-id>/session.json`.
- Señal de fallo real: frontend unitario produjo **706 aprobadas y 1 fallida de 707**, al comprobar `document.body.style.overflow` inmediatamente después de encontrar el diálogo de recuperación de contraseña (`AccountFlowPages.test.tsx:195`). Runner 1, generador 0, coordinador 1; HTML y originales conciliados. Cobertura no certificada. Corrida `2026-10-24T13-58-10-240Z-83afbdbd-0225-40c4-a88b-40edef930073`. La sesión conjunta conserva **exit 1** y no se reescribió como aprobada.
- Diagnóstico: las 12 pruebas del archivo afectado pasaron de forma aislada, sin cobertura, sin modificar expectativas ni producción. Corrida `2026-10-24T14-05-04-667Z-f108e727-9fea-4782-8be6-a9a1138e6f0f`. La repetición completa independiente de frontend unitario pasó 707/707. Es evidencia de intermitencia; la causa no se considera corregida ni definitivamente atribuida a Allure. No se añadió retry automático.
- Las otras tres suites completaron la sesión conjunta con códigos 0; integración backend incluyó PostgreSQL Testcontainers. No se reejecutaron para recuperar frontend. Evidencia final completa con cobertura:

| Aplicación / suite | Pruebas aprobadas | Líneas | Ramas | Funciones / métodos | Run ID |
|---|---:|---:|---:|---:|---|
| Frontend unitario, repetición independiente | 707/707 | 60,14 % (4908/8161) | 57,16 % (4233/7405) | 48,64 % (1522/3129) | `2026-10-24T14-06-01-085Z-45aeebaf-5ad4-46bf-a368-3eda8fab3585` |
| Frontend integración | 127/127 | 15,89 % (1297/8161) | 11,47 % (849/7405) | 15,76 % (493/3129) | `2026-10-24T14-04-37-530Z-dc47d8b2-5f0d-401a-bdd7-8df50c04f863` |
| Backend unitario | 540/540 | 59,37 % (4741/7986) | 48,10 % (1750/3638) | 51,81 % (1288/2486) | `2026-10-24T14-05-42-950Z-87a5343f-095b-4aa2-88ae-4a458b3438af` |
| Backend integración | 334/334 | 41,02 % (3276/7986) | 20,23 % (736/3638) | 42,12 % (1047/2486) | `2026-10-24T14-06-41-267Z-b1712fef-b9a1-421d-8bf0-1ad3457a4e76` |

- Cada fila final tiene cero fallos, errores y omisiones; runner, originales Allure y HTML coinciden. Los porcentajes se redondean desde contadores originales: Vitest trunca algunos valores en consola. No se promedian ni suman filas. La pequeña variación de funciones frontend respecto a fase 2 queda conservada como medición nueva, sin cambiar configuración o denominador.
- Cobertura: snapshot propio con motor, aplicación, suite, alcance completo/parcial, SHA, cambios locales, huella de configuración, fracciones y porcentajes. JaCoCo se lee a nivel raíz para evitar duplicar contadores de clases/paquetes. `adm-zip` se reutiliza desde la dependencia declarada del CLI instalado; no se añadió un paquete.
- Pruebas del helper: **4/4 aprobadas**, cubriendo contadores JaCoCo, fracciones Vitest, denominadores inválidos, mediciones antiguas, snapshot alterado e históricos sin cobertura. La primera muestra detectó un fallo de resolución pnpm de `adm-zip`: se corrigió resolviendo el paquete real del CLI; no se consideró válida esa cobertura fallida. Muestra corregida 3/3 con snapshot y código 0 (`2026-10-24T13-56-54-210Z-9e86c1e9-295d-40e3-b2bd-573387b9a04f`).
- Regeneración final de las cuatro filas: códigos 0 sin repetir pruebas, hashes de resultados originales y snapshots preservados, fechas de JSON del runner intactas, archivo HTML obsoleto de control eliminado, ZIP íntegros y sus puntos de entrada HTML comprobados. Evidencia local: `frontend/build/allure/phase5-validation.json`. Los escenarios vacíos y fallos controlados de fases 2–4 permanecen como evidencia previa; no se atribuyen nuevas ejecuciones en fase 5.
- Navegador Chromium **1216 × 552**: frontend unitario final mostró 707 aprobadas y `coverage_lines=60.14% (4908/8161)`; frontend integración mostró 127 y sus métricas; backend unitario mostró 540, métricas JaCoCo y tabla Markdown de cobertura abierta. Tres adjuntos globales visibles y cero errores JavaScript. Capturas `report-preview.png` junto a las corridas.
- Calidad: Oxlint frontend y scripts nuevos/modificados, tokens de color, `tsc -b`, build Vite y `git diff --check` aprobados. PMD main y `bootJar` aprobados (`UP-TO-DATE`, sin cambios productivos). Se mantienen avisos existentes de Lottie y tamaño de chunks, además de avisos JVM/Gradle de ejecuciones backend. No se repitió `check` completo ni Bruno/E2E.
- Cierre: fase 5 **Validada** y alcance local completo. CI/publicación pendientes; Task 36 sigue sin cumplir su objetivo. Registrar la intermitencia de la prueba de recuperación al ampliar trabajo de confiabilidad; no falsear la sesión inicial ni presentar su cobertura como válida. Sin cambios en AGENTS.md, Skills o workflows; sin commits, push, despliegue o publicación.

### 24/10/2026 — Fases 6 y 7, implementación con validación local

- Autorización: usuario pidió avanzar con ambas fases después de solicitar una sección exclusiva para administradores. Base `e2a1557` con cambios locales anteriores preservados, incluidos los dos archivos 38 y `frontend/cd`. No se hicieron commits, push, instalaciones ni despliegues.
- Estado: **Implementado, pendiente de validar remotamente**. La pantalla también queda **pendiente de aprobación visual**. No afirmar que GitHub ejecutó estos workflows ni que los HTML están publicados en producción.
- CI: coordinadores existentes ampliados a `combined`, respetando la selección histórica CI. `scripts/allure-ci.mjs` ejecuta una vez cada aplicación, conserva cobertura en la raíz del artefacto y añade Allure/recibo. Frontend mantiene lint/build; backend mantiene `check`, PMD y cobertura mínima 70 %. Generar/publicar no ejecuta tests.
- Evidencia combinada frontend: **837/837 pruebas aprobadas en 120 archivos**, cero omisiones. Corrida `2026-10-24T15-01-42-224Z-64db79b2-25a3-481d-9d94-928ce091fa88`. Cobertura redondeada: líneas **69,10 % (5664/8197)**, ramas **64,62 % (4808/7440)**, funciones **58,79 % (1853/3152)**. Runner, originales y HTML conciliados. `run.json.command` de esta corrida conservó inicialmente el nombre del wrapper separado, aunque el proceso real fue Vitest combinado directo; la declaración del comando se corrigió para futuras corridas sin alterar retrospectivamente esa evidencia.
- Evidencia combinada backend: **877/877 aprobadas**, cero omisiones, incluyendo PostgreSQL. Corrida `2026-10-24T15-08-12-940Z-6c1dfb26-071f-4bbc-9cd8-e963f2990b62`. `check`, PMD y gate JaCoCo aprobados. Cobertura histórica combinada: líneas **83,98 % (4104/4887)**, ramas **61,36 % (1674/2728)**, métodos **80,25 % (1085/1352)**. Su denominador conserva exclusiones históricas y difiere del reporte separado de fase 5; no compararlo como si fueran la misma medición.
- Artefactos de ensayo en `<aplicación>/build/allure/ci-evidence`. Sus recibos tienen huella/workflow nulos y cambios locales: son pruebas locales del coordinador, no evidencia remota publicable. El ensamblador CI rechaza esa atribución incompleta; la revisión local utiliza importación `local` explícita.
- Reutilización: `scripts/ci-validation.cjs` usa esquema v2 frontend/backend; backend incluye el manifest/lockfile del generador frontend. Se invalidan recibos históricos sin Allure. Pruebas existentes de CI actualizadas para admitir diagnósticos fallidos conservados, manteniendo que solo workflows exitosos sean reutilizables.
- Publicación: `.github/workflows/11-publish-allure.yml` manual, WIF, identity dedicada, bucket privado con prevención pública explícita. Resuelve artefactos exitosos por entradas, contrasta recibos con workflow/SHA, ensambla HTML inmutable y actualiza catálogo después de subir objetos. Conserva hasta 200 entradas; CI hasta 14 días. Los objetos no se borran automáticamente; falta definir la política del bucket al activarlo.
- Separación de Pages: `09-reports-pages.yml` descarga a `evidence/` y utiliza `scripts/assemble-public-coverage.mjs` para excluir `allure/` y `receipt.json`. Prueba de ensamblado acredita que no se copian al árbol público. La cobertura pública histórica se mantiene.
- Aplicación: nuevo módulo `quality` backend y capas frontend de dominio/repositorio/casos de uso/página. API `/api/v1/admin/quality-reports` y `/{id}/content`, protegidas por SecurityConfig y `@PreAuthorize` para ADMIN/SUPER_ADMIN. USER recibe 403 y anónimos 401 en ambas rutas; lectura solo de IDs catalogados y hash SHA-256 del HTML, sin cache. Storage GCS existente reutilizado; alternativa local explícita. Sin cambios financieros, esquema ni autenticación global.
- Interfaz: Gestión → Reportes de calidad, ruta `/admin/reportes-calidad`, reutilizando AdminRoute/sidebar. Listado por aplicación/suite/fecha, pruebas y cobertura; estados vacío, sin configuración, carga y error. Visor sandbox sin same-origin, almacenamiento de preferencias efímero y base URL adaptada a Allure 3.22.1. CSP bloquea red/analítica; prueba de navegador comprobó que no puede leer el documento padre.
- Validaciones dirigidas: 20 pruebas frontend de pantalla/ruta/sidebar aprobadas; otras 3 de la pantalla final aprobadas después de adaptar el visor. Pruebas backend de almacenamiento/integridad y SecurityConfig aprobadas. Primera comprobación PMD detectó propiedad de Storage gestionada por Spring y retornos nulos; se corrigió sin suprimir reglas. PMD y bootJar finales aprobados.
- Herramientas: 14 pruebas de CI/cobertura aprobadas inicialmente; tras añadir separación de Pages/publicación, 12 pruebas de CI/ensamblado aprobadas. Verifican origen, huella incorrecta, evidencia fallida, snapshot alterado, historial y exclusión pública. Oxlint, tokens, TypeScript y build aprobados; avisos existentes Lottie/chunks permanecen.
- Navegador: pantalla revisada a **1216×552, 768×1024, 390×844 y 360×640**, sin overflow global. Reportes reales frontend 837 y backend 877 abiertos en iframe, tres adjuntos visibles y bloqueo de acceso al padre. Sin errores JavaScript en la versión final; la CSP bloqueó scripts externos de analítica y scripts de desarrollo que Vite inserta en la vista de revisión. Capturas en `frontend/build/allure/quality-page-*.png` y `quality-*-embedded.png`. Vista aislada de revisión: `http://127.0.0.1:5189/build/allure/quality-preview.html`; no sustituye autenticación real ni despliegue.
- Cierre de comprobaciones: visor abierto en móvil y zoom 200 % sin overflow global; controles alcanzables. Pruebas backend finales dirigidas: 2 de almacenamiento y 30 de SecurityConfig, sin fallos ni errores. `git diff --check` y enlaces documentales aprobados.
- Pendientes externos: consulta de nombres de variables GitHub confirmó que aún no existe `ALLURE_REPORTS_BUCKET`. Se preguntó al usuario si utilizar bucket nuevo o existente; no asumir respuesta. Configurar bucket, WIF/identidad publicadora y permisos runtime/environment, publicar cambios por flujo autorizado y comprobar CI/publicación/401/403 en entorno real. No se han creado recursos ni alterado permisos remotos.

## Decisiones

### 24/10/2026 — Activación de los reportes en la aplicación local

- Solicitud explícita del usuario de conectar los reportes existentes a la app local. Se importaron las corridas combinadas frontend 837 y backend 877 de fase 6, sin repetir pruebas, a `backend/build/allure/local-reports`.
- `application-dev.yml` define esa carpeta como valor predeterminado relativo al directorio de ejecución backend; `ALLURE_REPORTS_DIRECTORY` permite sobrescribirlo. No se modificó `.env`, el perfil productivo ni las reglas de autorización.
- Se verificó que el backend de IntelliJ usaba directorio `backend/`, perfil dev y PostgreSQL local. Se reinició exclusivamente el proceso Treasury del puerto 5055 mediante `gradlew bootRun`; nueva instancia PID 5388, sesión local 14173. Arrancó correctamente, esquema actualizado sin migraciones nuevas y PostgreSQL conservado.
- Comprobaciones: Gradle classes aprobado; ambos HTML existen y sus hashes coinciden. Un verificador temporal ejecutó el servicio Java real sobre el catálogo: 2 reportes legibles, 877 y 837 pruebas, con integridad SHA-256 comprobada. HTTP sin sesión devuelve 401. No se utilizó ni fabricó una sesión administradora para esa verificación; el acceso por roles conserva las pruebas ya registradas.
- Uso: recargar la app y entrar en Home → Administrar → Reportes de calidad. La carpeta predeterminada se mantiene al reiniciar desde backend/; `clean` elimina artefactos y requiere reimportar. Sin instalaciones, commits, push ni publicación remota.

### 24/10/2026 — Separación de navegación global y del curso

- Solicitud del usuario: conservar solo enlaces del curso en su gestión y ubicar funciones globales en Administrar del home. No se cambian permisos ni URLs existentes.
- Home → Administrar: Gestión de Mejoras y Reportes de calidad para ADMIN/SUPER_ADMIN; Administraciones para SUPER_ADMIN y Arquitectura únicamente con su permiso existente de dueño.
- Gestión del curso: personas/usuarios del curso, horario, Lo que nos mueve, fotos y directiva. El contenido comunitario está vinculado a organización en persistencia; sus controles de edición se trasladan del menú global al curso.
- `AdministrationLayout` reutiliza HomeHeader y AppFooter para las cuatro páginas globales, sin sidebar ni banner del curso. Los guards AdminRoute, SuperAdminRoute y ArchitectureRoute se conservan al mover las rutas.
- Validación dirigida: 30/30 pruebas de HomeHeader, SidebarNav y AdminRoute aprobadas; TypeScript y Oxlint de los componentes modificados aprobados. Se corrigió el selector del test de temporizador para no confundir un círculo del icono de cámara con un contador.
- Navegador: administración global y menú del curso revisados a 1216×552, 768×1024, 390×844 y 360×640, sin errores JavaScript ni overflow global. Capturas `frontend/build/allure/navigation-{global,course}-*.png`. Revisión de interacción y permisos sin repetir suites completas. Pendiente de aprobación visual; sin commits, push o despliegue.

### 24/10/2026 — Fase 4, frontend validado

- Autorización: solicitud del usuario de avanzar con fase 4. Base `e2a1557`, conservando cambios previos de fases 2 y 3, incluido el archivo ajeno `frontend/cd`.
- Archivos modificados en esta fase: `frontend/scripts/run-allure-suite.mjs`, `frontend/vite.config.ts`, `frontend/allurerc.mjs`, `frontend/package.json` y este plan. Sin archivos de código productivo, pruebas de negocio, dependencias, lockfiles ni configuración backend modificados por esta fase.
- Suite completa de integración: **127 pruebas aprobadas en 11 archivos, cero fallos, errores u omisiones**. Corrida `2026-10-24T13-39-32-608Z-cad98fd7-a30f-412a-ba16-54a29c35298a`; Vitest, 127 resultados originales Allure y 127 casos en HTML conciliados. Resumen Vitest: **15,89 % líneas, 11,46 % ramas, 15,75 % funciones y 15,38 % statements**, con denominadores/exclusiones preservados. No acredita integración con backend real.
- Generación inicial: el CLI multifichero devolvió 1 por `EPERM` al renombrar internamente `awesome/data` a `data`. Se preservaron los resultados del runner 0 y el fallo del generador. Se habilitó HTML de archivo único mediante la opción oficial ya soportada por el paquete instalado; se regeneró sin repetir las pruebas y los intentos quedaron en `run.json`. Dos generaciones posteriores de esa misma corrida terminaron correctamente y conciliaron 127 casos.
- Regresión unitaria dirigida: **71/71 aprobadas en cuatro archivos**, incluidos los casos parametrizados con títulos repetidos; HTML 71/71. Corrida `2026-10-24T13-43-15-827Z-edfc895f-8e94-4034-9a4f-e9f5dd119fb0`. No se reejecutaron las 707 pruebas unitarias completas; se regeneró su evidencia de fase 2 con el comando abreviado anterior y se conciliaron 707 casos en el nuevo formato.
- Señal de fallo: fixture temporal `.integration.test.ts` produjo runner 1, generador 0, coordinador 1, un fallo visible y conteos correctos. Corrida `2026-10-24T13-43-01-207Z-d77d52e7-5e70-44b4-9013-c8a127c5f184`. Fixture eliminada en `finally`.
- Vacío y clasificación: un selector de integración inexistente devolvió 1 y cero pruebas. Seleccionar un archivo de integración en modo unitario también devolvió 1 y cero pruebas, conservando la exclusión. Corridas `2026-10-24T13-43-09-449Z-81f4a47b-a5a5-4c03-9cfd-7513e742528a` y `2026-10-24T13-43-12-627Z-78174f81-3ba5-48f4-a165-d85a6a6c0db9`.
- Regeneración y aislamiento: los hashes originales Allure y fechas de `vitest.json` de las corridas completas unitaria e integración se conservaron. Los hashes de ambos resúmenes de cobertura también permanecieron iguales durante los escenarios de regresión sin cobertura. Un comando ordinario de integración aprobó 6/6 casos de caché sin crear corridas Allure. Evidencia técnica local adicional: `frontend/build/allure/phase4-validation.json`.
- Navegador: reportes de integración (127) y regresión unitaria (71) revisados en Chromium a **1216 × 552**, sin errores JavaScript y con capturas `report-preview.png` junto a las corridas. Metadatos visibles identifican suite, alcance y transporte HTTP simulado. Se ejecutó el comando real `open integration <run-id>` y arrancó el servidor local en `127.0.0.1:51584`.
- Calidad: Oxlint, tokens de color, `tsc -b`, build Vite, sintaxis de scripts y `git diff --check` aprobados. Persisten los avisos existentes de `eval` en Lottie. La meta 89 % de Task 36 no está cumplida. No se ejecutaron backend, Bruno ni E2E en esta fase.
- Cierre: fase 4 **Validada**. No se creó Skill ni `docs/ALLURE.md`; no se modificaron AGENTS.md, otras Tasks ni CI; no hubo commits, push, publicación o despliegue. La cobertura dentro de Allure continúa pendiente de fase 5.

### 24/10/2026 — Fase 3, backend validado

- Autorización: solicitud del usuario de avanzar con fase 3. Se inició Docker Desktop con autorización; motor verificado 29.9.2. Los escenarios PostgreSQL utilizaron Testcontainers y no bases productivas.
- Base Git: `e2a1557`, preservando cambios previos frontend y archivos sin seguimiento, incluido `frontend/cd`.
- Archivos de esta fase: modificación de `backend/build.gradle` y este plan; creación de `scripts/run-backend-allure.mjs`. No se modificó código productivo, pruebas de negocio, dependencias frontend, otras Tasks ni workflows.
- Grafo: `dependencyInsight` verificó JUnit 6.0.3 antes y después de incorporar Allure, y adaptador Allure 3.0.0 en la configuración dedicada. La misma consulta sobre `testRuntimeClasspath` no encontró dependencias Allure.
- Muestra: `stand.StandProductTest`, **37/37 aprobadas**, incluidos casos parametrizados; JUnit, archivos Allure y HTML conciliados.
- Backend unitario final: **540/540 aprobadas**, sin errores ni omisiones. Corrida `2026-10-24T13-26-18-987Z-e44d1272-9627-4cbf-8342-d6562dd546d0`; originales y HTML coinciden. Cobertura: **59,37 % líneas, 48,10 % ramas, 51,81 % métodos**.
- Backend integración: **334/334 aprobadas**, sin errores ni omisiones, **173 etiquetadas `postgres`**. Corrida `2026-10-24T13-19-22-875Z-c40a9a3f-0d83-4f9f-a168-b55f5514dd78`; originales y HTML coinciden. Cobertura: **41,02 % líneas, 20,23 % ramas, 42,12 % métodos**.
- Fallo controlado: fixture Java temporal con una aserción fallida. Runner 1, generador 0, coordinador 1, un fallo visible y conteos conciliados. Corrida `2026-10-24T13-25-55-246Z-8c2d41dc-a956-424c-9aaf-c53930fe339b`. Fixture eliminada en `finally`; al cerrar se comprobó también la ausencia de su `.class`.
- Filtro vacío: corrida `2026-10-24T13-26-11-474Z-688d2f34-d34a-4bf0-baf6-a230fbb7ed93`, cero pruebas y código final 1. No se reutilizaron XML ni resultados anteriores. Después se ejecutó la suite unitaria completa final de 540 para dejar clases y cobertura coherentes.
- Regeneración: la primera corrida unitaria completa (`2026-10-24T13-18-13-825Z-94a9420c-3ee6-4a4a-9455-f057cc399160`) se regeneró conservando hashes de resultados y fecha de `junit-summary.json`, sin ejecutar pruebas. HTML de 540 casos y reporte de integración de 334 revisados en Chromium a **1216 × 552**, sin errores JavaScript; capturas junto a las corridas.
- Calidad: PMD main aprobado (`UP-TO-DATE`, sin cambios productivos), `bootJar` aprobado y JAR inspeccionado sin librerías Allure. `jacocoCombinedTestReport -x unitTest -x integrationTest` combinó los datos de suites ya ejecutadas sin repetirlas; estas exclusiones son de tareas para ensamblar cobertura, no omisiones de casos. Oxlint del script y comprobación sintáctica aprobados; `git diff --check` aprobado. No se ejecutó `check` completo, pues repetiría la batería histórica; el gate del 70 %, exclusiones y reglas permanecen intactos.
- Límites: las métricas no cumplen todavía el objetivo 89 % de la Task 36. Frontend, Bruno y E2E no se reejecutaron. Persiste el aviso JVM de class sharing y el aviso de características Gradle deprecadas, sin fallos de build. No se agregaron omisiones ni reintentos para aprobar.
- Cierre: fase 3 **Validada**. Las dos suites se ejecutan y reportan de forma independiente. No hay commits, push, publicaciones ni despliegues. La fase 4 requiere autorización.

### Corrección de apertura del reporte — 24/10/2026

El usuario reprodujo un fallo del comando documentado `allure open`: el CLI carga `allurerc.mjs` también al abrir un HTML existente y la configuración exigía `TREASURY_ALLURE_RUN_DIR` incondicionalmente. Se corrigió exclusivamente `frontend/allurerc.mjs` para admitir `open` y `serve` con una ruta explícita que ya contenga `index.html` y `summary.json`. La generación sigue requiriendo el coordinador y una corrida aislada.

Validación específica: `serve` respondió HTTP 200 con 707 aprobadas en `summary.json`; se ejecutó el comando real `open` y arrancó el servidor local en `127.0.0.1:53384`. Oxlint aprobado para el archivo cambiado; generación directa sin contexto rechazada. No se reejecutaron pruebas ni se regeneró el HTML. El comando de apertura de Operación y el indicado al usuario vuelven a ser válidos sin establecer manualmente variables de entorno. Se preservó el archivo ajeno sin seguimiento `frontend/cd` observado al iniciar esta corrección.

| Fecha | Decisión | Motivo y consecuencia |
|---|---|---|
| 24/10/2026 | Mantener el identificador 38 para encargo y plan maestro | El encargo ya ocupa el prefijo; conservar su archivo sin modificarlo y gestionar aquí la misma iniciativa evita inventar una segunda iniciativa. |
| 24/10/2026 | Mantener planificación, avances y decisiones en este archivo | Reutiliza `.agents/tasks/` sin crear otro sistema de seguimiento. |
| 24/10/2026 | Separar cinco fases locales y dos futuras opcionales | Permite cerrar el alcance local sin autorizar implícitamente CI ni publicación. |
| 24/10/2026 | Posponer Skill y mantener AGENTS.md intactos | No existe todavía un procedimiento Allure estable que justifique una Skill; las guías existentes permiten referenciar la iniciativa. |
| 24/10/2026 | Piloto frontend unitario, con activación explícita | Reutiliza el runner sin depender de Docker ni cambiar CI; exige resolver previamente Node/jsdom. |
| 24/10/2026 | Usar adaptadores oficiales y CLI npm local | `allure-vitest` y, posteriormente, `allure-jupiter`; evitar plugin Gradle y agentes adicionales para el reporte básico. Versiones finales sujetas a verificación de publicación y resolución. |
| 24/10/2026 | Directorios nuevos por ejecución bajo `build/allure/` | Mantiene resultados fuera de Git y de la limpieza de cobertura, sin mezclar ejecuciones históricas. |
| 24/10/2026 | Runtime Node portable 22.22.2 | Satisface engines instalados sin cambiar la instalación global ni introducir una dependencia Node en el proyecto. |
| 24/10/2026 | Parámetro oculto determinista para `test.each` | Evita agrupar casos distintos con títulos iguales como reintentos; implica dependencia directa de `allure-js-commons`. El ID puede variar al reordenar casos. |
| 24/10/2026 | Conciliar también `summary.json` del HTML | Contar únicamente archivos originales no detectaba la agrupación de casos. Un HTML sin correspondencia provoca error del coordinador. |
| 24/10/2026 | Runtime Gradle Allure dedicado y activación por suite | Preserva classpath ordinario y JAR productivo; permite verificar JUnit sin actualizarlo. |
| 24/10/2026 | Reutilizar el CLI frontend desde un coordinador backend | Evita instalar otro generador y reutiliza `scripts/`; JUnit y configuración JSON por corrida sustituyen al setup Vitest. |
| 24/10/2026 | Extender el coordinador frontend existente a integración | Conserva los comandos unitarios abreviados y separa rutas, títulos y metadatos por suite, sin otra instalación. |
| 24/10/2026 | HTML frontend autocontenido | Evita el renombrado de directorios de datos que falló en formato multifichero; se verificó en ambas suites y se conservan JSON de control para apertura. |
| 24/10/2026 | Cobertura congelada por corrida con resumen y ZIP adjuntos | Evita atribuir al reporte antiguo los datos de la última ejecución; integra métricas reales y mantiene sus denominadores. |
| 24/10/2026 | JaCoCo y HTML backend propios de la corrida Allure | Sustituye rutas compartidas únicamente en modo Allure y extiende el HTML autocontenido; los comandos ordinarios conservan su comportamiento. |
| 24/10/2026 | Coordinador local raíz y manifiesto histórico de sesión | Reutiliza los dos coordinadores existentes; una recuperación independiente no convierte retrospectivamente en aprobada la sesión fallida. |

Añadir decisiones técnicas con fecha, evidencia, alternativas consideradas y consecuencias. Registrar cuando una decisión sustituya a otra.

## Bloqueos y dependencias

No hay un bloqueo activo del piloto frontend validado. El requisito Node/jsdom se resolvió usando Node portable 22.22.2; el Node global 22.20.0 sigue siendo incompatible y no debe usarse para este piloto. Comprobar la disponibilidad del runtime temporal al retomar.

Las cuatro suites tienen integración Allure y cobertura por corrida validadas con las versiones exactas indicadas. PostgreSQL fue validado con contenedores efímeros. Ambos coordinadores generan HTML autocontenido y conservan intentos fallidos. La prueba frontend de recuperación falló una vez y pasó aislada y en repetición completa; su intermitencia requiere investigación de confiabilidad y no se considera corregida. Task 36 mantiene la meta pendiente; incorporar reportes no acredita alcanzar el 89 %.

## Próxima acción y reanudación

Las fases 6 y 7 están implementadas y comprobadas localmente. Próxima acción: resolver el bucket privado solicitado al usuario, configurar identidad/permisos y revisar la pantalla. La ejecución remota requiere publicar los cambios mediante el flujo autorizado; no se ha autorizado commit/push ni despliegue de la aplicación. Consultar `docs/ALLURE.md` para activación y comprobar CI/publicación/acceso real antes de marcar ambas fases como validadas. Conservar evidencia histórica y la intermitencia registrada en fase 5.

Al retomar:

1. Leer instrucciones, esta Task, la guía 01 y las referencias pertinentes; finalizar la lectura normativa con 08.
2. Revisar `git status --short` y preservar cambios ajenos.
3. Leer el último avance, decisiones y bloqueos; comprobar qué autorizaciones siguen vigentes.
4. Contrastar configuración y evidencia actuales antes de ejecutar la próxima acción.
5. Actualizar este registro al cerrar la entrega; no continuar automáticamente hacia una fase fuera del alcance autorizado.

## Definición de terminado

### Entrega de planificación

- [x] Únicamente el plan maestro creado, con objetivo, alcance, restricciones y referencias.
- [x] Siete fases documentadas y cinco locales diferenciadas de dos futuras opcionales.
- [x] Estados, avances, decisiones, bloqueos y próxima acción definidos.
- [x] Sin integración técnica, cambios de configuración, instalación ni publicación.

### Implementación local, validada

- [x] Fases 1–5 validadas con evidencia y comandos reproducibles.
- [x] Cuatro suites distinguibles, con resultados contrastados y sin mezcla de ejecuciones.
- [x] Fallos, omisiones, suites vacías y límites informados sin falsear éxito.
- [x] Cobertura, umbrales, clasificación y validaciones existentes preservados.
- [x] Guía operativa vigente y pendientes explícitos.

Las fases 6 y 7 están autorizadas e implementadas; su validación remota continúa pendiente. No marcarlas como validadas basándose exclusivamente en las comprobaciones locales ni presentar la pantalla como visualmente aprobada antes de confirmación del usuario.
