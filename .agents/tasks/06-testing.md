# 06. Pruebas

## Backend

JUnit 5 y Mockito. Dominio/calculadores sin Spring; servicios con `@ExtendWith(MockitoExtension.class)`. `AuthControllerTest` y `UserControllerTest` usan MockMvc standalone. `SecurityConfigTest` usa `@SpringBootTest(classes = TesoreriaAppApplication.class)` y `@AutoConfigureMockMvc`.

No llamar integración a Mockito o MockMvc standalone. Las pruebas con contexto Spring real llevan `@Tag("integration")`; sus subclases heredan la clasificación. Las pruebas `@Tag("postgres")` usan PostgreSQL real y requieren Docker para Testcontainers. Las pruebas con H2 no sustituyen la validación PostgreSQL.

```bash
cd backend
./gradlew test
./gradlew unitTest jacocoUnitTestReport
./gradlew integrationTest jacocoIntegrationTestReport
./gradlew jacocoCombinedTestReport
```

## Frontend

Vitest, jsdom, Testing Library y jest-dom. Hay tests de casos de uso, repositorios, interceptor, contextos, hooks, componentes y páginas. Páginas con hooks simulados no prueban backend.

```bash
cd frontend
pnpm test:run
pnpm exec vitest run ruta/al/test
pnpm test:coverage
pnpm test:coverage:unit
pnpm test:coverage:integration
```

Las pruebas frontend `*.integration.test.tsx` conectan las capas internas reales y simulan el transporte HTTP. No acreditan integración con backend real. Los demás archivos existentes permanecen en la suite unitaria o de componentes aislados. Los reportes frontend se guardan en `coverage/unit`, `coverage/integration` y `coverage/combined` para evitar sobrescribir otras suites.

Consultar las cuatro métricas desde la raíz con `node scripts/check-test-coverage.mjs`; agregar `--check` exige al menos 89 % en líneas, ramas y funciones/métodos. El objetivo de la tarea 36 sigue pendiente; no se modifica el gate histórico backend del 70 %.

Cubrir éxito, validación, not-found/conflicto, autorización y no persistencia ante error. No usar `.skip`, datos productivos ni registros preexistentes. No cambiar expectativas para esconder defectos sin revisar contrato. Informar comandos, conteos y limitaciones.
