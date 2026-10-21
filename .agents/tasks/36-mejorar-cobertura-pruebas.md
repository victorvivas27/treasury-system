# Tarea 36 — Mejorar cobertura y confiabilidad de las pruebas

## Estado y objetivo

En implementación desde el 20/10/2026. El objetivo global de 89 % sigue pendiente.

Avances y comandos reproducibles: [36-progreso-cobertura.md](36-progreso-cobertura.md).

Alcanzar **más del 88 %** de cobertura en líneas, ramas y funciones/métodos, con reportes independientes para frontend unitario, frontend de integración, backend unitario y backend de integración. Configurar una meta operativa de **89 %** para superar el 88 % sin depender del redondeo.

Las pruebas deben detectar errores reales y proteger comportamientos, reglas financieras, seguridad y contratos existentes.

## Base de referencia

Reportes locales revisados el 20/10/2026; deben actualizarse antes de tomar decisiones:

| Área | Líneas | Ramas | Funciones/métodos | Fecha del reporte |
|---|---:|---:|---:|---|
| Frontend, suite Vitest conjunta | 64,71 % | 59,24 % | 52,44 % | 21/09/2026 |
| Backend, suite JaCoCo conjunta | 81,75 % | 57,01 % | 78,91 % | 19/10/2026 |

No hay porcentajes separados por tipo de prueba. El reporte backend excluye, entre otros, controladores, adaptadores, repositorios, DTO, configuración y `shared`; no representa todo el código backend.

La ejecución backend del 20/10/2026 informó 647 pruebas: 594 aprobadas, 12 fallidas y 41 omitidas. Los 12 fallos corresponden a inicialización de Testcontainers sin Docker disponible. No considerar esta ejecución una validación completa de integración ni reutilizar el reporte anterior como si fuera actual.

## Fase 1 — Medición y clasificación

- [x] Leer las instrucciones del proyecto y verificar código, configuración Gradle, Vitest y workflows vigentes.
- [ ] Inventariar y clasificar las pruebas por comportamiento y dependencias reales; no basarse solamente en el nombre del archivo.
- [x] Separar la ejecución y los datos de cobertura de las cuatro suites para evitar mezclar resultados.
- [ ] Backend unitario: dominio, calculadores y servicios aislados, con dobles cuando corresponda.
- [ ] Backend de integración: componentes reales conectados, HTTP, seguridad, persistencia y transacciones; PostgreSQL real mediante Testcontainers para los escenarios que lo requieran.
- [ ] Frontend unitario: lógica aislada, validaciones, casos de uso, hooks y componentes aislados.
- [ ] Frontend de integración: componentes, contexto, hooks y cliente HTTP conectados; simular la API en el límite de red, conservando las capas internas reales.
- [ ] Mantener las pruebas contra backend real y de extremo a extremo identificadas por separado; una prueba de página con hooks simulados no acredita integración con backend.
- [x] Ejecutar la base completa con Docker disponible y registrar fallos, omisiones, fecha y commit.

## Fase 2 — Alcance representativo

- [x] Auditar las exclusiones e incluir código ejecutable relevante actualmente fuera del reporte.
- [ ] Definir y documentar el denominador de cada suite antes de agregar pruebas: unidades aislables para unitarias y capas conectadas para integración, con todos los módulos aplicables incluidos.
- [ ] Justificar cada exclusión por naturaleza del archivo, por ejemplo código generado o declaraciones sin comportamiento; no excluir código difícil de probar para elevar porcentajes.
- [ ] Medir también la cobertura combinada por aplicación y señalar qué código queda fuera de cada suite.
- [ ] Generar una lista priorizada de módulos y ramas sin cobertura.

## Fase 3 — Backend unitario

- [ ] Cubrir cálculos, montos, redondeos, límites, validaciones y cambios de estado.
- [ ] Probar autorización, aislamiento entre organizaciones y rechazo de operaciones inválidas.
- [ ] Cubrir errores de dependencias y comprobar ausencia de persistencia o efectos secundarios cuando una operación falla.
- [ ] Alcanzar al menos 89 % en líneas, ramas y métodos del alcance unitario acordado.

## Fase 4 — Frontend unitario

- [ ] Cubrir validaciones, transformaciones y casos de uso.
- [ ] Probar hooks y componentes en éxito, carga, vacío, error y reintento.
- [ ] Cubrir formularios inválidos, permisos, sesión vencida y prevención de envíos duplicados.
- [ ] Verificar resultados observables por el usuario, evitando acoplar las pruebas a detalles internos.
- [ ] Alcanzar al menos 89 % en líneas, ramas y funciones del alcance unitario acordado.

