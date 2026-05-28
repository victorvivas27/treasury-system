# 🎨 Frontend - Sistema de Tesorería

Guía rápida de comandos para desarrollo, compilación, linting y pruebas del módulo frontend.

> Todos los comandos deben ejecutarse dentro de la carpeta:
>
> ```bash
> frontend/
> ```
---

# 📦 Gestor de Paquetes

Este proyecto utiliza:

```bash
pnpm
```

En lugar de `npm` por mejoras en:

- ⚡ Velocidad
- 💾 Gestión eficiente de dependencias
- 🔒 Consistencia del lockfile
- 🚀 Rendimiento general del proyecto
---

# 📦 1. Scripts Disponibles

| Comando | Descripción |
|---|---|
|pnpm run dev` | Inicia el servidor de desarrollo de Vite |
| `pnpm run build` | Compila TypeScript y genera la build de producción |
| `pnpm run lint` | Ejecuta oxlint para detectar variables no utilizadas |
| `pnpm run preview` | Previsualiza la build de producción localmente |
| `pnpm run test` | Ejecuta Vitest en modo watch |
| `pnpm run test:run` | Ejecuta los tests una sola vez |
| `pnpm run test:coverage` | Ejecuta tests y genera reporte de cobertura |
| `pnpm run test:single` | Ejecuta un test específico por nombre |
| `pnpm run test:coverage:open` | Ejecuta tests con cobertura y abre el reporte en el navegador |

---

# 🚀 2. Desarrollo Local

Para iniciar el servidor de desarrollo:

```bash
pnpm run dev
```

## ✅ Resultado esperado

- Levanta el servidor local de Vite
- Recarga automática ante cambios
- Entorno listo para desarrollo frontend

---

# 🏗️ 3. Build de Producción

Para compilar TypeScript y generar la build final:

```bash
pnpm run build
```

## ✅ Resultado esperado

- Validación de TypeScript
- Generación de archivos optimizados
- Build lista para despliegue

---

# 🔍 4. Linting

Para ejecutar el análisis estático del código:

```bash
pnpm run lint
```

## ✅ Objetivo

Establecer el motor de análisis estático del frontend utilizando Oxc por su alto rendimiento y ESLint como soporte de calidad de código.

Este comando ayuda a detectar:

- Variables no utilizadas
- Problemas de estilo
- Posibles errores antes de producción

---

# 🧪 5. Testing

## Ejecutar tests en modo watch

```bash
pnpm run test
```

## Ejecutar tests una sola vez

```bash
pnpm run test:run
```

## Ejecutar un test específico

> El nombre del test debe ir entre comillas simples.

```bash
pnpm run test:single 'nombre-del-test'
```

---

# 📊 6. Cobertura de Tests

## Generar reporte de cobertura

-Un archivo especifico
```bash
 pnpm vitest run --coverage --coverage.include="**/NombreArchivo"
 ```
 -Todos el preoyecto
```bash
pnpm run test:coverage
```

## Generar cobertura y abrir el reporte

```bash
pnpm run test:coverage:open
```

## ✅ Resultado esperado

- Ejecuta la suite de tests
- Calcula cobertura de código
- Genera reporte visual
- Abre el reporte en el navegador

---

# 👀 7. Preview de Producción

Para previsualizar localmente la build de producción:

```bash
pnpm run preview
```

---

# 📌 Comandos Útiles

| Acción | Comando |
|---|---|
| Iniciar desarrollo | `pnpm run dev` |
| Generar build | `pnpm run build` |
| Ejecutar lint | `pnpm run lint` |
| Ejecutar tests watch | `pnpm run test` |
| Ejecutar tests una vez | `pnpm run test:run` |
| Ver cobertura | `pnpm run test:coverage:open` |
| Preview producción | `pnpm run preview` |

---

# 🧾 Resumen

- `pnpm run dev` → levanta Vite en modo desarrollo 🚀
- `pnpm run build` → genera la build de producción 🏗️
- `pnpm run lint` → valida calidad de código con Oxc/ESLint 🔍
- `pnpm run test` → ejecuta tests en modo watch 🧪
- `pnpm run test:coverage:open` → genera y abre reporte de cobertura 📊


## 📄 Abrir preview Markdown

 ```
 Ctrl + Shift + V
```
