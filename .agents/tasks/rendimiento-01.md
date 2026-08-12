Continúa con la optimización de rendimiento, pero trabaja únicamente sobre
los hallazgos relacionados con consultas a base de datos.

Prioridad:

1. PageRequest(0, 10_000) en TreasuryController.
2. Patrón N+1 detectado en StandService.
3. Resúmenes de stands que cargan ventas e ítems completos en memoria.

No modifiques todavía:
- configuración EAGER/LAZY global
- versión de Java
- Docker
- Cloud Run
- HikariCP
- contratos públicos de los endpoints

FASE 1 — Auditoría detallada

Antes de modificar código, analiza cada flujo completo:

Controller
→ Service/UseCase
→ Repository/Port
→ Adapter JPA
→ Query generada

Para cada endpoint indica:

- número aproximado de queries actuales
- entidades cargadas
- colecciones cargadas
- si existe N+1
- si existen consultas dentro de loops
- cantidad máxima potencial de registros cargados
- qué información realmente necesita la respuesta

FASE 2 — Optimización

Prioriza DTO projections, consultas agregadas y queries específicas.

Evita cargar entidades completas cuando solo se necesitan algunos campos.

Para resúmenes financieros, intenta que PostgreSQL realice agregaciones mediante:

SUM
COUNT
GROUP BY
CASE WHEN

en lugar de cargar todas las ventas en Java y calcular después.

No cambies reglas financieras.

Los valores calculados por las nuevas queries deben ser exactamente iguales
a los actuales.

FASE 3 — N+1

Para StandService identifica exactamente cuántas consultas genera actualmente.

Implementa una alternativa que permita obtener los agregados necesarios
en una o pocas consultas independientemente del número de stands.

Preferir:

1 query agregada

o como máximo:

1 query de stands
+
1 query agregada de ventas

Evita una query por cada stand.

FASE 4 — PageRequest(0, 10_000)

Analiza por qué TreasuryController necesita hasta 10.000 familias/apoderados.

No reemplaces simplemente 10.000 por otro número.

Determina qué campos se necesitan para enriquecer las respuestas y crea
una consulta/proyección que obtenga únicamente esos datos.

Si se necesitan datos por IDs conocidos, prefiere consultas del tipo:

WHERE id IN (...)

antes que cargar toda la tabla.

FASE 5 — Validación

Agrega tests que comparen el comportamiento anterior y nuevo.

Para cálculos financieros incluye casos con:

- múltiples stands
- múltiples métodos de pago
- ventas sin costos
- ventas con costos
- cantidades diferentes
- valores decimales
- listas vacías

Ejecuta:

./gradlew test
./gradlew check

No modifiques un flujo si no puedes demostrar que el resultado funcional
es equivalente.

FASE 6 — Informe

Al finalizar quiero para cada optimización:

ANTES:
- queries ejecutadas
- filas aproximadas cargadas
- objetos Java creados
- algoritmo utilizado

DESPUÉS:
- queries ejecutadas
- filas aproximadas cargadas
- objetos Java creados
- algoritmo utilizado

Incluye el SQL o JPQL utilizado.

No hagas commits automáticamente.

Antes de modificar contratos HTTP o migraciones de base de datos, detente
y explícame qué cambio sería necesario.
