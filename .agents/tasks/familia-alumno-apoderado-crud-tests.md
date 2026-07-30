# Task: Completar módulo Familia (Alumno + Apoderados)

## Contexto

Actualmente existen los módulos:

* Alumno
* Apoderado

El proyecto ya evolucionó desde una relación simple Alumno ↔ Apoderado hacia un concepto funcional llamado **Familia**.

La API expone una estructura similar a:

```json
{
  "familiaId": 5,
  "codigoFamilia": "FAM-2D051F43",
  "observacionesGenerales": "El apoderado con ID 10 es el contacto de emergencia principal.",
  "alumno": {
    "id": 1,
    "codigo": "AL-E5DF6B6D",
    "nombre": "ALUMNO FAMILIA"
  },
  "apoderados": [
    {
      "id": 4,
      "codigo": "AP-103B70F3",
      "nombre": "MARIA FAMILIA",
      "email": "maria.familia1780338287@gmail.com",
      "telefono": "+987654321",
      "relacion": {
        "parentesco": "Tutor Legal",
        "esPrincipal": true
      }
    },
    {
      "id": 10,
      "codigo": "AP-999B70F9",
      "nombre": "JUAN ESPINOZA",
      "email": "juan.emergencia@gmail.com",
      "telefono": "+955555555",
      "relacion": {
        "parentesco": "Contacto Emergencia",
        "esPrincipal": false
      }
    }
  ]
}
```



---

# Objetivo General

Implementar el módulo Familia en backend, frontend y tests.

Una Familia está compuesta por:

```txt
Familia
 ├── Alumno (1)
 └── Apoderados (1..N)
```

La pantalla Familia será la encargada de administrar:

* Alumno asociado.
* Apoderados asociados.
* Parentesco.
* Apoderado principal.
* Observaciones generales.

---

# Reglas de Negocio

## Relaciones

* Una familia pertenece a un único alumno.
* Una familia debe tener al menos un apoderado.
* Un apoderado puede pertenecer a más de una familia si el negocio lo permite.
* No se deben repetir apoderados dentro de una misma familia.

---

## Identificadores

Las relaciones internas deben manejarse usando:

```json
{
  "alumnoId": 1,
  "apoderadoId": 4
}
```

Nunca usar:

```txt
codigoAlumno
codigoApoderado
codigoFamilia
```

como foreign keys.

Los códigos son únicamente para:

* Visualización.
* Búsquedas.
* Identificación funcional.

---

## Apoderado principal

Debe existir una validación para garantizar:

```txt
Máximo un apoderado principal por familia.
```

---

# Backend

## Objetivo

Implementar CRUD completo de Familia.

---

## Modelo esperado

### FamiliaResponse

```json
{
  "familiaId": 5,
  "codigoFamilia": "FAM-2D051F43",
  "observacionesGenerales": "Observaciones generales",
  "alumno": {
    "id": 1,
    "codigo": "AL-E5DF6B6D",
    "nombre": "ALUMNO FAMILIA"
  },
  "apoderados": [
    {
      "id": 4,
      "codigo": "AP-103B70F3",
      "nombre": "MARIA FAMILIA",
      "email": "maria@gmail.com",
      "telefono": "+987654321",
      "relacion": {
        "parentesco": "Tutor Legal",
        "esPrincipal": true
      }
    }
  ]
}
```

---

# Endpoints

## Crear Familia

```http
POST /familias
```

Request:

```json
{
  "alumnoId": 1,
  "observacionesGenerales": "Observaciones generales",
  "apoderados": [
    {
      "apoderadoId": 4,
      "parentesco": "Tutor Legal",
      "esPrincipal": true
    },
    {
      "apoderadoId": 10,
      "parentesco": "Contacto Emergencia",
      "esPrincipal": false
    }
  ]
}
```

---

## Listar Familias

```http
GET /familias
```

Paginado.

---

## Obtener Familia

```http
GET /familias/{familiaId}
```

---

## Actualizar Familia

```http
PUT /familias/{familiaId}
```

Debe permitir:

* Actualizar observaciones.
* Agregar apoderados.
* Eliminar apoderados.
* Modificar parentesco.
* Cambiar principal.

---

## Eliminar Familia

```http
DELETE /familias/{familiaId}
```

Debe eliminar únicamente:

* Familia.
* Relaciones Familia-Apoderado.

No debe eliminar:

* Alumno.
* Apoderado.

---

# Validaciones Backend

Validar:

* Alumno existente.
* Apoderados existentes.
* Alumno obligatorio.
* Al menos un apoderado.
* No repetir apoderados.
* Parentesco obligatorio.
* Máximo un principal.
* Familia existente para update/delete.
* Errores controlados siguiendo el patrón actual del proyecto.

