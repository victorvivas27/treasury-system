# Diagnostico de rendimiento - GET /apoderados

Fecha: 2026-09-02

## 1. Causa raiz encontrada

La causa raiz encontrada en el codigo era un N+1 en el armado del DTO del endpoint `GET /tesoreria/api/v1/apoderados?page=0&size=20`.

El endpoint obtenia la pagina de apoderados correctamente, pero despues, por cada apoderado retornado, `ApoderadoController.response()` ejecutaba:

`users.findByCorreo(guardian.getEmail())`

Para `size=20`, eso agrega hasta 20 consultas de usuario solo para calcular `accessStatus`. La respuesta era pequena, asi que el problema no venia del peso del JSON ni del frontend.

## 2. Flujo del endpoint

Request:

`GET /tesoreria/api/v1/apoderados?page=0&size=20`

Flujo backend:

Usuario autenticado
↓
Spring Security / JWT
↓
`ApoderadoController.findAll(page, size, search)`
↓
`ApoderadoService.findAll(PageRequest)`
↓
`JpaApoderadoRepositoryAdapter.findAll(PageRequest)`
↓
`ApoderadoJpaRepository.findAll(pageable)` si `search` vacio
↓
Spring Data ejecuta query de pagina + query de COUNT
↓
`ApoderadoPersistenceMapper.toDomain`
↓
`ApoderadoController` calcula `accessStatus`
↓
`ApoderadoMapper.toResponse`
↓
JSON `PageResponse<ApoderadoResponse>`

Archivos relevantes:

- Controller: `backend/src/main/java/com/tesoreria/apoderado/infrastructure/adapter/in/web/controller/ApoderadoController.java`
- Service: `backend/src/main/java/com/tesoreria/apoderado/application/usecase/ApoderadoService.java`
- Adapter repository: `backend/src/main/java/com/tesoreria/apoderado/infrastructure/adapter/out/persistence/adapter/JpaApoderadoRepositoryAdapter.java`
- JPA repository: `backend/src/main/java/com/tesoreria/apoderado/infrastructure/adapter/out/persistence/repository/ApoderadoJpaRepository.java`
- Entity: `backend/src/main/java/com/tesoreria/apoderado/infrastructure/adapter/out/persistence/entity/ApoderadoEntity.java`
- DTO: `backend/src/main/java/com/tesoreria/apoderado/infrastructure/adapter/in/web/dto/ApoderadoResponse.java`
- User lookup: `backend/src/main/java/com/tesoreria/user/core/port/out/UserRepositoryOutPort.java`
- User JPA: `backend/src/main/java/com/tesoreria/user/infrastructure/adapter/out/persistence/repository/UserJpaRepository.java`

## 3. Queries involucradas

Para `search=""`, Spring Data `Page<>` implica:

1. Query principal de pagina sobre `apoderados`.
2. Query `COUNT` sobre `apoderados`.
3. Antes del cambio: una query por apoderado a `users` por `correo`.

Con `size=20`, el conteo del cuerpo del endpoint era:

- Antes: `2 + N` queries, hasta `22` queries para 20 filas.
- Despues: `3` queries: pagina, count y usuarios por correos en batch.

La query nueva de usuarios es derivada por Spring Data:

`findByCorreoIn(Collection<String> correos)`

SQL esperado:

```sql
select ...
from users
where correo in (...)
```

Por multitenancy, Hibernate agrega filtro de tenant a entidades que tienen `@TenantId`; `ApoderadoEntity` hereda `organization_id` desde `TenantScopedEntity`.

Indices existentes relevantes:

- `apoderados.codigo` unico inicial.
- `apoderados.email` unico inicial.
- `idx_apoderados_organization` en `organization_id`.
- `users.correo` unico inicial.
- `idx_users_organization` en `organization_id`.

No se agregaron indices porque el problema demostrado era cantidad de queries, no un plan lento demostrado por `EXPLAIN ANALYZE`.

## 4. Tiempos antes

Baseline manual entregado:

- HTTP total observado: ~1770 ms.
- Transferido: ~6.13 kB.
- Contenido: ~5.31 kB.
- Pagina: 0.
- Size: 20.

Separacion por fase no disponible en esta sesion:

- No se ejecuto login contra produccion porque `/auth/login` emite refresh/session tokens y puede escribir estado de sesion.
- No habia backend local escuchando en `5055`.
- La medicion Postgres/Testcontainers local no pudo correr porque Docker no esta disponible en esta maquina.

## 5. Cambio realizado

Se cambio solo la resolucion de `accessStatus` para la lista paginada:

