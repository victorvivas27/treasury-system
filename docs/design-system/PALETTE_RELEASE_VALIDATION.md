# Validación de paletas y navegación — 22 de octubre de 2026

## Resultado y alcance

Las comprobaciones del frontend terminaron sin fallos pendientes. No se desplegó, publicó ni hizo push. Esta validación cubre las paletas, su arranque y persistencia, el sidebar y los tooltips. No acredita integración con un backend real ni certificación WCAG completa.

## Pruebas ejecutadas

| Comprobación | Resultado |
|---|---|
| `pnpm test:run` | 824 pruebas, 118 archivos, todos aprobados en la pasada final |
| Regresión dirigida de sidebar y tooltips | 38 pruebas aprobadas |
| `pnpm lint` | Aprobado, incluido el inventario de colores |
| `pnpm build` | TypeScript y Vite aprobados |
| `git diff --check` | Aprobado; avisos de conversión LF/CRLF sin errores |
| `check-color-recipes.mjs` | 234 tonos de la escala Original conservados |
| `audit-palette-contrast.mjs` | Las ocho combinaciones pasan los pares de contraste definidos |
| `audit-palette-matrix.mjs` | 288 vistas; sin errores JavaScript ni overflow horizontal detectados |
| `audit-palette-bootstrap.mjs`, desarrollo y build | 14 casos aprobados en cada entorno |
| `audit-sidebar-interactions.mjs`, desarrollo y build | Cinco tamaños aprobados en cada entorno |
| Matriz adicional sobre el build | Nueve pantallas, Azul y lima/claro a 1216 × 552, aprobadas |

La matriz incluye Original, Azul y lima, Violeta y coral y Verde esmeralda y dorado; cada una en claro y oscuro a 1216 × 552, 768 × 1024, 390 × 844 y 360 × 640. Recorre inicio, autenticación, dashboard, configuración, alumnos, ingresos, gastos, aportes y notificaciones. Comprueba también gráficos, modal de confirmación, conversación/composición de notificaciones, selección de paletas sin recarga, persistencia al recargar, independencia del modo sistema y navegación por teclado del selector.

La regresión de sidebar añade 900 × 700 y la navegación hacia Gestión de stands. Verifica que el menú permanece abierto en escritorio mientras el puntero sigue dentro, se contrae al salir, no restaura tooltips antiguos y mantiene el cierre al navegar y Escape en móvil.

El arranque se prueba bloqueando los bundles de aplicación: cuatro paletas por dos modos, ausencia de preferencia, tres identificadores inválidos y dos resoluciones del modo sistema. Se comprueban el primer color de fondo, su restauración y `theme-color`. El build minificado redondea algunos coeficientes OKLCH: se comparan píxeles sRGB con tolerancia máxima de un nivel por canal, en lugar de exigir cadenas CSS idénticas.

## Correcciones durante esta validación

- Se aclararon estados y categorías derivados de las paletas nuevas en oscuro, y se limitó la luminosidad del primario en claro para conservar el contraste del texto de botones. No se cambió ningún HEX base ni los fondos aprobados.
- Dos roles de categorías de Original necesitaban ajustes de luminosidad: violeta en oscuro y celeste en claro. Sus bases y su escala tonal calibrada permanecen iguales.
- Se actualizó la prueba de Calendario que todavía exigía cerrar el submenú al navegar, comportamiento reemplazado expresamente por el usuario. La pasada completa inicial tuvo 823 aprobadas y ese fallo; la final aprobó las 824.
- Se corrigió una línea vacía adicional al final de `theme.ts`.
- Se documentaron las paletas y se incorporó una regresión reproducible de navegador para sidebar/tooltips.

### Contraste de los pares de tokens auditados

| Paleta | Oscuro, mínimo | Claro, mínimo |
|---|---:|---:|
| Original | 4,62:1 | 4,55:1 |
| Azul y lima | 5,17:1 | 5,07:1 |
| Violeta y coral | 4,94:1 | 5,02:1 |
| Verde esmeralda y dorado | 5,48:1 | 5,06:1 |

