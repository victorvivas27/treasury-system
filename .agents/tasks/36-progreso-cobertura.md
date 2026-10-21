# Tarea 36 — Registro de implementación

## Primera entrega, 20/10/2026

Base del repositorio: `c6da3d3`, con cambios locales sin commit. El objetivo global de 89 % no está cumplido.

### Medición

Las suites nuevas usan un alcance amplio y estable: todo el código TypeScript ejecutable bajo `frontend/src` y las clases principales backend. Las exclusiones frontend de estilos, assets, declaraciones, setup y entrada de arranque se mantienen. Backend excluye en estos reportes únicamente la clase de arranque y las implementaciones generadas `*MapperImpl`.

Los cuatro reportes permiten comparar cuánto cubre cada suite sobre la aplicación completa. No deben compararse directamente con el JaCoCo histórico, que excluye capas enteras, ni con el Vitest histórico, que solo consideraba archivos importados por pruebas. El resultado puede bajar al visibilizar código antes omitido.

Se conserva la verificación histórica backend del 70 %; no se reduce ningún umbral existente. La incorporación del umbral final y de las suites separadas a CI sigue pendiente hasta completar las fases correspondientes.

### Clasificación

- Backend: clases con contexto Spring real llevan `@Tag("integration")`, heredado por sus subclases; las pruebas `postgres` también pertenecen a integración. Mockito y MockMvc standalone se mantienen en la suite unitaria. Las pruebas de caché con proxies y contexto Spring pertenecen a integración aunque simulen el repositorio.
- Frontend: pruebas existentes aisladas permanecen en unitarias; las nuevas `*.integration.test.tsx` conectan contexto/hook, casos de uso cuando aplican, repositorio, transformaciones e interceptores Axios. Solo se sustituye el adaptador de transporte HTTP. No acreditan conexión a un backend desplegado ni ejecución en navegador real.
- Se añaden reportes unitarios, de integración y combinado en directorios distintos. Ejecutar el reporte combinado frontend no elimina los otros dos.

### Escenarios añadidos

- Liquidación de eventos: valores nulos y negativos, gastos que agotan o exceden ingresos, gastos de curso ausentes y conservación del total repartido.
- Configuración de aportes: creación y auditoría, actualización preservando identidad y fecha original y siete escenarios inválidos rechazados antes de persistir.
- 2FA: códigos de respaldo de un solo uso, rechazo de códigos incorrectos o vacíos, generación de secretos, PNG de enrolamiento y códigos de recuperación.
- Pagos frontend: respuesta del servidor frente al estado de la URL, retorno inválido, rechazo, reintento, polling, disponibilidad y redirecciones de checkout inseguras.
- Sesión frontend: ingreso por organización, selección de organización, errores HTTP, restauración por cookie y cierre local ante fallo de revocación.
- Caché de imágenes: solicitudes concurrentes, separación por propietario y versión, reintentos, liberación de URLs y descarte de descargas que terminan después del cierre de sesión.

Una prueba de 2FA reprodujo un defecto: una cadena vacía era aceptada después de consumir el último código de respaldo. El servicio ahora rechaza códigos vacíos o compuestos solo por espacios antes de comparar.

Las 41 omisiones iniciales de integración correspondían a `SA34PostgresWhatsAppTest`, condicionada a una URL externa. Se sustituye esa condición por un PostgreSQL efímero de Testcontainers, con credenciales generadas por el contenedor, para ejecutar los escenarios automáticamente.

### Validación frontend

- Suite unitaria: 611 pruebas aprobadas en 97 archivos, con un worker y sin ejecutar PostgreSQL simultáneamente.
- Suite de integración: 27 pruebas aprobadas en dos archivos.
- Lint aprobado con cuatro avisos preexistentes de expresiones sin uso. Build productivo aprobado; persiste un aviso de `eval` de la dependencia Lottie.
- La ejecución simultánea de suites pesadas produjo timeouts en pruebas de páginas existentes. Se fija un worker frontend; no se amplían timeouts ni se omiten aserciones. Las pruebas de expiración de sesión esperan las actualizaciones asíncronas de React.

Primeros módulos que superan 89 % en las tres métricas, sin reducir su alcance:

| Módulo y suite | Líneas | Ramas | Funciones/métodos |
|---|---:|---:|---:|
| `EventSettlementCalculator`, unitario backend | 100 % | 95 % | 100 % |
| `TwoFactorService`, unitario backend | 96,08 % | 100 % | 100 % |
| `useMercadoPago`, integración frontend | 98,36 % | 90,20 % | 100 % |

Estos resultados son por módulo; no implican que toda la aplicación haya alcanzado la meta.

### Resultado de la primera entrega

