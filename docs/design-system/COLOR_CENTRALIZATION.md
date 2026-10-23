# Centralización cromática: ocho bases

## Resultado y alcance

La identidad tematizable se configura con ocho valores de `frontend/src/shared/style/theme.css`: neutral claro, neutral oscuro, primario, acento, éxito, advertencia, error e información. Son ocho entradas para ambos modos; no se añadieron otras paletas ni selector. ThemeProvider, almacenamiento y lógica de negocio conservan su contrato.

Se conservaron los 43 nombres cromáticos anteriores. La escala representa los colores locales ya existentes: 234 tonos (128 opacos y 106 transparentes), con transparencia compartida entre variantes. Junto con 51 roles públicos —43 anteriores, seis sombras, ingreso del horario y acento nativo— hay 285 variables derivadas. Ninguna es una entrada adicional por paleta. No se mantuvieron HEX de compatibilidad para componentes normales.

Las recetas relativas OKLCH ajustan luminosidad, croma, matiz y alfa respecto de las bases. Sus coeficientes se calibraron para reproducir la identidad existente, en vez de reemplazarla por mezclas visualmente diferentes. Son comunes a futuras paletas. El negro límite de las sombras se representa con luminosidad/croma cero; su finalidad óptica no añade una base configurable.

La futura selección podrá sobrescribir las mismas ocho bases en el elemento raíz. No requiere cambiar los componentes. Los ocho valores deben elegirse y validarse conjuntamente: no cualquier combinación arbitraria garantiza contraste o diferenciación.

## Cobertura

**100 % de los colores normales de interfaz inventariados en las fuentes auditadas quedó conectado al sistema global.** El guard recorre 360 archivos CSS, TS/TSX y SVG de `src`, excluye pruebas y comprueba que no haya literales normales fuera del tema, dependencias inexistentes ni ciclos. Las únicas definiciones literales dentro del tema son las ocho bases.

Esta cifra mide conexión del código inventariado, no porcentaje de píxeles recoloreados ni certificación de todos los estados posibles. El navegador también dibuja partes internas de controles; su acento ahora depende de información. Recursos independientes y datos personalizados quedan fuera del denominador.

## Independencias justificadas

| Recurso | Motivo |
| --- | --- |
| `ScheduleColorPalette.tsx` | Valores y etiquetas elegidos por el usuario y persistidos; no son identidad de la aplicación. |
| `scheduleCards.ts` | Predeterminados independientes de asignaturas y tipos; `block.color` conserva prioridad. |
| `standSalesReport.css` | Documento autónomo A4 con esquema claro estable. Se extrae de la plantilla TS y se importa mediante `?inline`. |
| `ButtonBack.tsx`, solo `fill="white"` | Fotograma inicial del recurso independiente `/icons/Back.json`; evitar divergencia entre previsualización y animación. |
| Imágenes, vídeos, iconos decorativos y sus SVG/JSON | Assets independientes preservados; no se modificaron sus archivos. |
| `captureElement.ts`, comparación con transparencia | Condición técnica, no un color que se pinte en la interfaz. |

La política registra 32 ocurrencias literales independientes en fuentes, con justificación en `scripts/color-policy.mjs`. Los identificadores de categorías como `BLUE` o `RED` son datos del contrato, no colores CSS. Sus representaciones CSS sí dependen del tema.

Las animaciones comunitarias que ya se tematizaban conservan ese comportamiento; se adaptó su conversor para resolver colores CSS mediante el navegador y convertirlos a sRGB para Lottie. No se recolorearon assets adicionales. El observador del elemento raíz permite reaccionar a futuras modificaciones de paleta.

## Verificación por etapas

1. Referencia original: nueve rutas, cuatro viewports y dos modos, 72 vistas sin errores de JavaScript ni overflow horizontal.
2. Tema global: nueve rutas desktop en cada modo; comparación de colores renderizados y corrección de la conversión Lottie antes de continuar. Las 234 variantes inventariadas reproducen sus valores originales dentro de la cuantización de canvas.
3. Componentes: 72 vistas comparadas con la referencia, sin diferencias superiores a un nivel por canal de color ni errores de navegación/tamaño.
4. Controles nativos: acento derivado de información que reproduce las casillas originales de Chromium en claro y oscuro, con PNG idéntico píxel por píxel.
5. Verificación final y prueba temporal: ver resultados finales al pie. Se usan datos sintéticos, sin enviar notificaciones ni modificar información financiera.

