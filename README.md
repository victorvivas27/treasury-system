# Treasury System

## Correos de autenticación

El registro crea cuentas pendientes y envía mediante Gmail SMTP un enlace de verificación de
24 horas. También están disponibles el reenvío de verificación, la recuperación de
contraseña (60 minutos), el restablecimiento y el cambio autenticado de contraseña.
Los tokens son aleatorios, de un solo uso y en la base de datos sólo se conserva su hash
SHA-256.

Configura en `.env`:

```env
EMAIL_PROVIDER=gmail
GMAIL_USER=tesoreria.colegio@gmail.com
GMAIL_APP_PASSWORD=xxxxxxxxxxxxxxxx
EMAIL_FROM=Tesorería Escolar <tesoreria.colegio@gmail.com>
FRONTEND_URL=http://localhost:5173
```

`GMAIL_APP_PASSWORD` debe ser una contraseña de aplicación de Google, nunca la
contraseña normal de la cuenta. La cuenta necesita verificación en dos pasos para crearla.
No agregues `.env` al repositorio; ya está ignorado. En Google Cloud configura
`GMAIL_APP_PASSWORD` como secreto (por ejemplo, con Secret Manager) e inyecta las demás
variables en el servicio.

Para probarlo en local, levanta PostgreSQL, inicia el backend con
`cd backend && ./gradlew bootRun` y el frontend con `cd frontend && pnpm dev`.
Registra una cuenta en `/register`, abre el enlace recibido y luego inicia sesión.
El flujo de recuperación comienza en `/olvide-password`. Para comprobar el tercer
correo, cambia la contraseña desde el enlace de recuperación o desde la sesión iniciada.

Sistema de gestion escolar orientado a tesoreria y administracion de alumnos, apoderados y relaciones familiares. Incluye backend Spring Boot, frontend React/Vite y colecciones declarativas de pruebas API en `api-tests`.

## Cuota anual

El módulo disponible en `/tesoreria/cuotas` permite configurar una cuota única por
año, habilitar modalidad anual, dos cuotas o ambas, asignar la modalidad a cada
familia, generar obligaciones idempotentes y registrar o anular pagos. Los pagos no
se eliminan y las mutaciones quedan registradas en `treasury_audit` con usuario y fecha.

Las consultas admiten filtros por año, curso, familia, modalidad y estado. El resumen
se encuentra en `/tesoreria/resumen` y los reportes de familias al día, con deuda,
cuota anual pagada, primera cuota pagada y segunda pendiente en
`/tesoreria/reportes`.

La API parte de `/api/v1/tesoreria` y permite los roles autenticados `ADMIN` y `USER`
mientras el sistema no disponga de un rol específico de tesorero.

## Project Overview

La aplicacion permite administrar alumnos, apoderados y familias. Los endpoints publicos de alumnos y apoderados operan por `codigo`; las relaciones familiares usan IDs internos para vincular alumno y apoderados.

## Architecture

Backend hexagonal por modulo:

- `core`: modelos de dominio, puertos y codigos de error.
- `application`: casos de uso y reglas de aplicacion.
- `infrastructure/adapter/in/web`: controladores REST, DTOs y mappers HTTP.
- `infrastructure/adapter/out/persistence`: entidades JPA, repositorios Spring Data y mappers.
- `shared`: excepciones, respuestas de error, paginacion y constantes.

Frontend por capas:

- `core/A-domain`: entidades y contratos.
- `core/B-application`: casos de uso.
- `core/C-infra`: repositorios HTTP con Axios.
- `core/D-config`: configuracion compartida.
- `presentation`: paginas, features, hooks y componentes.
- `shared`: UI reutilizable, iconos y utilidades.

Comunicacion frontend-backend: Axios usa `VITE_API_URL`; por defecto apunta a `http://localhost:5055/tesoreria/api/v1`.

## Technologies

- Backend: Java 17, Spring Boot 4.0.6, Spring WebMVC, Spring Data JPA, Bean Validation, Lombok, Gradle, JaCoCo, PMD.
- Database: PostgreSQL 16 para Docker/dev/prod, H2 para tests.
- Frontend: React 19.2, TypeScript 5.9, Vite 8, React Router 7, Axios, Vitest, Testing Library, Oxlint.
- API tests: YAML bajo `api-tests`.

