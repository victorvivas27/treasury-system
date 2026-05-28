# Tarea: Crear vínculo Alumno-Apoderado

## Contexto

Actualmente el sistema ya cuenta con los módulos:

- `Alumno`
- `Apoderado`

La nueva tarea consiste en crear todo lo necesario en backend, frontend y api-tests para permitir vincular uno o más apoderados a un alumno.

Actualmente el alumno puede tener un campo como:

```json
{
  "id": 1,
  "codigo": "AL-12E0A071",
  "nombre": "JUAN PEREZ",
  "curso": "4A",
  "apoderadoId": 1
}
```

Este modelo no es suficiente porque solo permite asociar un apoderado por alumno.

El nuevo modelo debe permitir:

```txt
Un alumno puede tener uno o más apoderados.
Un apoderado puede estar vinculado a uno o más alumnos.
```

---

## Objetivo

Implementar una nueva relación entre alumnos y apoderados usando una entidad intermedia.

Nombre recomendado del módulo:

```txt
Familia
```
---

## Regla principal de relación

La relación debe manejarse internamente por `id`, no por `codigo`.

Usar:

```json
{
  "alumnoId": 1,
  "apoderadoId": 1
}
```

No usar `codigo` como llave de relación.

El `codigo` debe usarse solo para:

- Mostrar información en frontend.
- Buscar alumno.
- Buscar apoderado.
- Identificar visualmente registros.

---

## Modelo esperado

La relación debe quedar así:

```txt
Alumno 1 --- N Familia N --- 1 Apoderado
```

---

## Backend

### Crear entidad / dominio `Familia`

Campos mínimos requeridos:

```json
{
  "id": 1,
  "alumnoId": 1,
  "apoderadoId": 1,
  "parentesco": "Padre",
  "principal": true,
  "observaciones": "Apoderado principal"
}
```

### Campos

| Campo | Tipo sugerido | Obligatorio | Descripción |
|---|---|---|---|
| `id` | Long | Sí | Identificador interno del vínculo |
| `alumnoId` | Long | Sí | ID interno del alumno |
| `apoderadoId` | Long | Sí | ID interno del apoderado |
| `parentesco` | String | Sí | Padre, Madre, Tutor, Abuelo, etc. |
| `principal` | Boolean | No | Indica si es el apoderado principal |
| `observaciones` | String | No | Observaciones del vínculo |

---

## Validaciones de negocio

Implementar validaciones similares al patrón existente del proyecto.

### Validaciones requeridas

- El alumno debe existir.
- El apoderado debe existir.
- No permitir duplicar el mismo vínculo `alumnoId + apoderadoId`.
- El campo `parentesco` es obligatorio.
- Si `principal = true`, evaluar si debe existir solo un apoderado principal por alumno.
- Si el vínculo no existe, devolver error controlado.
- Si el alumno no existe, devolver error controlado.
- Si el apoderado no existe, devolver error controlado.

---

## Endpoints sugeridos

Adaptar los nombres si el proyecto ya usa otra convención.

### Crear vínculo

```http
POST /alumnos/{alumnoId}/apoderados
```

Body:

```json
{
  "apoderadoId": 1,
  "parentesco": "Padre",
  "principal": true,
  "observaciones": "Apoderado principal"
}
```

Response esperado:

```json
{
  "id": 1,
  "alumnoId": 1,
  "apoderadoId": 1,
  "parentesco": "Padre",
  "principal": true,
  "observaciones": "Apoderado principal"
}
```

---

### Listar apoderados vinculados a un alumno

```http
GET /alumnos/{alumnoId}/apoderados
```

Response esperado:

```json
[
  {
    "id": 1,
    "codigo": "AP-365A4978",
    "nombre": "VICTOR JAVIER",
    "email": "victor@gmail.com",
    "telefono": "987654321",
    "parentesco": "Padre",
    "principal": true,
    "observaciones": "Apoderado principal"
  }
]
```

---

### Eliminar vínculo

```http
DELETE /alumnos/{alumnoId}/apoderados/{apoderadoId}
```

Debe eliminar solo la relación, no debe eliminar el alumno ni el apoderado.

---

### Actualizar vínculo

