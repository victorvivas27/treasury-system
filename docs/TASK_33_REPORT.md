# Tarea 33 — Horario de clases

## Implementación

Consulta en `/calendario/horario-clases`, editor en `/admin/horario-clases`, enlace administrativo en Home y Gestión, desplegable Calendario Académico en Sidebar. Evaluaciones aparece deshabilitada como Próximamente.

El editor configura entrada y salida independientes de lunes a viernes, y permite añadir, editar y eliminar materias, recreos, almuerzos y actividades. Copiar una jornada incluye sus horas y bloques; reemplazar contenido requiere confirmación. Las operaciones destructivas y publicación también requieren confirmación. Cambiar de año con cambios pendientes pide descartarlos; cerrar la pestaña advierte sobre cambios sin guardar. Se reutilizan Button, ModalConfirm y LoadingState. Los diálogos bloquean el fondo, conservan foco, atrapan Tab, admiten Escape y tienen ancho máximo de 280 px.

La consulta ofrece resumen semanal predeterminado, detalle por día y tabla semanal. La tabla divide las franjas por todas las entradas, salidas e inicios/finales de bloques, representando duraciones variables e intervalos libres; dispone de desplazamiento horizontal en móvil. Todas las vistas muestran la salida explícita de la jornada.

## Decisiones de arquitectura

- Se reutilizan `organizations`, `organization_school_periods`, CurrentOrganizationService y TenantScopedEntity. No se crean cursos ni años paralelos.
- Una fila de `academic_schedules` por administración/período conserva dos instantáneas JSON en columnas TEXT: borrador y publicación. Es un agregado pequeño validado completo en cada escritura, sin necesidad de consultas analíticas por bloque. @Version protege escrituras concurrentes durante la transacción.
- Las materias y actividades son nombres embebidos de hasta 100 caracteres, editables en sus bloques; no existe catálogo académico previo que reutilizar. No se agrega un CRUD de materias independiente.
- Guardar borrador mantiene intacta la publicación anterior. Se permite un borrador con menos de cinco días, pero cada día incluido debe ser válido. Publicar requiere las cinco jornadas configuradas.
- Solo ADMIN/SUPER_ADMIN escriben o leen borradores, mediante SecurityConfig y @PreAuthorize. Los usuarios autenticados autorizados consultan exclusivamente lo publicado.
- Las escrituras y eliminación solo afectan al año activo de la administración. Los años históricos permanecen consultables y se rechazan escrituras con HTTP 409.
- La preferencia usa `localStorage["academic.schedule.view.<userId>"]`; se separa de los datos académicos y no se transfiere al cambiar de cuenta. La carga del horario también se reinicia cuando cambia la cuenta.
- Frontend conserva el flujo entidad/contrato → repositorio Axios → caso de uso → hook → página, con cancelación de lecturas obsoletas y recuperación de errores.

## Contrato HTTP

Base efectiva: `/tesoreria/api/v1/academic/schedules`.

| Método y ruta | Uso | Acceso |
| --- | --- | --- |
| GET /periods | Años existentes con curso e indicador editable | ADMIN, SUPER_ADMIN, USER |
| GET /{year} | Versión publicada; `{days: []}` si está vacía | ADMIN, SUPER_ADMIN, USER |
| GET /{year}/draft | Borrador | ADMIN, SUPER_ADMIN |
| PUT /{year}?publish=false | Guardar borrador, devuelve horario | ADMIN, SUPER_ADMIN |
| PUT /{year}?publish=true | Guardar y publicar, devuelve horario | ADMIN, SUPER_ADMIN |
| DELETE /{year} | Eliminar borrador y publicación; HTTP 204 | ADMIN, SUPER_ADMIN |

El cuerpo contiene `days[]` con `dayOfWeek` (1–5), `entryTime`, `exitTime` y `blocks[]`. Cada bloque tiene `dayOfWeek`, `startTime`, `endTime`, `type` (SUBJECT/BREAK/LUNCH/ACTIVITY), `name`, `order` y `color` opcional hexadecimal. Se admiten horas HH:mm o HH:mm:00; la respuesta serializa LocalTime.

Validaciones backend: jornada única de lunes a viernes; horas al minuto, inicio anterior a fin y entrada anterior a salida; bloques dentro de jornada, sin superposición incluyendo recreos; nombre requerido para materia/actividad; tipo, orden, longitud y color válidos. Errores usan el contrato StandardErrorResponse existente. Año inexistente o de otra administración devuelve 404.

## Migración y ejecución

`backend/src/main/resources/db/migration/V52__create_academic_schedules.sql` crea la tabla, la unicidad por administración/período y una FK compuesta que impide vincular una administración al período de otra. La eliminación de administración o período elimina sus horarios mediante ON DELETE CASCADE.

En un ambiente con base controlada y variables habituales configuradas, arrancar el backend con perfil prod, Flyway activado y `JPA_DDL_AUTO=validate`. Flyway aplicará V52 automáticamente después de V51. No editar migraciones anteriores ni ejecutar el SQL manualmente en una base ya gestionada por Flyway.

