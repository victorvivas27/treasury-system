# Treasury System

Sistema de gestión escolar orientado a tesorería, administración de alumnos, apoderados, familias y usuarios. Incluye una API Spring Boot, una aplicación React/Vite, PostgreSQL y colecciones Bruno para validar contratos HTTP.

## Funcionalidades

- Alumno: creación, listado, consulta, actualización y eliminación por código `AL-XXXXXXXX`.
- Apoderado: CRUD por código `AP-XXXXXXXX` y habilitación de acceso.
- Familia: vínculo de un alumno con uno o más apoderados, parentesco y contacto principal.
- Usuarios: administración de cuentas con roles `ADMIN` y `USER`.
- Autenticación: JWT, registro, verificación de correo, reenvío, recuperación, restablecimiento y cambio de contraseña.
- Tesorería: cuota anual, modalidades, obligaciones, pagos, aportes CEPA/Solidaria, ingresos, egresos, resumen financiero, auditoría y reportes.
- Eventos escolares: configuración, gastos, recaudación, liquidación y transferencias.
- Stands: configuración por evento, productos, ventas, apertura y cierre.
- Frontend: dashboard, configuración, perfil, rutas protegidas y vistas responsive de los módulos anteriores.

## Tecnologías

- Backend: Java 17, Spring Boot 4.0.6, WebMVC, Spring Security, Spring Data JPA, Bean Validation, Gradle, Flyway, PMD y JaCoCo.
- Base de datos: PostgreSQL 16 en desarrollo/Docker/producción y H2 en pruebas.
- Frontend: React 19, TypeScript 5.9, Vite 8, React Router 7, Axios, Recharts, Vitest, Testing Library y Oxlint.
- API tests: OpenCollection YAML ejecutable con Bruno CLI.

## Arquitectura

Backend hexagonal por módulo:

```text
core                    dominio, puertos y errores
application/usecase     casos de uso
config                  composición Spring
infrastructure/adapter  API web y persistencia JPA
shared                  paginación, CORS y manejo de errores
```

Frontend por capas:

```text
core/A-domain       entidades y contratos
core/B-application casos de uso
core/C-infra       repositorios Axios
core/D-config      configuración HTTP
presentation       contextos, hooks, features, páginas y router
shared             layout, estilos y UI reutilizable
```

Axios usa `VITE_API_URL`; el fallback local es `http://localhost:5055/tesoreria/api/v1`.

## Contratos principales

La API local parte de `http://localhost:5055/tesoreria/api/v1`.

- Alumno y Apoderado usan `codigo` en rutas individuales públicas.
- Familia usa `familiaId` en sus rutas y IDs internos de Alumno/Apoderado en los cuerpos.
- Login: `POST /auth/login` con `correo` y `password`.
- Las rutas protegidas requieren `Authorization: Bearer <token>`.
- Tesorería se expone bajo `/tesoreria`; los controladores concretos definen cuotas, aportes, ingresos, egresos, eventos, resumen y reportes.

## Ejecución local

### Requisitos

- Java 17.
- Node.js compatible con Vite 8.
- pnpm 11.5.0.
- PostgreSQL 16, o Docker Compose.

Crear los archivos locales a partir de las plantillas y completar sus valores sin versionarlos:

```bash
cp .env.example .env
cp frontend/.env.example frontend/.env
```

Backend:

```bash
cd backend
./gradlew bootRun
```

Frontend, en otra terminal:

```bash
cd frontend
pnpm install
pnpm dev
```

## Docker Compose

El compose levanta PostgreSQL 16 y el backend. Requiere en `.env` los valores obligatorios de base de datos, JWT y Gmail.

```bash
docker compose config
docker compose up --build
```

El frontend se ejecuta por separado con Vite.

## Variables de entorno

Backend principales:

