# Backend de Treasury System

API Java 17 con Spring Boot 4.0.6, WebMVC, Security, JPA, Flyway y Gradle. Los comandos se ejecutan desde `backend/`.

## Arquitectura

Los módulos separan dominio y puertos (`core`), casos de uso (`application`), composición Spring (`config`) y
adaptadores web/persistencia (`infrastructure`). `shared` centraliza paginación, CORS, excepciones y respuestas de
error.

Módulos actuales: Alumno, Apoderado, Familia, Usuario/autenticación, Tesorería, Eventos escolares y Stands.

## Perfiles

- `dev`: PostgreSQL y Hibernate `update`.
- `test`: H2 en memoria y `create-drop`.
- `prod`: PostgreSQL TLS, Flyway y Hibernate `validate`.

La aplicación usa el context path `/tesoreria`; la API parte de `/api/v1`.

## Ejecución local

Completar las variables requeridas en un `.env` local y ejecutar:

```bash
./gradlew bootRun
```

No es necesario construir previamente. Para limpiar artefactos antes de iniciar:

```bash
./gradlew clean bootRun
```

## Pruebas

```bash
./gradlew test
```

La suite utiliza JUnit 5 y Mockito. Incluye pruebas unitarias, controladores con MockMvc standalone y una prueba de
seguridad con `@SpringBootTest`/`@AutoConfigureMockMvc`.

## PMD y JaCoCo

```bash
./gradlew pmdMain
./gradlew jacocoTestReport
./gradlew jacocoTestCoverageVerification
```

- PMD 6.55.0 usa `config/pmd/ruleset.xml`.
- `pmdTest` está deshabilitado.
- JaCoCo 0.8.12 genera informes HTML/XML.
- La cobertura mínima configurada es 70 % sobre las clases incluidas.

Informes principales:

```text
build/reports/pmd/main.html
build/reports/jacoco/test/html/index.html
build/reports/tests/test/index.html
```

## Build y quality gate

```bash
./gradlew bootJar
./gradlew check
```

`check` ejecuta los tests, PMD para código principal y la verificación JaCoCo. No deben reducirse reglas, cobertura o
exclusiones únicamente para hacer pasar el gate.

## Comandos resumidos

| Acción           | Comando                      |
|------------------|------------------------------|
| Iniciar          | `./gradlew bootRun`          |
| Tests            | `./gradlew test`             |
| PMD              | `./gradlew pmdMain`          |
| Cobertura        | `./gradlew jacocoTestReport` |
| Build ejecutable | `./gradlew bootJar`          |
| Quality gate     | `./gradlew check`            |

En Windows usar `gradlew.bat` cuando el shell no ejecute `./gradlew`.

## Base de datos

Flyway aplica `src/main/resources/db/migration/V1__create_initial_schema.sql` en producción antes de Hibernate
`validate`. No editar migraciones aplicadas; agregar una versión posterior para cualquier cambio de esquema.
Consulta [NEON_DEPLOYMENT.md](NEON_DEPLOYMENT.md) para PostgreSQL/Neon, Secret Manager y Cloud Run.

## Web Push y contador del ícono

Las notificaciones del dispositivo usan Web Push estándar y claves VAPID. Generar una pareja una sola vez:

```bash
./gradlew generateVapidKeys
```

Guardar los valores producidos de forma segura y configurar:

```text
WEB_PUSH_ENABLED=true
WEB_PUSH_PUBLIC_KEY=<clave pública generada>
WEB_PUSH_PRIVATE_KEY=<clave privada generada>
WEB_PUSH_SUBJECT=mailto:correo-responsable@dominio.cl
```

La clave privada no debe agregarse al repositorio. En producción, las tres variables se inyectan desde los secretos
de GitHub Actions. Si faltan o son inválidas, la API informa que Web Push no está disponible y el frontend no solicita
permisos al usuario.
