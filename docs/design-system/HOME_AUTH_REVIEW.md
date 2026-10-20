# Revisión de Home y autenticación — 2026-10-19

## Alcance y resultado

Se revisaron Home sin sesión, Home con sesión ADMIN simulada, login y solicitud
de recuperación de contraseña. No se identificaron defectos que requirieran
cambios de presentación en estas pantallas durante esta revisión.

Se añadió `frontend/scripts/check-home-auth.mjs` para repetir la comprobación
con respuestas API sintéticas, sin utilizar cuentas reales.

## Verificación ejecutada

- `pnpm test:run`: 93 archivos y 584 pruebas aprobadas.
- `pnpm lint`: aprobado; cuatro advertencias existentes en AlumnoPage,
  ApoderadoPage, FamiliaPage y NotificationContext.
- `pnpm build`: aprobado; avisos de tamaño de bundle y eval en lottie-web.
- `git diff --check`: aprobado.
- `node scripts/check-home-auth.mjs`: 56 vistas/estados aprobados, sin errores
  JavaScript ni desbordamiento horizontal de documento o controles auditados.
- Anchos: 320, 375, 390, 430, 768, 1024 y 1216 px. Altura: 844 px salvo
  desktop de referencia, que usa exactamente 1216 × 552 px CSS.
- Estados: formularios iniciales, errores por envío vacío, confirmación de
  recuperación y menú de Home autenticado. Capturas en
  `frontend/demo-output/home-auth-review/`, junto con `results.json`.
- Inspección visual de capturas representativas móviles y desktop, incluyendo
  login, recuperación, Home y menú autenticado.

## Límites

La auditoría de navegador usa tema predeterminado y comunidad sin publicaciones
(estados de respaldo); no verifica galerías pobladas ni todos los roles.
Las pruebas unitarias existentes complementan los casos de selección de curso.
No se verificó envío real de correo ni autenticación contra backend real.
No se modificaron contratos, autorización ni estilos existentes.

Para repetir: iniciar Vite en `127.0.0.1:5178` y ejecutar el script desde
`frontend`. Chromium debe estar instalado para Playwright.
