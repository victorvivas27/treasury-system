# 06. Pruebas

## Backend

JUnit 5 y Mockito. Dominio/calculadores sin Spring; servicios con `@ExtendWith(MockitoExtension.class)`. `AuthControllerTest` y `UserControllerTest` usan MockMvc standalone. `SecurityConfigTest` usa `@SpringBootTest(classes = TesoreriaAppApplication.class)` y `@AutoConfigureMockMvc`.

No existen `@WebMvcTest`, `@DataJpaTest` ni Testcontainers. No llamar integración a Mockito o MockMvc standalone. Perfil test: H2 `create-drop`.

```bash
cd backend
./gradlew test
```

## Frontend

Vitest, jsdom, Testing Library y jest-dom. Hay tests de casos de uso, repositorios, interceptor, contextos, hooks, componentes y páginas. Páginas con hooks simulados no prueban backend.

```bash
cd frontend
pnpm test:run
pnpm exec vitest run ruta/al/test
pnpm test:coverage
```

Cubrir éxito, validación, not-found/conflicto, autorización y no persistencia ante error. No usar `.skip`, datos productivos ni registros preexistentes. No cambiar expectativas para esconder defectos sin revisar contrato. Informar comandos, conteos y limitaciones.
