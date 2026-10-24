# Estilos compartidos

`theme.css` contiene **ocho colores base configurables**, una escala tonal derivada y los roles cromáticos. `global.css` importa ese tema y contiene las escalas de medidas y las reglas generales.

## Contrato cromático

Configurar únicamente `--base-neutral-light`, `--base-neutral-dark`, `--base-primary`, `--base-accent`, `--base-success`, `--base-warning`, `--base-error` y `--base-info`, al comienzo de `theme.css`. Son ocho entradas para ambos modos, sin duplicar las bases por modo. Las cuatro paletas se seleccionan en Configuración: Original, Azul y lima, Violeta y coral y Verde esmeralda y dorado. Cada bloque declara exactamente esas ocho bases.

Las variantes `--tone-*` usan colores relativos OKLCH: multiplicadores de luminosidad y croma, desplazamientos de matiz y opacidad. Se calibraron contra los colores existentes para conservar la identidad actual. Las transparencias reutilizan su tono opaco o el primer tono de la misma familia. Los coeficientes son recetas compartidas, no valores que configurar por paleta.

Hay 234 variantes tonales (128 opacas y 106 con transparencia) que representan los colores locales ya existentes; no son 234 colores base. Se conservan los 43 nombres cromáticos públicos, seis roles de sombra, un rol para el marco de ingreso del horario y un rol de acento nativo: **289 variables derivadas**, además de las ocho bases. Mantener el aspecto previo requiere conservar esta variedad; reducirla visualmente sería otro trabajo.

`--control-accent` deriva de información y reproduce los acentos nativos actuales de Chromium en claro y oscuro. Los componentes que ya definían su propio `accent-color` mantienen su prioridad. No es una novena base. La geometría y las marcas internas de los controles siguen a cargo del navegador.

Los componentes pueden usar los roles públicos `--color-*`, `--text-*`, `--icon-*`, `--sidebar-*`, `--palette-*`, `--border-color`, `--divider`, `--focus-ring`, `--overlay` y `--shadow-*`. Los estilos locales migrados usan también la escala `--tone-*`. Para cambios nuevos, preferir el rol semántico adecuado antes de elegir un tono concreto. No usar nombres de estados para categorías sin ese significado.

Las futuras paletas podrán sobrescribir las mismas ocho bases en `:root[data-palette="identificador"]`. Los componentes y las recetas de modo no necesitan conocer el identificador. Mantener las bases neutrales próximas a neutrales; validar contraste y diferenciación para cada conjunto de ocho valores. Ninguna fórmula garantiza accesibilidad para ocho colores arbitrarios.

El negro límite de las sombras se obtiene con luminosidad/croma cero: es un límite óptico de la escala, no una novena entrada. `transparent`, `currentColor` y los colores de sistema del navegador tampoco son bases configurables.

### Paletas dinámicas y contraste

`data-palette` y `app-palette` identifican la paleta; `data-theme` y `app-theme` mantienen el modo claro/oscuro/sistema de forma independiente. `data-font-family` y `app-font-family` seleccionan la familia tipográfica de forma independiente. `palette.ts` y `typography.ts` contienen los catálogos; los valores cromáticos configurables están en `theme.css`, y las familias locales en `typography.css`. Se conserva el identificador interno `green-turquoise` para Verde esmeralda y dorado por compatibilidad con la selección ya persistida.

El arranque inline restaura y valida tema, paleta y tipografía antes de iniciar React. Vite genera el CSS crítico desde `theme.css`, `typography.css` y `global.css`, además de obtener la lista de paletas desde `theme.css`. ThemeProvider aplica los cambios sin recargar y sincroniza `theme-color`, preferencias entre pestañas y los cambios del modo sistema. Las fuentes WOFF2 se sirven localmente con `font-display: swap`; las muestras tipográficas cargan las alternativas al abrir Configuración. Las licencias OFL están junto a sus archivos en `src/assets/fonts/{jetbrains-mono,space-mono,ibm-plex-mono}`. Las animaciones comunitarias observan `data-palette` además de `data-theme`.

`--recipe-neutral-dark` y `--recipe-neutral-light` reducen la saturación de las superficies de las paletas nuevas; Original conserva su escala calibrada. Estos dos roles, más `--text-on-primary` y `--text-on-info`, explican las cuatro variables derivadas adicionales. No son bases independientes.

Las recetas de contraste aclaran los estados de las paletas nuevas en oscuro y limitan la luminosidad del primario en claro. Se conserva cada HEX configurado. Dos variantes de categorías de Original (violeta oscuro y celeste claro) recibieron ajustes de luminosidad para cumplir 4.5:1 como texto; las bases y los fondos de Original permanecen iguales. La comprobación de tokens no sustituye una certificación completa de accesibilidad de todas las pantallas.

