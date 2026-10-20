# Refactorización global del Design System responsive

## Contexto

La aplicación web presenta inconsistencias visuales en la versión móvil: títulos H1 de tamaños diferentes, jerarquías tipográficas irregulares, espaciados desiguales y componentes que no mantienen un estilo uniforme entre pantallas.

## Objetivo

Auditar y refactorizar los estilos de **toda la aplicación** para centralizar tipografía, espaciados, dimensiones y breakpoints en tokens globales reutilizables, tanto para móvil como para tablet y escritorio. Un cambio de tamaño de H1 móvil debe requerir modificar un único token, sin recorrer todas las pantallas.

## Instrucciones para el agente Codex

### Fase 1 — Auditoría

1. Identifica el framework, la arquitectura del frontend y el sistema de estilos existente (CSS, CSS Modules, Tailwind, componentes UI, etc.).
2. Recorre todas las rutas, páginas y componentes, incluidas pantallas públicas, autenticación, formularios, modales y estados vacíos.
3. Localiza tamaños tipográficos, márgenes, paddings, gaps, alturas, anchos y breakpoints repetidos o definidos directamente.
4. Detecta reglas contradictorias, overrides, desbordamientos y excepciones legítimas.
5. **Antes de modificar archivos**, presenta un plan breve con los archivos afectados, la estrategia de tokens y los riesgos previstos.

### Fase 2 — Sistema centralizado

1. Reutiliza y extiende el sistema de diseño existente; no crees uno paralelo.
2. Define tokens semánticos para:
   - Tipografía: H1, H2, H3, H4, subtítulos, texto base, texto pequeño, etiquetas y botones.
   - Espaciado: padding de página, secciones, tarjetas, formularios y separación entre elementos.
   - Componentes: botones, inputs, modales, tarjetas, tablas, radios y bordes.
   - Layout: contenedores, anchos máximos y breakpoints.
3. Centraliza los valores responsive de móvil, tablet y escritorio en la convención apropiada para el proyecto.
4. Aplica los tokens a los componentes compartidos y luego a todas las páginas, eliminando valores hardcodeados repetidos.
5. Conserva excepciones justificadas y documenta por qué existen.

### Ejemplo conceptual de tokens (adaptar al proyecto)

```css
:root {
  --font-h1: 36px;
  --font-h2: 30px;
  --font-h3: 24px;
  --font-h4: 20px;
  --font-body: 16px;
  --font-small: 14px;
  --page-padding: 32px;
  --section-gap: 40px;
  --card-padding: 24px;
  --control-height: 44px;
  --radius-card: 12px;
}

@media (max-width: 767px) {
  :root {
    --font-h1: 28px;
    --font-h2: 24px;
    --font-h3: 20px;
    --font-h4: 18px;
    --font-body: 14px;
    --font-small: 12px;
    --page-padding: 16px;
    --section-gap: 24px;
    --card-padding: 16px;
  }
}

/* Los componentes deben consumir tokens semánticos. */
h1, .heading-h1 { font-size: var(--font-h1); }
h2, .heading-h2 { font-size: var(--font-h2); }
```

> Los números anteriores son ilustrativos, no valores obligatorios. Verifica legibilidad y accesibilidad; evita reducir indiscriminadamente los textos de formularios. Si el proyecto utiliza Tailwind u otro sistema de tokens, implementa la solución en ese sistema en lugar de duplicarlo en CSS.

### Fase 3 — Aplicación integral

1. Uniforma la jerarquía de títulos y textos de todas las pantallas.
2. Normaliza espaciados, contenedores, botones, formularios, tarjetas, tablas y modales.
3. Revisa alineaciones y el comportamiento responsive de componentes especiales.
4. Evita selectores globales agresivos que rompan estilos intencionales.
5. No cambies textos, flujos de usuario, lógica de negocio ni identidad visual salvo que sea indispensable para corregir una inconsistencia visual.

### Fase 4 — Verificación

1. Comprueba las vistas en 320, 375, 390, 430, 768 y 1024 píxeles, y también en escritorio.
2. Verifica ausencia de scroll horizontal inesperado, textos cortados, solapamientos, botones demasiado pequeños y títulos desproporcionados.
3. Comprueba que un cambio en el token H1 móvil se refleje en todas las pantallas que usan esa jerarquía.
4. Ejecuta lint, build y tests disponibles. No afirmes haber hecho pruebas visuales si no pudiste realizarlas.
5. Si hay herramientas de navegador disponibles, toma capturas antes/después de las rutas representativas y revisa visualmente los resultados.

## Restricciones

- No modificar APIs, base de datos, lógica de negocio ni funcionalidades.
- No hacer despliegues ni cambios en producción sin autorización.
- No introducir una segunda librería de estilos o un sistema de tokens paralelo.
- No agregar parches CSS repetidos, overrides innecesarios ni valores mágicos.
- No cambiar la identidad visual ni rediseñar pantallas fuera del alcance.
- Mantener la accesibilidad y el comportamiento actual de los componentes.

## Entregable final

Al terminar, entrega:

1. Resumen de inconsistencias detectadas y corregidas.
2. Lista de archivos modificados.
3. Ubicación y nombres de los tokens centralizados.
4. Rutas y anchos de pantalla verificados.
5. Resultados de lint, build, tests y revisión visual (distinguiendo pruebas ejecutadas de pendientes).
6. Excepciones mantenidas y su justificación.
7. Ejemplo concreto de cómo cambiar globalmente el tamaño de todos los H1 móviles desde un solo token.

**Criterio de aceptación:** los tamaños y espaciados compartidos deben administrarse desde un lugar central; la apariencia móvil debe ser coherente en toda la aplicación y no deben producirse regresiones funcionales ni visuales en tablet o escritorio.