Viewports CSS: **1216 × 552**, **768 × 1024**, **390 × 844** y **360 × 640**. Las pruebas de cambio temporal usan desktop y móvil. Las rutas incluyen inicio, login, dashboard, configuración, alumnos, ingresos, gastos, aportes y notificaciones.

La prueba temporal modifica exclusivamente las ocho bases en el navegador. Expande el gráfico de cuotas, abre confirmación, formularios y compositor de notificaciones, y verifica cuatro estados semánticos distintos. Cada caso restaura el atributo original del elemento raíz en `finally` y comprueba los valores recuperados. El runner también verifica que `theme.css` no cambie en disco. Los valores de diagnóstico solo existen en el script de prueba, sin convertirse en paleta del producto.

## Pruebas y resultados

- `pnpm --config.verify-deps-before-run=false test:run`: **810 pruebas aprobadas en 118 archivos**. Incluye ThemeProvider, horarios, capturas y reporte de ventas.
- `pnpm --config.verify-deps-before-run=false lint`: lint y guard cromático. Resultados finales al pie.
- `pnpm --config.verify-deps-before-run=false build`: TypeScript y Vite. Avisos preexistentes de `eval` en Lottie.
- `node scripts/check-color-recipes.mjs`: **234 variantes aprobadas**.
- `node scripts/audit-frontend-contrast.mjs`: **4 vistas aprobadas**, mínimo **4,5539:1** entre las parejas de texto comprobadas; incluye validación y foco de login.
- `node scripts/check-native-control-colors.mjs`: **ambos modos con PNG idéntico**.
- Capturas, JSON y PDF de los ensayos: `frontend/demo-output/color-system/`, artefactos locales ignorados por Git.

Se desactivó la comprobación automática de instalación de pnpm durante los comandos para usar las dependencias presentes, sin reinstalarlas ni modificar el lockfile. Chromium y Vite/Vitest necesitaron ejecución fuera del sandbox por bloqueo de creación de procesos.

## Límites

- Chromium fue el navegador validado. El sistema requiere soporte de colores relativos OKLCH; no se afirma compatibilidad con navegadores antiguos ni validación en Firefox/Safari.
- Cada paleta futura necesita comprobar contraste, croma/gamut y distinción de categorías en ambos modos. Esta migración no certifica accesibilidad para ocho entradas arbitrarias ni afirma una auditoría WCAG exhaustiva de la aplicación.
- La igualdad de acentos nativos se comprobó en Chromium/Windows. Otros navegadores pueden dibujar sus controles con detalles propios.
- No se añadieron paletas ni selector. La arquitectura admite cuatro o más conjuntos de ocho bases en el raíz; esa selección y persistencia se implementarán posteriormente.

## Dependencias de los roles públicos

La tabla reúne las dependencias transitivas de ambos modos. Los 234 `--tone-*` dependen de una familia base, directamente o mediante otra variante alfa.

