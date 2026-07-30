# Task: Crear tests hooks Alumno

Completar los tests de:

- `useCreateAlumno`
- `useDeleteAlumno`
- `useEditAlumno`

Ubicación:

```txt
frontend/src/presentation/hooks/alumno/tests
```

---

## Reglas

- Usar como referencia los tests de hooks de `Apoderado`.
- Mantener exactamente el mismo estilo.
- Aplicar DRY.
- No modificar arquitectura.
- No instalar librerías nuevas.
- No dejar `console.log`.
- No dejar imports sin usar.
- No usar `.skip`.

---

## Convención obligatoria

Usar nombres tipo:

```ts
it("[useCreateAlumno #01] Debe ...", () => {})
it("[useDeleteAlumno #01] Debe ...", () => {})
it("[useEditAlumno #01] Debe ...", () => {})
```

---

## Casos mínimos

### useCreateAlumno

- estado inicial
- creación exitosa
- manejo de error
- validación de loading/error
- llamada correcta al mock

### useDeleteAlumno

- estado inicial
- eliminación exitosa
- manejo de error
- validación de loading/error
- llamada correcta al mock

### useEditAlumno

- estado inicial
- edición exitosa
- manejo de error
- validación de loading/error
- llamada correcta al mock

---

## Comando

```bash
cd frontend
pnpm test
```

Corregir errores encontrados.
