# Diagnóstico y solución del pantallazo blanco inicial de la PWA

Quiero que investigues y corrijas el **pantallazo blanco que aparece al
abrir la aplicación web/PWA antes de que se muestre el loader del
`index.html`**.

## Objetivo

Al abrir la aplicación, actualmente ocurre algo parecido a esto:

1.  Se abre la app.
2.  Aparece una pantalla totalmente blanca.
3.  Después aparece el loader definido en `index.html`.
4.  Finalmente carga React y se muestra la aplicación.

Quiero eliminar o reducir al mínimo ese primer pantallazo blanco.

## Importante

**NO usar como solución desactivar, eliminar o impedir la actualización
de la PWA.**

No quiero que se eliminen mecanismos de actualización del Service
Worker, actualización de versión, detección de nuevas versiones,
actualización automática/manual de la PWA ni ningún mecanismo existente
que permita que los usuarios reciban nuevas versiones de la aplicación.

Si la actualización de la PWA está relacionada con el problema, hay que
encontrar una solución que permita:

-   mantener las actualizaciones;
-   mantener el Service Worker;
-   mantener el comportamiento correcto de instalación de la PWA;
-   y al mismo tiempo evitar el pantallazo blanco.

## Investigación requerida

Primero encontrar exactamente **en qué momento aparece el blanco**.

Revisar como mínimo:

-   `index.html`
-   `<head>`
-   `<body>`
-   `#root`
-   loader inicial
-   CSS del loader
-   CSS global
-   scripts cargados antes del render
-   bundle principal de React
-   `main.tsx` / `main.jsx`
-   inicialización de React
-   `manifest.json` o manifest generado por Vite/PWA
-   `background_color`
-   `theme_color`
-   `<meta name="theme-color">`
-   configuración de `vite-plugin-pwa`, si existe
-   Service Worker
-   proceso de registro del Service Worker
-   estrategia de actualización de la PWA
-   splash inicial de la PWA instalada
-   caché del shell de la aplicación
-   navegación inicial
-   restauración de sesión/autenticación
-   requests que puedan estar bloqueando el primer render
-   posibles errores JavaScript durante el arranque
-   FOUC / flash of unstyled content
-   first paint / first contentful paint

## Punto clave

El loader ya está puesto en `index.html`, pero el problema es que:

**primero aparece blanco y recién después aparece ese loader.**

Por lo tanto, no asumir que agregar otro loader en React soluciona el
problema.

Hay que investigar qué ocurre **antes de que el navegador llegue a
pintar el loader del `index.html`**.

## Revisar especialmente PWA instalada

Como el problema se observa al abrir la aplicación instalada en
celular/escritorio, revisar si esa pantalla blanca pertenece a:

-   splash generado por el sistema operativo;
-   `background_color` del manifest;
-   fondo inicial del WebView;
-   navegación entre el shell cacheado y el documento actualizado;
-   activación de un nuevo Service Worker;
-   recarga provocada por actualización;
-   `skipWaiting`;
-   `clientsClaim`;
-   `registerType`;
-   `autoUpdate`;
-   actualización del precache;
-   invalidación del `index.html`;
-   doble reload durante una actualización.

Si se detecta que existe una recarga provocada por una nueva versión,
**no eliminar el sistema de actualización**. Corregir el flujo para que
la transición sea visualmente limpia.

## Loader inicial

Verificar que el loader que está actualmente en `index.html`:

-   no dependa de React;
-   no dependa de JavaScript para hacerse visible;
-   no dependa de un CSS externo que tenga que descargarse primero;
-   tenga estilos críticos disponibles inmediatamente;
-   tenga un fondo definido;
-   ocupe toda la pantalla;
-   se muestre antes de montar React.

También comprobar que el `body`, `html`, `#root` y el fondo de la PWA no
tengan colores diferentes que puedan producir un flash.

## Autenticación

Revisar también el flujo inicial de autenticación.

Determinar si React está esperando:

-   restaurar token;
-   leer cookie;
-   consultar `/me`;
-   validar sesión;
-   cargar usuario;
-   renovar token;
-   cargar configuración inicial;

antes de renderizar la interfaz.

Eso puede explicar un blanco posterior, pero necesito distinguir
claramente:

-   blanco antes del loader;
-   loader;
-   espera de autenticación;
-   render final.

## Diagnóstico

Antes de modificar código, identificar la causa concreta.

Quiero que informes algo similar a:

``` text
Inicio PWA
↓
pantalla del sistema / background manifest
↓
index.html
↓
loader inicial
↓
bundle JS
↓
React
↓
restauración de sesión
↓
App
```

Indicar en qué paso ocurre actualmente el pantallazo blanco.

## Solución

Aplicar la solución más pequeña y correcta posible.

No hacer cambios grandes en la arquitectura si no son necesarios.

La solución debe mantener:

-   PWA funcionando;
-   instalación funcionando;
-   Service Worker funcionando;
-   caché funcionando;
-   actualización de versiones funcionando;
-   autenticación funcionando.

## Validación

Después del cambio probar al menos estos escenarios:

1.  Primera apertura de la aplicación.
2.  Segunda apertura con archivos ya cacheados.
3.  Aplicación cerrada completamente y vuelta a abrir.
4.  Aplicación instalada como PWA.
5.  Navegador normal.
6.  Usuario con sesión iniciada.
7.  Usuario sin sesión.
8.  Después de desplegar una nueva versión.
9.  Cuando existe un Service Worker viejo y aparece una versión nueva.
10. Con conexión lenta.

## Resultado esperado

Al abrir la aplicación no debería existir una transición:

``` text
BLANCO
→ loader
→ app
```

Debería verse algo equivalente a:

``` text
splash/fondo de la aplicación
→ loader
→ app
```

sin flashes blancos perceptibles.

## Restricción final

No aceptar como solución:

> "Desactivar las actualizaciones de la PWA."

Si las actualizaciones están provocando el problema, solucionar
específicamente **la transición durante la actualización**, manteniendo
el mecanismo de actualización operativo.