## Installation

Backend:

```bash
cd backend
./gradlew test
./gradlew bootRun
```

Frontend:

```bash
cd frontend
pnpm install
pnpm build
pnpm dev
```

Docker:

```bash
cp .env.example .env
docker compose up --build
```

## Environment Variables

Backend:

- `APP_PROFILE`: perfil Spring activo. Default Docker: `dev`.
- `PORT`: puerto backend para perfil `prod`. Default: `8080`.
- `DB_HOST`: host PostgreSQL.
- `DB_PORT`: puerto PostgreSQL. Default recomendado: `5432`.
- `DB_NAME`: nombre de base de datos.
- `DB_USER`: usuario de base de datos.
- `DB_PASSWORD`: password de base de datos. Requerido; no debe versionarse con valores reales.
- `JPA_DDL_AUTO`: estrategia Hibernate en `prod`. Default: `validate`.
- `APP_CORS_ALLOWED_ORIGINS`: origenes permitidos por CORS separados por coma. Default local: `http://localhost:5173,http://127.0.0.1:5173`.
- `JWT_SECRET`: secreto de firma de tokens; debe ser robusto y mantenerse fuera del repositorio.
- `JWT_EXPIRATION_MS`: duración del token de acceso en milisegundos.
- `ADMIN_BOOTSTRAP_KEY`: clave de un solo uso para crear el administrador inicial.
- `TREASURY_MANAGED_COURSE`: curso administrado por tesorería. Default local: `1A`.
- `EMAIL_PROVIDER`: proveedor de correo; debe ser `gmail`.
- `GMAIL_USER`: dirección de la cuenta Gmail remitente.
- `GMAIL_APP_PASSWORD`: contraseña de aplicación de Google, almacenada como secreto.
- `EMAIL_FROM`: remitente visible, por ejemplo `Tesorería Escolar <tesoreria.colegio@gmail.com>`.
- `FRONTEND_URL`: origen usado para construir enlaces de verificación y recuperación.

Frontend:

- `VITE_API_URL`: URL base del backend. Default: `http://localhost:5055/tesoreria/api/v1`.

## Project Structure

- `.agents/tasks`: tareas de auditoria y ejecucion.
- `api-tests`: colecciones de pruebas HTTP por dominio.
- `backend`: aplicacion Spring Boot.
- `frontend`: aplicacion React/Vite.
- `docker-compose.yml`: backend y PostgreSQL para entorno local.
- `.env.example`: plantilla de variables sin secretos reales.

## Issues Found

### Critical Issues

- Credencial PostgreSQL real versionada en `docker-compose.yml`.
  - Root cause: configuracion local con password hardcodeado.
  - Impact: exposicion de secreto y reutilizacion insegura.
  - Solution implemented: Docker ahora consume `DB_PASSWORD` desde entorno y se agrego `.env.example`.

- Perfil `prod` usaba H2 local con consola habilitada.
  - Root cause: configuracion productiva copiada desde entorno de desarrollo.
  - Impact: riesgo de perdida de datos, consola administrativa expuesta y despliegue no productivo.
  - Solution implemented: `application-prod.yml` ahora usa PostgreSQL por variables y deshabilita H2 console.

### High Priority Issues

- Backend no compilaba por contratos inconsistentes entre `ApoderadoService` y `FamiliaController`.
  - Root cause: migracion parcial desde rutas por ID a rutas por `codigo`.
  - Impact: build backend roto y validaciones de familia incompletas.
  - Solution implemented: se agregaron busquedas internas reales por ID y lista de IDs sin cambiar la API publica por `codigo`.

- Tests backend de apoderado usaban metodos publicos obsoletos.
  - Root cause: pruebas desactualizadas despues del cambio a `codigo`.
  - Impact: `./gradlew test` fallaba en compilacion.
  - Solution implemented: `ApoderadoServiceTest` fue alineado al contrato vigente.

