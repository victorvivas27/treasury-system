# 01. Visión general

## Estructura

- `backend/`: Java 17, Spring Boot 4.0.6, Gradle, Security, JPA, Flyway y PostgreSQL/H2.
- `frontend/`: React 19, TypeScript 5.9, Vite 8, Axios, Vitest y Oxlint.
- `api-tests/`: OpenCollection YAML para Bruno.
- `.github/workflows/`: CI, Bruno, commit lint y despliegue.
- `docker-compose.yml`: backend y PostgreSQL 16.

## Módulos existentes

- Alumno: CRUD por código `AL-XXXXXXXX`.
- Apoderado: CRUD/acceso por código `AP-XXXXXXXX`.
- Familia: alumno, apoderados, parentesco y principal; vínculos por IDs.
- Usuario/autenticación: ADMIN/USER, JWT, verificación y recuperación.
- Tesorería: cuota anual, pagos, CEPA/Solidaria, ingresos, egresos, auditoría, resumen y reportes.
- Eventos escolares: gastos, recaudación, liquidación y transferencias.
- Stands: stands por evento, productos, apertura/cierre y ventas.
- Frontend: dashboard, configuración, perfil y navegación protegida.

```text
Alumno + Apoderado -> Familia -> Tesorería/Eventos -> Stands
Usuario/autenticación -> acceso protegido
Backend HTTP -> Axios -> casos de uso/hooks -> UI
```

Antes de editar: revisar `git status --short`, controlador, DTO, caso de uso, persistencia, consumidor frontend y pruebas. Confirmar identificadores, estados HTTP y errores. Modificar solo el alcance; aplicar `08-quality-operations.md` y revisar el diff final.
