# Implementación de versionamiento automático — SemVer + Conventional Commits

## 1. Objetivo

Implementar un sistema profesional de versionamiento para **Treasury System**, comenzando oficialmente desde:

```text
v1.0.0
```

A partir de este punto, el proyecto debe utilizar:

- Semantic Versioning (SemVer).
- Conventional Commits.
- Pull Requests.
- Git tags.
- GitHub Releases.
- CHANGELOG automático.
- Automatización mediante GitHub Actions.
- Release Please o una solución equivalente compatible con la arquitectura actual.
- Visualización automática de la versión actual en el frontend/footer.

El objetivo principal es evitar tener que modificar manualmente:

```text
1.0.0
1.0.1
1.1.0
2.0.0
```

La versión debe derivarse del tipo de cambios realizados.

---

# 2. Antes de modificar código

Primero audita el repositorio.

No asumas que el proyecto utiliza una configuración específica.

Determina:

1. Estructura del repositorio.
2. Si es monorepo o frontend/backend independientes.
3. Gestor de paquetes utilizado.
4. Ubicación del `package.json` del frontend.
5. Si existe un `package.json` raíz.
6. Rama principal (`main`, `master`, etc.).
7. Workflows existentes en `.github/workflows/`.
8. Sistema actual de CI/CD.
9. Sistema actual de deployment.
10. Si ya existen tags/releases.
11. Si existe `CHANGELOG.md`.
12. Si ya existe alguna estrategia de versionamiento.
13. Cómo se construye actualmente el frontend React/TypeScript.
14. Dónde debe mostrarse la versión en la interfaz.

No reemplaces workflows existentes sin comprobar primero qué función cumplen.

La implementación debe integrarse con la arquitectura real del repositorio.

---

# 3. Semantic Versioning

Usar el formato:

```text
MAJOR.MINOR.PATCH
```

Ejemplo inicial:

```text
1.0.0
```

La clasificación NO debe depender de:

- cantidad de archivos modificados;
- cantidad de líneas;
- duración del trabajo;
- tamaño del PR.

Debe depender del **impacto del cambio sobre el producto y su compatibilidad**.

---

## 3.1 PATCH

Formato:

```text
1.0.0 → 1.0.1
1.0.1 → 1.0.2
```

Utilizar PATCH cuando se corrige o mejora algo existente sin introducir una nueva funcionalidad pública significativa.

Conventional Commit principal:

```text
fix:
```

Ejemplos:

```text
fix: corrige alineación del sidebar
fix: corrige color del botón crear administración
fix: evita error al cerrar sesión
fix: corrige validación incorrecta del formulario
fix: corrige responsive del modal
fix: evita duplicación de solicitudes
```

También pueden existir cambios internos que normalmente NO necesitan provocar una nueva MINOR:

```text
refactor:
perf:
style:
test:
docs:
chore:
ci:
build:
```

No asumir que todo commit genera necesariamente una release.

---

# 4. MINOR

Formato:

```text
1.0.4 → 1.1.0
1.1.7 → 1.2.0
```

Utilizar MINOR cuando se agrega una nueva funcionalidad compatible con lo existente.

Conventional Commit:

```text
feat:
```

Ejemplos:

```text
feat: agrega módulo de reportes
feat: agrega recuperación de contraseña
feat: agrega filtros al listado de administraciones
feat: agrega exportación a Excel
feat: agrega sistema de notificaciones
feat: agrega nueva sección de configuración
```

Un `feat:` debe incrementar:

```text
MINOR
```

Ejemplo:

Versión actual:

```text
1.3.6
```

Nuevo cambio:

```text
feat: agrega panel de estadísticas
```

Nueva versión:

```text
1.4.0
```

---

# 5. MAJOR

Formato:

```text
1.x.x → 2.0.0
2.x.x → 3.0.0
```

MAJOR debe utilizarse exclusivamente cuando exista un cambio incompatible importante.

Ejemplos:

- eliminación de funcionalidad pública existente;
- API incompatible con clientes existentes;
- modificación incompatible de contratos frontend/backend;
- cambio que requiera migración obligatoria;
- eliminación o sustitución incompatible de endpoints;
- cambio importante de formato de datos público;
- nueva generación incompatible de la aplicación.

Utilizar Conventional Commits:

```text
feat!:
```

o:

```text
fix!:
```

También soportar:

```text
BREAKING CHANGE:
```

Ejemplo:

```text
feat!: reemplaza API de autenticación
```

o:

```text
feat: implementa nueva API de autenticación

BREAKING CHANGE: los endpoints anteriores de autenticación dejan de estar disponibles
```

Resultado:

```text
1.8.4 → 2.0.0
```

IMPORTANTE:

No utilizar MAJOR simplemente porque un PR tenga muchos archivos.