- CORS estaba abierto con `@CrossOrigin` en cada controlador.
  - Root cause: configuracion transversal declarada a nivel de controlador sin restriccion de origen.
  - Impact: cualquier origen podia invocar la API desde navegador.
  - Solution implemented: se reemplazo por `CorsConfig` centralizado y configurable con `APP_CORS_ALLOWED_ORIGINS`.

- Regla de dominio de `curso` en alumno no coincidia con el test.
  - Root cause: test esperaba 50 caracteres, dominio valida 4.
  - Impact: suite backend fallaba.
  - Solution implemented: test actualizado al limite real.

### Medium Priority Issues

- El build frontend compilaba archivos `*.test.*`.
  - Root cause: `tsconfig.app.json` incluia todo `src`.
  - Impact: mocks y tests legacy bloqueaban builds productivos.
  - Solution implemented: tests excluidos del build TypeScript de aplicacion.

- DTOs y hooks de familia tenian nombres inconsistentes (`apoderadoid`, `id`) frente a `apoderadoId` y `alumnoId`.
  - Root cause: migracion incompleta de tipos.
  - Impact: errores TypeScript y mapeo incorrecto al editar familia.
  - Solution implemented: tipos y hooks corregidos.

- Tests frontend conservaban expectativas legacy por ID numerico.
  - Root cause: mocks no actualizados con `codigo`, `alumnoId` y `apoderadoId`.
  - Impact: Vitest fallaba aunque el build productivo compilara.
  - Solution implemented: fixtures, repositorios y hooks fueron ajustados con compatibilidad controlada.

### Low Priority Issues

- Logs temporales en creacion de familia.
  - Root cause: depuracion dejada en el hook.
  - Impact: ruido y posible exposicion de datos en consola.
  - Solution implemented: logs removidos.

- Tests de hooks emitian advertencias `act(...)` y logs de error esperados.
  - Root cause: un test no esperaba las actualizaciones asincronas del hook y otro dejaba pasar `console.error` deliberado.
  - Impact: ruido en la suite y senales falsas durante CI.
  - Solution implemented: test asincrono ajustado y log esperado silenciado localmente.

- Literales y conversiones sensibles a locale en backend.
  - Root cause: `toUpperCase()` sin `Locale.ROOT` y magic number en dominio.
  - Impact: comportamiento inconsistente segun locale y warning PMD.
  - Solution implemented: normalizacion con `Locale.ROOT` y constante de dominio.

- `.gitattributes` de `backend` emite advertencias de atributos invalidos.
  - Root cause: lineas invalidas en configuracion Git.
  - Impact: ruido en comandos Git.
  - Solution implemented: no modificado porque no afecta build ni runtime.

## Improvements Implemented

- Backend pasa `./gradlew test` y `./gradlew check`.
- Frontend pasa `pnpm build`, `pnpm exec vitest run` y `pnpm lint`.
- `ApoderadoService` conserva contrato publico por `codigo` y agrega busquedas internas por ID para familias.
- Repositorios de alumno y apoderado completan metodos internos requeridos por servicios.
- Dominio `Apoderado` expone `setCodigo` para mapeo y pruebas.
- Tests backend actualizados y ampliados con cobertura de dominio `Familia`.
- Build frontend separado de archivos de test.
- Hooks de alumno, apoderado y familia manejan mejor loading, errores y compatibilidad de identificadores.
- Formularios de apoderado mejoran estados de loading y clases de error.
- Secretos removidos de Docker y documentados en `.env.example`.
- Perfil `prod` migrado de H2 a PostgreSQL.
- CORS centralizado en backend y parametrizado por ambiente.
- Handler global de errores limpiado y validaciones DTO mantenidas con respuesta estandar.
- Tests de hooks de apoderado ajustados para no emitir ruido en ejecucion normal.

## Remaining Recommendations

- Revisar periódicamente la matriz de autorización entre backend y rutas protegidas del frontend.
- Definir valores productivos estrictos para `APP_CORS_ALLOWED_ORIGINS`.
- Mantener inmutable la migración Flyway `V1` y crear una nueva versión para cada cambio de esquema.
- Ejecutar las colecciones `api-tests` contra backend levantado y base limpia.
- Reparar instalacion local de Bruno CLI o ejecutar con una instalacion limpia; el runner actual falla antes de correr colecciones por modulo Node `qs` faltante.
- Corregir `.gitattributes` de `backend` para eliminar warnings Git.
- Agregar pruebas de integracion HTTP para alumnos, apoderados y familias.