- `APP_PROFILE`: `dev`, `test` o `prod`.
  ### Archivos revisados

  - README.md
  - frontend/FRONTEND.md
  - backend/BACKEND.md
  - backend/NEON_DEPLOYMENT.md

  ### Archivos modificados

  - README.md
  - frontend/FRONTEND.md
  - backend/BACKEND.md

  backend/NEON_DEPLOYMENT.md no requirió cambios.

  ### Información eliminada

  - Auditorías e incidencias históricas ya resueltas.
  - Referencia al supuesto problema pendiente de .gitattributes.
  - Error antiguo de Bruno por el módulo qs.
  - Conteos antiguos de archivos y tests.
  - Resultados de validaciones anteriores presentados como actuales.
  - Afirmación de que autenticación y autorización estaban pendientes.
  - Endpoints antiguos por ID.
  - Listas históricas de correcciones y breaking changes que ya no aportaban valor.

  ### Información actualizada

  - Módulos actuales, incluidos Tesorería, Eventos escolares y Stands.
  - Autenticación JWT, roles, verificación y recuperación por correo.
  - PostgreSQL, H2, Flyway y perfiles Spring.
  - Arquitectura vigente del backend y frontend.
  - Bruno y autenticación administrativa reutilizable.
  - PMD 6.55, JaCoCo 70 %, Vitest, Oxlint y type checking.
  - Comandos reales de Gradle y package.json.
  - Ejecución local y Docker Compose.
  - Diferencia entre MockMvc standalone y @SpringBootTest.
  - Ausencia actual de ESLint, @WebMvcTest, @DataJpaTest y Testcontainers.

  ### Validaciones

  - Enlaces relativos: todos válidos.
  - Rutas y archivos documentados: comprobados.
  - Scripts frontend: contrastados con package.json.
  - Comandos Gradle: contrastados con build.gradle.
  - Referencias obsoletas por ID: ninguna.
  - Estadísticas antiguas y errores históricos: eliminados.
  - “ESLint” aparece únicamente para aclarar explícitamente que no se utiliza.
  - git diff --check: aprobado; solo avisos informativos LF/CRLF.

  Durante esta tarea solo se modificaron archivos Markdown de documentación general. Los cambios ajenos existentes en .agents, código, Bruno, configuraciones e imágenes permanecieron
  intactos.
- `PORT`: puerto del backend.
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`.
- `DB_SSL_MODE` y `JPA_DDL_AUTO` para producción.
- `JWT_SECRET`, `JWT_EXPIRATION_MS`, `ADMIN_BOOTSTRAP_KEY`.
- `APP_CORS_ALLOWED_ORIGINS`, `TREASURY_MANAGED_COURSE`.
- `EMAIL_PROVIDER`, `GMAIL_USER`, `GMAIL_APP_PASSWORD`, `EMAIL_FROM` y `FRONTEND_URL`.

Frontend:

- `VITE_API_URL`: URL base de la API.

No guardar secretos reales en Git. Producción utiliza PostgreSQL/Neon con TLS, Flyway y Hibernate `validate`; consulta [backend/NEON_DEPLOYMENT.md](backend/NEON_DEPLOYMENT.md).

## Autenticación por correo

El backend usa Spring Mail y Gmail SMTP. El registro crea una cuenta pendiente y envía un enlace de verificación válido por 24 horas. La recuperación de contraseña usa un enlace válido por 60 minutos. Los tokens son aleatorios, de un solo uso y solo se persiste su hash SHA-256.

`GMAIL_APP_PASSWORD` debe ser una contraseña de aplicación de Google. La cuenta Gmail necesita verificación en dos pasos. En producción debe inyectarse desde Secret Manager.

## Base de datos

- Desarrollo: PostgreSQL con perfil `dev`.
- Pruebas: H2 en memoria y `create-drop` con perfil `test`.
- Producción: PostgreSQL TLS, Flyway y `JPA_DDL_AUTO=validate`.
- Esquema inicial: `backend/src/main/resources/db/migration/V1__create_initial_schema.sql`.

No modificar una migración aplicada; los cambios de esquema deben agregarse en una nueva versión.

## Pruebas y quality gates

Backend:

```bash
cd backend
./gradlew test
./gradlew pmdMain
./gradlew check
```

`check` incluye PMD para código principal y la verificación JaCoCo. La cobertura mínima configurada es 70 % sobre las clases incluidas; `pmdTest` está deshabilitado.

Frontend:

```bash
cd frontend
pnpm test:run
pnpm lint
pnpm build
```

`build` ejecuta el type checking con `tsc -b` y genera el bundle con Vite. `lint` utiliza Oxlint; el proyecto no utiliza ESLint.

La suite backend incluye pruebas unitarias JUnit/Mockito, pruebas MockMvc standalone y `SecurityConfigTest` con `@SpringBootTest` y `@AutoConfigureMockMvc`. El frontend usa Vitest, jsdom y Testing Library.

## Colecciones Bruno

Las colecciones principales están en:

- `api-tests/alumno`
- `api-tests/apoderado`
- `api-tests/familia`

Cada colección autentica primero un administrador mediante variables `Admin_Email` y `Admin_Password`, guarda `adminToken` y lo reutiliza como Bearer. Deben ejecutarse contra una base limpia o controlada, en orden Alumno, Apoderado y Familia.

```bash
cd api-tests
bru run ./alumno -r --env tesoreria --env-var Admin_Email=<email> --env-var Admin_Password=<password>
bru run ./apoderado -r --env tesoreria --env-var Admin_Email=<email> --env-var Admin_Password=<password>
bru run ./familia -r --env tesoreria --env-var Admin_Email=<email> --env-var Admin_Password=<password>
```

Las tres colecciones han sido validadas completamente con autenticación administrativa. `scripts/test-full-flow.sh` continúa ejecutando solamente Apoderado.

## Documentación adicional

- [Frontend](frontend/FRONTEND.md)
- [Backend](backend/BACKEND.md)
- [Neon y Cloud Run](backend/NEON_DEPLOYMENT.md)
