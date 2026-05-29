# Task: Completar flujo Familia / Alumno-Apoderado

## Contexto

Actualmente existen los módulos:

- `Alumno`
- `Apoderado`

También existe una tarea previa para vincular alumnos con apoderados, pero quedó incompleta.

Faltó cubrir el flujo completo de CRUD y faltó agregar en frontend una ruta/pantalla llamada `Familia`, donde se podrá hacer el cruce entre alumnos y apoderados.

---

## Objetivo general

Completar todo lo necesario en backend, frontend y tests para manejar correctamente el vínculo entre alumnos y apoderados desde una sección/página de frontend llamada `Familia`.

La relación debe permitir:

```txt
Un alumno puede tener uno o más apoderados.
Un apoderado puede estar vinculado a uno o más alumnos.
```

---

## Importante sobre el nombre `Familia`

En frontend debe existir una ruta o sección llamada:

```txt
Familia
```

Esta sección será usada para hacer el cruce entre alumnos y apoderados.

Sin embargo, a nivel de backend, la entidad de relación recomendada puede mantenerse como:

```txt
AlumnoApoderado
```

o usar el nombre equivalente que mejor siga la arquitectura actual del proyecto.

No crear una entidad compleja de núcleo familiar si el proyecto todavía no la necesita.

La tarea actual se centra en:

```txt
Alumno ↔ Apoderado
```

---

## Regla principal

La relación debe hacerse internamente por `id`.

Usar:

```json
{
  "alumnoId": 1,
  "apoderadoId": 1
}
```

No usar `codigo` como foreign key.

El `codigo` debe usarse solo para:

- Mostrar información en frontend.
- Buscar alumnos.
- Buscar apoderados.
- Identificar visualmente registros.

---

# Backend

## Objetivo backend

Crear o completar el CRUD completo para el vínculo entre alumno y apoderado.

El flujo debe permitir:

- Crear vínculo.
- Listar vínculos.
- Obtener detalle de un vínculo si aplica según patrón del proyecto.
- Actualizar vínculo.
- Eliminar vínculo.
- Consultar apoderados vinculados a un alumno.
- Consultar alumnos vinculados a un apoderado si el patrón del proyecto lo permite.

---

## Modelo esperado

Relación esperada:

```txt
Alumno 1 --- N AlumnoApoderado N --- 1 Apoderado
```

Campos mínimos del vínculo:

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

## Validaciones backend

Implementar validaciones siguiendo el patrón existente del proyecto.

Validaciones requeridas:

- El alumno debe existir.
- El apoderado debe existir.
- No permitir duplicar vínculo con el mismo `alumnoId` y `apoderadoId`.
- `parentesco` debe ser obligatorio.
- `principal` debe aceptar `true` o `false`.
- Si el vínculo no existe, devolver error controlado.
- Si el alumno no existe, devolver error controlado.
- Si el apoderado no existe, devolver error controlado.
- Al eliminar un vínculo, no eliminar el alumno.
- Al eliminar un vínculo, no eliminar el apoderado.

Regla recomendada:

- Si `principal = true`, validar si solo debe existir un apoderado principal por alumno.
- Si el negocio permite varios principales, documentarlo en el código o tests.

---

## Endpoints backend sugeridos

Adaptar rutas y nombres si el proyecto ya tiene otra convención.

### Crear vínculo

```http
POST /familias/alumno-apoderado
```

Body:

```json
{
  "alumnoId": 1,
  "apoderadoId": 1,
  "parentesco": "Padre",
  "principal": true,
  "observaciones": "Apoderado principal"
}
```

Response:

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

### Listar vínculos

```http
GET /familias/alumno-apoderado
```

Response:

```json
{
  "content": [
    {
      "id": 1,
      "alumnoId": 1,
      "alumnoCodigo": "AL-12E0A071",
      "alumnoNombre": "JUAN PEREZ",
      "apoderadoId": 1,
      "apoderadoCodigo": "AP-365A4978",
      "apoderadoNombre": "VICTOR JAVIER",
      "parentesco": "Padre",
      "principal": true,
      "observaciones": "Apoderado principal"
    }
  ],
  "page": 0,
  "size": 5,
  "totalElements": 1,
  "totalPages": 1
}
```

---

### Obtener vínculo por id

```http
GET /familias/alumno-apoderado/{id}
```

Response:

```json
{
  "id": 1,
  "alumnoId": 1,
  "alumnoCodigo": "AL-12E0A071",
  "alumnoNombre": "JUAN PEREZ",
  "apoderadoId": 1,
  "apoderadoCodigo": "AP-365A4978",
  "apoderadoNombre": "VICTOR JAVIER",
  "parentesco": "Padre",
  "principal": true,
  "observaciones": "Apoderado principal"
}
```

