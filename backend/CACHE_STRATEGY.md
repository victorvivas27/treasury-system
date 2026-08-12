# Estrategia de caché

La aplicación utiliza Spring Cache Abstraction con Caffeine. Los servicios dependen de las
anotaciones de Spring y no de la implementación local. Caffeine fue elegido porque el proyecto no
tiene actualmente Redis ni otra caché distribuida configurada.

Esta implementación es adecuada mientras exista una sola instancia activa. Cloud Run puede
escalar horizontalmente; antes de habilitar múltiples instancias se debe reemplazar el
`CacheManager` por Redis. Una caché Caffeine no comparte invalidaciones entre instancias.

## Inventario implementado

| Caché                          | Método                          | Clave |    TTL | Invalidación                                                     |
|--------------------------------|---------------------------------|-------|-------:|------------------------------------------------------------------|
| `annualFeeConfigurations`      | `listConfigs()`                 | `all` | 30 min | guardar configuración anual                                      |
| `annualFeeConfigurationByYear` | `getConfig(year)`               | año   | 30 min | guardar configuración anual                                      |
| `contributionConfigurations`   | `listContributionConfigs(year)` | año   | 30 min | guardar configuración de aporte                                  |
| `treasuryDashboardOverview`    | `dashboardOverview(year)`       | año   |  1 min | cambios de cuotas, pagos, ingresos, egresos, aportes o auditoría |
| `contributionSummary`          | `contributionSummary(year)`     | año   |  1 min | cambios de aportes, su configuración o familias                  |

Los límites de tamaño y TTL están centralizados en `CacheConfig`. `sync = true` evita que varias
peticiones concurrentes calculen simultáneamente una clave ausente. Las estadísticas internas de
Caffeine están habilitadas mediante `recordStats()` para permitir inspección sin agregar logs por
request. El administrador es consciente de transacciones, por lo que las invalidaciones de métodos
transaccionales se aplican después de completar correctamente la transacción.

## Decisiones de consistencia

No se cachean saldos, pagos, obligaciones, aportes, ingresos, egresos, ventas, movimientos ni
auditorías como lecturas independientes. Son datos operativos que deben reflejar una escritura de
inmediato. El dashboard y el resumen de aportes sí reutilizan resultados agregados por un minuto,
pero toda escritura relacionada los invalida después de completarse correctamente.

Cuando una mutación no recibe el año como argumento se invalidan todas las entradas del agregado.
Es una decisión deliberada: es preferible recalcular pocos años antes que conservar un resultado
financiero potencialmente obsoleto. Los valores cacheados son records y modelos de dominio
desconectados, no entidades JPA administradas.

## Mejora esperada y pruebas

Las visitas repetidas al dashboard dejan de repetir durante un minuto las consultas de
configuración, planes, obligaciones, pagos, ingresos, egresos y auditoría. Las configuraciones
anuales y de aportes evitan lecturas repetidas durante 30 minutos.

`TreasuryCacheIntegrationTest` verifica un cache hit, la invalidación después de una actualización
y la separación de resultados por año.
