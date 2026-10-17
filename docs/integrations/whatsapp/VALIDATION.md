# Validacion de tarea 34

Fecha: 2026-10-16. No se usaron destinatarios ni credenciales de Meta reales.

- Backend: `gradlew.bat test -PexcludeTags=postgres pmdMain check` correcto, incluyendo cobertura minima y controles existentes.
- PostgreSQL 18 temporal en loopback, base nueva: `SA34PostgresWhatsAppTest`, 38 pruebas correctas. Flyway V53, migracion idempotente y segundo arranque con Hibernate validate correctos. Docker estaba detenido; no se modifico una base existente. Los tests PostgreSQL 16 con Testcontainers quedan disponibles para CI.
- Frontend: suite completa de Vitest, 90 archivos y 532 pruebas correctas. Advertencias existentes de act() en pruebas del dashboard y AuthContext.
- TypeScript correcto. Oxlint correcto con cuatro advertencias existentes de expresiones sin uso. Build Vite correcto, con advertencia de eval en lottie-web ya presente.
- Chromium con API simulada: modal dentro del viewport desktop 1216 x 552, ancho maximo 280 px, scroll del fondo bloqueado. Vista movil 375 x 740 sin desborde del modal. Validacion de invitacion desde fragmento y eliminacion del token en la URL comprobadas.
- `git diff --check` correcto.

Cobertura funcional nueva: normalizacion y rechazo de telefonos, consentimiento, configuracion deshabilitada/HTTPS, limite y reenvio, errores de Meta sanitizados, diferenciacion entre aceptacion y entrega, firma de webhook, aislamiento por WABA y emisor, idempotencia de estados, activacion y rechazo de token vencido/reemplazado/usado, permisos y aislamiento por curso. Las pruebas HTTP con PostgreSQL ejercitan el flujo compartido de invitaciones y contrasenas.

Pendiente externo: presentar y obtener aprobacion de plantilla, configurar la cuenta de Meta y comprobar una entrega real con Meta Test Number autorizado. WhatsApp queda deshabilitado por defecto; no se desplego ni se habilito produccion.