Se añaden 52 casos de prueba. Validación final: **1.423 pruebas aprobadas, cero fallos y cero omisiones**, distribuidas así:

| Suite | Pruebas aprobadas | Líneas | Ramas | Funciones/métodos |
|---|---:|---:|---:|---:|
| Frontend unitario | 611 | 55,26 % | 53,24 % | 44,56 % |
| Frontend integración | 27 | 3,64 % | 1,87 % | 2,13 % |
| Backend unitario | 451 | 58,54 % | 45,93 % | 51,45 % |
| Backend integración | 334 | 41,02 % | 20,23 % | 42,12 % |

Porcentajes redondeados a dos decimales desde los contadores, sobre el alcance amplio descrito arriba. Backend combinado: 73,78 % de líneas, 52,69 % de ramas y 68,14 % de métodos. La integración frontend todavía cubre solo sesión y pagos, por lo que su cobertura global es baja aunque el hook de pagos supere la meta individual.

La ejecución backend final incluyó `unitTest integrationTest jacocoUnitTestReport jacocoIntegrationTestReport jacocoCombinedTestReport pmdMain bootJar` y terminó sin advertencias de incompatibilidad entre clases y datos JaCoCo. Los 41 casos antes omitidos de WhatsApp/PostgreSQL ahora pasan con Testcontainers.

`node scripts/check-test-coverage.mjs` reconoce los cuatro reportes. La variante `--check` devuelve fallo, como corresponde, mientras la cobertura global no alcanza 89 %. `git diff --check` y las comprobaciones sintácticas de los scripts Node pasan.

### Comandos

Desde `backend`:

```powershell
.\gradlew.bat unitTest jacocoUnitTestReport pmdMain
.\gradlew.bat integrationTest jacocoIntegrationTestReport
.\gradlew.bat jacocoCombinedTestReport
```

La segunda orden requiere Docker disponible. Para un diagnóstico parcial sin PostgreSQL se permite `-PexcludeTags=postgres`, informando que la integración está incompleta.

Desde `frontend`:

```powershell
pnpm test:coverage:unit
pnpm test:coverage:integration
pnpm test:coverage
pnpm lint
pnpm build
```

Desde la raíz:

```powershell
node scripts/check-test-coverage.mjs
node scripts/check-test-coverage.mjs --check
git diff --check
```

El primer comando muestra las cuatro métricas sin exigir aún la meta; falla si falta un reporte o su denominador está vacío. `--check` además falla si alguna métrica no alcanza 89 %. Los timestamps corresponden al archivo local y no certifican por sí solos el commit probado ni una ejecución exitosa.

Reportes HTML:

- `frontend/coverage/unit/index.html`
- `frontend/coverage/integration/index.html`
- `frontend/coverage/combined/index.html`
- `backend/build/reports/jacoco/jacocoUnitTestReport/html/index.html`
- `backend/build/reports/jacoco/jacocoIntegrationTestReport/html/index.html`
- `backend/build/reports/jacoco/jacocoCombinedTestReport/html/index.html`

### Trabajo siguiente

1. Priorizar ramas faltantes en tesorería, servicios de seguridad, notificaciones y stands a partir de XML/JSON. Los siguientes focos detectados son invitación de apoderados, validación de productos y validaciones de ingresos y configuración anual.
2. Completar el inventario revisable por archivo y automatizar la asociación de resultados y reportes con el commit probado antes de integrar los nuevos gates en CI.
3. Ampliar integración frontend a formularios y flujos de los demás módulos; los primeros casos de sesión y pagos representan una fracción pequeña de la aplicación.
4. Validar recorridos de extremo a extremo e incorporar gates progresivos a CI.
5. Mantener el objetivo de 89 % pendiente hasta que las cuatro suites alcancen líneas, ramas y funciones/métodos requeridos.

## Segunda entrega, 21/10/2026 — Integración de cuotas anuales

Base: `ded6c21`, más el archivo de pruebas nuevo sin commit. Se añaden 17 escenarios en `useAnnualFees.integration.test.tsx`, manteniendo reales el hook, los casos de uso, el repositorio y los interceptores Axios; solo se sustituye el transporte HTTP. No acredita integración con backend real.

Escenarios: carga y filtros por año/familia/estado, pago en curso sin actualización prematura, actualización desde el servidor, errores de validación y mensaje general, fallo de red y reintento explícito, ausencia de reintentos automáticos de escrituras rechazadas, asignación de tres modalidades, regeneración exclusiva de modalidades estándar, rechazo sin regeneración, configuración e historial, anulación, retiro de familia, generación y recuperación de lecturas fallidas.

