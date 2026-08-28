# Frontend de Tesorería Escolar

Aplicación React 19 y TypeScript construida con Vite. Los comandos de esta guía se ejecutan desde `frontend/` y usan pnpm 11.5.0.

## Arquitectura

```text
src/
├── core/
│   ├── A-domain/       entidades y contratos de repositorio
│   ├── B-application/  casos de uso
│   ├── C-infra/        repositorios Axios
│   └── D-config/       configuración de API
├── presentation/
│   ├── components/
│   ├── context/
│   ├── features/
│   ├── hooks/
│   ├── pages/
│   └── routers/
└── shared/
    ├── constants/
    ├── layouts/
    ├── style/
    └── ui/
```

El flujo normal es página/componente -> hook -> caso de uso -> contrato -> repositorio Axios -> API. Los aliases disponibles son `@`, `@core`, `@presentation` y `@shared`.

Los módulos frontend actuales incluyen Alumno, Apoderado, Familia, Usuario/autenticación, Tesorería, Eventos escolares y Stands, además de dashboard, configuración, perfil y rutas protegidas.

## Configuración

`VITE_API_URL` define la base de la API. El fallback es:

```text
http://localhost:5055/tesoreria/api/v1
```

Crear `frontend/.env` desde `frontend/.env.example` cuando se necesite otro destino.

## Scripts disponibles

| Comando | Función |
| --- | --- |
| `pnpm dev` | Servidor de desarrollo Vite |
| `pnpm build` | Type checking con `tsc -b` y build Vite |
| `pnpm lint` | Análisis estático con Oxlint |
| `pnpm preview` | Vista local de la build |
| `pnpm test` | Vitest en modo interactivo/watch |
| `pnpm test:run` | Suite Vitest una vez |
| `pnpm test:coverage` | Suite con cobertura V8 |
| `pnpm test:single -- "nombre"` | Filtrado por nombre de test |
| `pnpm test:coverage:open` | Cobertura y apertura del reporte en Windows |

## Desarrollo y build

```bash
pnpm install
pnpm dev
```

Validación de producción:

```bash
pnpm build
```

`build` ejecuta TypeScript en modo build y después Vite. Los archivos `*.test.ts` y `*.test.tsx` están excluidos del type checking productivo, por lo que los tests deben ejecutarse por separado.

## Lint

```bash
pnpm lint
```

El proyecto utiliza únicamente Oxlint mediante:

```text
oxlint . -D no-unused-vars
```

No existe configuración ni dependencia de ESLint.

## Pruebas

Vitest usa jsdom, Testing Library, `jest-dom` y cobertura V8.

```bash
pnpm test
pnpm test:run
pnpm test:coverage
pnpm exec vitest run src/ruta/archivo.test.tsx
```

Las pruebas cubren casos de uso, repositorios, interceptor Axios, contextos, hooks, componentes y páginas. Las pruebas con hooks o repositorios simulados no representan integración con el backend; los contratos HTTP se validan con Bruno.

## Validación completa

```bash
pnpm test:run
pnpm lint
pnpm build
```

No instalar dependencias nuevas ni duplicar componentes de `shared/ui` sin revisar primero la arquitectura existente.
