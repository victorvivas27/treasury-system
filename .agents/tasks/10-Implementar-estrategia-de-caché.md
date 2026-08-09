# Implementar estrategia de caché en la aplicación de Tesorería

Analiza la aplicación completa de **Tesorería** y agrega una estrategia de caché siguiendo buenas prácticas para una aplicación financiera desarrollada con **Java + Spring Boot**.

## Objetivo

Mejorar el rendimiento de la aplicación, reducir consultas innecesarias a PostgreSQL y disminuir los tiempos de respuesta de endpoints que consultan repetidamente información que cambia poco.

IMPORTANTE:

* NO cachear indiscriminadamente.
* NO permitir que el caché provoque información financiera desactualizada.
* Antes de modificar código, identificar qué servicios y endpoints realmente se beneficiarían del caché.

---

# 1. Analizar la aplicación antes de implementar

Revisar:

* Controllers
* Services
* Repositories
* Consultas JPQL / SQL
* Dashboards
* Reportes
* Catálogos
* Configuraciones
* Endpoints utilizados frecuentemente por el frontend

Identificar:

* consultas ejecutadas muchas veces;
* consultas costosas;
* información que cambia poco;
* información que puede reutilizarse entre requests;
* endpoints que actualmente consultan la base de datos aunque los datos no hayan cambiado.

No agregar caché simplemente por existir un método GET.

---

# 2. Clasificar la información

Separar los datos en tres grupos.

## A. Recomendado para caché

Priorizar:

* tipos de transacción;
* categorías;
* bancos;
* tipos de cuentas;
* monedas;
* configuraciones generales;
* parámetros del sistema;
* permisos o información relativamente estática;
* catálogos;
* listas maestras;
* consultas que cambian muy pocas veces.

TTL sugerido:

30 minutos a varias horas dependiendo del dato.

---

## B. Caché de corta duración

Analizar si resulta beneficioso cachear:

* estadísticas del dashboard;
* totales agregados;
* indicadores;
* reportes resumidos;
* consultas analíticas costosas.

Estos datos pueden utilizar caché solamente durante períodos cortos.

TTL recomendado:

30 segundos a 5 minutos.

El objetivo es evitar que múltiples usuarios ejecuten repetidamente la misma consulta pesada.

---

## C. NO cachear por defecto

Evitar caché sobre:

* saldo actual;
* movimientos recientes;
* transferencias;
* pagos;
* ingresos;
* egresos;
* conciliaciones;
* operaciones pendientes;
* información crítica que necesite reflejar inmediatamente una transacción.

Si existe una justificación técnica para cachear alguno de estos datos, utilizar TTL muy corto e invalidación explícita.

Nunca sacrificar consistencia financiera solamente para mejorar rendimiento.

---

# 3. Tecnología de caché

Utilizar **Spring Cache Abstraction**.

No acoplar directamente los Services a una implementación específica.

Utilizar:

```java
@EnableCaching
```

y cuando corresponda:

```java
@Cacheable
@CacheEvict
@CachePut
```

---

# 4. Implementación recomendada

Evaluar primero cómo está desplegada la aplicación.

### Si existe una única instancia de Spring Boot

Utilizar preferentemente:

**Caffeine Cache**

por ser rápido, simple y no necesitar infraestructura adicional.

Dependencia sugerida:

```gradle
implementation 'com.github.ben-manes.caffeine:caffeine'
implementation 'org.springframework.boot:spring-boot-starter-cache'
```

---

### Si existen múltiples instancias

Si Tesorería puede ejecutarse con varias instancias en Cloud Run u otro entorno distribuido, utilizar preferentemente:

**Redis**

De esta forma todas las instancias utilizan el mismo caché.

No utilizar exclusivamente un caché local cuando múltiples instancias necesiten compartir información consistente.

---

# 5. Crear configuración centralizada

No distribuir TTL y nombres de caché arbitrariamente por toda la aplicación.

Crear una configuración central, por ejemplo:

```text
config/
    CacheConfig.java
```

Definir claramente los caches existentes.

Ejemplo conceptual:

```text
transactionTypes
categories
banks
accountTypes
currencies
systemConfigurations
dashboardSummary
```

Cada caché debe tener un nombre explícito relacionado con el dominio.

Evitar nombres genéricos como:

```text
cache1
data
results
temp
```

---

# 6. Claves del caché

Las claves deben considerar correctamente los parámetros de las consultas.

