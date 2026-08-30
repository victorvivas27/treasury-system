# Tareas pendientes para Codex --- Treasury System

## Objetivo general

Realizar tres mejoras en el proyecto **Treasury System** relacionadas
con la experiencia visual del frontend y con la administración anual de
los cursos.

Antes de modificar código, revisar la implementación actual y reutilizar
la arquitectura, componentes, variables CSS y convenciones existentes.
Evitar soluciones rápidas que dupliquen estilos o introduzcan
comportamientos inconsistentes.

------------------------------------------------------------------------

## 1. Sidebar --- Unificar y suavizar la animación de Header, Nav y Footer

### Problema actual

Al abrir y cerrar el sidebar, sus distintas partes no se sienten
sincronizadas:

-   `SidebarHeader`
-   `SidebarNav`
-   `SidebarFooter`

Los iconos, textos y contenedores cambian de posición o tamaño en
momentos diferentes. Esto genera saltos visuales y hace que parezca que
cada sección ejecuta su propia animación.

Actualmente se perciben comportamientos similares a:

``` text
icono → se mueve
texto → desaparece
icono → vuelve a moverse
footer → termina después
header → termina antes
```

### Objetivo

Crear **un único sistema de animación compartido para todo el sidebar**.

La apertura y el cierre deben sentirse como una sola animación continua
y coordinada.

### Requisitos

-   Unificar duración de las transiciones.
-   Unificar `cubic-bezier` / easing.
-   Sincronizar la aparición y desaparición de los textos.
-   Sincronizar Header, Nav y Footer.
-   Evitar que los iconos den saltos durante la transición.
-   Evitar múltiples movimientos innecesarios de los iconos.
-   Mantener los iconos visualmente estables mientras cambia el ancho
    del sidebar.
-   Revisar `padding`, `gap`, `justify-content`, anchos de wrappers y
    cualquier otra propiedad que cambie entre estado expandido y
    colapsado y pueda provocar desplazamientos.
-   No resolverlo agregando delays independientes a cada componente.

### Resultado visual esperado

La animación debe ser:

-   suave;
-   limpia;
-   elegante;
-   ligeramente lenta;
-   sincronizada;
-   sin saltos de iconos;
-   sin que Header, Nav y Footer parezcan animaciones independientes.

Priorizar que el cambio principal sea el **ancho del sidebar +
aparición/desaparición del texto**, en lugar de mover repetidamente los
iconos.

------------------------------------------------------------------------

## 2. Home --- Reemplazar animaciones violentas por animaciones delicadas

### Secciones a revisar

Revisar especialmente las animaciones de las cards/secciones:

### Nuestro manifiesto

**Lo que nos mueve**

Y la sección:

### Aplicación instalable

**¡Instala Tesorería Escolar en tu celular!**

> Es muy fácil: agrégala a tu pantalla de inicio y ábrela como cualquier
> otra aplicación.

También revisar el SVG y los elementos visuales asociados a esta
sección.

### Problema actual

Las animaciones son demasiado violentas, especialmente en desktop.

Algunos elementos parecen desplazarse demasiado lejos, incluso como si
salieran de la pantalla, y luego regresan hasta su posición final. Esto
genera una sensación brusca y poco cuidada.

### Objetivo

Mantener las animaciones activadas por viewport/scroll, pero reemplazar
el movimiento actual por una animación mucho más delicada, progresiva y
elegante.

### Comportamiento que debe mantenerse

Las animaciones deben seguir ejecutándose:

-   al entrar inicialmente en la página/sección;
-   al hacer scroll hacia abajo y volver a entrar en el viewport;
-   al hacer scroll hacia arriba y volver a entrar en el viewport.

No convertirlas en animaciones que se ejecuten solamente una vez.

### Dirección visual sugerida

Priorizar combinaciones pequeñas de:

``` css
opacity
translateY pequeño
scale muy leve
```

Como referencia conceptual:

``` text
opacity: 0 → 1
translateY: 20px → 0
scale: 0.98 → 1
duración aproximada: 700–1000ms
```

