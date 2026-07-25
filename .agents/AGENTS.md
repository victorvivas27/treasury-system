# Guía de desarrollo de `treasury-system`

Este archivo documenta la estructura y los patrones comprobados en el código
actual. Se basa en los módulos `alumno`, `apoderado` y `familia`, sus pruebas y
la configuración de build; no describe una arquitectura ideal distinta de la
implementada.

## 1. Alcance

El repositorio contiene:

- `backend`: API REST con Java 17, Spring Boot, WebMVC, Spring Data JPA,
  PostgreSQL/H2 y Gradle.
- `frontend`: React 19, TypeScript, Vite, React Router, Axios, Vitest y Testing
  Library.
- `api-tests`: colecciones OpenCollection/Bruno en YAML contra la API
  levantada.

Los dominios implementados de punta a punta son Alumno, Apoderado y Familia.
Familia vincula un alumno con uno o más apoderados y guarda `parentesco` y
`esPrincipal` en cada relación.

## 2. Arquitectura real del backend

El backend usa una arquitectura hexagonal organizada por módulo:

```text
com.tesoreria.<modulo>/
├── core/
│   ├── model/
│   ├── exception/
│   └── port/
│       ├── in/
│       └── out/
├── application/usecase/
├── config/
└── infrastructure/adapter/
    ├── in/web/
    │   ├── controller/
    │   ├── dto/
    │   └── mapper/
    └── out/persistence/
        ├── adapter/
        ├── entity/
        ├── mapper/
        └── repository/
```

`com.tesoreria.shared` contiene excepciones, paginación, constantes, CORS y
manejo global de errores.

### 2.1 Dominio

Los modelos de `core/model` son clases Java sin anotaciones JPA. Sus
constructores llaman setters para aplicar las mismas validaciones y
normalizaciones que una modificación posterior.

Patrones existentes:

- Las invariantes lanzan `DomainException`.
- Cada módulo tiene un enum `*ErrorCode` con campo y `HttpStatus`.
- Las longitudes compartidas salen de `ValidationConstants`.
- Se aplica `trim()` antes de validar.
- Los nombres se normalizan a mayúsculas con `Locale.ROOT`.
- El email de Apoderado se normaliza a minúsculas.
- Los textos opcionales blancos se convierten a `null`.
- Familia rechaza alumno inválido, lista vacía, apoderados repetidos y más de un
  apoderado principal.
- `FamiliaApoderado` es un objeto de dominio propio, distinto del DTO web y del
  `@Embeddable` de persistencia.

Las reglas de negocio deben permanecer en dominio/aplicación. Los DTO pueden
validar forma de entrada con Jakarta Validation, pero no reemplazan las
invariantes del dominio.

### 2.2 Puertos, servicios y configuración

Los contratos de entrada están en `core/port/in` y los repositorios en
`core/port/out`.

Los servicios de `application/usecase`:

- implementan varios puertos de entrada del módulo;
- reciben puertos de salida por constructor;
- coordinan existencia, duplicados, actualización y eliminación;
- recuperan la entidad existente antes de actualizarla;
- modifican el dominio mediante setters y luego llaman `save`;
- usan `DomainException` para not found y conflictos.

No tienen `@Service`. Se registran como `@Bean` en configuraciones específicas:
`AlumnoDomainConfig`, `ApoderadoDomainConfig` y `FamiliaDomainConfig`.
`AlumnoService` también usa `FamiliaRepositoryOutPort` para impedir eliminar un
alumno vinculado.

### 2.3 API web

Las rutas parten de `/tesoreria/api/v1` mediante `ApiConstants`.

- Alumno: `/alumnos`; GET/PUT/DELETE individual por `codigo`
  `AL-XXXXXXXX`.
- Apoderado: `/apoderados`; GET/PUT/DELETE individual por `codigo`
  `AP-XXXXXXXX`.
- Familia: `/familias`; GET/PUT/DELETE individual por `familiaId` numérico.
- Los listados aceptan `page` y `size` y devuelven `PageResponse<T>`.
- POST devuelve 201, GET/PUT 200 y DELETE 204.

Flujo implementado:

```text
Request DTO -> web mapper -> dominio -> caso de uso
            -> web mapper -> Response DTO
```

Alumno y Apoderado inyectan actualmente sus servicios concretos en el
controlador. Familia usa puertos de entrada para el CRUD y
`AlumnoService`/`ApoderadoService` para validar referencias y formar respuestas
detalladas. Al extender un módulo se mantiene su patrón actual sin introducir
un segundo estilo dentro del mismo flujo.

`GlobalExceptionHandler` centraliza:

- errores Jakarta Validation como 400;
- `DomainException` con su estado y campo;
- JSON ilegible/formato inválido como 400;
- respuesta `StandardErrorResponse(status, errors, timestamp)`, donde `errors`
  es un mapa campo-mensaje.

### 2.4 Persistencia

La persistencia separa:

