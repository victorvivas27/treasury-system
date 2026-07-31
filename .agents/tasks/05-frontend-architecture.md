# 05. Frontend

```text
src/core/A-domain       entidades y contratos
src/core/B-application casos de uso
src/core/C-infra       repositorios Axios
src/core/D-config      API
src/presentation       contextos, hooks, features, páginas y router
src/shared             layout, estilos, constantes y UI
```

Aliases: `@`, `@core`, `@presentation`, `@shared`. Flujo: UI -> hook -> caso de uso -> contrato -> Axios -> API. No llamar Axios desde componentes.

Hay entidades/repositorios para Alumno, Apoderado, Familia, Auth, User, Treasury y Stand. `AppRouter.tsx` incluye cuenta, rutas protegidas, administración, tesorería, eventos y stands. Reutilizar `MainLayout`, sidebar, `shared/ui`, estados, modales e iconos.

- Mantener tipos/JSON alineados con backend.
- Usar `codigo` para Alumno/Apoderado y `familiaId` para Familia.
- Mantener formularios controlados, loading, errores y navegación.
- No introducir dependencias, estilos o patrones paralelos.
- Los tests están excluidos del TypeScript productivo y se ejecutan aparte.

```bash
cd frontend
pnpm test:run
pnpm lint
pnpm build
```

`build` ejecuta `tsc -b` y Vite; `lint` usa Oxlint. No tocar router/layout/assets fuera del alcance.
