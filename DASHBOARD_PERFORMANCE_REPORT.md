# Dashboard Overview Performance Report

Fecha: 2026-09-02

## 1. Flujo completo encontrado

Ruta frontend:

`DashboardPage` -> `TreasuryRepositoryImpl.dashboardOverview(year)` -> `GET /tesoreria/api/v1/tesoreria/dashboard/overview?year=2026`

El Dashboard tambien dispara en paralelo:

- `GET /tesoreria/api/v1/tesoreria/dashboard/overview?year=2026`
- `GET /tesoreria/api/v1/tesoreria/aportes/resumen?year=2026`

Ruta backend del endpoint principal:

`TreasuryController.dashboardOverview(year)` -> `TreasuryService.dashboardOverview(year)` -> `TreasuryRepositoryOutPort` -> JPA repositories -> PostgreSQL.

Datos entregados por el overview:

- cuotas: familias, modalidades, obligaciones pagadas/pendientes, montos cobrados/pendientes
- finanzas: ingresos de cuotas, otros ingresos, ingresos totales, egresos y saldo
- flujo mensual
- estado de obligaciones
- egresos por categoria
- egresos por descripcion
- movimientos recientes
- trazas de auditoria
- composicion de alumnos activos por genero

## 2. Requests realizadas al abrir Dashboard

En el codigo frontend, `DashboardPage` usa `Promise.all` para ejecutar en paralelo:

- `dashboard/overview`
- `aportes/resumen`

No se encontro duplicacion frontend del request `dashboard/overview` dentro de `DashboardPage`.

## 3. Numero de queries SQL

Conteo derivado del flujo backend antes del cambio para una llamada con configuracion anual existente:

- `TreasuryService.dashboardOverview`: aproximadamente 17 statements SQL.
- Trabajo adicional del controller fuera del cache: aproximadamente 7 statements SQL.
- Total estimado por llamada cold/miss: aproximadamente 24 statements SQL.

Despues del cambio:

- `TreasuryService.dashboardOverview`: aproximadamente 8 statements SQL.
- Trabajo adicional del controller fuera del cache: se mantiene en aproximadamente 7 statements SQL.
- Total estimado por llamada cold/miss: aproximadamente 15 statements SQL.

Reduccion estimada: 9 statements SQL menos por cache miss del endpoint.

## 4. Query o proceso mas lento

No se ejecuto `EXPLAIN ANALYZE` contra produccion desde este entorno.

El cuello de botella demostrado en codigo fue doble:

- lecturas duplicadas del mismo anio dentro de `TreasuryService.dashboardOverview`
- auditoria: el endpoint necesitaba solo 100 trazas, pero consultaba todas las trazas del anio y aplicaba `limit(100)` en Java

## 5. Desglose temporal del endpoint

Existe instrumentacion en `DashboardPerformanceProbe`, activable con `app.instrumentation.dashboard=true`.

Fases registradas actualmente por el controller:

- `dashboardOverview`
- `listarFamilia`
- `listPlans`
- `listObligations`
- total del endpoint
- cantidad de SQL statements/HQL queries
- hit/miss de cache

No se registraron tiempos reales de produccion en este cambio porque no se ejecutaron llamadas contra datos reales.

## 6. Causa raiz

La causa raiz encontrada fue trabajo repetido y exceso de filas recuperadas:

- `dashboardOverview(year)` leia `config`, `planes`, `obligaciones`, `ingresos` y `egresos`.
- Dentro del mismo metodo llamaba a `dashboard(year)`, que volvia a leer `config`, `planes` y `obligaciones`.
- Al final llamaba a `financialSummary(year)`, que volvia a leer `config`, `obligaciones`, `ingresos` y `egresos`.
- La consulta de auditoria ordenaba y recuperaba todas las trazas del anio aunque la respuesta solo expone 100.

Esto explica variabilidad: en cache miss se ejecutaban varias lecturas redundantes y la tabla de auditoria podia aumentar el costo segun volumen anual.

## 7. Cambios realizados

- `TreasuryService.dashboardOverview` ahora reutiliza las listas ya cargadas para calcular cuotas.
- `TreasuryService.dashboardOverview` ahora reutiliza obligaciones, ingresos y egresos ya cargados para calcular `FinancialSummary`.
- Se evita consultar pagos activos si no existen obligaciones.
- Se agrego `findRecentAudits` para consultar en SQL solo las ultimas 100 trazas del rango anual.
- Se agrego una prueba que verifica que `dashboardOverview` no repite lecturas del mismo anio.

## 8. Antes vs despues

Referencia manual de produccion:

- promedio historico: ~1.57 s
- medicion reciente: ~1.22 s
- pico observado: 2.80 s

Medicion local disponible:

- `TreasuryServiceTest`: pasa.
- Backend tests sin `postgres`: pasan.
- No se midio latencia HTTP real contra produccion desde este entorno.

Comparacion tecnica medida por interacciones de repositorio:

- antes: 3 lecturas de obligaciones por configuracion, 2 de ingresos, 2 de egresos, auditoria sin limite SQL
- despues: 1 lectura de obligaciones por configuracion, 1 de ingresos, 1 de egresos, auditoria limitada a 100 filas en SQL

## 9. Mejora porcentual

Por statements estimados en cache miss del endpoint:

- antes: ~24 SQL
- despues: ~15 SQL
- mejora: ~9 SQL menos
- reduccion: ~37.5 %

La mejora porcentual real en milisegundos debe medirse en produccion con 5 llamadas secuenciales y `app.instrumentation.dashboard=true`.

## 10. Riesgos o mejoras pendientes

- El controller todavia recalcula cuotas validas fuera del cache para excluir familias/alumnos inactivos. No se elimino porque preserva comportamiento funcional.
- El cache actual esta en el service, no en el resultado final del controller. Por eso un cache hit aun puede ejecutar SQL de composicion/familias/planes/obligaciones.
- Antes de mover cache al controller hay que corregir invalidaciones: cambios en alumnos/familias pueden afectar `courseComposition` y cuotas visibles.
- Pendiente ejecutar `EXPLAIN ANALYZE` en produccion o una replica con las consultas reales si los tiempos siguen altos.