- `*Entity`: JPA.
- `*JpaRepository`: Spring Data.
- `*PersistenceMapper`: dominio ↔ entidad.
- `Jpa*RepositoryAdapter`: implementación del puerto.

Convenciones existentes:

- IDs con `GenerationType.IDENTITY`.
- Códigos generados en `@PrePersist` con `AL-`, `AP-` y `FAM-`.
- Fechas `created_at` y `updated_at`.
- Alumno/Apoderado consultados públicamente por `codigo`.
- Familia única por `alumno_id`.
- Relaciones Familia-Apoderado como `@ElementCollection`, únicas por
  `familia_id` y `apoderado_id`.
- Conversión de `PageRequest` compartido a `Pageable` y retorno de
  `PageResponse`.

Nunca exponer entidades JPA desde controladores ni hacer depender al dominio de
Spring Data.

## 3. Arquitectura real del frontend

```text
src/
├── core/
│   ├── A-domain/entities y repository
│   ├── B-application/use-cases
│   ├── C-infra/repositories
│   └── D-config
├── presentation/
│   ├── features
│   ├── hooks
│   ├── pages
│   └── routers
└── shared/
    ├── constants
    ├── layouts
    ├── style
    └── ui
```

El alias `@` apunta a `src`.

### 3.1 Capas y comunicación

- `A-domain/entities`: interfaces, DTOs y `PageResponse`.
- `A-domain/repository`: contratos TypeScript.
- `B-application/use-cases`: clases con repositorio por constructor y método
  `execute`.
- `C-infra/repositories`: implementaciones Axios.
- `D-config/api.ts`: instancia Axios con `VITE_API_URL` y fallback local.

Los componentes no llaman Axios. El recorrido implementado es:

```text
componente/página -> hook -> caso de uso -> contrato
                  -> repositorio Axios -> API
```

Existen aliases heredados de compatibilidad en repositorios y casos de uso. No
son precedente para duplicar contratos nuevos. Se usa el identificador real de
la API: `codigo` para Alumno/Apoderado y `familiaId` para Familia.

### 3.2 Presentación

Los hooks coordinan formulario/listado, loading, errores, casos de uso,
parámetros de ruta, navegación, modales y traducción de
`response.data.errors` a errores de campo.

Los hooks paginados exponen página actual, totales, siguiente/anterior,
`refetch` y banderas de navegación. Los formularios son controlados, limpian el
error del campo modificado y separan carga inicial de carga de envío.

- Las páginas componen encabezados, hooks y features.
- Los features renderizan listas y formularios.
- Los estilos se ubican junto a feature/página.
- `AppRouter` declara navegación y rutas CRUD.
- `shared/ui` contiene Button, modales, feedback, empty states y skeletons.
- `shared/constants/Icons.tsx` centraliza iconos.

Antes de crear UI nueva, revisar y reutilizar `shared/ui`.

## 4. Reglas para implementar un CRUD

### 4.1 Backend

1. Crear modelo de dominio con invariantes en constructor y setters.
2. Crear `*ErrorCode` con campo y estado.
3. Definir un puerto de entrada por operación en `core/port/in`.
4. Definir el puerto de repositorio en `core/port/out`.
5. Implementar los casos de uso en `application/usecase`.
6. Registrar el servicio con `@Bean` en `<Modulo>DomainConfig`.
7. Crear Request/Response DTOs y mapper web.
8. Crear controlador con estados HTTP y paginación coherentes.
9. Crear entidad JPA, Spring Data repository, mapper y adaptador.
10. Validar referencias entre módulos y restricciones al eliminar.
11. Añadir tests de dominio, servicio, frontend y API.

Update:

- recuperar primero el recurso;
- conservar ID, código y fechas;
- cambiar solo campos editables mediante setters;
- guardar la instancia modificada;
- devolver 404 si no existe.

Delete:

- comprobar existencia y vínculos;
- devolver 204 sin body.

Listado:

- aceptar `page`/`size`;
- usar `PageRequest`/`PageResponse`;
- mapear cada elemento a Response DTO.

### 4.2 Frontend

1. Definir entidad, DTOs y paginación en `A-domain/entities`.
2. Definir contrato en `A-domain/repository`.
3. Crear casos de uso inyectables con `execute`.
4. Implementar repositorio Axios.
5. Crear hooks de listado/creación/edición/eliminación según el flujo.
6. Crear features y páginas.
7. Registrar rutas en `AppRouter`.
8. Reutilizar layout y `shared/ui`.
9. Manejar lista vacía, loading, error, confirmación y éxito.
10. Mostrar `errors` del backend en los campos.
11. Mantener nombres JSON iguales a los DTOs backend.
12. Usar el identificador real del endpoint sin aliases nuevos.

## 5. Tests

### 5.1 Backend unitario

La suite Java actual contiene tests de dominio y aplicación.

Dominio:

- JUnit 5 puro, sin Spring.
- `<Modelo>Test.java` en `src/test/java/<modulo>`.
- `@BeforeEach` para fixtures y `@Nested` por campo/operación.
- Nombres en español `metodo_deberiaResultado` o `deberia...`.
- `assertThrows(DomainException.class, ...)`.
- Verificar mensaje, estado o valor normalizado.
- Cubrir null, vacío, espacios, mínimos, máximos, formato y casos válidos.
- Usar `assertAll` para aserciones del mismo escenario.

Servicios:

- JUnit 5 + Mockito con `@ExtendWith(MockitoExtension.class)`.
- Puertos con `@Mock`; servicio con `@InjectMocks`.
- Fixtures en `@BeforeEach`.
- `@Nested` para find/list, create, update y delete.
- `when` -> llamada -> aserciones -> `verify`.
- Comprobar `never()` cuando un error debe impedir persistir.
- Verificar contenido y metadatos paginados.

```bash
cd backend
./gradlew test
./gradlew check
```

`check` ejecuta PMD main y JaCoCo. La cobertura mínima configurada es 70 % en
las clases no excluidas por `build.gradle`; `pmdTest` está deshabilitado.

### 5.2 Backend integración

Actualmente no existen tests Java con `@SpringBootTest`, `@WebMvcTest`,
`@DataJpaTest`, `MockMvc` o Testcontainers. No afirmar que existen.

Si se necesitan, agregarlos como una categoría nueva. El perfil de prueba
disponible usa H2 en memoria, `create-drop` y
`backend/src/main/resources/application-test.yaml`.

### 5.3 Frontend unitario/componentes

La suite usa Vitest, jsdom, Testing Library y matchers de `jest-dom`.

Patrones:

- tests junto a la capa o en carpetas `test`/`tests`;
- `describe` por unidad e `it` descriptivo; es frecuente
  `[Unidad #NN] Debe ...`;
- `vi.mock`, `vi.mocked`, `beforeEach` y `vi.clearAllMocks`;
- `render`/`screen` para UI;
- `renderHook`, `act` y `waitFor` para hooks;
- `fireEvent` o `userEvent`;
- `MemoryRouter` al usar React Router;
- promesas controladas para transiciones de loading;
- `rerender` para cambios de props.

Cobertura por capa:

- caso de uso: delegación, retorno y manejo de error implementado;
- repositorio: método HTTP, URL, params/body y `response.data`;
- hook listado: carga, error, paginación y refetch;
- hook formulario: carga inicial, cambios, errores, submit, loading, modal y
  navegación;
- hook delete: confirmación, éxito/error, callback y guard sin ID;
- componente: render, roles/labels, estados, mensajes y callbacks;
- página: composición/navegación.

Los tests llamados “Integration” en páginas simulan hooks: integran UI, no
frontend con backend.

```bash
cd frontend
pnpm exec vitest run
pnpm exec vitest run ruta/al/test
pnpm test:coverage
pnpm build
pnpm lint
```

El build excluye `*.test.ts(x)`; ejecutar Vitest además del build.

### 5.4 Integración HTTP

La integración real está en `api-tests` (OpenCollection/Bruno). Las colecciones
se organizan por módulo en happy path CRUD, validaciones de create/update,
not-found de get/delete y listados; Familia adapta la organización a vínculos.

Cada YAML:

- declara `info`, HTTP, body, auth y settings;
- usa `{{Url_Base}}` y variables de entorno;
- comprueba status y body en scripts `type: tests`;
- guarda IDs/códigos con `bru.setEnvVar`;
- prepara/limpia datos con `before-request`/`after-response` cuando hace falta;
- usa `seq` y nombres numerados para flujos ordenados.

Un CRUD nuevo debe cubrir create, get, update, get actualizado, list, delete,
get eliminado, validaciones, not found y conflictos. Comprobar también el
contrato `status`/`errors` y preparar/limpiar datos explícitamente.

Estas pruebas requieren backend levantado y `Url_Base`.
`scripts/test-full-flow.sh` muestra el flujo existente, aunque hoy ejecuta solo
la colección Apoderado.

## 6. Flujo de trabajo

Antes de cambiar código:

1. Elegir el módulo más parecido.
2. Revisar dominio, puertos, servicio, web, persistencia, frontend y tests.
3. Confirmar si el recurso usa `codigo` o ID.
4. Revisar `StandardErrorResponse`.
5. Revisar `shared/ui`.

Durante el cambio:

- mantener el alcance solicitado;
- conservar la separación de capas;
- no duplicar contratos, mappers, casos de uso o UI;
- no mezclar DTOs, dominio y entidades JPA;
- no cambiar JSON sin actualizar backend, frontend y API tests;
- mantener normalización, estados, paginación y errores;
- actualizar tests en la misma entrega.

Verificación final:

```bash
cd backend
./gradlew test
./gradlew check

cd ../frontend
pnpm exec vitest run
pnpm build
pnpm lint
```

Si cambia el contrato HTTP, ejecutar la colección API relevante. Informar
cualquier suite no ejecutada y no llamar “integración” a una prueba unitaria.