- Antes: `findAll()` mapeaba cada fila llamando `response(guardian)`, y cada `response()` hacia `users.findByCorreo(...)`.
- Despues: `findAll()` obtiene todos los correos de la pagina, llama una vez a `users.findByCorreos(...)`, arma un `Map<String, User>` y mapea cada apoderado en memoria.

Archivos modificados:

- `ApoderadoController.java`
  - `findAll()` ahora precarga usuarios por correo en batch.
  - `findByCodigo`, `create`, `update` y otras rutas mantienen el flujo individual existente.

- `UserRepositoryOutPort.java`
  - Nuevo metodo `findByCorreos(Collection<String> correos)`.

- `UserJpaRepository.java`
  - Nuevo metodo Spring Data `findByCorreoIn(Collection<String> correos)`.

- `JpaUserRepositoryAdapter.java`
  - Implementa el metodo batch y mapea entidades a dominio.

- `ApoderadoControllerTest.java`
  - Nuevo test verifica que `findAll()` use `findByCorreos(...)` y no `findByCorreo(...)` por fila.

- `PostgresPerformanceQueryIntegrationTest.java`
  - Se agrego test de performance local esperado: 20 apoderados deben resolverse con 3 prepared statements. No pudo ejecutarse por falta de Docker.

## 6. Tiempos despues

No hay tiempos HTTP despues medidos en produccion en esta sesion. No voy a atribuir una mejora porcentual de latencia sin ejecutar la llamada real.

Mejora demostrada por conteo de operaciones para `size=20`:

| Medida | Antes | Despues |
| --- | ---: | ---: |
| Queries pagina apoderados | 1 | 1 |
| Query COUNT | 1 | 1 |
| Queries usuarios para `accessStatus` | hasta 20 | 1 |
| Total cuerpo endpoint | hasta 22 | 3 |
| Reduccion de queries | - | 19 menos |
| Reduccion porcentual de queries | - | ~86.4 % |
| Tamano de respuesta | ~5.31 kB contenido | Sin cambio esperado |
| Contrato API | Igual | Igual |

Validaciones ejecutadas:

- `./gradlew.bat test --tests apoderado.ApoderadoControllerTest --tests apoderado.ApoderadoServiceTest --tests user.UserServiceTest`: OK.
- `./gradlew.bat pmdMain`: OK.

Validacion bloqueada:

- `./gradlew.bat test --tests performance.PostgresPerformanceQueryIntegrationTest.listGuardians_deberiaResolverAccessStatusSinNMasUno`: fallo por inicializacion de Docker/Testcontainers, no por asercion del test.

## 7. Mejora porcentual

Mejora de queries dentro del cuerpo del endpoint:

- Antes: hasta 22 queries para `size=20`.
- Despues: 3 queries.
- Mejora: 19 queries menos.
- Mejora porcentual: `(22 - 3) / 22 = 86.4 %`.

Mejora de tiempo HTTP:

- Antes manual: ~1770 ms.
- Despues real: pendiente de medir.
- Mejora en ms/%: pendiente, porque no hubo ejecucion productiva ni entorno local con DB disponible.

## 8. Riesgos o trabajo pendiente

- Falta medir 5 muestras reales post-deploy del endpoint con un token/sesion ya disponible que no requiera login nuevo.
- Falta capturar TTFB, duracion backend y tiempo de serializacion HTTP.
- Falta ejecutar el test Postgres/Testcontainers cuando Docker este disponible para confirmar empiricamente los 3 prepared statements.
- Falta `EXPLAIN ANALYZE` de la query principal y del `COUNT` contra produccion o replica read-only. No se ejecuto porque no habia acceso DB seguro en esta sesion.
- La paginacion actual no define `ORDER BY`; mantiene el comportamiento existente, pero la pagina puede ser no deterministica. No se cambio porque seria cambio funcional/contrato de ordenamiento.
- Si despues de este cambio el endpoint sigue cerca de 1.77 s, la siguiente medicion debe separar autenticacion/JWT, adquisicion de conexion y query `COUNT`.

## 9. Siguiente paso recomendado

Despues de desplegar:

1. Ejecutar 5 GET secuenciales a `GET /tesoreria/api/v1/apoderados?page=0&size=20` con sesion ya autenticada.
2. Registrar min, promedio, max, p50, p95, TTFB y bytes.
3. Activar temporalmente Hibernate statistics/slow SQL para confirmar:
   - cantidad total de statements;
   - tiempo de query principal;
   - tiempo de `COUNT`;
   - tiempo de `users where correo in (...)`.
4. Solo si el `COUNT` o la query principal aparecen lentos, ejecutar `EXPLAIN ANALYZE` read-only y evaluar indice/ordenamiento con evidencia.