La suite de integración frontend pasa **44 pruebas en tres archivos, cero fallos y cero omisiones**. Cobertura global de esa suite: **4,80 % líneas (360/7497), 2,22 % ramas (148/6679), 3,46 % funciones (101/2915)**. Antes: 3,64 %, 1,87 % y 2,13 %, respectivamente. `useAnnualFees.ts` alcanza **100 % líneas, 95,65 % ramas y 100 % funciones**. Se mantiene el denominador y las exclusiones existentes; el objetivo global de 89 % continúa pendiente.

Validaciones ejecutadas desde `frontend`:

```powershell
node node_modules/vitest/vitest.mjs run src/presentation/hooks/treasury/useAnnualFees.integration.test.tsx
$env:TEST_SUITE='integration'
node node_modules/vitest/vitest.mjs run --coverage
node node_modules/oxlint/bin/oxlint . -D no-unused-vars
node node_modules/typescript/bin/tsc -b
node node_modules/vite/bin/vite.js build
```

Lint, TypeScript y build aprobados; persiste el aviso de `eval` de Lottie. `git diff --check` aprobado. Vitest/Vite necesitaron ejecución fuera del sandbox por `spawn EPERM`. Se invocaron las herramientas locales con Node porque `pnpm exec` intentó reinstalar módulos y abortó por ausencia de TTY; no se añadieron dependencias. No se reejecutaron backend, suite unitaria frontend ni recorridos de extremo a extremo en esta entrega; sus métricas anteriores no constituyen una validación nueva.

## Tercera entrega, 21/10/2026 — Validaciones backend de tesorería

Sobre `ded6c21`, conservando los cambios de la segunda entrega, se añaden **29 pruebas unitarias** en `backend/src/test/java/treasury/TreasuryValidationTest.java`:

- Trece entradas inválidas de ingresos: año, descripción ausente/vacía/larga, monto ausente/cero/negativo/fraccionario, fecha ausente/fuera de año, categoría y usuario ausentes o vacíos. Se verifica HTTP 400 y ausencia total de llamadas al repositorio, incluida auditoría.
- Trece configuraciones anuales inválidas: año, monto, modalidad, fechas requeridas, pertenencia al año y orden de cuotas. Se comprueba rechazo antes de persistir.
- Actualización de configuración preservando identidad y fecha de creación, con auditoría; ingreso válido en año mínimo, monto mínimo y descripción máxima, con normalización de campos opcionales; fallo de persistencia del ingreso sin auditoría posterior.

Validación: **480 pruebas unitarias backend aprobadas, cero fallos, errores u omisiones**, frente a las 451 anteriores. PMD aprobado. Cobertura backend unitaria: **58,56 % líneas, 46,62 % ramas y 51,45 % métodos**, frente a 58,54 %, 45,93 % y 51,45 %. El denominador y las exclusiones no cambian. No se modifica código productivo ni contratos.

Comandos desde `backend`:

```powershell
.\gradlew.bat unitTest --tests treasury.TreasuryValidationTest
.\gradlew.bat unitTest jacocoUnitTestReport pmdMain
```

Gradle requirió ejecución fuera del sandbox para acceder a su caché de usuario. Desde la raíz se ejecutaron `node scripts/check-test-coverage.mjs` y `git diff --check`. No se reejecutaron integración backend/PostgreSQL, frontend ni E2E en esta entrega. La meta global sigue pendiente. Próximos focos: corrección/anulación y detección de duplicados de ingresos, validación de productos e invitación de apoderados; ampliar integración conectada y completar gates/recorridos críticos según la tarea 36.

## Cuarta entrega, 21/10/2026 — Ciclo de vida de ingresos

Base `ded6c21`, conservando las entregas locales previas sin commit. Se incorporan **23 pruebas unitarias** en `backend/src/test/java/treasury/TreasuryIncomeLifecycleTest.java`:

- Duplicado activo rechazado pese a diferencias de mayúsculas, espacios externos y escala del monto almacenado; se permiten registros cuando cambia descripción, monto o fecha, o el anterior está anulado.
- Corrección con preservación de ID, año, creador y fecha de creación; actualización de campos financieros y opcionales; auditoría con valores anteriores/nuevos, actor y motivo normalizado.
- Rechazo de correcciones sin motivo, cambios sobre ingresos anulados y corrección/anulación/eliminación de ingresos inexistentes, sin escrituras ni auditorías.
- Anulación con motivo/actor requeridos, conservación de los datos financieros y registro de fecha, responsable y razón, sin eliminación física.
- Fallos de guardado de corrección o anulación propagados sin auditoría posterior. Estas pruebas aisladas no acreditan rollback de base de datos.

