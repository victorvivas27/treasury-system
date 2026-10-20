# Perfil responsive — 2026-10-19

## Cambios

- Desktop (desde 1024 px): dos columnas, identidad y cuenta a la izquierda;
  datos familiares, aportes y cuotas a la derecha.
- Móvil (hasta 680 px): una columna, edición al final del encabezado personal,
  controles de al menos 44 px y cuotas distribuidas en dos filas.
- Tablet: encabezado horizontal y tarjetas familiares en tres columnas.
- Eliminadas las definiciones repetidas y las reglas móviles contradictorias.
  Se conservó la identidad violeta del perfil y se reutilizan tokens globales.
- Editor: fondo bloqueado, foco contenido, cierre con Escape y devolución del
  foco al botón de edición. No se cierra durante una actualización.
- Galería de avatares con altura limitada y desplazamiento propio, encabezado
  del editor visible al desplazarse y contraste de botones según el tema.
- Corregido texto que mostraba escapes Unicode literales en el límite de foto.

## Archivos

- `frontend/src/presentation/pages/user/ProfilePage.tsx`: estructura y modal.
- `frontend/src/presentation/pages/user/ProfilePage.css`: base compartida.
- `frontend/src/presentation/pages/user/ProfileMobile.css`: composición móvil.
- `frontend/src/presentation/pages/user/ProfileDesktop.css`: composición desktop.
- `frontend/src/presentation/pages/user/ProfileEditor.css`: editor compartido.
- `frontend/src/presentation/pages/user/ProfilePage.test.tsx`: regresión de foco,
  bloqueo del fondo y cierre con teclado.
- `frontend/scripts/check-profile-design.mjs`: auditoría de navegador repetible.

## Validación

- `pnpm test:run`: 93 archivos, 585 pruebas aprobadas.
- `pnpm lint`: aprobado, con cuatro advertencias previas fuera del perfil.
- `pnpm build`: aprobado; mantiene avisos de bundle y eval en lottie-web.
- `git diff --check`: aprobado para los cambios de perfil.
- Chromium: 14 combinaciones de tamaño y tema, con perfil y editor en cada una.
  Anchos de 320, 375, 390, 430, 768, 1024 y 1216 px; temas claro y oscuro.
  Desktop de referencia exactamente 1216 × 552 px CSS. Otros altos: 844 px.
- Sin desbordamiento horizontal ni errores JavaScript en las vistas auditadas.
  Verificados disposición por viewport, controles táctiles, carga de avatar,
  modal de hasta 320 px dentro de la pantalla, fondo bloqueado y retorno del foco.
- Inspección visual de capturas representativas móviles, desktop y editor.
- Capturas y resultado JSON en `frontend/demo-output/profile-review/`.

## Alcance y excepciones

La auditoría de navegador utiliza cuenta USER y datos familiares sintéticos,
con nombres largos y cuotas pagadas/pendientes. No modifica una cuenta real ni
comprueba cargas de archivos contra backend. La lógica financiera se conserva.
Las pruebas unitarias cubren además los estados existentes del perfil.

El avatar conserva dimensiones propias; el input móvil de edición usa 16 px
para evitar zoom al enfocarlo en iOS. Los títulos y textos de la página consumen
`--font-h1`, `--font-h2`, `--font-small` y `--font-size-xs`. Cambiar `--font-h1`
en la regla móvil global cambia también el nombre del perfil.

Para repetir: iniciar Vite en `127.0.0.1:5178` y ejecutar desde `frontend`:
`node scripts/check-profile-design.mjs` (requiere Chromium de Playwright).

## Ajuste de cuotas y simplificación visual

Se separaron el título «Cuota del curso» y la modalidad, y se presentó el detalle
como una lista con concepto, vencimiento, importe y estado. El total ahora se
etiqueta «Total pendiente», conservando el cálculo existente.

Por preferencia del usuario se eliminaron los recuadros interiores de datos
familiares, aportes y cuotas: superficies transparentes, sin bordes perimetrales
y con separadores suaves entre bloques. Se conserva el contenedor principal.

Verificación del ajuste: 10 pruebas del perfil aprobadas; lint y build aprobados
durante la implementación. La versión visual simplificada se verificó con
`node scripts/check-profile-design.mjs --personalizada`: 14 combinaciones de
tamaño y tema aprobadas, incluidos textos largos y desktop 1216 × 552 px.
Capturas en `frontend/demo-output/profile-review-personalizada/`.
