# Task: Crear módulo Alumno

## Objetivo

Crear el módulo `Alumno` siguiendo la arquitectura, estilo y convenciones existentes del proyecto.

Usar el módulo `Apoderado` como referencia principal.

---

## Entidad

El módulo `Alumno` debe manejar los siguientes campos:

- `id`
- `nombre`
- `curso`
- `apoderadoId`

---

## Backend

Crear el módulo en:

```txt
backend/src/main/java/com/tesoreria/alumno
```

La estructura debe ser equivalente a la del módulo `Apoderado`.

---

## Importante: configuración Spring

No crear una clase genérica llamada:

```txt
DomainConfig.java
```

Debe usarse un nombre específico para evitar colisión de beans en Spring.

Crear:

```txt
AlumnoDomainConfig.java
```

Ejemplo esperado:

```java
package com.tesoreria.alumno.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import com.tesoreria.alumno.application.usecase.AlumnoService;
import com.tesoreria.alumno.core.port.out.AlumnoRepositoryOutPort;

@Configuration
public class AlumnoDomainConfig {
  @Bean
  public AlumnoService alumnoService(AlumnoRepositoryOutPort repository) {
    return new AlumnoService(repository);
  }
}
```

---

## Modelo de dominio

El modelo `Alumno` debe contener:

```java
private Long id;
private String nombre;
private String curso;
private Long apoderadoId;
```

---

## Validaciones

Validar:

- `nombre` obligatorio.
- `nombre` mínimo 2 caracteres.
- `nombre` máximo 100 caracteres.
- `nombre` no debe contener números ni caracteres especiales.
- `curso` obligatorio.
- `curso` mínimo 1 carácter.
- `curso` máximo 50 caracteres.
- `apoderadoId` obligatorio.
- `apoderadoId` debe ser un número positivo.
- El `apoderadoId` debe existir antes de crear un alumno.

---

## Endpoints REST

Crear endpoints:

```txt
POST   /api/alumnos
GET    /api/alumnos/{id}
GET    /api/alumnos
PUT    /api/alumnos/{id}
DELETE /api/alumnos/{id}
```

---

## Request esperado

```json
{
  "nombre": "Juan Pérez",
  "curso": "4A",
  "apoderadoId": 1
}
```

---

## Response esperado

```json
{
  "id": 1,
  "nombre": "Juan Pérez",
  "curso": "4A",
  "apoderadoId": 1
}
```

---

## Pruebas backend

Crear pruebas similares a las de `Apoderado`.

Cubrir:

- Crear alumno válido.
- Obtener alumno por ID.
- Actualizar alumno.
- Eliminar alumno.
- Validaciones de `nombre`.
- Validaciones de `curso`.
- Validaciones de `apoderadoId`.
- Error cuando el alumno no existe.
- Error cuando el `apoderadoId` no existe.

---

## Frontend

Crear estructura equivalente a `apoderado`:

```txt
frontend/src/core/A-domain/entities/alumno/Alumno.ts
frontend/src/core/A-domain/repository/alumno/IAlumnoRepository.ts
frontend/src/core/B-application/use-cases/alumno
frontend/src/core/C-infra/repositories/alumno
frontend/src/presentation/features/alumno
frontend/src/presentation/hooks/alumno
frontend/src/presentation/pages/alumno
```

---

## Frontend esperado

Crear:

- Entidad `Alumno`.
- Repositorio `IAlumnoRepository`.
- Implementación `AlumnoRepositoryImpl`.
- Casos de uso:
  - `CreateAlumnoUseCase`
  - `GetAlumnosUseCase`
  - `GetAlumnoByIdUseCase`
  - `UpdateAlumnoUseCase`
  - `DeleteAlumnoUseCase`

- Hooks:
  - `useAlumnos`
  - `useCreateAlumno`
  - `useEditAlumno`
  - `useDeleteAlumno`

- Componentes y páginas para:
  - Listar alumnos.
  - Crear alumno.
  - Editar alumno.
  - Eliminar alumno.

---

## Tests frontend

Crear pruebas para:

- Entidad Alumno.
- Casos de uso.
- Repositorio.
- Hooks.
- Formularios.
- Página de listado.

---

## API Tests

Crear carpeta:

```txt
api-tests/alumno
```

Debe seguir la misma estructura usada en `api-tests/apoderado`.

Crear pruebas para:

- Happy Path CRUD.
- Validaciones de creación.
- Validaciones de actualización.
- Get by ID inválido.
- Delete inválido.
- List all.

---

## Criterios de aceptación

La tarea estará completa cuando:

- El backend compile correctamente.
- Los tests backend pasen.
- El frontend compile correctamente.
- Los tests frontend pasen.
- Los endpoints CRUD funcionen.
- Los API tests estén organizados igual que los de `apoderado`.
- No exista colisión de beans por nombres genéricos como `DomainConfig`.
- El módulo `Alumno` respete la arquitectura existente.

---

## Comandos sugeridos

Backend:

```bash
cd backend
./gradlew test
./gradlew bootRun
```

Frontend:

```bash
cd frontend
pnpm test
pnpm build
```

---

## Resumen

Crear el módulo `Alumno` usando `Apoderado` como referencia, con los campos `nombre`, `curso` y `apoderadoId`.

No crear `DomainConfig.java`; crear `AlumnoDomainConfig.java` para evitar conflictos de beans en Spring.
