# Informe de mejoras de frontend — Treasury System

Fecha: 21 de octubre de 2026. Implementación del plan aprobado de la skill `frontend-design`.

## Mejoras implementadas

- Tipografía: títulos principales coherentes con los tokens; encabezados, estados y acciones de tablas legibles. `SingleLineFitText` conserva el texto completo y un mínimo de 12 px, permitiendo saltos de línea.
- Formularios: errores completos, con altura natural, sin truncamiento; asociación mediante `aria-invalid` y `aria-describedby` en los campos revisados de alumnos, apoderados, usuarios y login. El login enfoca el primer campo inválido.
- Login: eliminado el medidor de fortaleza y su referencia accesible. Se conserva la política y validación de contraseña existente; registro, recuperación y cambio de contraseña no pierden su evaluación.
- Diálogos: gestión reutilizable del foco, Tab y Shift+Tab, Escape, retorno al origen y bloqueo del scroll. Los diálogos superpuestos respetan el foco del superior. Las confirmaciones tienen título y descripción accesibles y no permiten Escape durante una operación en curso.
- Posicionamiento: las confirmaciones y alertas ancladas se mantienen dentro del viewport al cambiar tamaño o contenido. Se conservan los límites de 280 px para confirmar y 320 px para editar; configuración anual, aportes y formularios de movimientos respetan esos límites.
- Tooltips: disponibles por foco, hover y toque; descripción accesible, cierre con Escape o interacción exterior y posibilidad de mover el puntero sobre la ayuda.
- Tesorería: resúmenes financieros no disponibles se distinguen de importes cero; los errores de carga de aportes permanecen visibles con reintento y no se presentan como una lista vacía.
- Dashboard: meses e importes legibles en la línea de tiempo, con scroll interno, sin comprimir cifras ni dividirlas en varias líneas en tablet.
- Pagos: el resumen se adapta al ancho disponible junto a la barra lateral; corregido el desbordamiento detectado a 900 px. Acciones y etiquetas más legibles.
- Accesibilidad visual: foco sólido, mayor contraste de acciones destructivas y tonos del tema claro, opciones de selectores más legibles y amplias en dispositivos táctiles. Mensajes y etiquetas respetan la preferencia de movimiento reducido.
- Regresión corregida: el editor de horarios duplicaba el bloqueo de scroll de la confirmación compartida. Se mantiene el foco en el campo de la segunda confirmación y se libera el fondo al cerrar.

## Pruebas y comprobaciones

| Comprobación | Resultado |
| --- | --- |
| `pnpm lint` | Aprobado |
| `pnpm build` | Aprobado; TypeScript y Vite |
| Suite completa `pnpm test:run --maxWorkers=2` con reporte JSON | 794 pruebas aprobadas; 0 fallos |
| Regresiones finales de configuración anual, aportes, confirmación y tooltip | 20 pruebas aprobadas |
| Matriz general de pantallas y estados | 360 combinaciones; sin errores de JavaScript ni desbordamiento horizontal global |
| Navegador: pantallas y operaciones de teclado/modal | 84 combinaciones finales aprobadas |
| Navegador: carga, vacío, error y permisos en dashboard, ingresos, gastos y aportes | 64 combinaciones finales aprobadas |
| Formularios de creación y edición de alumnos, apoderados y familias | 24 combinaciones aprobadas |
| Revisión final de listas administrativas con texto ampliado | 16 combinaciones aprobadas |
| Línea de tiempo: importes completos y tamaño mínimo de texto | 6 tamaños aprobados |
| Acceso a guardar dentro del scroll de formularios, teclado y retorno del foco | 10 combinaciones aprobadas |
| Tema claro en dashboard, ingresos, gastos y aportes | 8 combinaciones aprobadas |
| Contraste y errores del login en ambos temas | 4 combinaciones aprobadas; mínimo de contraste medido de roles principales: 4,55:1 |
| `git diff --check` | Aprobado; solo aviso de normalización LF/CRLF del archivo de Pagos |

Viewports CSS obligatorios comprobados: **1216 × 552**, **768 × 1024**, **390 × 844** y **360 × 640**. También se comprobaron **900 × 700**, **844 × 390** en horizontal y **608 × 276** con factor de escala 2 para simular el espacio y la ampliación del desktop al 200 %. La simulación de zoom no equivale a una prueba manual del zoom del navegador en el equipo del usuario.

Se inspeccionaron capturas de desktop, tablet, móvil, móvil pequeño, ancho intermedio, diálogos ampliados y tema claro. Las pruebas de permisos verificaron la redirección de usuarios USER fuera de rutas administrativas, manteniendo la autorización existente.

## Evidencia y reproducción

Las respuestas de API son sintéticas e interceptadas por Playwright; estas comprobaciones no ejecutan operaciones contra servicios financieros reales.

- `frontend/scripts/audit-frontend-design.mjs`: matriz de pantallas, estados, overflow y permisos; admite `DESIGN_BASE_URL`, `DESIGN_VIEWPORTS`, `DESIGN_STATES`, `DESIGN_ROUTES`, `DESIGN_OUTPUT` y `DESIGN_THEME`.
- `frontend/scripts/audit-frontend-interactions.mjs`: ejecuta la misma matriz con comprobaciones de teclado, geometría, foco y acciones alcanzables de formularios.
- `frontend/scripts/audit-frontend-contrast.mjs`: contraste de roles principales, acciones destructivas y errores renderizados del login en ambos temas.
- Capturas y resultados: `frontend/demo-output/frontend-audit/`, incluidos `vitest.json`, `build.log` y los directorios `final-interactions`, `final-states`, `forms`, `final-lists`, `final-timeline`, `form-actions`, `light` y `contrast`.