Un refactor interno grande que mantiene compatibilidad puede seguir siendo PATCH.

---

# 6. Regla fundamental de clasificación

Implementar/documentar esta matriz:

| Cambio | Tipo | Incremento |
|---|---|---|
| Bug fix | `fix:` | PATCH |
| Corrección visual | `fix:` | PATCH |
| Optimización compatible | `perf:` | normalmente PATCH |
| Nueva funcionalidad | `feat:` | MINOR |
| Nueva sección funcional | `feat:` | MINOR |
| Nuevo módulo | `feat:` | MINOR |
| Nueva capacidad compatible | `feat:` | MINOR |
| Cambio incompatible | `feat!:` / `fix!:` | MAJOR |
| Breaking change | `BREAKING CHANGE:` | MAJOR |
| Documentación | `docs:` | sin release por defecto |
| Tests | `test:` | sin release por defecto |
| CI | `ci:` | sin release por defecto |
| Mantenimiento | `chore:` | sin release por defecto |
| Refactor interno | `refactor:` | sin release o PATCH según política |

Configurar la automatización siguiendo estas reglas.

---

# 7. PR pequeño no significa PATCH

Esto debe quedar explícitamente documentado.

Ejemplo A:

PR modifica 2 archivos:

```text
feat: agrega recuperación de contraseña
```

Aunque sea pequeño:

```text
MINOR
```

Ejemplo B:

PR modifica 40 archivos:

```text
fix: corrige manejo interno de errores sin cambiar contratos
```

Puede continuar siendo:

```text
PATCH
```

Ejemplo C:

PR modifica solamente unas pocas líneas:

```text
feat!: elimina compatibilidad con API v1
```

Debe ser:

```text
MAJOR
```

Por tanto:

```text
TAMAÑO DEL PR != TIPO DE VERSIÓN
```

La clasificación depende del impacto semántico.

---

# 8. Pull Requests con múltiples cambios

Un PR puede contener varios commits.

Ejemplo:

```text
fix: corrige sidebar
fix: corrige modal
feat: agrega filtro de administraciones
docs: actualiza documentación
```

La release debe tomar el cambio de mayor impacto.

Prioridad:

```text
BREAKING CHANGE
      ↓
MAJOR

feat:
      ↓
MINOR

fix:
      ↓
PATCH
```

En el ejemplo anterior existe un `feat:`.

Por tanto:

```text
1.0.0 → 1.1.0
```

No:

```text
1.0.1
```

---

# 9. Estrategia de Pull Requests

Mantener el flujo:

```text
branch
   ↓
commits
   ↓
push
   ↓
Pull Request
   ↓
review / CI
   ↓
merge
   ↓
main
```

No incrementar automáticamente la versión simplemente porque se realizó:

```text
git push
```

Tampoco incrementar automáticamente por abrir un PR.

La versión debe prepararse a partir de cambios integrados a la rama principal.

---

# 10. Conventional Commits

Establecer como estándar:

```text
<type>(<scope opcional>): <descripción>
```

Ejemplos:

```text
fix(sidebar): corrige alineación del logout
fix(auth): evita refresh duplicado
feat(reports): agrega exportación PDF
feat(admin): agrega filtros de administraciones
refactor(auth): reorganiza servicio de autenticación
docs: actualiza documentación
test(auth): agrega pruebas de refresh token
```

Para breaking changes:

```text
feat(api)!: reemplaza contrato de autenticación
```

---

# 11. Scopes recomendados

No hacerlos obligatorios inicialmente.

Permitir scopes como:

```text
auth
sidebar
admin
administrations
reports
users
notifications
frontend
backend
api
database
security
ui
ci
```

Ejemplo:

```text
fix(sidebar): corrige animación al cerrar
```

---

# 12. Validación de commits

Analizar si resulta conveniente incorporar:

```text
commitlint
```

y configuración de Conventional Commits.

Objetivo:

Evitar commits incorrectos como:

```text
cambios
arreglo
update
cosas nuevas
fix final
cambio 2
```

Favorecer:

```text
fix(sidebar): corrige animación de cierre
feat(reports): agrega exportación de movimientos
```

Si se instala Husky u otro hook, comprobar primero que no interfiera con el entorno actual de desarrollo.

No agregar dependencias innecesarias si GitHub puede realizar la validación de forma más simple.

---

# 13. Pull Request title

Considerar validar también el título del PR.

Ejemplos:

```text
fix(sidebar): corrige animación del footer
```

```text
feat(reports): agrega módulo de reportes
```

Esto es especialmente importante si el repositorio utiliza:

```text
Squash and merge
```

En ese caso, comprobar cómo GitHub construye el commit final después del merge.

La automatización debe basarse en información que permanezca disponible después del merge.

---

# 14. Release Please

