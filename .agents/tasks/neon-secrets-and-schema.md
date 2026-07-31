# Task 007 - Configurar Neon, Secret Manager y esquema productivo

## Objetivo

Completar la preparación del entorno backend para que el servicio desplegado en Cloud Run pueda iniciar correctamente usando:

- Neon PostgreSQL.
- Google Secret Manager.
- Cloud Run.
- El workflow de despliegue ya existente.

No modificar el frontend.

## Estado confirmado

Ya existen:

- `.github/workflows/deploy-backend.yml`
- `backend/Dockerfile`
- `backend/.dockerignore`
- configuración TLS para Neon en `application-prod.yml`
- Artifact Registry
- Workload Identity Federation
- cuenta de despliegue

El backend usa:

```text
APP_PROFILE=prod
```

La conexión productiva tiene el formato:

```text
jdbc:postgresql://${DB_HOST}:${DB_PORT:5432}/${DB_NAME}?sslmode=${DB_SSL_MODE:require}
```

El perfil productivo mantiene:

```text
JPA_DDL_AUTO=validate
```

Actualmente no existen migraciones completas de Flyway o Liquibase.

## Alcance de esta tarea

Esta tarea debe:

1. Revisar el modelo JPA completo.
2. Definir una estrategia segura para crear el esquema inicial en Neon.
3. Incorporar migraciones versionadas.
4. Preparar la lista exacta de secretos y variables de Cloud Run.
5. Preparar instrucciones de Google Secret Manager.
6. Validar el arranque productivo contra una base vacía de prueba, si es posible.

## 1. Revisar el modelo de datos

Inspeccionar:

- todas las entidades JPA;
- relaciones;
- claves primarias;
- claves foráneas;
- índices;
- restricciones únicas;
- columnas obligatorias;
- enums;
- longitudes;
- tipos de fecha y hora;
- migraciones programáticas existentes;
- inicialización de datos;
- lógica de bootstrap administrativo.

Identificar el esquema completo que necesita la aplicación.

No inferir tablas o columnas que no existan en el código.

## 2. Seleccionar Flyway o Liquibase

Revisar la estructura del proyecto y elegir una sola herramienta.

Preferir Flyway salvo que exista una razón técnica concreta para usar Liquibase.

La decisión debe considerar:

- Spring Boot utilizado;
- Gradle;
- PostgreSQL;
- facilidad de mantener SQL versionado;
- compatibilidad con Neon;
- integración con `ddl-auto=validate`.

Explicar brevemente la elección.

## 3. Implementar migraciones iniciales

Crear las migraciones necesarias para generar desde cero el esquema completo.

Requisitos:

- Deben funcionar sobre una base PostgreSQL vacía.
- Deben ser compatibles con Neon.
- Deben ser versionadas.
- Deben ser deterministas.
- Deben incluir claves primarias y foráneas.
- Deben incluir restricciones e índices requeridos por el código.
- Deben respetar nombres reales de tablas y columnas.
- No deben contener credenciales.
- No deben contener datos personales reales.
- No deben borrar información existente.
- No usar `DROP DATABASE`.
- No usar `create-drop`.
- No cambiar automáticamente a `ddl-auto=update`.

Usar nombres similares a:

```text
V1__create_initial_schema.sql
V2__add_user_token_constraints.sql
V3__add_treasury_integrity_constraints.sql
```

La numeración exacta debe depender de la estructura real.

## 4. Revisar migraciones programáticas existentes

Revisar:

```text
UserTokenSchemaMigration
TreasuryDataIntegrityMigration
```

Determinar si:

- deben convertirse en migraciones SQL;
- deben conservarse temporalmente;
- quedarían duplicando cambios de Flyway;
- podrían fallar después de incorporar el nuevo esquema.

No mantener dos mecanismos haciendo el mismo cambio.

Modificar o retirar esas migraciones solo si es necesario para evitar duplicidad o fallos.

Documentar claramente la decisión.

## 5. Configurar Flyway/Liquibase

Modificar únicamente lo necesario en:

- `build.gradle` o archivos Gradle correspondientes;
- `application-prod.yml`;
- configuración de pruebas, si hace falta.

Requisitos:

- Las migraciones deben ejecutarse antes de la validación JPA.
- Hibernate debe seguir validando el esquema.
- Mantener:

```text
JPA_DDL_AUTO=validate
```

- No ejecutar migraciones destructivas.
- No incorporar credenciales.
- No alterar el perfil dev salvo necesidad justificada.

## 6. Validar contra PostgreSQL

Ejecutar, si el entorno lo permite:

1. Tests existentes.
2. Build Gradle.
3. Arranque contra una base PostgreSQL vacía.
4. Ejecución automática de migraciones.
5. Reinicio de la aplicación.
6. Confirmación de que las migraciones no vuelven a aplicarse.
7. Confirmación de que Hibernate `validate` finaliza correctamente.

Puede usarse PostgreSQL local mediante Docker para validación.

No utilizar credenciales reales de Neon para pruebas locales.

Si Docker no está disponible, informar la limitación y ejecutar todas las validaciones posibles sin inventar resultados.

## 7. Variables normales de Cloud Run

