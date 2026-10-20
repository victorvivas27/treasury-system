# Dashboard responsive — 2026-10-19

## Resultado

Se reorganizó la presentación sin modificar consultas, cálculos, permisos ni
acciones financieras. El saldo aparece primero, seguido de ingresos, egresos
y los indicadores de familias/cuotas.

- Desktop: indicadores en filas, composición y cumpleaños juntos, flujo a
  ancho completo y detalle en dos columnas equilibradas.
- Móvil: saldo a ancho completo, indicadores en parejas y detalle en una columna.
  Acciones principales de al menos 44 px. Historial administrativo en filas
  verticales, conservando selección individual y selección de todas las trazas.
- Eliminadas las capas de layout `--compact` y sus reglas contradictorias.
  El detalle de aportes, modalidades y movimientos usa espacio y tipografía
  sin tarjetas con borde dentro de otras tarjetas.
- Los aportes usan modificadores propios para evitar heredar las reglas
  globales `.is-paid` y `.is-pending` de la pantalla de pagos.
- Se conserva el mensaje de directiva y sus animaciones. El footer continúa
  siendo el AppFooter compartido, con su firma animada.

## Archivos

- `frontend/src/presentation/pages/dashboard/DashboardPage.tsx`: clases de layout
  y modificadores visuales de aportes; comportamiento conservado.
- `DashboardPage.css`: entrada a los estilos.
- `DashboardBase.css`: apariencia compartida y tablet.
- `DashboardMobile.css`: hasta 680 px.
- `DashboardDesktop.css`: desde 1024 px, con ajuste para pantallas amplias.
- `DashboardMessage.css`: estilos y animaciones existentes del mensaje,
  extraídos del archivo original para conservarlos durante la refactorización.
- `CashflowTimeline.css`: selector de ubicación adaptado al layout común.
- `frontend/scripts/check-dashboard-design.mjs`: auditoría de navegador.

BoardMessage.css y CashflowTimeline.css ya tenían cambios locales al iniciar.
No se atribuyen íntegramente a esta tarea. No se modificó BoardMessage.css.

## Verificación

- `pnpm test:run`: 93 archivos y 588 pruebas aprobadas.
- Pruebas del dashboard: 7 archivos, 24 pruebas aprobadas.
- `pnpm lint`: aprobado, cuatro advertencias previas fuera del dashboard.
- `pnpm build`: aprobado; conserva avisos de bundle grande y eval en lottie-web.
- `git diff --check`: aprobado para los archivos de la tarea.
- Chromium: 60 vistas/estados aprobados con API sintética. Siete anchos:
  320, 375, 390, 430, 768, 1024 y 1216 px. Desktop exactamente 1216 × 552 px;
  el resto usa 844 px de alto. Temas claro/oscuro y roles ADMIN/USER.
- Estados: detalle cerrado/abierto, cambio de año, vacío y error de carga.
  Verificados ausencia de errores JavaScript, desbordamiento horizontal
  accidental y bordes/fondos heredados en los indicadores de aportes.
- Inspección visual de capturas móviles y desktop en ambos temas.
- Capturas y resultados en `frontend/demo-output/dashboard-review/`.

## Límites y excepciones

La línea de tiempo conserva su desplazamiento horizontal intencional. La tabla
administrativa permite scroll en tablet cuando lo necesita; en móvil usa filas
verticales. El navegador usa movimiento reducido para capturas estables; las
animaciones originales se conservaron en código, sin afirmar revisión visual
del ciclo completo de animación. La captura PNG mantiene sus pruebas existentes.

Las pruebas de navegador no escriben datos reales ni verifican backend.
No se ejecutó backend porque este cambio modifica presentación.

Se reutilizan tokens globales de tipografía (`--font-h1`, `--font-h2`,
`--font-h3`, `--font-small`), espaciado y controles. Cambiar `--font-h1` en
la regla móvil global modifica también el saludo principal del dashboard.
Las dimensiones de donuts, iconos y línea de tiempo conservan escalas propias.

Para repetir: iniciar Vite en `127.0.0.1:5178` y ejecutar desde `frontend`
`node scripts/check-dashboard-design.mjs` con Chromium instalado para Playwright.

## Claridad del resumen móvil

Ajuste posterior: el sector desde saldo hasta cumpleaños se organiza en tres
secciones con título y contexto visibles hasta 680 px:

- «Dinero del curso»: saldo, ingresos y egresos; indica pesos chilenos y año.
- «Cuotas del curso»: cantidades pagadas y pendientes, indicando que son cuotas.
- «Nuestro curso»: familias, composición de alumnos y próximo cumpleaños.

El resumen móvil forma un único bloque con tres franjas de fondo: dinero en
tono verde, cuotas en superficie neutra y curso en tono azul. Los indicadores
de cuotas se presentan como filas con etiqueta a la izquierda y valor a la
derecha. Los datos interiores no tienen tarjetas ni bordes propios; composición
y cumpleaños usan fondo transparente. En desktop los contenedores
usan `display: contents` y conservan la distribución de indicadores existente.
Los KPI tienen una clase propia para compartir estilos entre ambas estructuras.

Validación de este ajuste: 24 pruebas del dashboard aprobadas (7 archivos), lint
y build aprobados con advertencias previas. Auditoría Chromium: 60 vistas/estados
aprobados en los mismos siete anchos, dos temas y dos roles. El script verifica
la visibilidad y asociación de los títulos móviles con sus indicadores. Capturas
del resumen en `frontend/demo-output/dashboard-review/*-summary-*.png`.
Se inspeccionó visualmente el resumen móvil a 390 px.

El resumen móvil se compactó después: dinero y cuotas usan filas con etiqueta
a la izquierda y cifra a la derecha, padding de 12 px y separación de 8 px.
Los títulos usan `--font-size-sm`, las cifras `--font-size-md` y el saldo
`--font-size-lg`. Las descripciones repetidas por indicador se ocultan en móvil;
se conserva el contexto del encabezado de cada franja y objetivos táctiles de
44 px. Desktop conserva sus estilos. Nueva auditoría: 60 vistas aprobadas,
lint y diff sin errores; revisión visual del resumen a 390 px.
