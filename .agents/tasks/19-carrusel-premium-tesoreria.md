# Dar estilo premium al carrusel de fotos existente

La galería ya está implementada. Quiero cambiar únicamente su
presentación visual para que se vea como un **carrusel moderno, elegante
y premium** dentro del Home de Tesorería.

No modificar la lógica de carga de imágenes ni los datos existentes.

## Diseño principal

Quiero un carrusel tipo **center mode / featured slide**:

-   La foto activa debe aparecer grande y centrada.
-   La fotografía anterior y la siguiente deben quedar parcialmente
    visibles a los costados.
-   La foto activa debe tener mayor escala y protagonismo.
-   Las fotos laterales pueden verse ligeramente más pequeñas y con
    menor opacidad.
-   Debe quedar claro visualmente que existen más imágenes hacia ambos
    lados.

Referencia conceptual:

``` text
        FOTO ANTERIOR        FOTO ACTIVA         FOTO SIGUIENTE
           parcialmente      protagonista         parcialmente
             visible                               visible

       ┌──────────┐      ┌──────────────────┐      ┌──────────┐
       │          │      │                  │      │          │
       │          │      │                  │      │          │
       └──────────┘      └──────────────────┘      └──────────┘

                         ●  ○  ○
```

## Aspecto visual

La imagen activa debe sentirse como una pieza principal del Home.

Aplicar:

-   Bordes redondeados elegantes.
-   `object-fit: cover`.
-   Buena proporción horizontal, evitando imágenes demasiado altas.
-   Separación limpia entre slides.
-   Transiciones suaves.
-   Sombras muy sutiles si son coherentes con el diseño actual.
-   No utilizar efectos exagerados.

La imagen activa puede utilizar aproximadamente:

``` css
scale: 1;
opacity: 1;
```

Las laterales:

``` css
scale: 0.88;
opacity: 0.55;
```

La transición entre estados debe sentirse fluida, aproximadamente entre
`400ms` y `600ms`.

## Navegación

Agregar controles visuales elegantes.

### Flechas

-   Flecha izquierda y derecha.
-   Posicionadas sobre los laterales del carrusel.
-   Botones circulares o semitransparentes.
-   Diseño minimalista.
-   Mostrar claramente el estado hover.

### Indicadores

Debajo del carrusel colocar dots:

``` text
●  ○  ○
```

El indicador activo debe distinguirse claramente.

Si combina con el diseño actual, el indicador activo puede transformarse
en una pequeña cápsula:

``` text
━━  •  •
```

## Movimiento

La transición entre fotografías debe ser suave.

Idealmente:

-   Slide horizontal.
-   Ligero cambio de escala.
-   Cambio progresivo de opacidad en las imágenes laterales.
-   Sin saltos visuales.

Evitar animaciones demasiado rápidas.

## Interacción

Debe permitir:

-   Click en flechas.
-   Click en indicadores.
-   Swipe en dispositivos táctiles.
-   Drag con mouse si la implementación actual lo permite.
-   Navegación por teclado cuando corresponda.

## Autoplay

Si se utiliza autoplay:

-   Cambiar aproximadamente cada 5 o 6 segundos.
-   Detener temporalmente cuando el usuario pasa el mouse sobre el
    carrusel.
-   Reiniciar después de una interacción manual.
-   No hacer autoplay demasiado rápido.

Si el autoplay perjudica la experiencia, priorizar navegación manual.

## Mobile

En móvil:

-   La imagen activa debe ocupar aproximadamente entre 85% y 92% del
    ancho.
-   Debe seguir viéndose una pequeña parte de la siguiente fotografía.
-   Permitir swipe horizontal natural.
-   Mantener indicadores debajo.
-   Las flechas pueden ocultarse si interfieren con la experiencia
    táctil.

Ejemplo:

``` text
┌────────────────────────┐  ┌──
│                        │  │
│      FOTO ACTIVA       │  │ siguiente
│                        │  │
└────────────────────────┘  └──

         ●  ○  ○
```

## Sensación buscada

Quiero que se sienta similar a un carrusel de una landing page moderna o
una aplicación premium:

-   limpio
-   elegante
-   visual
-   fluido
-   con buena jerarquía
-   sin parecer un slider genérico

La fotografía debe ser la protagonista.

## Importante

La galería ya funciona.

No rehacer la funcionalidad salvo que sea necesario para conseguir esta
presentación.

Priorizar cambios en:

-   CSS
-   layout
-   estados activos/inactivos
-   transiciones
-   controles
-   responsive

Mantener el estilo general y componentes visuales existentes del Home de
Tesorería.