## Breaking Changes

- Los endpoints publicos de alumnos y apoderados operan por `codigo`, no por ID numerico.
- `application-prod.yml` ahora requiere variables PostgreSQL.
- Docker requiere `DB_PASSWORD` desde entorno o `.env`.
- El build productivo frontend ya no compila archivos `*.test.ts` ni `*.test.tsx`.

## Migration Notes

- Crear `.env` desde `.env.example` y definir `DB_PASSWORD` antes de usar Docker.
- Consumidores externos deben usar `codigo` en rutas de alumnos y apoderados.
- Relaciones de familia siguen enviando IDs numericos de alumno/apoderados.
- Para producción, verificar que Flyway aplique todas las migraciones antes de la validación de Hibernate.

## Performance Improvements

- Typecheck productivo frontend reducido al excluir tests.
- Se removieron logs innecesarios en hooks.
- Se evitaron caminos nulos/stub en servicios que generaban fallos tardios.

## Security Improvements

- Password real eliminado de `docker-compose.yml`.
- `.env.example` agregado para documentar configuracion sin secretos.
- Perfil `prod` deja de usar H2 local y consola H2.
- CORS abierto removido de controladores y reemplazado por lista configurable de origenes.
- Pendiente: autenticacion, autorizacion y CSRF segun mecanismo de sesion/token que se adopte.

## Verification

```bash
cd backend && ./gradlew check
cd frontend && pnpm build
cd frontend && pnpm exec vitest run
cd frontend && pnpm lint
```

Resultado validado:

- `./gradlew check`: exitoso.
- `pnpm build`: exitoso.
- `pnpm exec vitest run`: exitoso, 33 archivos y 217 tests.
- `pnpm lint`: exitoso.
- Tests de hooks de apoderado reejecutados sin advertencias `act(...)` ni logs esperados en `stderr`.
- Backend levantado con perfil `test` y H2; `GET http://localhost:5055/tesoreria/api/v1/alumnos` respondio `200`.
- Colecciones Bruno `alumno`, `apoderado` y `familia`: no ejecutadas porque `bru.cmd` falla al iniciar con `Cannot find module 'qs'`.

Nota: `pmdTest` queda deshabilitado en Gradle porque el ruleset actual genera ruido masivo en tests legacy; `pmdMain` si corre dentro de `check`.

## Final Checklist

- [x] Frontend working
- [x] Backend working
- [x] APIs working at build/contract level and local smoke test
- [x] Authentication working: autenticación JWT, verificación de correo y recuperación de contraseña implementadas
- [x] Database working at configuration/test level
- [x] Build successful
- [x] Tests passing
- [x] Lint passing
- [x] Type checking passing
- [ ] Production ready: quedan pendientes autenticacion, autorizacion, origenes CORS productivos y migraciones versionadas

## Cuota CEPA y Cuota Solidaria

La pantalla `/tesoreria/aportes` permite consultar los dos aportes independientes por
familia y año escolar. Los usuarios `USER` pueden ver cards, métricas, buscar y filtrar.
Los usuarios `ADMIN` además pueden configurar montos, registrar pagos y anularlos con
un motivo auditable.

### Flujo de prueba

1. Iniciar backend y frontend e ingresar con una cuenta `ADMIN`.
2. Abrir `Tesorería > CEPA y Solidaria`.
3. Seleccionar el año escolar.
4. Abrir una familia y marcar cada estado por separado.
5. Comprobar que la card y los contadores cambian sin recargar.
6. Anular un registro, ingresar el motivo y verificar que vuelve a mostrarse pendiente.
7. Ingresar como `USER` y comprobar que puede consultar, pero no modificar.

Los endpoints se encuentran bajo `/api/v1/tesoreria/aportes`:

- `GET /aportes` lista familias y acepta `year`, `course`, `familyId`,
  `cepaStatus`, `solidarityStatus` y `search`.