| Rol | Bases de las que depende |
| --- | --- |
| `--shadow-card` | neutral-dark |
| `--shadow-elevated` | neutral-dark |
| `--shadow-nav-active` | accent |
| `--shadow-sidebar` | neutral-dark |
| `--shadow-sidebar-collapsed` | primary, neutral-dark |
| `--shadow-sidebar-submenu` | neutral-dark, neutral-light |
| `--border-color` | neutral-light |
| `--color-accent` | accent |
| `--color-accent-soft` | accent |
| `--color-active` | neutral-dark, neutral-light |
| `--color-bg` | neutral-dark, neutral-light |
| `--color-elevated` | neutral-dark, neutral-light |
| `--color-danger-surface` | error |
| `--color-error` | error |
| `--color-error-soft` | error |
| `--color-hover` | neutral-dark, neutral-light |
| `--color-info` | info, primary |
| `--color-info-soft` | info |
| `--color-input` | neutral-dark, neutral-light |
| `--color-primary` | primary |
| `--color-sidebar` | neutral-dark, neutral-light |
| `--color-success` | success |
| `--color-success-soft` | success |
| `--color-surface` | neutral-dark, neutral-light |
| `--color-warning` | warning |
| `--color-warning-soft` | warning |
| `--divider` | primary, neutral-light |
| `--focus-ring` | accent |
| `--icon-accent` | accent |
| `--icon-muted` | neutral-light, neutral-dark |
| `--icon-on-accent` | neutral-dark, neutral-light |
| `--overlay` | neutral-dark |
| `--palette-blue` | info |
| `--palette-green` | success |
| `--palette-orange` | error |
| `--palette-pink` | error |
| `--palette-sky` | info |
| `--palette-violet` | info |
| `--sidebar-icon` | accent, neutral-dark |
| `--sidebar-icon-active` | warning, accent |
| `--sidebar-submenu-arrow-bg` | neutral-dark, neutral-light |
| `--sidebar-submenu-bg` | neutral-dark, neutral-light |
| `--sidebar-submenu-text` | neutral-light, neutral-dark |
| `--sidebar-text` | neutral-light, neutral-dark |
| `--text-boot` | neutral-light, neutral-dark |
| `--text-boot-muted` | neutral-light, neutral-dark |
| `--text-main` | neutral-light, neutral-dark |
| `--text-muted` | neutral-light, neutral-dark |
| `--text-on-accent` | neutral-dark, neutral-light |
| `--schedule-ingress-color` | neutral-dark |
| `--control-accent` | info |

## Archivos modificados y creados

Las rutas siguientes corresponden a esta entrega. Se preservaron los archivos no versionados preexistentes `frontend/public/icono-tesoreria-fondo-oscuro-preview.png` y `frontend/public/videos/`.

- `docs/design-system/COLOR_CENTRALIZATION.md`
- `frontend/index.html`
- `frontend/package.json`
- `frontend/scripts/audit-color-system.mjs`
- `frontend/scripts/audit-frontend-contrast.mjs`
- `frontend/scripts/check-color-recipes.mjs`
- `frontend/scripts/check-color-tokens.mjs`
- `frontend/scripts/check-native-control-colors.mjs`
- `frontend/scripts/color-policy.mjs`
- `frontend/scripts/fixtures/color-reference.json`
- `frontend/src/presentation/features/alumno/style/AlumnosList.css`
- `frontend/src/presentation/features/alumno/style/BirthdaySection.css`
- `frontend/src/presentation/features/apoderado/style/ApoderadosList.css`
- `frontend/src/presentation/features/apoderado/style/CrearApoderadoForm.css`
- `frontend/src/presentation/features/familia/style/CrearFamilia.css`
- `frontend/src/presentation/features/familia/style/FamiliaList.css`
- `frontend/src/presentation/pages/academic/Schedule.css`
- `frontend/src/presentation/pages/academic/ScheduleManagementPage.tsx`
- `frontend/src/presentation/pages/academic/SchedulePublished.css`
- `frontend/src/presentation/pages/auth/AccountFlowPages.css`
- `frontend/src/presentation/pages/community/AboutManagementPage.css`
- `frontend/src/presentation/pages/dashboard/BoardMessage.css`
- `frontend/src/presentation/pages/home/components/HomeCommunity.tsx`
- `frontend/src/presentation/pages/home/style/AboutCylinder.css`
- `frontend/src/presentation/pages/home/style/HomeCommunity.css`
- `frontend/src/presentation/pages/home/style/HomeDashboardPreview.css`
- `frontend/src/presentation/pages/home/style/HomeDesktop.css`
- `frontend/src/presentation/pages/home/style/HomeFeatures.css`
- `frontend/src/presentation/pages/home/style/HomeHeader.css`
- `frontend/src/presentation/pages/home/style/HomeHero.css`
- `frontend/src/presentation/pages/home/style/HomeInstallGuide.css`
- `frontend/src/presentation/pages/home/style/HomeMobile.css`
- `frontend/src/presentation/pages/home/style/HomePage.css`
- `frontend/src/presentation/pages/home/style/HomeTour.css`
- `frontend/src/presentation/pages/home/style/HomeWelcome.css`
- `frontend/src/presentation/pages/notificacion/Notificacion.css`
- `frontend/src/presentation/pages/organization/AdministrationsPage.css`
- `frontend/src/presentation/pages/stand/StandManagementPage.css`
- `frontend/src/presentation/pages/stand/standSalesReport.css`
- `frontend/src/presentation/pages/stand/standSalesReport.ts`
- `frontend/src/presentation/pages/tesoreria/AnnualFeesPage.css`
- `frontend/src/presentation/pages/tesoreria/EventsPage.css`
- `frontend/src/presentation/pages/tesoreria/ExpensesPage.css`
- `frontend/src/presentation/pages/tesoreria/FamilyContributionsPage.css`
- `frontend/src/presentation/pages/tesoreria/IncomesPage.css`
- `frontend/src/presentation/pages/tesoreria/PaymentsPage.css`
- `frontend/src/presentation/pages/tesoreria/TreasuryMovementFilters.css`
- `frontend/src/presentation/pages/user/ProfileEditor.css`
- `frontend/src/presentation/pages/user/ProfilePage.css`
- `frontend/src/shared/layouts/sidebar/style/Sidebar.css`
- `frontend/src/shared/layouts/sidebar/style/SidebarFooter.css`
- `frontend/src/shared/style/README.md`
- `frontend/src/shared/style/global.css`
- `frontend/src/shared/style/theme.css`
- `frontend/src/shared/ui/apptour/AppTour.css`
- `frontend/src/shared/ui/button/Button.css`
- `frontend/src/shared/ui/compactselect/CompactSelect.css`
- `frontend/src/shared/ui/feedback/FeedbackState.css`
- `frontend/src/shared/ui/footer/AppFooter.css`
- `frontend/src/shared/ui/loading/LoadingState.css`
- `frontend/src/shared/ui/modalalert/ModalAlert.css`
- `frontend/src/shared/ui/modalconfirm/ModalConfirm.css`
- `frontend/src/shared/ui/status-toggle/StatusToggleButton.css`
- `frontend/src/shared/ui/tooltip/Tooltip.css`
- `frontend/vite.config.ts`

