# Tarea: Convertir la aplicación actual a Multi-Tenant sin romper producción

## Objetivo

Evolucionar la aplicación actual de invitaciones, que hoy funciona con un único contexto/administrador, hacia una arquitectura **multi-tenant**, donde diferentes administradores puedan utilizar la misma aplicación para sus propios cursos, colegios u organizaciones.

La migración debe hacerse **sin perder datos, sin borrar tablas, sin recrear la base de datos y sin romper las funcionalidades actuales**.

La aplicación existente ya está operativa. Todo cambio debe ser incremental, compatible hacia atrás y realizado mediante migraciones Flyway.

---

# REGLA PRINCIPAL

## NO ROMPER LO EXISTENTE

Antes de modificar cualquier archivo, analizar primero:

- entidades actuales
- tablas actuales
- migraciones Flyway existentes
- relaciones entre usuarios e invitaciones
- autenticación JWT
- endpoints
- repositorios
- servicios
- controladores
- configuración de seguridad
- creación de invitaciones
- consulta de invitaciones
- endpoints públicos
- envío de emails
- Cloudinary
- slugs existentes

No asumir nombres de tablas, columnas, entidades o endpoints.

Primero inspeccionar el proyecto real y adaptar esta tarea a la implementación existente.

---

# PROHIBIDO

No hacer ninguna de estas acciones:

- borrar tablas
- renombrar tablas existentes sin necesidad
- borrar columnas actuales
- recrear la base de datos
- ejecutar `DROP TABLE`
- ejecutar `TRUNCATE`
- cambiar IDs existentes
- cambiar slugs existentes
- eliminar usuarios existentes
- eliminar invitaciones existentes
- modificar URLs públicas ya creadas
- cambiar Cloudinary URLs existentes
- reemplazar migraciones Flyway que ya fueron ejecutadas
- editar migraciones Flyway antiguas
- usar `ddl-auto=create`
- usar `ddl-auto=create-drop`
- usar `ddl-auto=update` en producción
- crear una base de datos por administrador
- confiar en un `organizationId` enviado por el frontend para autorización
- permitir que un administrador consulte datos de otra organización

Las migraciones nuevas deben ser exclusivamente nuevas versiones Flyway.

Ejemplo:

```text
V1__...
V2__...
V3__...

NO MODIFICARLAS

Agregar:

V4__create_organizations.sql
V5__add_organization_relations.sql
V6__backfill_existing_data.sql
...
```

El número real debe continuar desde la última migración existente.

---

# ESTRATEGIA DE MIGRACIÓN

La implementación debe hacerse por fases.

No intentar convertir toda la aplicación a multi-tenant en un único cambio.

---

# FASE 0 — Auditoría

Antes de escribir código:

1. localizar la última migración Flyway;
2. identificar la tabla de usuarios;
3. identificar la tabla de invitaciones;
4. identificar cómo se relaciona actualmente una invitación con su propietario;
5. revisar JWT;
6. revisar registro/login;
7. revisar repositories;
8. revisar endpoints privados;
9. revisar endpoints públicos `/api/public/...`;
10. revisar envío de emails;
11. revisar cualquier tabla dependiente de invitaciones;
12. revisar tests existentes.

Generar mentalmente el mapa de dependencias antes de modificar entidades.

---

# FASE 1 — Crear Organization sin afectar tablas actuales

Crear una nueva entidad, por ejemplo:

```java
Organization
```

Campos recomendados:

```text
id
name
slug
type
active
createdAt
updatedAt
```

Opcionalmente:

```text
schoolName
courseName
```

No mover todavía datos actuales.

Crear solamente la tabla nueva.

Ejemplo conceptual:

```sql
CREATE TABLE organizations (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    slug VARCHAR(150) NOT NULL UNIQUE,
    type VARCHAR(50),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

Adaptar tipos y convenciones a la base real.

---

# FASE 2 — Crear organización para los datos actuales

Todos los datos actuales deben seguir perteneciendo al usuario/administrador actual.

Crear automáticamente una organización inicial.

Ejemplo:

```text
name = Mi Invitación
slug = default
type = LEGACY
active = true
```

No depender de un ID fijo como `1`.

La migración debe localizar la organización por un valor único, por ejemplo su slug.

Ejemplo conceptual:

```sql
INSERT INTO organizations (name, slug, type, active)
VALUES ('Mi Invitación', 'default', 'LEGACY', true)
ON CONFLICT (slug) DO NOTHING;
```

Adaptar según PostgreSQL y esquema existente.

Esta organización será el tenant inicial y conservará todos los datos actuales.

---

# FASE 3 — Asociar usuarios a organizaciones

Agregar `organization_id` a la tabla de usuarios.

IMPORTANTE:

Inicialmente debe aceptar NULL.

NO hacer inmediatamente:

```sql
organization_id BIGINT NOT NULL
```

Primero:

```sql
ALTER TABLE users
ADD COLUMN organization_id BIGINT;
```

Luego agregar foreign key.

Ejemplo conceptual:

```sql
ALTER TABLE users
ADD CONSTRAINT fk_users_organization
FOREIGN KEY (organization_id)
REFERENCES organizations(id);
```

Después hacer backfill:

```sql
UPDATE users
SET organization_id = (
    SELECT id
    FROM organizations
    WHERE slug = 'default'
)
WHERE organization_id IS NULL;
```

Validar que no quede ningún registro sin organización.

Solo después, en otra migración, se puede establecer:

```sql
NOT NULL
```

si el modelo definitivo lo requiere.

---

# FASE 4 — Asociar invitaciones a organizaciones

Agregar también:

```text
organization_id
```

a las invitaciones.

Misma estrategia:

1. agregar nullable;
2. agregar FK;
3. migrar datos existentes;
4. verificar;
5. convertir a NOT NULL posteriormente.

Ejemplo conceptual:

```sql
ALTER TABLE invitations
ADD COLUMN organization_id BIGINT;
```

Backfill:

```sql
UPDATE invitations
SET organization_id = (
    SELECT id
    FROM organizations
    WHERE slug = 'default'
)
WHERE organization_id IS NULL;
```

Todos los slugs existentes deben permanecer exactamente iguales.

NO regenerar slugs.

---

# FASE 5 — Revisar tablas hijas

Inspeccionar si existen tablas como:

```text
guests
recipients
parents
students
images
invitation_sections
rsvps
email_logs
templates
events
```

No agregar `organization_id` automáticamente a todas.

Determinar si el tenant puede inferirse de manera segura a través de `invitation_id`.

Ejemplo:

```text
RSVP
  -> invitation_id
  -> invitation.organization_id
```

Si la relación ya garantiza aislamiento, evitar duplicar innecesariamente `organization_id`.

Agregarlo solo donde tenga sentido arquitectónico o mejore seguridad/consultas.

---

# FASE 6 — Modelo Java

Agregar relación en las entidades reales.

Ejemplo conceptual:

```java
@ManyToOne(fetch = FetchType.LAZY, optional = false)
@JoinColumn(name = "organization_id")
private Organization organization;
```

No usar cascadas peligrosas como:

```java
CascadeType.REMOVE
CascadeType.ALL
```

sin comprobar el comportamiento actual.

Eliminar una organización nunca debe borrar accidentalmente invitaciones o usuarios en producción.

Preferir desactivar organizaciones con:

```text
active = false
```

antes que eliminación física.

---

# FASE 7 — Seguridad

## Regla crítica

El `organizationId` NO debe confiarse al frontend.

Incorrecto:

```text
GET /api/invitations?organizationId=5
```

y utilizar directamente `5`.

Un usuario podría cambiarlo manualmente.

El backend debe obtener la organización desde el usuario autenticado.

Flujo:

```text
JWT
 ↓
authenticated user
 ↓
organization
 ↓
consultas filtradas
```

---

# JWT

Agregar información del tenant al contexto autenticado.

Puede agregarse al JWT:

```json
{
  "sub": "USER_ID",
  "email": "admin@ejemplo.com",
  "role": "ADMIN",
  "organizationId": 123
}
```

Pero incluso si existe en el token, validar el diseño actual y mantener compatibilidad con tokens anteriores durante la transición si fuera necesario.

No romper login/refresh/token verification existente.

---

# FASE 8 — Roles

Preparar roles como:

```text
SUPER_ADMIN
ADMIN
EDITOR
```

Semántica:

```text
SUPER_ADMIN
    puede administrar organizaciones

ADMIN
    puede administrar únicamente su organización

EDITOR
    permisos limitados dentro de su organización
