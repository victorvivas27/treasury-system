# 08. Quality gates, Docker y CI

## Backend

PMD 6.55.0, JaCoCo 0.8.12 y cobertura mínima 70 % sobre clases incluidas. `pmdTest` está deshabilitado; ruleset en `backend/config/pmd/ruleset.xml`.

```bash
cd backend
./gradlew test
./gradlew pmdMain
./gradlew jacocoTestReport
./gradlew jacocoTestCoverageVerification
./gradlew bootJar
./gradlew check
```

`check` incluye PMD main y JaCoCo. No suprimir reglas, bajar cobertura o ampliar exclusiones solo para pasar.

## Frontend

```bash
cd frontend
pnpm test:run
pnpm test:coverage
pnpm lint
pnpm build
```

Type checking está en `build`; lint es Oxlint; tests Vitest van aparte.

## Docker, CI y producción

Compose levanta backend/PostgreSQL 16 y requiere `.env` local. Workflows: `backend-ci.yml`, `frontend-ci.yml`, `bruno-tests.yml`, `commit-lint.yml`, `deploy-backend.yml`.

Producción usa PostgreSQL/Neon TLS, Flyway, Hibernate validate e Hikari. Despliegue usa Workload Identity Federation, Artifact Registry y Cloud Run. No usar claves JSON, mostrar secretos, desplegar, publicar o hacer push sin autorización. Secretos runtime deben venir de Secret Manager con permisos mínimos.

```bash
docker compose config
bash -n scripts/test-full-flow.sh
git diff --check
git status --short
```

Revisar solo el diff autorizado. Avisos LF/CRLF no son error si `git diff --check` devuelve 0. Para migraciones validar PostgreSQL vacía y segundo arranque; para infraestructura validar YAML/configuración sin desplegar.
