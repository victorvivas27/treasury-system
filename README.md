## Scripts

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Inicia el servidor de desarrollo de Vite |
| `npm run build` | Compila TypeScript y genera la build de producción |
| `npm run lint` | Ejecuta oxlint para detectar variables no utilizadas |
| `npm run preview` | Previsualiza la build de producción localmente |
| `npm run test` | Ejecuta Vitest en modo watch |
| `npm run test:run` | Ejecuta los tests una sola vez |
| `npm run test:coverage` | Ejecuta tests y genera reporte de cobertura |
| `npm run test:single` | Ejecuta un test específico por nombre |
| `npm run test:coverage:open` | Ejecuta tests con cobertura y abre el reporte en el navegador |

### Ejemplos de uso

```bash
# Desarrollo
npm run dev

# Test específico (el nombre va entre comillas simples)
npm run test:single 'nombre-del-test'

# Ver cobertura
npm run test:coverage:open

# Establecer el motor de análisis estático (Linting) para el Frontend utilizando Oxc por su alto rendimiento y ESLint

Ejecutar npm run lint para asegurar calidad de código.