```

No es obligatorio implementar todos los permisos avanzados en la primera migración.

Prioridad:

1. aislamiento de datos;
2. compatibilidad;
3. administración básica.

---

# FASE 9 — Repositories

Este es uno de los cambios más importantes.

Una consulta privada que actualmente sea:

```java
findAll()
```

debe convertirse conceptualmente en:

```java
findAllByOrganizationId(...)
```

Una consulta por ID:

```java
findById(id)
```

para recursos privados no debe utilizarse directamente si permite acceso cruzado.

Preferir:

```java
findByIdAndOrganizationId(id, organizationId)
```

o equivalentes.

Ejemplos:

```java
Optional<Invitation> findByIdAndOrganizationId(
    Long id,
    Long organizationId
);
```

```java
List<Invitation> findAllByOrganizationId(
    Long organizationId
);
```

La regla es:

> Todo acceso privado a información perteneciente a una organización debe estar limitado por la organización autenticada.

---

# FASE 10 — Services

Crear un mecanismo centralizado para obtener la organización actual.

Por ejemplo:

```java
CurrentUserService
```

o:

```java
TenantContext
```

Evitar duplicar en todos los controllers lógica como:

```java
SecurityContextHolder...
```

Ejemplo conceptual:

```java
Long organizationId = currentUserService.getOrganizationId();
```

Luego:

```java
repository.findAllByOrganizationId(organizationId);
```

---

# FASE 11 — Creación de invitaciones

El frontend NO debe decidir el `organizationId`.

Cuando se crea una invitación:

```text
POST /api/invitations
```

el backend obtiene:

```text
authenticatedUser.organization
```

y asigna automáticamente:

```java
invitation.setOrganization(currentUser.getOrganization());
```

Nunca aceptar libremente:

```json
{
  "organizationId": 999
}
```

para usuarios ADMIN normales.

---

# FASE 12 — Endpoints públicos

Los endpoints públicos actuales deben continuar funcionando.

Ejemplo:

```text
GET /api/public/invitations/{slug}
```

NO cambiar sus URLs si actualmente son públicas y se usan para compartir invitaciones.

Un slug existente debe continuar resolviendo exactamente la misma invitación después de la migración.

No exigir `organizationId` para acceder a una invitación pública por slug si eso rompería links existentes.

---

# SLUGS

Si actualmente los slugs son globalmente únicos, conservar esa regla inicialmente.

NO cambiar ahora a:

```text
organization + slug
```

si hacerlo rompe enlaces actuales.

Primero mantener:

```text
UNIQUE(slug)
```

Más adelante, si realmente es necesario, evaluar slugs por tenant mediante una migración independiente y estrategia de URLs.

---

# FASE 13 — Configuración por organización

Crear posteriormente una tabla:

```text
organization_settings
```

Campos posibles:

```text
organization_id
sender_name
reply_to_email
logo_url
primary_color
school_name
course_name
```

Ejemplo conceptual:

```text
Organization
    1 ---- 1
OrganizationSettings
```

No mezclar esta configuración con las credenciales del proveedor de email.

---

# FASE 14 — Emails

La infraestructura SMTP/proveedor puede continuar siendo global.

Ejemplo:

```text
notifications@miinvitacion.cl
```

Cada organización puede tener:

```text
senderName
replyToEmail
```

Ejemplo:

```text
From:
Curso 4°A <notifications@miinvitacion.cl>

Reply-To:
profesora@colegio.cl
```

NO guardar contraseñas SMTP de usuarios en texto plano.

Para la primera versión multi-tenant, utilizar un único proveedor global.

---

# FASE 15 — SUPER_ADMIN

Crear soporte para un rol interno:

```text
SUPER_ADMIN
```

El SUPER_ADMIN puede:

- listar organizaciones;
- crear organizaciones;
- activar/desactivar organizaciones;
- crear o asignar administradores;
- revisar estado general.

Un ADMIN común NO puede:

- cambiar su `organizationId`;
- consultar otra organización;
- listar todas las organizaciones;
- acceder a datos globales.

---

# FASE 16 — Registro de nuevos administradores

No modificar el registro actual hasta comprender su flujo.

Luego implementar uno de estos modelos:

## Modelo recomendado inicialmente

El SUPER_ADMIN crea:

```text
Organization
+
Admin
```

De esta manera no se permite que cualquier persona cree organizaciones arbitrariamente.

Más adelante se puede implementar onboarding público.

---

# FASE 17 — Compatibilidad con el usuario actual

El usuario/administrador existente debe seguir funcionando después del despliegue.

Al ejecutar las migraciones:

```text
usuario existente
        ↓