```http
PUT /alumnos/{alumnoId}/apoderados/{apoderadoId}
```

Body:

```json
{
  "parentesco": "Madre",
  "principal": false,
  "observaciones": "Contacto secundario"
}
```

---

## Respuesta esperada al consultar alumno

Cuando se consulte un alumno por detalle, se debe poder mostrar sus apoderados vinculados.

Ejemplo:

```json
{
  "id": 1,
  "codigo": "AL-12E0A071",
  "nombre": "JUAN PEREZ",
  "curso": "4A",
  "apoderados": [
    {
      "id": 1,
      "codigo": "AP-365A4978",
      "nombre": "VICTOR JAVIER",
      "email": "victor@gmail.com",
      "telefono": "987654321",
      "parentesco": "Padre",
      "principal": true
    }
  ]
}
```

Si el proyecto mantiene el listado de alumnos liviano, no agregar apoderados al listado principal salvo que el patrón existente lo permita.

---

## Backend - Arquitectura esperada

Seguir la arquitectura actual del proyecto.

Crear o modificar las capas necesarias:

```txt
domain
application
ports
adapters
infrastructure
persistence
```

### Consideraciones

- No poner lógica de negocio en el controller.
- No poner lógica de negocio en entidades JPA.
- Crear casos de uso para crear, listar, actualizar y eliminar vínculo.
- Crear mapper entre request, response, dominio y persistencia.
- Crear repositorio/puerto para la relación.
- Reutilizar patrones existentes de `Alumno` y `Apoderado`.
- Crear configuración Spring con nombre específico, por ejemplo:

```txt
AlumnoApoderadoDomainConfig
```

No usar nombres genéricos como:

```txt
DomainConfig
Config
```

---

## Frontend

Crear la interfaz necesaria para vincular apoderados desde el módulo de alumno.

### En la vista de alumno

Mostrar:

- Código del alumno.
- Nombre del alumno.
- Curso.
- Sección de apoderados vinculados.

Ejemplo visual:

```txt
Alumno: JUAN PEREZ
Código: AL-12E0A071
Curso: 4A

Apoderados vinculados
-------------------------------------------------
Código        Nombre          Parentesco   Principal
AP-365A4978   VICTOR JAVIER   Padre        Sí
```

---

## Frontend - Funcionalidades requeridas

### 1. Listar apoderados vinculados

Al abrir el detalle del alumno, mostrar los apoderados ya asociados.

Consumir endpoint:

```http
GET /alumnos/{alumnoId}/apoderados
```

---

### 2. Vincular apoderado

Agregar botón:

```txt
Vincular apoderado
```

Al hacer clic, mostrar formulario o modal.

Campos sugeridos:

- Buscar apoderado por nombre o código.
- Seleccionar apoderado.
- Seleccionar parentesco.
- Marcar si es principal.
- Observaciones opcionales.

Request:

```json
{
  "apoderadoId": 1,
  "parentesco": "Padre",
  "principal": true,
  "observaciones": "Apoderado principal"
}
```

---

### 3. Editar vínculo

Permitir editar:

- Parentesco.
- Principal.
- Observaciones.

No editar desde este flujo los datos propios del apoderado como nombre, email o teléfono.

---

### 4. Eliminar vínculo

Permitir quitar un apoderado del alumno.

Importante:

Eliminar vínculo no significa eliminar el apoderado del sistema.

---

## Frontend - Arquitectura esperada

Seguir la estructura actual del frontend.

Crear o modificar capas según corresponda:

```txt
domain
use-cases
infrastructure
hooks
pages
components
```

### Reglas

- No llamar API directamente desde componentes.
- Usar repositorio o caso de uso si el proyecto ya lo hace así.
- Los componentes deben enfocarse en UI.
- Los hooks deben coordinar estado, carga y errores.
- Reutilizar componentes compartidos existentes.
- No duplicar formularios si existe una forma reutilizable.

---

## API Tests

Crear pruebas API para el nuevo flujo.

### Casos mínimos

#### Crear vínculo

- Crear vínculo correctamente.
- Error si el alumno no existe.
- Error si el apoderado no existe.
- Error si el vínculo ya existe.
- Error si falta parentesco.

#### Listar vínculos

