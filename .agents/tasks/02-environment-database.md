# 02. Entorno y base de datos

## Configuración

Requiere Java 17, pnpm 11.5.0 y PostgreSQL 16; Docker es opcional. `APP_PROFILE` selecciona `dev`, `test` o `prod`. Variables: `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `JWT_SECRET`, `ADMIN_BOOTSTRAP_KEY`, `APP_CORS_ALLOWED_ORIGINS`, `TREASURY_MANAGED_COURSE`, `EMAIL_PROVIDER`, `GMAIL_USER`, `GMAIL_APP_PASSWORD`, `EMAIL_FROM` y `FRONTEND_URL`. Frontend usa `VITE_API_URL`.

Usar `.env.example` y `frontend/.env.example`; nunca versionar valores reales.

## Perfiles y esquema

- `dev`: PostgreSQL, `ddl-auto: update`.
- `test`: H2 en memoria, puerto 5055, `create-drop`.
- `prod`: PostgreSQL TLS, Flyway, Hikari y `JPA_DDL_AUTO=validate`.

Migración actual: `backend/src/main/resources/db/migration/V1__create_initial_schema.sql`. También existen `UserTokenSchemaMigration` y `TreasuryDataIntegrityMigration`.

No editar migraciones aplicadas: crear `V2__...sql` o posterior. No usar `update/create/create-drop` en producción. Conservar PK, FK, índices, uniques y nombres JPA; evitar duplicar migraciones programáticas. No incluir secretos ni datos personales.

```bash
cd backend
./gradlew bootRun

cd ..
docker compose config
docker compose up --build
```

Para esquema: tests, `check`, PostgreSQL vacía, segundo arranque y Hibernate `validate`. No tocar Docker o perfiles fuera del alcance.