## Cierre de verificaciones

- **72 vistas finales aprobadas** (36 por modo), comparadas con la referencia original, sin cambios superiores a un nivel por canal en los colores comprobados ni regresiones de JavaScript/overflow.
- **36 ensayos temporales aprobados** (18 por modo), con restauración de las ocho bases y comprobación de que el archivo de tema queda idéntico en disco.
- Todos los grupos requeridos reaccionaron: dashboard, tarjetas, navegación, botones, formularios, tablas, gráficos, modales, notificaciones, estados, inicio, login y configuración. Entre las muestras repetidas entre escenarios: 132/132 controles de formulario, 100/100 elementos de tabla, 348/348 elementos gráficos y 620/620 elementos de diálogo cambiaron. Son muestras de estilos, no conteos de componentes únicos.
- Las muestras de botones que no variaron corresponden a elementos transparentes/ocultos: menú del inicio en desktop, cierre del sidebar en desktop y retorno del chat; no bloquean la identidad cromática. Los controles nativos seleccionables tienen ahora acento derivado.
- **4 vistas del build de producción aprobadas**, en inicio y login de ambos modos, incluyendo los estilos críticos. Se bloquearon service workers y WebSockets en el harness para aislar el ensayo y la API sintética; no es una validación del modo offline ni de comunicaciones reales.
- **Exportaciones aprobadas en ambos modos**: descarga PNG real del dashboard y generación del PDF A4 del reporte, conservando el esquema de impresión. Comparación posterior sin cambios de colores respecto a la referencia.
- **Lint y guard cromático aprobados sin advertencias nuevas**, **build final aprobado**, **810 pruebas aprobadas**, **git diff --check aprobado**. Sin dependencias nuevas ni cambios de lockfile.
- Resumen de evidencias: `frontend/demo-output/color-system/final-summary.json`; comparaciones por fase, capturas y pruebas de restauración en los subdirectorios correspondientes. Estos artefactos permanecen locales e ignorados por Git.

