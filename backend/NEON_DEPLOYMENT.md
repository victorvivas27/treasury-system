# Neon, Secret Manager y Cloud Run

## Crear y preparar Neon

1. Crear un proyecto y una base PostgreSQL en Neon.
2. Abrir **Connection Details** y seleccionar una conexión directa o pooled
   según el límite del plan.
3. Registrar por separado el host, puerto, base, usuario y contraseña. No
   copiar la URL completa a Git ni a GitHub Variables.
4. Configurar `DB_HOST`, `DB_PORT`, `DB_NAME` y `DB_SSL_MODE=require` como
   variables normales de Cloud Run.
5. Guardar usuario y contraseña en Secret Manager.

El perfil productivo construye:

```text
jdbc:postgresql://${DB_HOST}:${DB_PORT:5432}/${DB_NAME}?sslmode=${DB_SSL_MODE:require}
```

Flyway aplica `db/migration/V1__create_initial_schema.sql` antes de que
Hibernate valide el esquema con `JPA_DDL_AUTO=validate`. En una base vacía, el
primer arranque crea las tablas y `flyway_schema_history`; los siguientes
arranques verifican el checksum y no repiten la migración.

Para comprobarlo, consultar en Neon:

```sql
SELECT installed_rank, version, description, success
FROM flyway_schema_history
ORDER BY installed_rank;
```

## Secret Manager

Crear secretos sin escribir sus valores en comandos guardados, historiales o
archivos del repositorio:

| Secreto                            | Variable Cloud Run    |
|------------------------------------|-----------------------|
| `treasury-dev-db-user`             | `DB_USER`             |
| `treasury-dev-db-password`         | `DB_PASSWORD`         |
| `treasury-dev-jwt-secret`          | `JWT_SECRET`          |
| `treasury-dev-admin-bootstrap-key` | `ADMIN_BOOTSTRAP_KEY` |
| `treasury-dev-gmail-user`          | `GMAIL_USER`          |
| `treasury-dev-gmail-app-password`  | `GMAIL_APP_PASSWORD`  |

Los nombres usan caracteres permitidos por Secret Manager. Crear cada secreto
desde la consola y añadir su valor como una versión. La cuenta runtime debe
recibir `roles/secretmanager.secretAccessor` sobre cada secreto individual, no
a nivel de proyecto.

Cuenta runtime recomendada:

```text
treasury-system-runtime@uber-victor-api.iam.gserviceaccount.com
```

Si no existe, crear `treasury-system-runtime`, seleccionarla como cuenta del
servicio Cloud Run y otorgar acceso por secreto. No asignar
`roles/cloudsql.client`.

## Configuración de Cloud Run

Variables normales mínimas:

```text
APP_PROFILE=prod
DB_HOST=<NEON_HOST>
DB_PORT=5432
DB_NAME=<NEON_DATABASE>
DB_SSL_MODE=require
JPA_DDL_AUTO=validate
APP_CORS_ALLOWED_ORIGINS=<FRONTEND_ORIGIN>
FRONTEND_URL=<FRONTEND_URL>
```

Referencias de secretos:

```text
DB_USER=treasury-dev-db-user:latest
DB_PASSWORD=treasury-dev-db-password:latest
JWT_SECRET=treasury-dev-jwt-secret:latest
ADMIN_BOOTSTRAP_KEY=treasury-dev-admin-bootstrap-key:latest
GMAIL_USER=treasury-dev-gmail-user:latest
GMAIL_APP_PASSWORD=treasury-dev-gmail-app-password:latest
```

No configurar `PORT`: Cloud Run lo inyecta. Antes de desplegar, verificar que
la cuenta runtime puede acceder a cada versión referenciada.

## Pool de conexiones

Producción usa por defecto máximo 5 conexiones por instancia y cero conexiones
mínimas inactivas. El máximo potencial es:

```text
máximo de instancias Cloud Run × DB_POOL_MAX_SIZE
```

Ajustar el máximo de instancias o `DB_POOL_MAX_SIZE` para no superar el límite
de Neon. Los timeouts pueden configurarse con `DB_POOL_CONNECTION_TIMEOUT_MS`,
`DB_POOL_IDLE_TIMEOUT_MS` y `DB_POOL_MAX_LIFETIME_MS`.

## Operación y rotación

- Revisar fallos de Flyway, validación Hibernate y conexión TLS en los logs de
  la revisión de Cloud Run.
- Para rotar la contraseña Neon, crear primero la credencial nueva, añadir una
  nueva versión a `treasury-dev-db-password`, desplegar/reiniciar la revisión y
  revocar después la contraseña anterior.
- Rotar JWT y claves de bootstrap de forma coordinada; cambiar `JWT_SECRET`
  invalida tokens activos.
- Nunca registrar URLs JDBC que incluyan usuario o contraseña.
