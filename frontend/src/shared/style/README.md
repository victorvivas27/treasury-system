# Personalizar los estilos

El archivo de edición es **`global.css`**. También controla la pantalla de carga inicial y la cubierta de actualización. Vite incluye automáticamente las reglas marcadas `critical-boot` y las variables que necesitan en el HTML, para conservar la carga diferida del resto del CSS. No se mantiene una segunda copia manual de esos valores.

## Qué cambiar

| Variables | Uso |
| --- | --- |
| `--color-*`, `--text-*`, `--border-color`, `--overlay` | Colores semánticos del tema |
| `--palette-*` | Colores decorativos que conservan el mismo valor en ambos temas |
| `--font-main`, `--font-family-*` | Fuentes |
| `--font-size-*`, `--font-weight-*`, `--leading-*`, `--tracking-*` | Tipografía |
| `--space-*` | Márgenes, rellenos y separaciones |
| `--radius-*`, `--stroke-*` | Esquinas y bordes |
| `--size-*`, `--offset-*` | Dimensiones y desplazamientos |
| `--shadow-*`, `--effect-size-*`, `--opacity-*` | Sombras y efectos |
| `--duration-*`, `--easing-*`, `--motion-distance-*`, `--stagger-*` | Animaciones y transiciones |

El primer `:root` contiene la identidad y los valores originales compartidos. `:root[data-theme="light"]` define las diferencias del tema claro. El siguiente `:root` agrupa los demás valores por función.

Los nombres numéricos describen el **valor inicial**. Para personalizar, modifica el valor y conserva el nombre: todos los componentes que lo usan recibirán el cambio. Un tamaño de texto y un espaciado tienen variables diferentes aunque inicialmente midan lo mismo.

Ejemplos de declaraciones que puedes editar dentro de esos bloques:

```css
/* Acento del tema oscuro; editar también su variante clara si corresponde. */
--color-accent: #0eebcd;

/* Todos los espacios que originalmente medían 0.75rem. */
--space-0-75rem: 0.875rem;

/* Todos los textos que originalmente medían 0.875rem. */
--font-size-0-875rem: 0.95rem;

/* Color decorativo violeta, incluido el gráfico de cuotas. */
--palette-violet: #7c3aed;
```

La escala conserva la variedad de medidas existente para evitar cambios de diseño durante la migración. Las sombras completas también tienen variables propias. Cambiar un color decorativo no sustituye automáticamente colores semánticos ni los colores internos de todas las sombras: se editan en sus respectivas secciones del mismo archivo.

## Qué permanece en los componentes

- Selectores, distribución (`display`, grid, flex), porcentajes relativos, proporciones, capas y estados de interacción.
- Condiciones `@media`: las variables CSS no se pueden utilizar directamente en sus consultas.
- Posiciones y dimensiones calculadas según la pantalla, el contenido o el progreso de una operación.
- Variables locales que seleccionan una variante o reciben datos dinámicos; sus valores visuales estáticos referencian las variables globales.
- Los colores de archivos independientes de la aplicación, como imágenes, iconos y el manifiesto PWA, no son propiedades CSS.

Para nuevos estilos, reutiliza una variable de la misma función. Si falta, declárala en la sección correspondiente de `global.css`. Evita introducir otro valor visual fijo en un componente. Comprueba los cambios en ambos temas, en móvil y escritorio.
