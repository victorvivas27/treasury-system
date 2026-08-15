Quiero que analices y mejores el rendimiento de mi aplicación en producción sin cambiar su comportamiento funcional.

La aplicación usa:

* Backend: Spring Boot con Java 21
* Base de datos: PostgreSQL
* Frontend separado
* Despliegue backend en Google Cloud Run
* Gradle
* Spring Security con JWT

Objetivo principal:

Reducir tiempos de respuesta, consumo innecesario de CPU/memoria, consultas lentas a base de datos y problemas de escalabilidad, manteniendo la aplicación estable y segura.

Antes de modificar código:

1. Analiza la arquitectura actual del proyecto.
2. Revisa `build.gradle`, configuración de Spring Boot, perfiles `application.yml`, `application-prod.yml` y configuración de base de datos.
3. Identifica posibles problemas reales de rendimiento.
4. No hagas optimizaciones prematuras.
5. No cambies funcionalidad, contratos de API ni reglas de negocio.
6. No elimines validaciones ni mecanismos de seguridad para ganar rendimiento.

Revisa especialmente los siguientes puntos:

### 1. Base de datos

Busca:

* Problemas N+1 en JPA/Hibernate.
* Relaciones `EAGER` innecesarias.
* Consultas que traigan demasiados registros.
* Consultas sin paginación.
* Consultas repetidas dentro de loops.
* Uso incorrecto de `findAll()`.
* Falta de índices en columnas usadas frecuentemente en `WHERE`, `JOIN`, `ORDER BY` o búsquedas.
* Queries que puedan optimizarse.
* Proyecciones DTO cuando no sea necesario cargar una entidad completa.

No agregues índices indiscriminadamente. Justifica cada índice recomendado.

### 2. Hibernate / JPA

Analiza:

* `open-in-view`
* estrategias de fetch
* lazy loading
* batch fetching
* cantidad de queries generadas
* tamaño de consultas
* transacciones innecesariamente largas
* métodos que deberían usar `@Transactional(readOnly = true)`

Evita cambios que puedan provocar `LazyInitializationException`.

### 3. Pool de conexiones

Revisa la configuración de HikariCP:

* `maximumPoolSize`
* `minimumIdle`
* `connectionTimeout`
* `idleTimeout`
* `maxLifetime`

Comprueba que los valores tengan sentido para Google Cloud Run y PostgreSQL.

No aumentes el pool simplemente para conseguir más rendimiento. Considera que múltiples instancias de Cloud Run pueden multiplicar el número total de conexiones a PostgreSQL.

### 4. Spring Boot

Busca:

* beans o servicios pesados inicializados innecesariamente
* operaciones bloqueantes evitables
* llamadas repetidas
* serialización excesiva de objetos
* DTOs demasiado grandes
* endpoints que devuelvan información que el frontend no utiliza
* logging excesivo en producción

Asegúrate de que en producción no esté activo:

```yaml
spring:
  jpa:
    show-sql: true
```

### 5. JWT y seguridad

Analiza el código de autenticación y validación JWT.

Busca:

* parsing repetido del mismo token dentro de una misma request
* consultas innecesarias de usuario en cada request
* operaciones costosas dentro de filtros de seguridad

No reduzcas la seguridad del sistema para mejorar rendimiento.

### 6. Google Cloud Run

Revisa si la aplicación está preparada correctamente para Cloud Run.

Analiza:

* memoria
* CPU
* concurrencia
* número máximo de instancias
* número mínimo de instancias
* cold starts
* tiempo de startup
* tamaño de la imagen Docker
* configuración JVM

No hagas cambios de infraestructura automáticamente si no están definidos en el repositorio. En esos casos dame primero una recomendación concreta.

### 7. Docker

Revisa el Dockerfile y detecta:

* capas innecesarias
* imagen runtime demasiado grande
* archivos innecesarios copiados
* configuraciones JVM mejorables
* oportunidades para reducir tiempo de startup o consumo de memoria

Mantén Java 21.

### 8. Caché

Identifica operaciones que realmente puedan beneficiarse de caché.

No agregues caché global de manera indiscriminada.

Para cada caché propuesta explica:

* qué dato se cacheará
* cuánto tiempo debería durar
* cómo se invalida
* qué riesgo de datos obsoletos existe

### 9. Endpoints

Analiza los controladores y servicios buscando endpoints potencialmente lentos.

Para cada problema encontrado quiero:

* endpoint afectado
* causa
* impacto estimado
* solución propuesta
* riesgo del cambio

### 10. Logging

En producción evita logging excesivo.

Busca especialmente:

* logs dentro de loops
* SQL logging
* payloads completos
* tokens JWT
* passwords
* secretos
* información sensible

Nunca registres secretos ni tokens completos.

## Forma de trabajo

Primero haz una auditoría.

Clasifica cada hallazgo como:

* CRÍTICO
* ALTO
* MEDIO
* BAJO

Para cada hallazgo indica:

1. Archivo
2. Código afectado
3. Problema
4. Impacto
5. Solución
6. Riesgo del cambio

Después implementa primero solamente optimizaciones de bajo riesgo y alto impacto.

Después de cada cambio:

* ejecuta los tests
* ejecuta `./gradlew check`
* verifica que compile correctamente
* revisa que no cambie el comportamiento de las APIs

Si un cambio importante no puede comprobarse con los tests existentes, agrega un test apropiado.

No hagas refactors estéticos que no aporten rendimiento.

No agregues dependencias nuevas salvo que sean realmente necesarias.

## Muy importante

No quiero simplemente cambios de código.

Quiero evidencia de que cada cambio puede mejorar el rendimiento.

Cuando sea posible compara:

ANTES:

* cantidad de queries
* tiempo aproximado
* consumo
* comportamiento

DESPUÉS:

* cantidad de queries
* tiempo aproximado
* consumo
* comportamiento

Al finalizar entrega un resumen con:

### Cambios realizados

### Problemas encontrados pero no modificados

### Recomendaciones para Cloud Run

### Recomendaciones para PostgreSQL

### Riesgos pendientes

### Próximos 5 cambios con mayor impacto potencial
