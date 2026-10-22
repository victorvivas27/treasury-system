---
name: frontend-design
description: Diseñar, auditar y mejorar interfaces de Treasury System (React, TypeScript, Vite), preservando arquitectura, reglas de negocio y comportamiento. Usar cuando se soliciten mejoras visuales, UX/UI, responsive, dashboards, formularios, tablas, modales o componentes frontend.
---

# Frontend Design — Treasury System

## Objetivo
Producir interfaces profesionales, coherentes, accesibles y funcionales para un sistema escolar de tesorería. Priorizar claridad de datos financieros, rapidez de operación y consistencia sobre efectos decorativos.

## Activación
Aplicar ante peticiones de diseño, rediseño, auditoría visual, responsive, componentes, navegación, dashboards, formularios, tablas y modales. No activar para cambios puramente backend.

## Antes de editar
1. Leer `AGENTS.md`, `.agents/AGENTS.md`, `.agents/tasks/01-project-overview.md`, `.agents/tasks/05-frontend-architecture.md` y `.agents/tasks/08-quality-operations.md` cuando existan.
2. Inspeccionar componentes, estilos, tokens, rutas y pruebas reales; el código tiene prioridad sobre documentación desactualizada.
3. Comprobar `git status` y preservar modificaciones preexistentes.
4. Identificar objetivo, usuarios, estados de interfaz y alcance exacto. Si faltan preferencias estéticas, conservar la identidad visual actual.
5. Antes de crear componentes o dependencias, buscar equivalentes reutilizables.

## Principios de diseño
- Jerarquía: destacar tarea principal, importe, estado y siguiente acción.
- Coherencia: reutilizar espaciado, tipografía, paleta, iconografía y componentes actuales; proponer tokens solo cuando aporte valor.
- Densidad: optimizar para operaciones administrativas con muchas tablas, filtros y formularios, sin sacrificar legibilidad.
- Estados: diseñar carga, vacío, error, éxito, validación y permisos denegados.
- Accesibilidad: etiquetas, foco visible, teclado, contraste suficiente, semántica HTML y feedback no basado solo en color.
- Responsive: no depender de hover; evitar scroll horizontal de página, permitir desplazamiento controlado en tablas densas.
- Rendimiento: evitar animaciones pesadas, renderizados innecesarios y dependencias nuevas sin aprobación.
- Datos: mostrar importes, fechas, totales y estados sin ambigüedad; no alterar precisión ni reglas de negocio.

## Restricciones específicas del proyecto
- **Nunca mostrar barras de scroll visibles** (verticales ni horizontales). Ocultarlas con CSS sin desactivar el desplazamiento necesario: conservar gestos táctiles, rueda del mouse y teclado, y mantener accesible todo el contenido. No usar `overflow: hidden` como sustituto cuando impida leer o recorrer la información.
- Viewport desktop de referencia: **1216 × 552 píxeles CSS**. Validar obligatoriamente, cuando exista navegador disponible, tablet 768 × 1024, móvil 390 × 844 y móvil pequeño 360 × 640 píxeles CSS; comprobar también anchuras intermedias sin depender de breakpoints rígidos. El diseño debe ser mobile-friendly sin sacrificar la densidad administrativa en desktop.
- Modales de edición: ancho máximo 320 px; modales de confirmación: 280 px; nunca exceder viewport; controles compactos, fondo bloqueado y posición según card seleccionada, de acuerdo con las reglas vigentes.
- Mantener arquitectura `core/A-domain`, `core/B-application`, `core/C-infra`, `core/D-config`, `presentation` y `shared`.
- No modificar contratos HTTP, autorización, lógica financiera, rutas, modelos de dominio, persistencia ni datos por una tarea visual.
- No instalar dependencias, hacer commit, push, publicar o desplegar sin autorización expresa.
- No introducir secretos ni modificar archivos `.env`.

## Flujo de ejecución
1. **Diagnóstico:** identificar problemas concretos con archivo/componente, impacto y prioridad.
2. **Propuesta breve:** explicar qué cambiará y qué permanecerá intacto; para tareas grandes, implementar por pantallas o componentes.
3. **Implementación:** hacer cambios mínimos y consistentes, reutilizando estilos y componentes existentes.
4. **Comprobación visual:** comparar antes/después si es posible; verificar overflow, jerarquía, estados y responsive en viewport de referencia.
5. **Pruebas:** ejecutar desde `frontend/` `pnpm lint`, `pnpm build` y las pruebas relevantes con `pnpm test:run` cuando corresponda. No afirmar ejecución si no se realizó.
6. **Informe:** resumir archivos cambiados, decisiones de diseño, pruebas ejecutadas y limitaciones; dejar constancia de cambios no relacionados preservados.

## Patrones por módulo
Consultar `references/design-guidelines.md` para pautas detalladas y checklist.

## Criterios de aceptación
- La función existente sigue operando y no se altera la semántica de los datos.
- No aparecen errores TypeScript ni advertencias nuevas atribuibles al cambio.
- Los controles esenciales son utilizables por teclado y están etiquetados.
- El diseño funciona a 1216 × 552 sin recortes críticos; se comprueba adaptación móvil cuando aplique.
- Se mantienen reglas de modales y convenciones del proyecto.
- No se ejecutan acciones de despliegue o versionado sin permiso.

## Flujo responsive obligatorio
1. Revisar cada pantalla afectada en desktop, tablet, móvil y móvil pequeño; comprobar orientación horizontal cuando corresponda.
2. En móvil priorizar tareas y acciones frecuentes; navegación compacta accesible por teclado y táctil, sin depender de hover.
3. Tablas financieras: preservar importes, estados y acciones críticas; usar tarjetas, columnas prioritarias o scroll interno según contexto, sin ocultar datos silenciosamente.
4. Gráficos: evitar etiquetas superpuestas, tooltips inaccesibles y contenedores con ancho fijo.
5. Formularios: etiquetas visibles, campos legibles, teclado móvil adecuado y botones alcanzables.
6. Modales: mantener límites 320/280 px, ajustar al ancho y alto disponible, permitir scroll interno y foco controlado.
7. Revisar 200 % de zoom, texto largo, mensajes de error y navegación táctil.
8. Informar qué viewports se verificaron realmente y cuáles no pudieron probarse.

