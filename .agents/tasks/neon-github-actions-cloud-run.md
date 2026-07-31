

## Objetivo

Completar la configuración necesaria para desplegar el backend en Cloud Run usando:

- GitHub Actions
- Workload Identity Federation
- Artifact Registry
- Cloud Run
- Neon PostgreSQL como base de datos de desarrollo

No utilizar Cloud SQL.

## Estado actual

Ya existen:

- `.github/workflows/deploy-backend.yml`
- `backend/.dockerignore`
- `backend/Dockerfile`
- Workload Identity Federation
- Artifact Registry
- Cuenta de servicio de despliegue

Los tests y el build Gradle fueron exitosos.

## 1. Revisar el workflow

Revisar:

```text
.github/workflows/deploy-backend.yml
```

Confirmar que:

- usa Workload Identity Federation;
- no usa claves JSON;
- tiene `contents: read`;
- tiene `id-token: write`;
- construye desde `backend`;
- publica la imagen con `${{ github.sha }}`;
- despliega en Cloud Run;
- configura `APP_PROFILE=prod`;
- utiliza `RUNTIME_SERVICE_ACCOUNT`;
- no configura `PORT`;
- no contiene credenciales de Neon;
- no contiene secretos de aplicación;
- no usa `--allow-unauthenticated`.

No modificarlo salvo que exista un error real.

## 2. Configuración de Neon

La base de datos de desarrollo estará en Neon PostgreSQL.

No crear:

- Cloud SQL;
- VPC Connector;
- IP privada;
- Cloud SQL Proxy;
- rol `roles/cloudsql.client`.

Revisar cómo construye el backend la URL JDBC.

Determinar si utiliza variables separadas:

```text
DB_HOST
DB_PORT
DB_NAME
DB_USER
DB_PASSWORD
```

o una URL completa, por ejemplo:

```text
DATABASE_URL
SPRING_DATASOURCE_URL
```

No inventar una nueva variable si la configuración actual ya define una estrategia.

## 3. Compatibilidad SSL con Neon

Neon requiere conexión PostgreSQL mediante TLS.

Revisar si la URL JDBC productiva incluye parámetros SSL adecuados.

El formato esperado normalmente será similar a:

```text
jdbc:postgresql://HOST:5432/DATABASE?sslmode=require
```

Pero se debe respetar la configuración real encontrada en el repositorio.

Si la aplicación construye la URL desde `DB_HOST`, `DB_PORT` y `DB_NAME`, ajustar la configuración productiva para admitir SSL sin escribir credenciales directamente.

Usar una variable como:

```text
DB_SSL_MODE=require
```

solo si encaja con la estructura existente.

No desactivar la validación SSL.

## 4. Pool de conexiones

Neon puede suspender conexiones inactivas y tiene límites de conexión según el plan.

Revisar la configuración de HikariCP.

Proponer valores prudentes para Cloud Run y desarrollo, por ejemplo:

```text
maximum-pool-size: 5
minimum-idle: 0
connection-timeout: 30000
idle-timeout: 300000
max-lifetime: 600000
```

No aplicar valores sin verificar primero si ya existe configuración de pool.

Evitar que cada instancia de Cloud Run abra demasiadas conexiones.

## 5. Variables de runtime para Cloud Run

Separar variables normales de secretos.

Variables normales potenciales:

```text
APP_PROFILE=prod
DB_HOST
DB_PORT
DB_NAME
DB_SSL_MODE
JPA_DDL_AUTO
APP_CORS_ALLOWED_ORIGINS
FRONTEND_URL
EMAIL_PROVIDER
EMAIL_FROM
TREASURY_MANAGED_COURSE
JWT_EXPIRATION_MS
```

Secretos:

```text
DB_USER
DB_PASSWORD
JWT_SECRET
ADMIN_BOOTSTRAP_KEY
GMAIL_USER
GMAIL_APP_PASSWORD
```

Confirmar los nombres exactos en el código antes de entregar la lista definitiva.

No incluir secretos directamente en el workflow.

## 6. Secret Manager

Preparar la lista de secretos que posteriormente deben crearse en Google Secret Manager.

Como mínimo, revisar:

```text
DB_USER
DB_PASSWORD
JWT_SECRET
ADMIN_BOOTSTRAP_KEY
GMAIL_USER
GMAIL_APP_PASSWORD
```

La cuenta runtime deberá recibir:

```text
roles/secretmanager.secretAccessor
```

solo sobre los secretos que utilice.

No crear secretos automáticamente.

No mostrar valores de archivos `.env`.

## 7. Neon y cadena de conexión

Entregar una tabla con:

- dato requerido;
- variable de aplicación correspondiente;
- dónde encontrarlo en Neon;
- si es variable normal o secreto.

Incluir:

- Host
- Puerto
- Base de datos
- Usuario
- Contraseña
- SSL mode
- URL JDBC resultante

No mostrar credenciales reales.

## 8. Migraciones y esquema

El perfil productivo utiliza `JPA_DDL_AUTO=validate` o equivalente.

Revisar nuevamente si existen migraciones completas.

Si no existen:

- señalar que una base Neon vacía no permitirá iniciar la aplicación;
- no cambiar automáticamente a `update`;
- no usar `create` ni `create-drop`;
- proponer como tarea separada la incorporación de Flyway o Liquibase;
- identificar cómo se creó actualmente el esquema local.

No ocultar este bloqueo.

## 9. GitHub variables

Confirmar las variables requeridas:

```text
GCP_PROJECT_ID
GCP_REGION
GAR_REPOSITORY
BACKEND_IMAGE_NAME
CLOUD_RUN_BACKEND_SERVICE
WIF_PROVIDER
DEPLOY_SERVICE_ACCOUNT
RUNTIME_SERVICE_ACCOUNT
```

Usar `vars` de GitHub para valores no sensibles.

No crear variables de GitHub con credenciales de Neon.

## 10. IAM

Cuenta de despliegue:

```text
roles/artifactregistry.writer
roles/run.admin
roles/iam.serviceAccountUser
roles/iam.workloadIdentityUser
```

Cuenta runtime:

```text
roles/secretmanager.secretAccessor
```

No asignar:

```text
roles/cloudsql.client
```

porque la base de datos estará en Neon.

## 11. Primer despliegue

No ejecutar el despliegue.

Entregar pasos para:

1. Configurar variables GitHub.
2. Crear secretos en Secret Manager.
3. Vincular secretos al servicio Cloud Run.
4. Configurar variables normales.
5. Preparar el esquema en Neon.
6. Hacer commit.
7. Hacer push a `main`.
8. Revisar GitHub Actions.
9. Revisar logs de Cloud Run.

Mensaje de commit sugerido:

```text
ci: configure backend deployment for Cloud Run
```

## 12. Validaciones

Verificar:

- sintaxis YAML del workflow;
- construcción correcta de la URL PostgreSQL;
- compatibilidad SSL con Neon;
- ausencia de credenciales en Git;
- ausencia de claves JSON;
- ausencia de configuración Cloud SQL;
- uso correcto de la cuenta runtime;
- límites razonables del pool de conexiones.

## Entrega final

Presentar:

1. Resultado de la revisión del workflow.
2. Configuración de conexión requerida por Neon.
3. Variables normales de Cloud Run.
4. Secretos de Secret Manager.
5. Configuración SSL.
6. Configuración recomendada de HikariCP.
7. Estado del esquema y migraciones.
8. Roles IAM definitivos.
9. Bloqueos antes del despliegue.
10. Pasos exactos para el primer despliegue.

No modificar archivos salvo que se detecte una incompatibilidad concreta con Neon.
