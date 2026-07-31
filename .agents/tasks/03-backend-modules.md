# 03. Backend y módulos

Cada módulo bajo `backend/src/main/java/com/tesoreria/<modulo>` separa `core`, `application/usecase`, `config` e `infrastructure/adapter` web/persistencia. `shared` contiene paginación, CORS, excepciones y errores. Los servicios se registran normalmente en `*DomainConfig`.

Flujo: Request DTO -> mapper -> dominio/caso de uso -> mapper -> Response DTO. No exponer JPA ni poner reglas en controladores.

## API real

Context path `/tesoreria`, base `/api/v1`:

- `/alumnos`: POST/listado; GET/PUT/DELETE por código.
- `/apoderados`: POST/listado; operaciones/acceso por código.
- `/familias`: CRUD por `familiaId`; cuerpos con IDs relacionados.
- `/auth`, `/users`: identidad y usuarios.
- `/tesoreria`: cuotas, aportes, ingresos, egresos, resumen, reportes y eventos.
- `/stands`: stands, productos y ventas.

Consultar controladores antes de documentar rutas. Usar `PageRequest`/`PageResponse`, preservar ID/código/timestamps y usar `DomainException`/`GlobalExceptionHandler`.

Familia valida referencias internas por ID. Tesorería audita mutaciones y corrige mediante anulación, no eliminación. `SchoolEventService` gestiona eventos; `ManagedCourseService` limita el curso. Stand conserva sus estados y reglas existentes.

```bash
cd backend
./gradlew test
./gradlew pmdMain
./gradlew check
```

Modificar solo capas y pruebas requeridas. Si cambia HTTP, validar frontend y Bruno.