Estos valores son solamente una referencia. Revisar primero la
implementación existente y elegir los valores que mejor encajen con el
diseño actual.

### Evitar

Evitar movimientos grandes como:

``` css
translateX(-100vw)
translateX(100vw)
translateY(200px)
```

Evitar cualquier transformación que haga parecer que las cards o el SVG
salen completamente de la pantalla antes de volver a su lugar.

### Resultado esperado

La animación debe sentirse:

-   más lenta;
-   más delicada;
-   elegante;
-   natural;
-   sin movimientos bruscos;
-   sin saltos al acomodarse;
-   consistente tanto en desktop como en mobile/tablet.

------------------------------------------------------------------------

## 3. Administración --- Permitir actualizar curso y año conservando el historial

### Contexto funcional

Desde `SUPER_ADMIN` se puede crear una nueva administración asociada a
un curso y año lectivo.

Ejemplo inicial:

``` text
1° A Básico
2026
```

Durante todo 2026 esa administración acumula información como:

-   ingresos;
-   gastos;
-   pagos;
-   stands;
-   movimientos y demás información relacionada.

Al comenzar el siguiente año, la misma administración debería poder
continuar con el curso siguiente:

``` text
2° A Básico
2027
```

Y posteriormente:

``` text
3° A Básico
2028
```

### Problema actual

Anteriormente existía la posibilidad de modificar estos datos, pero
actualmente esa opción ya no está disponible.

Esto provoca que una administración creada para `1° A Básico 2026` no
tenga una forma clara de avanzar a `2° A Básico 2027` al comenzar el
siguiente año lectivo.

### Solución deseada

Revisar la posibilidad de volver a incorporar esta funcionalidad dentro
de **Configuración**.

Debe estar disponible para el administrador correspondiente y también
para `SUPER_ADMIN`, respetando los permisos actuales del sistema.

Una interfaz posible sería:

``` text
Curso actual
2° A Básico

Año lectivo
2027

[Actualizar curso]
```

### Requisito crítico: conservar el historial

No implementar esto simplemente modificando dos strings sin revisar
primero el modelo de datos.

Si se cambia:

``` text
1° A Básico 2026
```

por:

``` text
2° A Básico 2027
```

los datos históricos de 2026 **no deben pasar a mostrarse como si
pertenecieran a 2° A Básico 2027**.

El sistema debe poder mantener conceptualmente un historial como:

``` text
2026 · 1° A Básico
2027 · 2° A Básico
2028 · 3° A Básico
```

### Antes de implementar

Revisar:

-   entidades del dominio relacionadas con administración, curso y año;
-   modelo de base de datos;
-   migraciones existentes;
-   relaciones de ingresos, gastos, pagos, stands y demás movimientos
    con la administración/período;
-   endpoints actuales de actualización;
-   permisos de `ADMIN` y `SUPER_ADMIN`;
-   pantalla actual de Configuración;
-   comportamiento histórico existente.

### Decisión de arquitectura

Determinar si el modelo actual ya soporta períodos/años históricos o si
actualmente `curso` y `año` son solamente propiedades mutables de una
administración.

Si son propiedades mutables, diseñar una solución que permita avanzar de
año **sin perder la identidad histórica de cada período**.

No realizar una migración destructiva ni modificar el significado de
registros históricos existentes sin analizar previamente las relaciones.

### Resultado esperado

El administrador debería poder finalizar un año lectivo y comenzar el
siguiente manteniendo la continuidad de su administración, mientras que
el sistema conserva correctamente los datos correspondientes a cada
curso y año.

------------------------------------------------------------------------

## Orden recomendado de trabajo

1.  Corregir y unificar las animaciones del Sidebar.
2.  Corregir las animaciones de Home.
3.  Analizar el modelo de datos de administración/curso/año antes de
    implementar la tercera tarea.

En las dos primeras tareas, revisar los archivos reales antes de
modificar estilos y evitar duplicar CSS. En la tercera, **no comenzar
por la UI**: primero entender cómo se almacenan y relacionan actualmente
los datos históricos.
