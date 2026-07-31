# 04. Autenticación y seguridad

Spring Security es stateless con JWT HS256 (JJWT 0.11.5). Login: `POST /api/v1/auth/login`, cuerpo `correo/password`; respuesta `token`, `tokenType`, `expiresIn`, `user`. Las rutas protegidas requieren `Authorization: Bearer <token>`. Roles: `ADMIN` y `USER`.

Componentes: `SecurityConfig`, `JwtAuthenticationFilter`, `JwtService`, `TokenRevocationService`. Bootstrap del primer ADMIN: `/auth/bootstrap-admin` y `X-Bootstrap-Key`.

Existen registro, verificación/reenvío, password olvidada, reset, cambio y logout. Los tokens de cuenta son de un uso y se guarda su hash. Hay rate limiting. El correo usa Spring Mail (`GmailEmailAdapter`) y `EmailTemplates`; no Nodemailer. La cabecera del email es texto, no logo embebido.

## Reglas

- No registrar passwords, JWT, tokens ni secretos.
- No ampliar rutas públicas/roles sin tests; mantener CORS centralizado.
- Usar variables/Secret Manager; no `.env` en Git.
- Revisar el modelo stateless antes de cambiar CSRF/cookies.
- Mantener revocación al cambiar password.

Existe `SecurityConfigTest` con `@SpringBootTest` y `@AutoConfigureMockMvc`, además de tests unitarios de auth/JWT/rate limiting/revocación/email.

```bash
cd backend
./gradlew test --tests user.SecurityConfigTest
./gradlew test
./gradlew check
```