- Listar apoderados vinculados a un alumno.
- Retornar lista vacía si el alumno no tiene apoderados.
- Error si el alumno no existe, si ese es el patrón del proyecto.

#### Actualizar vínculo

- Actualizar parentesco.
- Actualizar principal.
- Error si el vínculo no existe.

#### Eliminar vínculo

- Eliminar vínculo correctamente.
- Confirmar que el apoderado sigue existiendo.
- Confirmar que el alumno sigue existiendo.
- Error si el vínculo no existe.

---

## Criterios de aceptación

La tarea se considera completa cuando:

- Existe una relación `Familia` o equivalente.
- Un alumno puede tener más de un apoderado.
- Se puede crear vínculo desde backend.
- Se puede listar apoderados vinculados a un alumno.
- Se puede editar el vínculo.
- Se puede eliminar el vínculo sin borrar alumno ni apoderado.
- El frontend muestra los apoderados vinculados en el detalle del alumno.
- El frontend permite vincular un nuevo apoderado.
- El frontend permite editar o quitar el vínculo.
- Existen api-tests del flujo principal y errores.
- Se ejecutaron pruebas relevantes o se documentó por qué no se pudieron ejecutar.

---

## Archivos esperados

El agente debe analizar el proyecto antes de decidir nombres exactos.

Posibles archivos a crear o modificar:

### Backend

```txt
AlumnoApoderado
AlumnoApoderadoController
AlumnoApoderadoRequest
AlumnoApoderadoResponse
CrearAlumnoApoderadoUseCase
ListarApoderadosPorAlumnoUseCase
ActualizarAlumnoApoderadoUseCase
EliminarAlumnoApoderadoUseCase
AlumnoApoderadoRepositoryPort
AlumnoApoderadoJpaRepository
AlumnoApoderadoEntity
AlumnoApoderadoMapper
AlumnoApoderadoDomainConfig
```

### Frontend

```txt
AlumnoApoderado
AlumnoApoderadoRepository
AlumnoApoderadoApiRepository
vincularApoderadoUseCase
listarApoderadosPorAlumnoUseCase
actualizarAlumnoApoderadoUseCase
eliminarAlumnoApoderadoUseCase
useAlumnoApoderados
AlumnoApoderadosSection
VincularApoderadoModal
```

### API Tests

```txt
alumno-apoderado.create
alumno-apoderado.list
alumno-apoderado.update
alumno-apoderado.delete
```

Usar los nombres reales según la convención del proyecto.

---

## Restricciones

- No reemplazar `Alumno` ni `Apoderado`.
- No eliminar datos existentes.
- No usar `codigo` como foreign key.
- No acoplar frontend directamente a endpoints sin repositorio/caso de uso si el proyecto ya usa capas.
- No introducir librerías nuevas salvo necesidad justificada.
- No modificar configuración global sin necesidad.
- No cambiar arquitectura existente.

---

## Orden sugerido de implementación

1. Analizar módulo `Alumno`.
2. Analizar módulo `Apoderado`.
3. Revisar rutas, DTOs, validaciones, errores y tests existentes.
4. Crear modelo de dominio `Familia`.
5. Crear persistencia de la relación.
6. Crear puerto/repositorio.
7. Crear casos de uso.
8. Crear controller.
9. Crear DTOs y mappers.
10. Crear pruebas backend/API.
11. Crear repositorio frontend.
12. Crear casos de uso frontend.
13. Crear hook.
14. Crear componentes UI.
15. Integrar sección en detalle de alumno.
16. Ejecutar pruebas relevantes.
17. Entregar resumen final.

---

## Formato de respuesta esperado del agente

Al finalizar, responder con:

```md
## Archivos creados

- ...

## Archivos modificados

- ...

## Tests ejecutados

- ...

## Errores encontrados y corregidos

- ...

## Pendientes

- ...
```

---

## Resumen

Crear el módulo `Familia` para vincular alumnos con uno o más apoderados.

La relación debe hacerse por `id`, no por `codigo`.

El frontend debe permitir ver, crear, editar y eliminar vínculos desde el detalle del alumno.

El backend debe mantener arquitectura limpia y casos de uso separados.

Los api-tests deben cubrir creación, listado, actualización, eliminación y errores principales.