Para validar localmente con Docker:

```powershell
cd backend
.\gradlew.bat check bootJar --console=plain
```

El perfil dev existente usa Hibernate update y tiene Flyway desactivado: arrancar dev no sustituye la verificación de la migración ni garantiza las FK compuestas de V52.

## Archivos de esta entrega

Backend:
- `backend/src/main/java/com/tesoreria/academic/core/Schedule.java`
- `backend/src/main/java/com/tesoreria/academic/application/ScheduleService.java`
- `backend/src/main/java/com/tesoreria/academic/infrastructure/persistence/ScheduleEntity.java`
- `backend/src/main/java/com/tesoreria/academic/infrastructure/persistence/ScheduleRepository.java`
- `backend/src/main/java/com/tesoreria/academic/infrastructure/web/ScheduleController.java`
- `backend/src/main/java/com/tesoreria/user/config/security/SecurityConfig.java` (integración mínima)
- `backend/src/main/resources/db/migration/V52__create_academic_schedules.sql`
- `backend/src/test/java/academic/ScheduleValidationTest.java`
- `backend/src/test/java/academic/ScheduleHttpPersistenceTest.java`
- `backend/src/test/java/academic/SchedulePostgresTest.java`
- `backend/src/test/java/user/SA02PostgresInvitationTest.java` (versión esperada de Flyway actualizada de V51 a V52)

Frontend:
- `frontend/src/core/A-domain/entities/academic/Schedule.ts`
- `frontend/src/core/A-domain/repository/academic/IScheduleRepository.ts`
- `frontend/src/core/C-infra/repositories/academic/ScheduleRepositoryImpl.ts`
- `frontend/src/core/B-application/use-cases/academic/ScheduleUseCases.ts`
- `frontend/src/core/B-application/use-cases/academic/ScheduleUseCases.test.ts`
- `frontend/src/presentation/hooks/academic/useSchedule.ts`
- `frontend/src/presentation/hooks/academic/useSchedule.test.ts`
- `frontend/src/presentation/pages/academic/SchedulePage.tsx`
- `frontend/src/presentation/pages/academic/SchedulePage.test.tsx`
- `frontend/src/presentation/pages/academic/ScheduleManagementPage.tsx`
- `frontend/src/presentation/pages/academic/ScheduleManagementPage.test.tsx`
- `frontend/src/presentation/pages/academic/Schedule.css`
- `frontend/src/presentation/routers/AppRouter.tsx` (integración)
- `frontend/src/presentation/pages/home/components/HomeHeader.tsx` (integración)
- `frontend/src/shared/layouts/sidebar/SidebarNav.tsx` (integración)
- `frontend/src/shared/layouts/sidebar/style/SidebarNav.css` (posicionamiento)
- `frontend/src/shared/layouts/sidebar/AcademicNavigation.test.tsx`

Documentación: este reporte. Se preservaron los cambios preexistentes de arquitectura, seguridad, configuración y otros archivos.

## Evidencia y límites de las pruebas

- Backend específico H2: 10 pruebas exitosas; validación de dominio y HTTP real con JWT, autorización, transacciones, borrador/publicación, aislamiento entre administraciones, eliminación, cambio de año y conservación del historial.
- Backend completo con Docker/PostgreSQL: 673 pruebas exitosas con `check bootJar`, sin excluir etiquetas. PMD y JaCoCo pasan; bootJar generado. Cobertura de instrucciones 77,92 %, líneas 81,18 %.
- Frontend suite completa final: 461 pruebas en 85 archivos, todas exitosas.
- Frontend módulo final: 17 pruebas en 5 archivos, todas exitosas, incluidas recarga por cuenta, recuperación de errores y separación de preferencias.
- Typecheck/build y lint exitosos. Lint conserva cuatro avisos en archivos ajenos al módulo; Vite conserva avisos de eval en lottie-web.
- Chromium a 1440×1000 y 390×844: resumen, salida distinta del viernes, tabla móvil sin desbordar la página, preferencia tras recargar, editor y confirmación de máximo 280 px con foco/Escape. Estas comprobaciones interceptan la API con datos de prueba; no son pruebas integrales contra el backend.
- `bash -n scripts/test-full-flow.sh` y `git diff --check` exitosos.
- PostgreSQL específico del horario: 5 pruebas exitosas, incluidas las cuatro pruebas HTTP heredadas, migración sobre base vacía, segunda ejecución de Flyway sin migraciones pendientes y segundo arranque con Hibernate validate. Se ejecutaron en un contenedor PostgreSQL 16 aislado.
- SA02PostgresInvitationTest conserva su verificación del segundo arranque y espera V52, la última migración de esta entrega. La suite corregida completa pasó sin fallos.

No se implementan evaluaciones, notificaciones, PDFs ni calendarios externos. No se agregaron dependencias, datos académicos de ejemplo, despliegues ni cambios financieros. Las instantáneas no mantienen un historial de versiones intermedias dentro del mismo año; conservan el horario de cada año y la última publicación.