organization = default
```

```text
invitaciones existentes
        ↓
organization = default
```

Su login debe continuar funcionando.

Sus invitaciones deben continuar apareciendo.

Sus imágenes deben continuar funcionando.

Los slugs deben continuar funcionando.

Las URLs públicas deben continuar funcionando.

---

# FASE 18 — Flyway seguro

Cada etapa importante debe usar una migración independiente.

Ejemplo conceptual:

```text
VXX__create_organizations.sql
VXX__add_organization_to_users.sql
VXX__add_organization_to_invitations.sql
VXX__backfill_default_organization.sql
VXX__add_organization_constraints.sql
```

No utilizar un único archivo gigante si puede evitarse.

Nunca modificar una migración que ya se ejecutó en producción.

---

# FASE 19 — Orden correcto para NOT NULL

No hacer:

```text
ADD COLUMN NOT NULL
```

sobre tablas existentes con datos.

Hacer:

```text
1. ADD COLUMN nullable
2. BACKFILL
3. VALIDAR
4. ADD FK
5. verificar código
6. SET NOT NULL
```

La restricción NOT NULL debe agregarse solamente cuando sea seguro.

---

# FASE 20 — Índices

Después del backfill agregar índices según consultas.

Ejemplos:

```sql
CREATE INDEX idx_users_organization
ON users(organization_id);
```

```sql
CREATE INDEX idx_invitations_organization
ON invitations(organization_id);
```

Si se consulta frecuentemente por tenant y estado:

```sql
CREATE INDEX idx_invitations_org_status
ON invitations(organization_id, status);
```

No agregar índices sin revisar los campos reales.

---

# FASE 21 — Tests obligatorios

Agregar tests que garanticen aislamiento.

## Test 1

```text
Admin A
organization A
```

debe ver invitaciones A.

## Test 2

```text
Admin B
organization B
```

debe ver invitaciones B.

## Test 3

Admin A intenta acceder mediante ID a una invitación de B.

Resultado esperado:

```text
404
```

o:

```text
403
```

según convención existente.

Preferiblemente no revelar existencia de recursos ajenos.

## Test 4

Admin A intenta actualizar invitación de B.

Debe fallar.

## Test 5

Admin A intenta eliminar invitación de B.

Debe fallar.

## Test 6

Los slugs públicos antiguos siguen funcionando.

## Test 7

Usuario existente sigue iniciando sesión.

## Test 8

Invitaciones anteriores siguen apareciendo para el usuario existente.

---

# FASE 22 — Test de migración

Antes de producción:

1. utilizar una copia o entorno de desarrollo con datos representativos;
2. ejecutar las nuevas migraciones;
3. comprobar cantidad de usuarios antes/después;
4. comprobar cantidad de invitaciones antes/después;
5. comprobar que ningún ID cambió;
6. comprobar que ningún slug cambió;
7. comprobar que ningún `organization_id` quedó NULL cuando no corresponde;
8. comprobar foreign keys;
9. iniciar backend;
10. ejecutar tests.

---

# FASE 23 — Verificaciones SQL

Crear consultas de diagnóstico, sin borrar datos.

Ejemplos conceptuales:

```sql
SELECT COUNT(*) FROM users;
```

```sql
SELECT COUNT(*) FROM invitations;
```

```sql
SELECT COUNT(*)
FROM users
WHERE organization_id IS NULL;
```

```sql
SELECT COUNT(*)
FROM invitations
WHERE organization_id IS NULL;
```

Después de completar el backfill, los dos últimos deberían devolver:

```text
0
```

si todas las entidades requieren organización.

---

# FASE 24 — No introducir cambios visuales innecesarios

Durante la migración backend:

- no rediseñar frontend;
- no cambiar rutas actuales;
- no cambiar componentes que no estén relacionados;
- no modificar metadata social;
- no modificar Cloudinary;
- no cambiar creación actual de invitaciones salvo lo necesario;
- no cambiar comportamiento público.

Primero estabilizar multi-tenancy.

Después agregar UI para organizaciones.

---

# FASE 25 — Frontend

Una vez que backend sea compatible:

Agregar gradualmente:

```text
OrganizationContext
```

o equivalente.

El frontend puede mostrar:

```text
Curso 4°A
Mis invitaciones
Configuración
Usuarios
```

Pero el frontend nunca es responsable de la seguridad real.

Aunque alguien manipule JavaScript o Network DevTools, backend debe bloquear acceso a otro tenant.

---

# FASE 26 — Escalado

Mantener inicialmente:

```text
1 frontend
1 backend
1 PostgreSQL
1 Cloudinary account
1 email provider
```

y múltiples organizaciones dentro de ellos.

No crear:

```text
backend por curso
database por curso
deploy por curso
```

La separación es lógica mediante `organization_id`.

---

# FASE 27 — Compatibilidad de despliegue

La implementación debe permitir, idealmente, este orden:

## Deploy A

Migraciones aditivas:

```text
organizations
organization_id nullable
```

Código antiguo todavía podría funcionar.

## Deploy B

Código nuevo entiende multi-tenancy.

## Deploy C

Después de validar producción:

```text
SET organization_id NOT NULL
```

Esto reduce riesgo comparado con ejecutar esquema y código incompatible simultáneamente.

---

# FASE 28 — Backup

Antes de aplicar migraciones en producción:

realizar backup/snapshot de PostgreSQL si el proveedor lo permite.

No usar el backup como sustituto de una migración segura.

---

# FASE 29 — Logging

Agregar logs útiles sin exponer datos sensibles.

Ejemplo:

```text
userId
organizationId
operation
resourceId
```

Nunca loggear:

```text
password
JWT completo
DB_PASSWORD
JWT_SECRET
Cloudinary secret
SMTP password
```

---

# FASE 30 — Resultado esperado

Al terminar:

```text
PLATAFORMA
│
├── Organization DEFAULT
│   ├── administrador existente
│   └── invitaciones existentes
│
├── Curso A
│   ├── Admin A
│   └── invitaciones A
│
└── Curso B
    ├── Admin B
    └── invitaciones B