Con Vite disponible en `http://127.0.0.1:5174`, ejecutar desde `frontend/`:

```powershell
node scripts/audit-frontend-design.mjs
node scripts/audit-frontend-interactions.mjs
node scripts/audit-frontend-contrast.mjs
```

El entorno de esta sesión exigió ejecutar Vite, Chromium y Vitest fuera del sandbox por restricciones de creación de procesos. La comprobación automática de dependencias de pnpm se desactivó únicamente mediante una variable de entorno de proceso para usar las dependencias ya instaladas; no se instalaron paquetes ni se cambiaron manifiestos o archivos de configuración del entorno.

## Límites y pendientes

No quedaron fallos funcionales detectados pendientes en las comprobaciones ejecutadas. Permanece el aviso preexistente de uso de `eval` dentro de la dependencia `lottie-web` al compilar. No se probaron dispositivos físicos, lectores de pantalla reales, Safari ni operaciones con el backend real; la validación visual y funcional de navegador se hizo con Chromium y API simulada. La medición de contraste cubre los roles principales y los errores del login, no constituye una certificación de accesibilidad de toda la aplicación.

Se conservaron la arquitectura, los contratos HTTP, la autorización, las reglas financieras y la identidad visual. Se preservaron los cambios previos de `PaymentsPage.css` y el directorio no versionado `.agents/skills/`. No se modificaron archivos `.env`, no se añadieron dependencias y no se realizaron commits, push ni despliegues.

## Archivos modificados y añadidos

La siguiente lista incluye los archivos de esta implementación y este informe; excluye el directorio de skills que ya estaba presente. En `PaymentsPage.css`, los dos cambios anteriores del usuario permanecen y las reglas de esta tarea se añadieron al final.

- `docs/design-system/frontend-design-audit.md`
- `frontend/scripts/audit-frontend-contrast.mjs`
- `frontend/scripts/audit-frontend-design.mjs`
- `frontend/scripts/audit-frontend-interactions.mjs`
- `frontend/src/presentation/features/alumno/CrearAlumnoForm.tsx`
- `frontend/src/presentation/features/alumno/EditarAlumnoForm.tsx`
- `frontend/src/presentation/features/alumno/style/CrearAlumnoForm.css`
- `frontend/src/presentation/features/alumno/style/EditarAlumnoForm.css`
- `frontend/src/presentation/features/apoderado/CrearApoderadoForm.tsx`
- `frontend/src/presentation/features/apoderado/EditarApoderadoForm.tsx`
- `frontend/src/presentation/features/apoderado/style/CrearApoderadoForm.css`
- `frontend/src/presentation/features/user/UserEditorModal.css`
- `frontend/src/presentation/features/user/UserForm.tsx`
- `frontend/src/presentation/pages/academic/ScheduleManagementPage.tsx`
- `frontend/src/presentation/pages/architecture/ArchitecturePage.test.tsx`
- `frontend/src/presentation/pages/auth/LoginPage.css`
- `frontend/src/presentation/pages/auth/LoginPage.test.tsx`
- `frontend/src/presentation/pages/auth/LoginPage.tsx`
- `frontend/src/presentation/pages/dashboard/CashflowTimeline.css`
- `frontend/src/presentation/pages/tesoreria/AnnualFeesPage.css`
- `frontend/src/presentation/pages/tesoreria/AnnualFeesPage.tsx`
- `frontend/src/presentation/pages/tesoreria/ExpensesPage.css`
- `frontend/src/presentation/pages/tesoreria/ExpensesPage.test.tsx`
- `frontend/src/presentation/pages/tesoreria/ExpensesPage.tsx`
- `frontend/src/presentation/pages/tesoreria/FamilyContributionsPage.css`
- `frontend/src/presentation/pages/tesoreria/FamilyContributionsPage.test.tsx`
- `frontend/src/presentation/pages/tesoreria/FamilyContributionsPage.tsx`
- `frontend/src/presentation/pages/tesoreria/IncomesPage.css`
- `frontend/src/presentation/pages/tesoreria/IncomesPage.test.tsx`
- `frontend/src/presentation/pages/tesoreria/IncomesPage.tsx`
- `frontend/src/presentation/pages/tesoreria/PaymentsPage.css`
- `frontend/src/shared/style/AdminDataTable.css`
- `frontend/src/shared/style/global.css`
- `frontend/src/shared/ui/button/Button.css`
- `frontend/src/shared/ui/compactselect/CompactSelect.css`
- `frontend/src/shared/ui/dialog/useDialogFocus.ts`
- `frontend/src/shared/ui/feedback/FeedbackState.test.tsx`
- `frontend/src/shared/ui/feedback/FeedbackState.tsx`
- `frontend/src/shared/ui/modalalert/ModalAler.tsx`
- `frontend/src/shared/ui/modalconfirm/ModalConfirm.accessibility.test.tsx`
- `frontend/src/shared/ui/modalconfirm/ModalConfirm.css`
- `frontend/src/shared/ui/modalconfirm/ModalConfirm.tsx`
- `frontend/src/shared/ui/single-line-fit-text/SingleLineFitText.css`
- `frontend/src/shared/ui/single-line-fit-text/SingleLineFitText.test.tsx`
- `frontend/src/shared/ui/single-line-fit-text/SingleLineFitText.tsx`
- `frontend/src/shared/ui/tooltip/Tooltip.css`
- `frontend/src/shared/ui/tooltip/Tooltip.test.tsx`
- `frontend/src/shared/ui/tooltip/Tooltip.tsx`