---

### Actualizar vínculo

```http
PUT /familias/alumno-apoderado/{id}
```

Body:

```json
{
  "parentesco": "Madre",
  "principal": false,
  "observaciones": "Contacto secundario"
}
```

Response:

```json
{
  "id": 1,
  "alumnoId": 1,
  "apoderadoId": 1,
  "parentesco": "Madre",
  "principal": false,
  "observaciones": "Contacto secundario"
}
```

---

### Eliminar vínculo

```http
DELETE /familias/alumno-apoderado/{id}
```

Debe eliminar solo la relación.

No debe eliminar:

- Alumno.
- Apoderado.

---

### Listar apoderados por alumno

```http
GET /alumnos/{alumnoId}/apoderados
```

Response:

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

### Listar alumnos por apoderado

Crear este endpoint si encaja con el patrón del proyecto:

```http
GET /apoderados/{apoderadoId}/alumnos
```

Response:

```json
[
  {
    "id": 1,
    "codigo": "AL-12E0A071",
    "nombre": "JUAN PEREZ",
    "curso": "4A",
    "parentesco": "Padre",
    "principal": true
  }
]
```

---

## Backend - Arquitectura esperada

Seguir la arquitectura actual del proyecto:

```txt
domain
application
ports
adapters
infrastructure
persistence
```

Crear o completar:

```txt
AlumnoApoderado
AlumnoApoderadoController
AlumnoApoderadoRequest
AlumnoApoderadoUpdateRequest
AlumnoApoderadoResponse
AlumnoApoderadoDetalleResponse
CrearAlumnoApoderadoUseCase
ListarAlumnoApoderadoUseCase
ObtenerAlumnoApoderadoUseCase
ActualizarAlumnoApoderadoUseCase
EliminarAlumnoApoderadoUseCase
ListarApoderadosPorAlumnoUseCase
ListarAlumnosPorApoderadoUseCase
AlumnoApoderadoRepositoryPort
AlumnoApoderadoJpaRepository
AlumnoApoderadoEntity
AlumnoApoderadoMapper
AlumnoApoderadoDomainConfig
```

Usar nombres reales según la convención existente.

---

# Frontend

## Objetivo frontend

Crear la ruta o sección:

```txt
Familia
```

Desde esta ruta se debe poder hacer el cruce entre alumnos y apoderados.

La pantalla debe permitir:

- Ver vínculos existentes.
- Crear un vínculo alumno-apoderado.
- Editar un vínculo.
- Eliminar un vínculo.
- Buscar o seleccionar alumno.
- Buscar o seleccionar apoderado.
- Ver el código del alumno.
- Ver el código del apoderado.

---

## Ruta frontend requerida

Crear o completar una ruta similar a:

```txt
/familia
```

o según la convención del proyecto:

```txt
/familias
```

Usar el nombre que mejor encaje con las rutas existentes.

---

## Vista Familia

La página debe mostrar una tabla de vínculos.

Columnas sugeridas:

| Alumno código | Alumno nombre | Curso | Apoderado código | Apoderado nombre | Parentesco | Principal | Acciones |
|---|---|---|---|---|---|---|---|

Ejemplo:

```txt
Familia

AL-12E0A071 | JUAN PEREZ | 4A | AP-365A4978 | VICTOR JAVIER | Padre | Sí | Editar / Eliminar
```

---

## Crear vínculo desde frontend

Agregar botón:

```txt
Crear vínculo
```

Formulario o modal con:

- Alumno.
- Apoderado.
- Parentesco.
- Principal.
- Observaciones.

El alumno y el apoderado deben poder buscarse por:

- Código.
- Nombre.

Guardar usando el caso de uso correspondiente.

No llamar directamente la API desde componentes.

---

## Editar vínculo desde frontend

Permitir editar:

- Parentesco.
- Principal.
- Observaciones.

No editar aquí los datos propios del alumno ni del apoderado.

---

## Eliminar vínculo desde frontend

Permitir eliminar el vínculo.

Debe quedar claro que se elimina la relación, no el alumno ni el apoderado.

---

## Integración en detalle de alumno

En el detalle de alumno, mostrar la sección:

```txt
Apoderados vinculados
```

Columnas sugeridas:

| Código | Nombre | Email | Teléfono | Parentesco | Principal |
|---|---|---|---|---|---|

Esta sección debe consumir:

```http
GET /alumnos/{alumnoId}/apoderados
```

---

## Frontend - Arquitectura esperada

Seguir la estructura actual del frontend:

```txt
domain
application/use-cases
infrastructure
presentation/hooks
presentation/pages
presentation/components
```

Crear o completar según el patrón existente:

```txt
familia/domain
familia/application
familia/infrastructure
presentation/hooks/familia
presentation/pages/familia
presentation/components/familia
```

Nombres sugeridos:

```txt
AlumnoApoderado
FamiliaPage
FamiliaTable
FamiliaForm
FamiliaModal
useCreateAlumnoApoderado
useEditAlumnoApoderado
useDeleteAlumnoApoderado
useListAlumnoApoderado
createAlumnoApoderadoUseCase
editAlumnoApoderadoUseCase
deleteAlumnoApoderadoUseCase
listAlumnoApoderadoUseCase
AlumnoApoderadoRepository
AlumnoApoderadoApiRepository
```

Usar nombres reales según el estilo del proyecto.

---

# Tests frontend hooks Alumno

## Objetivo

Completar los tests de:

- `useCreateAlumno`
- `useDeleteAlumno`
- `useEditAlumno`

Ubicación:

```txt
frontend/src/presentation/hooks/alumno/tests
```

---

## Reglas obligatorias

- Usar como referencia los tests de hooks de `Apoderado`.
- Mantener exactamente el mismo estilo.
- Aplicar DRY.
- No modificar arquitectura.
- No instalar librerías nuevas.
- No dejar `console.log`.
- No dejar imports sin usar.
- No usar `.skip`.
- Usar mocks siguiendo el patrón existente.

---

## Convención obligatoria de nombres

Usar nombres tipo:

```ts
it("[useCreateAlumno #01] Debe ...", () => {})
it("[useDeleteAlumno #01] Debe ...", () => {})
it("[useEditAlumno #01] Debe ...", () => {})
```

---

## Casos mínimos para `useCreateAlumno`

Cubrir:

- Estado inicial.
- Creación exitosa.
- Manejo de error.
- Validación de `loading`.
- Validación de `error`.
- Llamada correcta al mock.
- Limpieza o reset de error si el hook lo maneja.

Ejemplo de nombres:

```ts
it("[useCreateAlumno #01] Debe inicializar con estado por defecto", () => {})
it("[useCreateAlumno #02] Debe crear un alumno correctamente", () => {})
it("[useCreateAlumno #03] Debe manejar error al crear alumno", () => {})
it("[useCreateAlumno #04] Debe activar y desactivar loading durante la creación", () => {})
it("[useCreateAlumno #05] Debe llamar al caso de uso con los datos correctos", () => {})
```

---

## Casos mínimos para `useDeleteAlumno`

Cubrir:

- Estado inicial.
- Eliminación exitosa.
- Manejo de error.
- Validación de `loading`.
- Validación de `error`.
- Llamada correcta al mock.
- Confirmar que se usa el `id` correcto.

Ejemplo de nombres:

```ts
it("[useDeleteAlumno #01] Debe inicializar con estado por defecto", () => {})
it("[useDeleteAlumno #02] Debe eliminar un alumno correctamente", () => {})
it("[useDeleteAlumno #03] Debe manejar error al eliminar alumno", () => {})
it("[useDeleteAlumno #04] Debe activar y desactivar loading durante la eliminación", () => {})
it("[useDeleteAlumno #05] Debe llamar al caso de uso con el id correcto", () => {})
```

---

## Casos mínimos para `useEditAlumno`

Cubrir:

- Estado inicial.
- Edición exitosa.
- Manejo de error.
- Validación de `loading`.
- Validación de `error`.
- Llamada correcta al mock.
- Confirmar que se usa el `id` y payload correcto.

Ejemplo de nombres:

```ts
it("[useEditAlumno #01] Debe inicializar con estado por defecto", () => {})
it("[useEditAlumno #02] Debe editar un alumno correctamente", () => {})
it("[useEditAlumno #03] Debe manejar error al editar alumno", () => {})
it("[useEditAlumno #04] Debe activar y desactivar loading durante la edición", () => {})
it("[useEditAlumno #05] Debe llamar al caso de uso con id y datos correctos", () => {})
```

---

# Tests frontend hooks Familia / AlumnoApoderado

Si se crean hooks nuevos para la ruta Familia, también crear tests para:

- `useCreateAlumnoApoderado`
- `useEditAlumnoApoderado`
- `useDeleteAlumnoApoderado`
- `useListAlumnoApoderado`

Ubicación sugerida:

```txt
frontend/src/presentation/hooks/familia/tests
```

o según convención existente.

Casos mínimos:

- Estado inicial.
- Flujo exitoso.
- Manejo de error.
- Validación de loading/error.
- Llamada correcta al mock.
- Payload correcto.