```

Todos comparten:

```text
Spring Boot
PostgreSQL
Cloud Run
Cloudinary
Email Provider
```

pero sus datos están aislados mediante organización.

---

# CRITERIOS DE ACEPTACIÓN

La tarea NO se considera terminada hasta verificar:

- [ ] La base de datos existente no fue recreada.
- [ ] No se modificaron migraciones Flyway antiguas.
- [ ] No se perdieron usuarios.
- [ ] No se perdieron invitaciones.
- [ ] No cambiaron IDs existentes.
- [ ] No cambiaron slugs existentes.
- [ ] Los enlaces públicos anteriores siguen funcionando.
- [ ] El administrador actual sigue pudiendo iniciar sesión.
- [ ] Sus invitaciones actuales siguen apareciendo.
- [ ] Existe `Organization`.
- [ ] Usuarios están asociados a una organización.
- [ ] Invitaciones están asociadas a una organización.
- [ ] Nuevos administradores pueden pertenecer a organizaciones diferentes.
- [ ] ADMIN A no puede leer datos de ADMIN B.
- [ ] ADMIN A no puede modificar datos de ADMIN B.
- [ ] ADMIN A no puede borrar datos de ADMIN B.
- [ ] El organizationId se obtiene del contexto autenticado.
- [ ] El frontend no controla la autorización multi-tenant.
- [ ] Los endpoints públicos existentes siguen funcionando.
- [ ] Flyway arranca correctamente.
- [ ] Todos los tests existentes continúan pasando.
- [ ] Se agregaron tests de aislamiento multi-tenant.

---

# FORMA DE TRABAJO DEL AGENTE

Aplicar los cambios en pequeñas etapas.

Antes de cada modificación:

1. inspeccionar implementación actual;
2. identificar dependencias;
3. preservar compatibilidad;
4. modificar únicamente lo necesario.

Después de cada etapa:

1. compilar;
2. ejecutar tests;
3. revisar migraciones;
4. verificar que no aparezcan regresiones.

Si encuentra una diferencia entre estas instrucciones y el código real:

> preservar el comportamiento actual y adaptar la implementación al proyecto real.

No inventar tablas o clases si ya existe un concepto equivalente.

---

# PRIORIDAD

Orden de prioridades:

```text
1. NO perder datos
2. NO romper producción
3. aislamiento entre organizaciones
4. compatibilidad con funcionalidades existentes
5. seguridad backend
6. mantenibilidad
7. nuevas funcionalidades
```

La migración debe ser conservadora.

El objetivo no es rehacer la aplicación.

El objetivo es **evolucionar la aplicación actual a multi-tenant conservando todo lo que ya funciona**.