---

# Arquitectura Backend

Seguir estructura existente:

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
Familia
FamiliaController

FamiliaRequest
FamiliaUpdateRequest

FamiliaResponse
FamiliaDetailResponse

CrearFamiliaUseCase
ActualizarFamiliaUseCase
EliminarFamiliaUseCase
ObtenerFamiliaUseCase
ListarFamiliasUseCase

FamiliaRepositoryPort
FamiliaJpaRepository

FamiliaEntity
FamiliaApoderadoEntity

FamiliaMapper

FamiliaDomainConfig
```

Usar nombres reales según convención existente.

---

# Frontend

## Ruta requerida

Crear:

```txt
/ familia
```

o

```txt
/ familias
```

según la convención del proyecto.

---

# Vista Familia

Tabla principal:

| Código Familia | Alumno Código | Alumno | Cantidad Apoderados | Principal | Acciones |
| -------------- | ------------- | ------ | ------------------- | --------- | -------- |

Ejemplo:

```txt
FAM-2D051F43
AL-E5DF6B6D
ALUMNO FAMILIA
2 apoderados
MARIA FAMILIA
```

---

# Formulario Crear Familia

Campos:

* Alumno.
* Observaciones generales.
* Lista de apoderados.

Por cada apoderado:

* Apoderado.
* Parentesco.
* Principal.

Debe permitir:

```txt
Agregar apoderado
Quitar apoderado
```

---

# Detalle Familia

Mostrar:

```txt
Familia
 ├── Alumno
 └── Apoderados
```

Ejemplo:

```txt
Familia: FAM-2D051F43

Alumno:
- AL-E5DF6B6D
- ALUMNO FAMILIA

Apoderados:

MARIA FAMILIA
- Tutor Legal
- Principal

JUAN ESPINOZA
- Contacto Emergencia
```

---

# Integración Alumno

Agregar sección:

```txt
Familia
```

en el detalle del alumno.

Mostrar:

* Código familia.
* Apoderados asociados.
* Principal.
* Parentescos.

---

# Arquitectura Frontend

Seguir patrón existente:

```txt
domain
application/use-cases
infrastructure
presentation/hooks
presentation/pages
presentation/components
```

Crear:

```txt
familia/domain
familia/application
familia/infrastructure

presentation/hooks/familia

presentation/pages/familia

presentation/components/familia
```

---

# Tests Frontend

Completar tests existentes:

```txt
useCreateAlumno
useEditAlumno
useDeleteAlumno
```

Tomando como referencia:

```txt
Apoderado
```

---

# Hooks Familia

Crear tests para:

```txt
useCreateFamilia
useEditFamilia
useDeleteFamilia
useListFamilias
useGetFamilia
```

Casos mínimos:

* Estado inicial.
* Flujo exitoso.
* Manejo de error.
* Loading.
* Error.
* Payload correcto.
* Mock correcto.

---

# API Tests

Crear o completar pruebas para:

## Crear Familia

* Crear correctamente.
* Error sin alumno.
* Error sin apoderados.
* Error por apoderado duplicado.
* Error por múltiples principales.

## Listar Familias

* Lista correcta.
* Lista vacía.
* Paginación.

## Obtener Familia

* Obtener por id.
* Error si no existe.

## Actualizar Familia

* Cambiar observaciones.
* Agregar apoderado.
* Eliminar apoderado.
* Cambiar principal.
* Error si no existe.

## Eliminar Familia

* Eliminar correctamente.
* Confirmar que alumno existe.
* Confirmar que apoderados existen.

---

# Comandos

Frontend:

```bash
cd frontend
pnpm test
```

Backend:

```bash
cd backend
./gradlew test
```

API:

```bash
cd api-tests
pnpm test
```

Corregir errores encontrados antes de entregar.

---

# Restricciones

* No modificar arquitectura.
* No instalar librerías nuevas.
* No usar códigos como FK.
* No eliminar alumnos.
* No eliminar apoderados.
* No dejar console.log.
* No dejar imports sin usar.
* No usar .skip.
* Mantener patrones existentes.

---

# Criterios de aceptación

La tarea se considera completa cuando:

* Existe CRUD completo de Familia.
* Existe página Familia.
* Se puede crear, listar, editar y eliminar Familias.
* Se pueden administrar múltiples apoderados.
* Existe un único principal.
* Los códigos son visibles pero no usados como FK.
* Los tests de Alumno están completos.
* Existen tests para Familia.
* Existen API tests.
* Se ejecutaron pruebas relevantes o se documentó por qué no fue posible ejecutarlas.

---

# Formato de respuesta esperado

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