Los pares incluyen texto principal, secundario, estados y categorías sobre fondo/superficie; texto sobre botones primarios, de acento, información y peligro; estados sobre sus fondos suaves y foco. El umbral de texto es 4,5:1 y el de foco 3:1. Son pruebas de roles definidos; no examinan automáticamente cada combinación CSS de todos los componentes.

## Contrato cromático final

Se mantienen ocho bases por paleta, 289 variables derivadas y ninguna base adicional por modo. La inspección estática recorrió 363 archivos y no encontró colores normales de interfaz fuera del contrato. Los 32 literales independientes se justifican en `color-policy.mjs`; no representan un porcentaje de cobertura visual de toda la aplicación.

Orden: neutral claro, neutral oscuro, primario, acento, éxito, advertencia, error e información.

| Paleta | Ocho bases |
|---|---|
| Original | `#E5E7EB`, `#0A0F1A`, `#1E3A5F`, `#0EEBCD`, `#22C55E`, `#F59E0B`, `#EF4444`, `#3B82F6` |
| Azul y lima | `#F8FAFC`, `#101827`, `#2563EB`, `#A3E635`, `#16A34A`, `#D97706`, `#DC2626`, `#0284C7` |
| Violeta y coral | `#FAF7FF`, `#1C1630`, `#7C3AED`, `#FB7185`, `#15803D`, `#B45309`, `#BE123C`, `#2563EB` |
| Verde esmeralda y dorado | `#F4FAF6`, `#102820`, `#047857`, `#EAB308`, `#15803D`, `#B45309`, `#B91C1C`, `#0369A1` |

El identificador persistido `green-turquoise` se conserva para la última paleta por compatibilidad; el nombre visible y los valores corresponden a Verde esmeralda y dorado.

Permanecen independientes los colores personalizados/persistidos de horarios, los valores predeterminados de asignaturas, las imágenes y recursos decorativos, el primer fotograma del botón Volver y el documento A4 de impresión de stands. No se modificaron para solucionar contraste del tema.

## Archivos ajustados en esta validación

- `frontend/src/shared/style/theme.css`: recetas de contraste.
- `frontend/src/shared/style/README.md`: contrato vigente de paletas y excepciones.
- `frontend/src/presentation/context/theme.ts`: formato al final del archivo.
- `frontend/src/shared/layouts/sidebar/AcademicNavigation.test.tsx`: expectativa de navegación vigente.
- `frontend/scripts/audit-palette-bootstrap.mjs`: comparación del color dibujado en builds minificados.
- `frontend/scripts/audit-palette-matrix.mjs`: destino configurable del informe de producción.
- `frontend/scripts/audit-sidebar-interactions.mjs`: comprobaciones reproducibles de navegación y tooltips.
- Este informe.

Los cambios previos de centralización, selección de paletas y comportamiento del sidebar se conservaron, al igual que las modificaciones ajenas al alcance.

## Límites y avisos de entrega

- Navegador usado: Chromium automatizado. No se ejecutaron Firefox, WebKit ni lectores de pantalla.
- Las APIs de las pruebas de navegador están simuladas; no se modificaron datos reales. No se ejecutaron pruebas backend porque este cambio no lo modifica. La comprobación de conexión/configuración del entorno real debe realizarse al preparar el despliegue.
- El build conserva avisos de tamaño de bundles y de `eval` dentro de `lottie-web`. No impidieron compilar; requieren un trabajo separado de rendimiento/dependencias.
- No se ejecutó cobertura; los conteos anteriores son de pruebas ejecutadas, no porcentajes de cobertura.

Las evidencias locales están en `frontend/demo-output/palettes/` y `frontend/demo-output/sidebar/`. No deben publicarse como recursos de la aplicación.
