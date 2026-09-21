Quiero que realices una refactorización de alto nivel y calidad profesional del sistema CI/CD de este repositorio.

NO quiero parches aislados. Analiza primero el pipeline completo y después implementa una arquitectura coherente, mantenible, segura y sin ejecuciones duplicadas.

Los workflows están en:

.github/workflows/

01-commit-lint.yml
02-frontend-ci.yml
03-backend-ci.yml
04-bruno-tests.yml
05-versioning-ci.yml
06-release-please.yml
07-deploy-backend.yml
08-deploy-frontend.yml
09-reports-pages.yml

OBJETIVO

Diseñar un pipeline CI/CD claro donde cada workflow tenga una única responsabilidad y donde sea sencillo entender:

feature → PR → dev → main → release → producción

Antes de modificar archivos:

1. Lee COMPLETAMENTE los 9 workflows.
2. Lee también:
   - release-please-config.json
   - .release-please-manifest.json
   - .commitlintrc.json
   - scripts/test-versioning.cjs
   - scripts/test-auto-release.cjs
   - configuración Gradle relevante del backend
   - package.json y pnpm-lock.yaml del frontend
3. Busca todas las referencias existentes a los nombres de los workflows.
4. Analiza branch protection / required checks que puedan verse afectados, si esa información está disponible.
5. Construye mentalmente el grafo completo de eventos y dependencias antes de editar.

ARQUITECTURA DESEADA

El pipeline debe separar claramente:

A. VALIDACIÓN
- Conventional commits / PR title.
- Frontend CI.
- Backend CI.
- API tests con Bruno.
- Validaciones de versionado.

B. RELEASE
- Release Please debe encargarse del proceso de versionado/release.
- Evitar que Release Please se convierta innecesariamente en un mega-orquestador.
- Evitar validaciones duplicadas sobre el mismo SHA.
- Los PR automáticos de Release Please deben ser tratados correctamente y no romper commitlint innecesariamente.

C. DEPLOYMENT
- Producción debe desplegar únicamente código previamente validado.
- Preferir un evento inequívoco de release/tag para producción si es compatible con la arquitectura real del repositorio.
- Mantener workflow_dispatch como mecanismo manual cuando tenga sentido.
- No permitir deployments duplicados provocados por múltiples triggers para el mismo release.
- Backend y frontend deben poder fallar de forma independiente y ser fáciles de diagnosticar.

D. COVERAGE
- Revisar por qué 09-reports-pages.yml vuelve a ejecutar tests que ya ejecutan Frontend CI y Backend CI.
- Evitar trabajo duplicado cuando sea posible sin comprometer la integridad de los reportes.
- Los reportes publicados deben corresponder inequívocamente al commit/release correcto.

BRANCHES

Mantener la intención:

feature/*
   ↓
PR
   ↓
dev
   ↓
PR
   ↓
main
   ↓
Release Please
   ↓
release/tag
   ↓
production

No asumir que cada workflow debe ejecutarse en cada etapa.

Usar `paths` / `paths-ignore`, condiciones y reusable workflows cuando realmente aporten valor.

BRUNO

Revisar específicamente 04-bruno-tests.yml.

Actualmente los API tests se ejecutan después de push a dev.

Determina una estrategia mejor para que una regresión de API pueda bloquear el merge antes de entrar en la rama correspondiente.

Evita ejecutar PostgreSQL + Java + Node + Bruno cuando los cambios no afectan backend/API.

CACHES Y TOOLCHAIN

Unificar donde corresponda:

- Java 17
- Gradle caching
- Node 22
- pnpm
- versiones de GitHub Actions

No mantener dos estrategias distintas de cache sin una razón técnica documentada.

No actualizar versiones arbitrariamente sólo porque exista una versión más nueva. Verificar compatibilidad con el proyecto.

SEGURIDAD

Mantener principio de mínimo privilegio en `permissions`.

No introducir secrets nuevos innecesariamente.

No imprimir secrets en logs.

Mantener autenticación de Google Cloud mediante Workload Identity Federation.

No reemplazar WIF por service-account JSON.

Revisar que workflows provenientes de pull requests no obtengan permisos/secrets de producción innecesarios.

DEPLOYMENT

Revisar especialmente:

07-deploy-backend.yml
08-deploy-frontend.yml

Mantener:

- Artifact Registry
- Google Cloud Run
- Workload Identity Federation
- environment: production
- configuración runtime necesaria.

No cambiar nombres de servicios, secretos, repositorios de Artifact Registry ni configuración de producción salvo que exista una razón demostrable.

VERSIONADO

Mantener Release Please como sistema de versionado.

No implementar manualmente un segundo sistema de versionado.

Mantener compatibilidad con Conventional Commits.

Revisar:

05-versioning-ci.yml
06-release-please.yml
release-please-config.json
.release-release-please-manifest.json
scripts/test-versioning.cjs
scripts/test-auto-release.cjs

IMPORTANTE SOBRE LOS ARCHIVOS

Los workflows fueron renombrados y actualmente son:

01-commit-lint.yml
02-frontend-ci.yml
03-backend-ci.yml
04-bruno-tests.yml
05-versioning-ci.yml
06-release-please.yml
07-deploy-backend.yml
08-deploy-frontend.yml
09-reports-pages.yml

Busca y actualiza TODAS las referencias internas a nombres antiguos.

No debe quedar ninguna referencia a:

frontend-ci.yml
backend-ci.yml
versioning-ci.yml
deploy-backend.yml
deploy-frontend.yml
reports-pages.yml

cuando la referencia necesite ahora el nombre numerado correspondiente.

CALIDAD

Quiero una solución de nivel producción:

- YAML claro.
- Nombres consistentes.
- Responsabilidad única.
- Sin duplicación innecesaria.
- Sin condiciones frágiles.
- Sin carreras entre workflows.
- Con concurrency cuando tenga sentido.
- Fail-fast donde corresponda.
- Logs comprensibles.
- Comentarios solamente cuando expliquen decisiones no obvias.
- Evitar complejidad accidental.
- Evitar automatización innecesariamente sofisticada.

NO cambies código funcional de frontend/backend salvo que sea estrictamente necesario para hacer funcionar CI.

ANTES DE TERMINAR

Valida estáticamente todos los YAML.

Busca referencias rotas después del refactor.

Comprueba que todos los `uses: ./.github/workflows/...` apunten a archivos existentes.

Comprueba todos los workflow_dispatch invocados por nombre.

Ejecuta los tests de versionado existentes.

Ejecuta las validaciones locales razonablemente posibles del frontend/backend relacionadas con los cambios.

No hagas push.
No hagas merge.
No despliegues producción.
No modifiques secrets.
No ejecutes acciones destructivas.

ENTREGA FINAL

Al terminar dame:

1. Arquitectura anterior.
2. Problemas encontrados.
3. Arquitectura nueva.
4. Archivos modificados.
5. Explicación de cada cambio.
6. Diagrama del flujo final.
7. Qué dispara cada workflow.
8. Qué workflows son required checks recomendados.
9. Riesgos o configuraciones manuales pendientes en GitHub.
10. Pruebas/validaciones ejecutadas y sus resultados.

No consideres terminada la tarea si sólo modificaste los YAML. Verifica el flujo completo como un sistema.
