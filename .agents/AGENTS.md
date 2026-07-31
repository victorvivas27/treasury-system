# Guía para agentes de Treasury System

Treasury System integra backend Spring Boot, frontend React/Vite, PostgreSQL, pruebas y colecciones Bruno. Administra Alumno, Apoderado, Familia, Usuario/autenticación, Tesorería, Eventos escolares y Stands.

## Reglas

- Verificar código y configuración antes de confiar en documentación.
- Mantener el alcance y preservar cambios ajenos.
- No versionar secretos ni archivos `.env`.
- No cambiar contratos, esquema, reglas financieras o autorización sin alinear consumidores y pruebas.
- Alumno y Apoderado usan `codigo` en rutas públicas; Familia usa IDs internos y `familiaId`.
- No añadir dependencias, desplegar, publicar ni hacer push sin autorización.

## Orden de lectura

1. [Visión general](tasks/01-project-overview.md)
2. [Entorno y base de datos](tasks/02-environment-database.md)
3. [Backend y módulos](tasks/03-backend-modules.md)
4. [Autenticación y seguridad](tasks/04-authentication-security.md)
5. [Frontend](tasks/05-frontend-architecture.md)
6. [Pruebas](tasks/06-testing.md)
7. [Bruno](tasks/07-bruno-api-tests.md)
8. [Quality gates, Docker y CI](tasks/08-quality-operations.md)

Leer siempre `01`, después las áreas afectadas y finalizar con `08`.

## Validación principal

```bash
cd backend
./gradlew test
./gradlew pmdMain
./gradlew check

cd ../frontend
pnpm test:run
pnpm lint
pnpm build

cd ..
bash -n scripts/test-full-flow.sh
git diff --check
```

No ampliar `scripts/test-full-flow.sh` sin una tarea específica: actualmente ejecuta solo Apoderado.