Implementar Release Please mediante GitHub Actions, siempre que sea compatible con la estructura real del repositorio.

Objetivo:

Después de integrar cambios a `main`, Release Please debe analizar los Conventional Commits y preparar una release.

Ejemplo:

Versión existente:

```text
1.0.0
```

Commits acumulados:

```text
fix: corrige sidebar
fix: corrige modal
fix: corrige validación
```

Release propuesta:

```text
1.0.1
```

Si aparece:

```text
feat: agrega reportes
```

Release propuesta:

```text
1.1.0
```

Si aparece:

```text
feat!: reemplaza API pública
```

Release propuesta:

```text
2.0.0
```

---

# 15. No crear una versión por cada PR obligatoriamente

Preferir el flujo de Release PR.

Ejemplo:

```text
main
 │
 ├── fix: sidebar
 ├── fix: modal
 ├── fix: tooltip
 └── fix: responsive
          ↓
     Release Please
          ↓
     Release PR
          ↓
        v1.0.1
```

Si antes de liberar entra:

```text
feat: agrega reportes
```

Release Please debe recalcular según SemVer:

```text
v1.1.0
```

Esto permite agrupar varios cambios en una sola versión.

---

# 16. Release PR

La automatización debe crear/preparar un PR similar a:

```text
chore(main): release 1.1.0
```

Ese PR debe mostrar claramente:

- nueva versión;
- features;
- fixes;
- breaking changes si existen;
- CHANGELOG correspondiente.

Al hacer merge del Release PR:

```text
crear tag
crear GitHub Release
actualizar versión
```

Esto mantiene control humano sobre cuándo una versión se considera oficialmente publicada.

---

# 17. Git tags

Las versiones oficiales deben tener tags:

```text
v1.0.0
v1.0.1
v1.1.0
v1.2.0
v2.0.0
```

No crear tags para cada commit.

Un tag representa una release oficial.

---

# 18. CHANGELOG

Crear o mantener:

```text
CHANGELOG.md
```

Debe ser generado automáticamente cuando sea posible.

Ejemplo:

```markdown
# Changelog

## 1.1.0

### Features

- agrega módulo de reportes
- agrega filtros de administraciones

### Bug Fixes

- corrige animación del sidebar
- corrige validación del formulario
```

No mantener manualmente información que Release Please pueda generar de forma fiable.

---

# 19. Fuente única de versión

Debe existir UNA fuente confiable de versión.

No introducir versiones hardcodeadas independientes como:

```tsx
<span>v1.0.0</span>
```

porque quedarían desincronizadas.

Determina durante la auditoría cuál debe ser la fuente correcta.

Si corresponde al frontend:

```json
{
  "version": "1.0.0"
}
```

en su `package.json`.

Si la arquitectura requiere otra fuente, documentar la decisión.

---

# 20. Mostrar versión en el frontend

Agregar la versión de forma discreta al footer existente.

Ejemplo visual:

```text
Tesorería Escolar · v1.0.0
```

o integrado con el copyright existente:

```text
© 2026 Tesorería Escolar · v1.0.0
```

NO hardcodear:

```tsx
v1.0.0
```

El frontend debe obtener la versión desde la fuente única definida anteriormente.

La implementación exacta debe adaptarse al sistema de build existente.

Si utiliza Vite, evaluar una solución compatible con Vite.

No exponer información sensible del build.

---

# 21. Comportamiento esperado

Estado inicial:

```text
v1.0.0
```

### Caso PATCH

Cambios:

```text
fix(sidebar): corrige logout
fix(modal): corrige responsive
```

Resultado:

```text
v1.0.1
```

Footer:

```text
Tesorería Escolar · v1.0.1
```

---

### Caso MINOR

Versión:

```text
v1.0.1
```

Cambio:

```text
feat(reports): agrega módulo de reportes
```

Resultado:

```text
v1.1.0
```

Footer:

```text
Tesorería Escolar · v1.1.0
```

---

### Caso MAJOR

Versión:

```text
v1.8.4
```

Cambio:

```text
feat(api)!: reemplaza API pública
```

Resultado:

```text
v2.0.0
```

Footer:

```text
Tesorería Escolar · v2.0.0
```

---

# 22. GitHub Actions

Crear los workflows necesarios dentro de:

```text
.github/workflows/
```

pero primero inspeccionar los workflows existentes.

Evitar:

- workflows duplicados;
- releases duplicadas;
- tags duplicados;
- loops de CI;
- ejecuciones provocadas por commits automáticos;
- permisos excesivos.

Utilizar permisos mínimos necesarios.

No incluir secretos directamente en YAML.

Utilizar:

```text
secrets
```

o mecanismos oficiales de GitHub cuando corresponda.

---

# 23. Protección contra errores

La solución debe impedir o minimizar situaciones como:

```text
package.json = 1.1.0
Git tag = v1.0.5
GitHub Release = v1.0.6
Footer = v1.0.3
```

La arquitectura debe mantener sincronizados:

```text
versión del proyecto
       ↓
CHANGELOG
       ↓
Git tag
       ↓
GitHub Release
       ↓
build frontend
       ↓
footer
```

---

# 24. Primera versión v1.0.0

Antes de crear `v1.0.0`, comprobar si ya existen tags o releases que puedan entrar en conflicto.

Si no existen conflictos y el estado actual representa oficialmente la primera versión estable:

```text
v1.0.0
```

Establecerlo como baseline del nuevo sistema.

No eliminar tags anteriores sin autorización.

---

# 25. Documentación para desarrolladores

Crear documentación breve, por ejemplo:

```text
docs/VERSIONING.md
```

Debe explicar:

## Bug

```bash
git commit -m "fix(sidebar): corrige animación"
```

Resultado esperado:

```text
PATCH
```

## Feature

```bash
git commit -m "feat(reports): agrega exportación"
```

Resultado esperado:

```text
MINOR
```

## Breaking change

```bash
git commit -m "feat(api)!: reemplaza contrato de autenticación"
```

Resultado esperado:

```text
MAJOR
```

También explicar:

```text
docs:
test:
refactor:
chore:
ci:
build:
style:
perf:
```

y qué comportamiento de release tiene cada uno en ESTE repositorio.

---

# 26. No inferir versión por tamaño del cambio

No implementar algoritmos que intenten decidir la versión según:

```text
número de archivos
número de líneas
cantidad de commits
duración del PR
```

La intención semántica debe provenir de Conventional Commits.

Ejemplo:

```text
3 líneas + BREAKING CHANGE = MAJOR
```

mientras:

```text
50 archivos de refactor compatible != necesariamente MAJOR
```

---

# 27. Validaciones finales

Después de implementar, verificar como mínimo:

### Escenario A

```text
fix: corrige bug
```

Debe producir/proponer:

```text
PATCH
```

### Escenario B

```text
feat: agrega funcionalidad
```

Debe producir/proponer:

```text
MINOR
```

### Escenario C

```text
feat!: cambio incompatible
```

Debe producir/proponer:

```text
MAJOR
```

### Escenario D

```text
docs: actualiza README
```

No debe producir una release funcional innecesaria.

### Escenario E

```text
fix + feat
```

Debe ganar:

```text
MINOR
```

### Escenario F

```text
fix + feat + BREAKING CHANGE
```

Debe ganar:

```text
MAJOR
```

---

# 28. Tests y comprobaciones

Ejecutar después de la implementación:

- instalación/validación de dependencias;
- lint;
- TypeScript;
- tests existentes;
- build del frontend;
- validación de workflows;
- validación de configuración Release Please;
- comprobación de lectura de versión en frontend.

No declarar terminada la tarea si el build falla debido a los cambios introducidos.

No corregir problemas ajenos al versionamiento sin documentarlos primero.

---

# 29. Resultado esperado

Al terminar quiero poder trabajar normalmente:

```text
crear branch
    ↓
realizar cambios
    ↓
usar Conventional Commits
    ↓
push
    ↓
Pull Request
    ↓
merge a main
    ↓
Release Please analiza commits
    ↓
Release PR
    ↓
merge de Release PR
    ↓
nueva versión oficial
    ↓
Git tag
    ↓
GitHub Release
    ↓
CHANGELOG
    ↓
frontend/footer actualizado
```

Ejemplo:

```text
v1.0.0
```

Realizo:

```text
fix(sidebar): corrige animación
```

Resultado:

```text
v1.0.1
```

Posteriormente:

```text
feat(reports): agrega módulo de reportes
```

Resultado:

```text
v1.1.0
```

Posteriormente:

```text
feat(api)!: reemplaza contrato público
```

Resultado:

```text
v2.0.0
```

---

# 30. Entrega final del agente

Al finalizar, entregar un informe con:

1. Arquitectura de versionamiento encontrada inicialmente.
2. Archivos creados.
3. Archivos modificados.
4. Dependencias agregadas, si existen.
5. Workflows creados/modificados.
6. Fuente única elegida para la versión.
7. Cómo obtiene el frontend la versión.
8. Cómo se actualiza el footer.
9. Cómo funciona Release Please.
10. Cómo se genera el CHANGELOG.
11. Cómo se crean tags/releases.
12. Reglas PATCH/MINOR/MAJOR implementadas.
13. Resultado de lint/tests/build.
14. Cualquier decisión que requiera intervención manual.

No limitarse a entregar instrucciones.

Realizar la implementación completa en el repositorio, respetando la arquitectura existente y evitando modificaciones no relacionadas.