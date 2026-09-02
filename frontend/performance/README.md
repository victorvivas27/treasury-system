# Performance Navigation Audit

Auditoria Playwright para medir la navegacion productiva sin modificar datos.

## Variables

El runner requiere estas variables en `frontend/.env` o en el entorno:

- `PERF_BASE_URL`
- `PERF_USERNAME`
- `PERF_PASSWORD`

Opcional:

- `PERF_ITERATIONS`, por defecto `5`

No se imprimen credenciales, tokens, cookies ni headers `Authorization`.

## Ejecucion

Desde `frontend`:

```bash
pnpm exec playwright test -c performance/config/playwright.performance.config.ts
```

Para una corrida minima:

```bash
PERF_ITERATIONS=1 pnpm exec playwright test -c performance/config/playwright.performance.config.ts
```

## Alcance seguro

El flujo abre la app en `PERF_BASE_URL`, hace login por la UI y navega por pantallas visibles del sidebar:

- Dashboard
- Alumnos
- Apoderados
- Tesoreria

No hace clic en crear, editar, eliminar, enviar, pagar, aprobar, rechazar, subir archivos ni configurar valores.

## Reportes

Los reportes locales se generan en:

- `performance/reports/performance-report.json`
- `performance/reports/PERFORMANCE_REPORT.md`
- `performance/screenshots/`

Esas salidas estan ignoradas por git porque pueden contener URLs internas, trazas o informacion operacional.
