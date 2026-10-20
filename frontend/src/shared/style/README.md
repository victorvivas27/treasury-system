# Estilos compartidos

`global.css` contiene el tema, las escalas comunes, los roles de componentes y las reglas base. Se redujo de 1.195 a **117 variables** (90,2% menos).

## Dónde cambiar cada cosa

| Necesidad | Variables |
| --- | --- |
| Tema oscuro y claro | `--color-*`, `--text-*`, `--icon-*` |
| Títulos y texto | `--font-h1` a `--font-h4`, `--font-body`, `--font-small` |
| Etiquetas y botones | `--font-label`, `--font-button` |
| Escala de texto | `--font-size-xs` a `--font-size-4xl` |
| Espacios comunes | `--space-1` a `--space-16` (escala de ocho pasos) |
| Espacio según su función | `--page-padding`, `--section-gap`, `--card-padding`, `--form-gap` |
| Controles y modales | `--control-*`, `--modal-*` |
| Bordes y superficies | `--radius-*`, `--border-width`, `--shadow-*` |
| Movimiento compartido | `--duration-fast`, `--duration-normal`, `--duration-slow` |

Los valores iniciales están en `:root`. El tema claro modifica solamente sus diferencias. Los bloques responsive ajustan los roles de móvil y tablet.

Para cambiar los H1 móviles, editar `--font-h1` en el bloque de hasta 767px. Para cambiar su interlineado, editar `--heading-leading`. El H1 del Home público usa esas reglas globales; su clase conserva el degradado y la animación.

## Regla para nuevos estilos

Reutilizar un rol o una medida de la escala cuando corresponda. Crear una variable global solamente si representa una decisión compartida. Una sombra decorativa, una posición o una medida exclusiva de un componente permanece en su propia hoja CSS. No crear una variable global por cada número que aparezca.

Las dimensiones calculadas, los iconos, los gráficos y las animaciones particulares conservan sus valores locales. Esta simplificación conserva la apariencia previa; no rediseña ni redondea automáticamente esas medidas.

Vite obtiene el CSS de carga inicial del bloque `critical-boot` de este mismo archivo. No mantener una segunda copia manual ni eliminar sus marcadores.

Validación de navegador con API simulada: `node scripts/check-responsive-design.mjs home` o `components`, con Vite en 5178. El resumen de la migración está en `docs/design-system/simplification-summary.json` desde la raíz del repositorio.