### Recursos independientes

- `ScheduleColorPalette.tsx`: colores que el usuario selecciona y persiste. No cambiar sus valores ni sus etiquetas mediante temas.
- `scheduleCards.ts`: valores predeterminados independientes para asignaturas/tipos; conserva la prioridad de `block.color`.
- `standSalesReport.css`: documento A4 autónomo con un esquema claro estable, independiente de la pantalla. Se importa como texto con `?inline`.
- `ButtonBack.tsx`, únicamente `fill="white"`: fotograma inicial que coincide con `/icons/Back.json`; el archivo de animación permanece intacto.
- Imágenes, vídeos, SVG/JSON decorativos y colores internos de bibliotecas de iconos: recursos independientes sin recoloreado nuevo. Las animaciones comunitarias que ya se tematizaban conservan ese comportamiento.

No hay excepciones de compatibilidad con colores fijos para controles, superficies, textos, navegación o estados normales. La comparación con transparencia en `captureElement.ts` es una condición técnica, no un color renderizado.

### Comprobación

`pnpm check:colors` verifica las ocho definiciones, dependencias de todos los roles, ciclos y literales fuera de las excepciones documentadas en `scripts/color-policy.mjs`. Forma parte de `pnpm lint`.

`node scripts/check-color-recipes.mjs` comprueba en Chromium los valores originales de la escala. `scripts/fixtures/color-reference.json` contiene únicamente datos de prueba; no participa en el tema ni configura paletas.

`node scripts/audit-color-system.mjs baseline-dark` registra una referencia; usar `DESIGN_THEME=light` para claro. Las fases `stage1-*`/`stage2-*` comparan contra las referencias locales. Las fases `mutation-*` cambian temporalmente las ocho bases en el navegador, abren gráficos y diálogos con API simulada, guardan evidencias y restauran los valores en `finally`. No escriben paletas en la aplicación. Usar `DESIGN_BASE_URL`, `DESIGN_VIEWPORTS` y `DESIGN_ROUTES` para seleccionar el entorno.

El sistema requiere soporte de colores relativos OKLCH. La validación realizada utiliza Chromium; no se afirma compatibilidad con navegadores antiguos.

## Dónde cambiar cada cosa

| Necesidad | Variables |
| --- | --- |
| Identidad cromática y ambos modos | Las ocho `--base-*` de `theme.css` |
| Títulos y texto | `--font-h1` a `--font-h4`, `--font-body`, `--font-small` |
| Etiquetas y botones | `--font-label`, `--font-button` |
| Familia de la interfaz | `--font-family-primary`, seleccionada desde Configuración |
| Interlineado y espaciado tipográfico | `--leading-body`, `--heading-leading`, `--font-letter-spacing` según la familia |
| Escala de texto | `--font-size-xs` a `--font-size-4xl` |
| Espacios comunes | `--space-1` a `--space-16` (escala de ocho pasos) |
| Espacio según su función | `--page-padding`, `--section-gap`, `--card-padding`, `--form-gap` |
| Controles y modales | `--control-*`, `--modal-*` |
| Bordes y superficies | `--radius-*`, `--border-width`, `--shadow-*` |
| Movimiento compartido | `--duration-fast`, `--duration-normal`, `--duration-slow` |

Las recetas cromáticas iniciales están en `:root` de `theme.css`; el tema claro modifica solamente sus diferencias. Los bloques responsive de `global.css` ajustan los roles de medidas de móvil y tablet.

Para cambiar los H1 móviles, editar `--font-h1` en el bloque de hasta 767px. Para cambiar su interlineado, editar `--heading-leading`. El H1 del Home público usa esas reglas globales; su clase conserva el degradado y la animación.

## Regla para nuevos estilos

Reutilizar un rol o una medida de la escala cuando corresponda. Crear una variable global solamente si representa una decisión compartida. La geometría de una sombra decorativa, una posición o una medida exclusiva de un componente permanece en su propia hoja CSS; su color referencia el tema. No crear una variable global por cada número que aparezca.

Las dimensiones calculadas, los iconos, los gráficos y las animaciones particulares conservan sus valores locales. Esta simplificación conserva la apariencia previa; no rediseña ni redondea automáticamente esas medidas.

Vite obtiene el CSS de carga inicial del bloque `critical-boot` de `global.css` y resuelve sus variables desde `theme.css` y `global.css`, incluyendo dependencias transitivas. No mantener una segunda copia manual ni eliminar sus marcadores.

Validación de navegador con API simulada: `node scripts/check-responsive-design.mjs home` o `components`, con Vite en 5178. El resumen de la migración está en `docs/design-system/simplification-summary.json` desde la raíz del repositorio.