Por ejemplo, si una consulta depende de:

* userId
* companyId
* accountId
* fecha
* moneda
* filtros

estos valores deben formar parte de la clave cuando corresponda.

Nunca permitir que un usuario pueda recibir información cacheada perteneciente a otro usuario o empresa.

Esto es especialmente importante en Tesorería.

Ejemplo:

```java
@Cacheable(
    value = "dashboardSummary",
    key = "#companyId + ':' + #year + ':' + #month"
)
```

---

# 7. Invalidación

La invalidación es obligatoria cuando un dato cacheado es modificado.

Ejemplo conceptual:

```java
@CacheEvict(value = "categories", allEntries = true)
public Category updateCategory(...) {
    ...
}
```

Aplicarla en operaciones:

* create;
* update;
* delete.

Después de una modificación, una lectura posterior debe poder obtener información actualizada.

---

# 8. Dashboard

Revisar especialmente el dashboard porque normalmente contiene varias consultas agregadas.

Si actualmente cada entrada al dashboard ejecuta consultas como:

```text
SUM ingresos
SUM egresos
saldo mensual
cantidad de operaciones
estadísticas por categoría
estadísticas por banco
```

evaluar crear un caché específico.

Ejemplo:

```text
dashboardSummary
```

con TTL corto, aproximadamente:

```text
1 minuto
```

La clave debe incluir los parámetros que cambien el resultado:

```text
companyId
usuario, si aplica
mes
año
otros filtros
```

Cuando se registra, modifica o elimina un movimiento relacionado, invalidar el caché correspondiente al dashboard.

---

# 9. Evitar problemas comunes

No implementar:

* caché infinito;
* caché sin TTL;
* claves incorrectas;
* caché compartido entre usuarios accidentalmente;
* caché de entidades JPA administradas;
* almacenamiento de información sensible innecesaria;
* caché de excepciones;
* caché de resultados incorrectos;
* caché sobre métodos de escritura.

Preferir cachear DTOs o resultados inmutables cuando sea posible.

---

# 10. Observabilidad

Agregar logs solamente donde aporten valor.

Debe ser posible comprobar:

* cuándo una consulta realmente llega a PostgreSQL;
* cuándo un resultado puede provenir del caché;
* cuándo un caché es invalidado.

No llenar producción con logs innecesarios.

Si Spring Boot Actuator ya está instalado, evaluar métricas relacionadas con caché.

---

# 11. Tests

Agregar pruebas para verificar:

### Cache hit

Dos llamadas iguales deberían provocar una sola consulta al repository cuando el resultado sea cacheable.

### Cache eviction

Después de modificar información:

```text
GET
GET
UPDATE
GET
```

el último GET debe recuperar la información nueva.

### Separación por parámetros

Dos requests con diferentes:

```text
companyId
accountId
usuario
fecha
```

no deben compartir incorrectamente el mismo resultado cacheado.

---

# 12. No romper funcionalidad existente

La implementación debe conservar:

* API actual;
* contratos de los endpoints;
* DTOs;
* seguridad;
* autenticación;
* autorización;
* reglas de negocio;
* validaciones;
* tests existentes.

No cambiar contratos REST solamente para agregar caché.

---

# 13. Entrega esperada

Al terminar, documentar:

1. Qué métodos fueron cacheados.
2. Por qué se eligieron.
3. Nombre de cada caché.
4. TTL utilizado.
5. Estrategia de generación de claves.
6. Qué operaciones invalidan cada caché.
7. Qué datos se decidió NO cachear y por qué.
8. Si se utilizó Caffeine o Redis y la razón.
9. Qué mejora se espera obtener.
10. Qué tests fueron agregados.

Antes de implementar, mostrar un pequeño inventario como:

| Caché            | Información       |   TTL | Invalidación                           |
| ---------------- | ----------------- | ----: | -------------------------------------- |
| categories       | Categorías        |   1 h | create/update/delete                   |
| banks            | Bancos            |   1 h | create/update/delete                   |
| currencies       | Monedas           |   6 h | modificación                           |
| dashboardSummary | Resumen dashboard | 1 min | movimiento creado/modificado/eliminado |

Después implementar únicamente los caches que tengan una justificación clara.

## Principio principal

En Tesorería:

**consistencia de la información > rendimiento.**

La caché debe reducir trabajo innecesario sin permitir que saldos, movimientos u otra información financiera crítica quede desactualizada.