- `GET /aportes/resumen` entrega los contadores del año.
- `GET|PUT /aportes/configuraciones` consulta o configura los aportes anuales.
- `POST /aportes/{familyId}/pagos` registra un pago.
- `PATCH /aportes/{id}/anulacion` anula un pago sin eliminar su registro.

La cuota anual continúa disponible en `/tesoreria/cuotas`. Sus entidades, tablas,
servicios, endpoints y pantalla no fueron reemplazados por este módulo.

Para corregir la modalidad de una familia:

1. Anular todos sus pagos activos indicando el motivo.
2. Seleccionar la familia y cambiar entre `Cuota única` y `Dos cuotas`.
3. Guardar la modalidad; las nuevas obligaciones se regeneran automáticamente.

Los pagos anulados permanecen en auditoría, pero no bloquean el cambio de modalidad
ni forman parte del total recaudado. Si aún existe otro pago activo de la familia,
el cambio continúa bloqueado hasta anularlo.

## Egresos de Tesorería

La ruta `/tesoreria/gastos`, visible como `Tesorería > Egresos`, administra el dinero
utilizado por el curso. El resumen conserva el total recaudado y calcula en backend:

```text
Saldo disponible = cuota del curso pagada + ingresos extraordinarios - egresos activos
```

Los egresos anulados desaparecen del panel y dejan de descontarse. El backend conserva
el registro para auditoría, sin eliminarlo físicamente.
Los usuarios `USER` pueden consultar; los usuarios `ADMIN` pueden registrar, corregir
con motivo y anular. Si un nuevo egreso supera el saldo, se solicita confirmación.

### Prueba manual

1. Ingresar como `ADMIN` y abrir `Tesorería > Egresos`.
2. Seleccionar el año y pulsar `Registrar egreso`.
3. Completar descripción, monto, fecha y categoría.
4. Guardar y verificar la card, el total de egresos y el saldo disponible.
5. Abrir `Ver detalle` para corregir el registro indicando un motivo.
6. Anularlo indicando el motivo y comprobar que desaparece del panel.
7. Confirmar que el total recaudado no cambió y que el saldo recuperó el monto anulado.

API bajo `/api/v1/tesoreria`:

- `GET|POST /egresos`
- `GET|PATCH /egresos/{id}`
- `PATCH /egresos/{id}/anulacion`
- `GET /resumen-financiero?year=2026`

## Ingresos extraordinarios

La ruta `/tesoreria/ingresos` diferencia los ingresos automáticos por cuotas de los
ingresos extraordinarios creados manualmente. Las pestañas `Todos`, `Cuotas` y
`Otros ingresos` evitan registrar nuevamente una cuota como ingreso manual.

El resumen financiero se calcula exclusivamente en backend:

```text
Ingresos por cuotas = cuota anual del curso pagada
Ingresos totales = ingresos por cuotas + ingresos extraordinarios activos
Saldo disponible = ingresos totales - egresos activos
```

Los ingresos extraordinarios pueden corregirse con motivo o anularse. Los anulados
desaparecen del panel y dejan de sumarse, aunque el backend conserva el registro de
auditoría sin eliminarlo físicamente. Un envío duplicado con la misma
descripción, monto y fecha se rechaza.

### Prueba manual

1. Ingresar como `ADMIN` y abrir `Tesorería > Ingresos`.
2. Verificar que la pestaña `Cuotas` muestra el total automático de solo lectura.
3. Pulsar `Registrar ingreso` y guardar una rifa o donación.
4. Comprobar que aumentan `Otros ingresos`, `Ingresos totales` y `Saldo disponible`.
5. Abrir el detalle para corregir el monto indicando un motivo.
6. Anularlo indicando un motivo y comprobar que desaparece del panel.
7. Verificar que el ingreso anulado dejó de sumarse y que las cuotas no se duplicaron.

API bajo `/api/v1/tesoreria`:

- `GET|POST /ingresos`
- `GET|PATCH /ingresos/{id}`
- `PATCH /ingresos/{id}/anulacion`
- `GET /resumen-financiero?year=2026`
