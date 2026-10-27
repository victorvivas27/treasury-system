# Tarea 35 — Design System responsive

> **Estado actual tras la simplificación solicitada:** 1.195 → 117 variables
> globales, una reducción del **90,2%**. Se conservaron tema, escalas pequeñas y
> roles compartidos; los detalles exclusivos permanecen en los componentes.
> La migración comprobó 177.740 declaraciones en cinco anchos y ambos temas,
> conservando sus valores resueltos. El inventario actual y los archivos afectados
> están en [simplification-summary.json](simplification-summary.json).
> La guía vigente es `frontend/src/shared/style/README.md`.
> Las cifras e inventarios de la migración inicial que siguen son históricos.

Validación de la simplificación: build y lint aprobados (persisten cuatro avisos
previos de lint); Home en siete anchos y ambos temas, más 28 estados de tablas y
modales, sin fallos. `git diff --check` aprobado. La suite ejecutó 536 tests:
535 pasaron y una aserción de SkeletonWrapper comparaba `1rem` con los `16px`
calculados por jsdom. Se cambió esa aserción para comprobar el valor relativo
declarado, conservando la altura del componente; su archivo pasó 2/2 al repetirlo.
No se volvió a ejecutar toda la suite después de ese ajuste de la aserción.

## Alcance y resultados

Se auditó React 19 + CSS convencional: las 83 hojas de estilo, el router,
pantallas públicas, autenticación, páginas protegidas, formularios, componentes
compartidos, modales y estados vacíos. Se extendió `global.css`; no se incorporaron
dependencias ni otro sistema de estilos. No se modificaron APIs, datos ni reglas
de negocio. Los cambios anteriores presentes en el workspace se conservaron.

Las inconsistencias principales eran títulos que elegían medidas distintas por
página, reducciones móviles independientes, espaciados definidos por valores
numéricos y medidas directas en las pantallas más recientes. La migración inicial
conectó 1.150 declaraciones en 51 hojas con roles semánticos o primitivas del
sistema existente. Se añadieron 31 primitivas necesarias para conservar geometría.
El inventario completo y los breakpoints encontrados están en
[task-35-audit.json](task-35-audit.json).

Se unificaron los H1 de aplicación, subtítulos, títulos de secciones, etiquetas,
formularios, botones compartidos, tarjetas, tablas y modales. Crear familia ahora
usa H1 para su título de página. Los botones compactos móviles compartidos tienen
36px de altura mínima. Los controles mantienen texto de 16px. Confirmación usa un
máximo de 280px y edición de perfil/mensaje 320px, limitados por la pantalla.
El documento queda bloqueado mientras los modales compartidos están abiertos.

La revisión en navegador detectó un margen negativo del encabezado del horario
que aún dependía del padding antiguo, y filtros de cuota anual que no cabían a
768px. Se corrigieron usando el padding de página y permitiendo envolver filtros.
El recorrido guiado respeta la preferencia de movimiento reducido.

## Tokens y personalización

Fuente única: `frontend/src/shared/style/global.css`, bloque `TASK 35`.

| Función | Tokens |
| --- | --- |
| Jerarquía | `--font-h1`, `--font-h2`, `--font-h3`, `--font-h4`, `--heading-leading` |
| Texto | `--font-subtitle`, `--font-body`, `--font-small`, `--font-label`, `--font-button`, `--font-modal-title` |
| Espacio | `--page-padding`, `--section-gap`, `--card-padding`, `--form-gap`, `--element-gap` |
| Controles | `--control-height`, `--control-height-small`, `--control-height-large`, `--control-padding`, `--radius-control` |
| Modales | `--modal-edit-max`, `--modal-confirm-max`, `--modal-gutter`, `--modal-padding` |
| Superficies y layout | `--radius-card`, `--border-width`, `--table-cell-padding`, `--content-max`, `--form-max` |
| Excepciones de exhibición | `--display-hero`, `--display-error` |

Roles responsive: móvil hasta 767px, tablet entre 768 y 1023px, escritorio desde
1024px. H1 al cierre: 16/16/24px respectivamente; se conservó un ajuste simultáneo
de los tokens de móvil y tablet realizado durante la validación.
Escritorio de referencia: **1216 × 552 CSS px**.

Para cambiar todos los H1 móviles a 22px, editar solamente el valor ya existente:

```css
@media (max-width: 767px) {
  :root { --font-h1: 1.375rem; }
}
```

El script de navegador cambia temporalmente ese token a 31px a 390px y comprueba
el tamaño calculado de los H1 de las pantallas visitadas.

## Validación

- `pnpm lint`: sin errores; cuatro advertencias `no-unused-expressions` en
  NotificationContext, AlumnoPage, ApoderadoPage y FamiliaPage, ajenas a esta tarea.