Validación ejecutada desde `backend`: `.\gradlew.bat unitTest jacocoUnitTestReport pmdMain`. Resultado: **503 pruebas aprobadas, cero fallos, errores u omisiones**; PMD aprobado (sin cambios en producción, tarea actualizada previamente). Reporte unitario: **58,79 % líneas, 47,03 % ramas, 51,53 % métodos**, frente a 58,56 %, 46,62 % y 51,45 %. No cambian denominadores, exclusiones ni umbrales.

Desde la raíz: `node scripts/check-test-coverage.mjs` y `git diff --check`. No se reejecutaron integración backend/PostgreSQL, frontend ni E2E; los reportes de esas suites mantienen sus fechas anteriores. La meta global del 89 % sigue pendiente. Próximos focos: validación de productos, invitación de apoderados e integración conectada de los módulos restantes.

## Quinta entrega, 21/10/2026 — Productos de stands

Sobre la misma base y conservando los cambios locales anteriores, se añaden **37 pruebas unitarias** en `backend/src/test/java/stand/StandProductTest.java`:

- Alta y edición rechazan nombre ausente/vacío, precio ausente/no positivo, costo ausente/negativo, equivalencia no positiva y stock negativo, sin consultar ni guardar productos ni afectar ventas/eventos.
- Alta y edición normalizan textos, aceptan precio decimal/costo cero/equivalencia fraccionaria, establecen stock y disponibilidad para stock ausente/cero/positivo y disponibilidad explícita. Edición conserva identidad, stand y fecha de creación.
- Campos opcionales ausentes o vacíos se normalizan a null.
- Stand cerrado rechaza alta, edición y eliminación antes de tocar productos. Producto perteneciente a otro stand se rechaza con 404 sin mutar sus datos.

Desde `backend`: `.\gradlew.bat unitTest jacocoUnitTestReport pmdMain`. **540 pruebas aprobadas, cero fallos, errores u omisiones**; PMD aprobado (UP-TO-DATE). Cobertura unitaria backend: **59,37 % líneas, 48,10 % ramas y 51,81 % métodos**, frente a 58,79 %, 47,03 % y 51,53 %. No se modifica producción, denominadores, exclusiones ni umbrales.

Desde la raíz: `node scripts/check-test-coverage.mjs` y `git diff --check`. Las restantes suites no se reejecutaron en esta entrega y sus reportes no son evidencia nueva. El objetivo global sigue pendiente; próximos focos: invitaciones de apoderados, ramas de ventas/stock e integración conectada.

## Sexta entrega, 21/10/2026 — Pantallas conectadas de tesorería y administración

Se agregan tres archivos de integración frontend con transporte Axios controlado, conservando componentes, hooks, casos de uso, repositorios e interceptores reales:

- `AnnualFeesPage.integration.test.tsx`: 14 casos de configuración, modalidades estándar/personalizada, validación de vencimiento, pago manual y actualización desde servidor, comprobantes pendientes, carga/aprobación de archivo, fallo y reintento, anulación/retiro con motivo y recuperación de lecturas.
- `EventsPage.integration.test.tsx`: 28 casos de creación/edición, participantes, gastos comunes/donados, recaudación, eliminación confirmada, cálculo/confirmación/cancelación de distribución, saldo negativo, errores de servidor, recuperación, cambio de año y cancelación de formularios.
- `AdministrationsPage.integration.test.tsx`: 19 casos de carga y acceso de administradores, creación secuencial de curso/administrador, fallos parciales, contraseña inválida, slug, administrador adicional, activación, correo, curso/año, doble confirmación de eliminación, rechazos y cancelaciones.

**105 pruebas de integración aprobadas en seis archivos, sin fallos ni omisiones** (61 nuevas respecto a las 44 anteriores). Cobertura global de integración frontend: **13,25 % líneas (994/7497), 10,51 % ramas (702/6679), 12,86 % funciones (375/2915)**, frente a 4,80 %, 2,22 % y 3,46 %. Denominadores, exclusiones y umbrales sin cambios; meta global de 89 % pendiente.

Comandos desde `frontend`: `$env:TEST_SUITE='integration'; node node_modules/vitest/vitest.mjs run --coverage`, `node node_modules/oxlint/bin/oxlint . -D no-unused-vars` y `node node_modules/typescript/bin/tsc -b`, aprobados. Se corrigieron dos opciones de tipado de los helpers de Testing Library. La comprobación de tipos general de tests mantiene errores preexistentes en otros archivos; no se detectaron errores en los tres archivos nuevos tras esa corrección. `git diff --check` aprobado. No se reejecutaron las otras tres suites ni E2E en esta entrega; estas pruebas no acreditan integración con backend real. El archivo de eventos quedó guardado durante una interrupción manual y posteriormente fue validado de nuevo.