Convención sugerida:

```ts
it("[useCreateAlumnoApoderado #01] Debe ...", () => {})
it("[useEditAlumnoApoderado #01] Debe ...", () => {})
it("[useDeleteAlumnoApoderado #01] Debe ...", () => {})
it("[useListAlumnoApoderado #01] Debe ...", () => {})
```

---

# API Tests

Crear o completar pruebas API para el CRUD del vínculo.

Ubicación según estructura existente de `api-tests`.

## Casos mínimos

### Crear vínculo

- Crear vínculo correctamente.
- Error si el alumno no existe.
- Error si el apoderado no existe.
- Error si el vínculo ya existe.
- Error si falta parentesco.

### Listar vínculos

- Listar vínculos existentes.
- Listar con paginación si aplica.
- Retornar lista vacía cuando no existan vínculos.

### Obtener vínculo

- Obtener vínculo por id.
- Error si el vínculo no existe.

### Actualizar vínculo

- Actualizar parentesco.
- Actualizar principal.
- Actualizar observaciones.
- Error si el vínculo no existe.

### Eliminar vínculo

- Eliminar vínculo correctamente.
- Confirmar que el alumno sigue existiendo.
- Confirmar que el apoderado sigue existiendo.
- Error si el vínculo no existe.

### Listar apoderados por alumno

- Retornar apoderados asociados al alumno.
- Retornar lista vacía si el alumno no tiene apoderados.
- Error si el alumno no existe, si ese es el patrón del proyecto.

### Listar alumnos por apoderado

- Retornar alumnos asociados al apoderado.
- Retornar lista vacía si el apoderado no tiene alumnos.
- Error si el apoderado no existe, si ese es el patrón del proyecto.

---

# Comandos

Ejecutar pruebas relevantes.

Frontend:

```bash
cd frontend
pnpm test
```

Si existe cobertura:

```bash
cd frontend
pnpm test -- --coverage
```

Backend:

```bash
cd backend
./gradlew test
```

API tests:

```bash
cd api-tests
pnpm test
```

Adaptar comandos si el proyecto usa otra convención.

Corregir errores encontrados antes de entregar.

---

# Restricciones

- No modificar arquitectura.
- No instalar librerías nuevas.
- No cambiar configuración global sin necesidad.
- No usar `codigo` como llave de relación.
- No eliminar alumno al eliminar vínculo.
- No eliminar apoderado al eliminar vínculo.
- No dejar `console.log`.
- No dejar imports sin usar.
- No usar `.skip`.
- No crear datos hardcodeados innecesarios.
- No duplicar lógica si existe patrón reutilizable.
- No modificar código no relacionado con esta tarea.

---

# Criterios de aceptación

La tarea se considera completa cuando:

- Existe CRUD completo para el vínculo alumno-apoderado.
- Existe ruta/página frontend `Familia` o equivalente.
- Desde `Familia` se pueden crear, listar, editar y eliminar vínculos.
- En detalle de alumno se muestran apoderados vinculados.
- Se usan `id` para relaciones internas.
- Se muestran `codigo` de alumno y apoderado en frontend.
- Los tests de `useCreateAlumno` están completos.
- Los tests de `useDeleteAlumno` están completos.
- Los tests de `useEditAlumno` están completos.
- Existen tests para hooks nuevos de Familia si se crean.
- Existen api-tests del CRUD del vínculo.
- Se ejecutaron pruebas relevantes o se documentó por qué no se pudieron ejecutar.

---

# Orden sugerido de implementación

1. Revisar `AGENTS.md`.
2. Revisar módulo `Alumno`.
3. Revisar módulo `Apoderado`.
4. Revisar tests de hooks de `Apoderado`.
5. Completar tests de hooks de `Alumno`.
6. Crear o completar backend del vínculo alumno-apoderado.
7. Crear CRUD backend completo.
8. Crear api-tests del CRUD.
9. Crear ruta frontend `Familia`.
10. Crear repositorio frontend para vínculo.
11. Crear casos de uso frontend.
12. Crear hooks frontend.
13. Crear tests de hooks Familia.
14. Crear componentes/página Familia.
15. Integrar apoderados vinculados en detalle de alumno.
16. Ejecutar tests.
17. Corregir errores.
18. Entregar resumen final.

---

# Formato de respuesta esperado del agente

Al finalizar, responder:

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

# Resumen

Completar el flujo completo para vincular alumnos y apoderados.

Debe existir CRUD completo en backend, ruta `Familia` en frontend para hacer el cruce, integración visual en alumno y tests completos de hooks de alumno.

La relación se maneja por `id`; el `codigo` solo se usa para visualización o búsqueda.