## Fase 5 — Integración

### Backend

- [ ] Verificar contratos HTTP, autenticación, permisos y separación de datos entre organizaciones.
- [ ] Validar persistencia, restricciones, transacciones, rollback y operaciones duplicadas con PostgreSQL real.
- [ ] Probar integraciones externas con servidores o respuestas controladas: errores, tiempos de espera, reintentos e idempotencia cuando aplique.
- [ ] Aislar los datos por prueba y comprobar limpieza y repetibilidad.
- [ ] Alcanzar al menos 89 % en líneas, ramas y métodos del alcance de integración acordado.

### Frontend

- [ ] Probar flujos conectados desde la interacción del usuario hasta la solicitud HTTP y la actualización de pantalla.
- [ ] Cubrir respuestas exitosas, validaciones del servidor, errores de red y sesión vencida.
- [ ] Comprobar carga, recuperación ante fallos y prevención de solicitudes duplicadas.
- [ ] Alcanzar al menos 89 % en líneas, ramas y funciones del alcance de integración acordado.

## Prioridad de escenarios

1. Tesorería y pagos: cálculos, anulaciones, duplicados, transacciones y rollback.
2. Seguridad: autenticación, renovación de tokens, permisos y aislamiento entre organizaciones.
3. Mercado Pago, correo y WhatsApp: fallos, tiempos de espera y reintentos.
4. Frontend crítico: formularios, errores de API, sesiones vencidas y envíos duplicados.
5. Alumnos, apoderados, familias, eventos, stands y horarios.

Complementar con recorridos de extremo a extremo: ingreso, registro de pago y consulta del resultado. Usar estos recorridos para comprobar el sistema conectado; no sustituir con ellos los cuatro reportes de cobertura.

## Fase 6 — CI y mantenimiento

- [ ] Avanzar en entregas revisables con metas de 75 %, 82 % y finalmente 89 %, sin reducir niveles ya alcanzados.
- [ ] Aplicar cada meta a todas las métricas exigidas; no asumir que superar líneas implica superar ramas.
- [ ] Ejecutar las cuatro suites y publicar artefactos independientes con fecha y commit verificables.
- [ ] Bloquear incumplimientos del umbral final y evitar que resultados antiguos o suites vacías aparenten éxito.
- [ ] Exigir integración PostgreSQL en el entorno de CI correspondiente; un entorno sin Docker debe informar una validación incompleta.
- [ ] Auditar omisiones: justificar las legítimas y corregir las que oculten escenarios requeridos.
- [ ] Evitar ejecuciones duplicadas innecesarias y preservar la correspondencia entre reportes y commit.
- [ ] Evaluar pruebas de mutación en cálculos y seguridad para comprobar que las aserciones detectan alteraciones incorrectas. Registrar resultados; cualquier dependencia nueva requiere autorización según las reglas del proyecto.

## Reglas de implementación

- No bajar umbrales, ampliar exclusiones, añadir omisiones ni modificar expectativas para esconder defectos.
- No escribir pruebas que solo ejecuten líneas o repliquen la implementación; comprobar resultados, errores y efectos secundarios relevantes.
- No cambiar contratos, esquema, reglas financieras ni autorización como atajo para facilitar pruebas.
- Preservar cambios ajenos. No añadir dependencias, publicar, desplegar ni hacer push sin autorización.
- Registrar por entrega: alcance, métricas, conteos, fallos, omisiones, comandos ejecutados y limitaciones.
- Aplicar las verificaciones de `.agents/tasks/06-testing.md` y `.agents/tasks/08-quality-operations.md`, adaptadas a los comandos separados que se implementen.

## Criterios de aceptación

- [ ] Cuatro suites con ejecución y reportes independientes reproducibles.
- [ ] Al menos 89 % de líneas y ramas en las cuatro suites; funciones en frontend y métodos en backend también al menos 89 %.
- [ ] Denominadores y exclusiones documentados y representativos, con cobertura combinada adicional por aplicación.
- [ ] Todas las pruebas requeridas pasan, incluida integración con PostgreSQL; ninguna omisión encubre un escenario obligatorio.
- [ ] Recorridos críticos de extremo a extremo verificados.
- [ ] CI impide regresiones por debajo de los umbrales y asocia los reportes al commit validado.
- [ ] Evidencia de pruebas sobre errores, límites, seguridad y reglas financieras, además de escenarios exitosos.