- `pnpm build`: TypeScript y Vite aprobados; advertencia de `eval` en lottie-web.
- `pnpm test:run`: primera pasada con 535 aprobados y un timeout en UsersPage.
  Repetición `pnpm exec vitest run --maxWorkers=2`: **536/536**, 92 archivos aprobados.
- `git diff --check`: aprobado.
- Navegador Chromium con API interceptada: 320, 375, 390, 430, 768, 1024 y 1216px.
  Las capturas desktop se hicieron con viewport 1216 × 552, aunque las imágenes
  de página completa incluyen el contenido que requiere desplazamiento vertical.
- Matriz final: **217/217 vistas**, sin errores JavaScript, redirecciones
  inesperadas ni desbordamientos detectados. Propagación del token H1 aprobada.
- Componentes: 14 vistas con datos y 14 aperturas de modal verificadas; sin
  desbordamientos y con bloqueo de fondo en los siete anchos.

Rutas incluidas en la matriz de 31 pantallas por siete anchos:

```text
/, /login, /olvide-password, /aceptar-invitacion, /password-actualizada,
/students, /parents, /family, /students/new, /parents/new, /family/new,
/users, /profile, /configuration,
/calendario/horario-clases, /admin/horario-clases,
/admin/sobre-nosotros, /admin/fotos-del-curso, /admin/directiva, /admin/mejoras,
/tesoreria/pagos, /tesoreria/ingresos, /tesoreria/gastos, /tesoreria/cuotas,
/tesoreria/aportes, /tesoreria/eventos, /tesoreria/reportes, /tesoreria/stands,
/notifications, /birthdays, /no-existe
```

Hay una comprobación adicional con una tabla de alumnos poblada, un nombre largo,
confirmación de eliminación y edición de perfil, en los siete anchos. Comprueba
límites de ancho y bloqueo del documento; cancela los diálogos sin guardar.

Reproducción (Vite en puerto 5178):

```powershell
cd frontend
pnpm exec vite --host 127.0.0.1 --port 5178
# En otra terminal:
node scripts/check-responsive-design.mjs verified
node scripts/check-responsive-design.mjs components
```

Resultados y capturas locales, excluidos del versionado:
`frontend/demo-output/design-system/{before,verified,components}/`.
Se inspeccionaron capturas representativas de alumnos móvil, aportes desktop,
confirmación y edición de perfil. La matriz automatizada mide geometría y fuentes;
no equivale a inspección visual humana de cada combinación.

Límites: datos sintéticos, principalmente estados vacíos; no se validaron datos
reales, envíos financieros, todos los estados de permisos ni Safari/Firefox.
Dashboard, administraciones y arquitectura se auditaron estáticamente; su CSS sí
consume los tokens, pero no forman parte de la matriz Chromium anterior.
No se ejecutó backend porque esta tarea solo cambia presentación.

## Excepciones conservadas

- Revisión posterior del Home sin login: el título toma tamaño, interlineado y
  espaciado de letras de la regla global `h1`. Se eliminaron las sobrescrituras
  desktop y móvil de `HomeHero.css`; se conservan el degradado y la animación.
  Verificación `node scripts/check-responsive-design.mjs home`: siete anchos
  aprobados; se cambió temporalmente el token a 23px y la regla global a 31px,
  interlineado 1.7 y espaciado 2px para comprobar que las clases no los bloquean.
  Las tarjetas editoriales de comunidad mantienen sus bordes y padding asimétricos.
- El 404 usa una escala de exhibición separada, porque es una ilustración numérica.
- Firmas de días del horario, importes, métricas, gráficos, avatares e iconos
  conservan tamaños propios o primitivas; no son títulos de página.
- Ajuste de nombres según el contenido y dimensiones dinámicas de popovers,
  progreso y animación se conservan.
- Breakpoints estructurales de sidebar, tablas, galerías y agenda permanecen
  locales porque responden al contenido. CSS nativo no acepta `var()` en `@media`.

## Archivos

Las 51 hojas migradas inicialmente se identifican en `task-35-audit.json` por
`declarations > 0`. También se ajustaron estos archivos al finalizar la revisión:

```text
frontend/src/shared/style/global.css
frontend/src/shared/style/README.md
frontend/src/shared/layouts/MainLayout.css
frontend/src/shared/ui/button/Button.css
frontend/src/shared/ui/emptystate/EmptyState.css
frontend/src/shared/ui/feedback/FeedbackState.css
frontend/src/shared/ui/status-toggle/StatusToggleButton.css
frontend/src/presentation/pages/home/style/HomeHero.css
frontend/src/presentation/pages/home/style/HomePage.css
frontend/src/presentation/pages/familia/FamiliaCreateFormPage.tsx
frontend/scripts/check-responsive-design.mjs
docs/design-system/task-35-audit.json
docs/design-system/TASK_35_REPORT.md
```

Los otros archivos modificados que ya aparecían en `git status` antes de comenzar
a esta tarea. En las hojas que coinciden con esta migración se conservaron esas
ediciones y solo se aplicaron cambios de estilos adicionales.