Confirmar los nombres exactos y preparar una tabla con:

- nombre;
- propósito;
- ejemplo de formato;
- obligatoriedad;
- valor recomendado para desarrollo.

Revisar como mínimo:

```text
APP_PROFILE
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

No incluir secretos en esta tabla como valores visibles.

No configurar `PORT`.

## 8. Secretos de Google Secret Manager

Confirmar cuáles son realmente obligatorios:

```text
DB_USER
DB_PASSWORD
JWT_SECRET
ADMIN_BOOTSTRAP_KEY
GMAIL_USER
GMAIL_APP_PASSWORD
```

Para cada uno indicar:

- nombre recomendado del secreto en Google Secret Manager;
- variable de entorno que recibirá Cloud Run;
- si es obligatorio para el arranque;
- qué componente lo usa;
- cómo debe rotarse;
- si puede omitirse temporalmente en desarrollo.

No mostrar valores.

## 9. Nombres recomendados de secretos

Usar nombres consistentes, por ejemplo:

```text
treasury-dev-db-user
treasury-dev-db-password
treasury-dev-jwt-secret
treasury-dev-admin-bootstrap-key
treasury-dev-gmail-user
treasury-dev-gmail-app-password
```

Confirmar que cumplen las reglas de Google Secret Manager.

No crear secretos automáticamente.

## 10. Cuenta runtime

Confirmar si existe una cuenta runtime separada.

Nombre recomendado:

```text
treasury-system-runtime
```

Email esperado:

```text
treasury-system-runtime@uber-victor-api.iam.gserviceaccount.com
```

No asumir que existe.

Preparar instrucciones para:

- crearla si falta;
- conceder `roles/secretmanager.secretAccessor` únicamente sobre cada secreto;
- permitir que Cloud Run use esa cuenta;
- evitar roles amplios a nivel de proyecto.

No asignar:

```text
roles/cloudsql.client
```

## 11. Preparar configuración de Cloud Run

Entregar el comando o configuración conceptual necesaria para asociar:

### Variables normales

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

### Secretos

```text
DB_USER=treasury-dev-db-user:latest
DB_PASSWORD=treasury-dev-db-password:latest
JWT_SECRET=treasury-dev-jwt-secret:latest
ADMIN_BOOTSTRAP_KEY=treasury-dev-admin-bootstrap-key:latest
GMAIL_USER=treasury-dev-gmail-user:latest
GMAIL_APP_PASSWORD=treasury-dev-gmail-app-password:latest
```

No ejecutar el despliegue.

No escribir valores reales de Neon.

## 12. HikariCP

Revisar si conviene incorporar una configuración explícita.

Considerar:

```yaml
maximum-pool-size: 5
minimum-idle: 0
connection-timeout: 30000
idle-timeout: 300000
max-lifetime: 600000
```

Aplicarla solo si:

- no rompe pruebas;
- es apropiada para Cloud Run;
- no entra en conflicto con configuración existente;
- se documenta el impacto sobre conexiones máximas.

## 13. Seguridad

Verificar:

- ausencia de credenciales Neon en Git;
- ausencia de secretos en YAML;
- ausencia de URLs completas con usuario y contraseña;
- ausencia de claves JSON;
- `.env` ignorados;
- migraciones sin datos sensibles;
- logs sin contraseñas;
- errores de conexión sin exposición de secretos.

No leer ni mostrar los valores de `.env`.

## 14. Documentación

Crear o actualizar documentación técnica con:

- cómo crear el proyecto Neon;
- dónde obtener host, puerto, base, usuario y contraseña;
- cómo crear los secretos;
- cómo asignar permisos a la cuenta runtime;
- cómo preparar una base Neon vacía;
- cómo validar que Flyway/Liquibase aplicó correctamente;
- cómo revisar logs de Cloud Run;
- cómo rotar la contraseña de Neon.

No incluir credenciales reales.

## 15. No implementar

No realizar todavía:

- push a `main`;
- despliegue real;
- creación de servicios Cloud Run;
- cambios al frontend;
- Firebase;
- dominio;
- acceso público;
- configuración de correo real;
- datos productivos;
- importación de información personal.

## Validaciones obligatorias

Al finalizar ejecutar:

```text
./gradlew test
./gradlew bootJar
```

Y, si Docker está disponible:

```text
docker build --tag treasury-backend:neon-validation backend
```

También validar:

- migración en base PostgreSQL vacía;
- segundo arranque sin cambios pendientes;
- `ddl-auto=validate`;
- `git diff --check`;
- ausencia de secretos en los cambios.

## Entrega final

Presentar:

1. Herramienta de migración seleccionada.
2. Archivos creados.
3. Archivos modificados.
4. Migraciones incorporadas.
5. Tratamiento de las migraciones programáticas existentes.
6. Resultado de tests.
7. Resultado del build.
8. Resultado de la prueba con PostgreSQL.
9. Variables normales definitivas.
10. Secretos definitivos.
11. Instrucciones de Secret Manager.
12. Permisos de la cuenta runtime.
13. Configuración requerida de Cloud Run.
14. Bloqueos pendientes.
15. Diff resumido.

No hacer commit, push ni despliegue sin aprobación.

