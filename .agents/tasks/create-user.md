AGENTE: Implementa el módulo completo de USER con Spring Security y JWT en el proyecto Treasury System.

ANTES DE EMPEZAR:
1. Analiza TODO el proyecto existente (backend y frontend)
2. Identifica la arquitectura, convenciones y patrones ya implementados en Apoderados, Alumno y Familia
3. Basa toda la implementación en lo que YA EXISTE en el código

REQUISITOS DEL MÓDULO USER:

ENTIDAD USER:
- id: Long (autogenerado)
- code: String (único, formato USR-001)
- nombre: String (mínimo 3, máximo 100, solo letras y espacios)
- correo: String (ÚNICO, formato email válido)
- password: String (encriptado con BCrypt, mínimo 8 caracteres, mayúscula, minúscula, número y especial)
- rol: Enum (ADMIN, USER) - por defecto USER
- enabled: Boolean (por defecto true)
- accountNonLocked: Boolean (por defecto true)
- createdAt: LocalDateTime (autogenerado)
- updatedAt: LocalDateTime (autogenerado)

VALIDACIONES:
- Correo único en BD
- Código único en BD
- Password segura con validaciones
- No permitir eliminar al último ADMIN
- No permitir cambiar rol del usuario logueado
- Validar email no en uso al actualizar (excepto mismo usuario)

ENDOPOINTS REST:
POST   /api/auth/login          - Login con correo + password → retorna JWT
POST   /api/auth/register       - Registrar nuevo usuario (solo ADMIN)
GET    /api/auth/me             - Obtener usuario logueado
POST   /api/auth/logout         - Logout
POST   /api/auth/refresh        - Refrescar token

POST   /api/users               - Crear usuario (solo ADMIN)
GET    /api/users               - Listar todos (ADMIN y USER)
GET    /api/users/{id}          - Obtener por ID
GET    /api/users/code/{code}   - Obtener por código
GET    /api/users/email/{email} - Obtener por email
PUT    /api/users/{id}          - Actualizar usuario (ADMIN o mismo usuario)
DELETE /api/users/{id}          - Eliminar usuario (solo ADMIN)
PATCH  /api/users/{id}/rol      - Cambiar rol (solo ADMIN)

SEGURIDAD JWT:
- Usar jjwt-api 0.11.5
- Algoritmo HS256
- Expiración: 24 horas
- Secret en environment variables
- Filtro para validar JWT en cada request
- Configuración CORS
- Stateless sessions

PROTECCIÓN DE ENDPOINTS:
- /api/auth/login → PUBLICO
- /api/auth/register → ADMIN
- /api/auth/** → PUBLICO
- /api/users/** → ADMIN y USER
- /api/users/admin/** → solo ADMIN

ESTRUCTURA BACKEND A IMPLEMENTAR:
entity/User.java
dto/UserRequestDTO.java
dto/UserResponseDTO.java
dto/auth/LoginRequestDTO.java
dto/auth/LoginResponseDTO.java
dto/auth/RegisterRequestDTO.java
mapper/UserMapper.java
repository/UserRepository.java
service/UserService.java
service/CustomUserDetailsService.java
controller/UserController.java
controller/AuthController.java
config/security/SecurityConfig.java
config/security/JwtAuthenticationFilter.java
config/security/JwtService.java
config/security/SecurityConstants.java
config/security/PasswordEncoderConfig.java
exception/UserNotFoundException.java
exception/EmailAlreadyExistsException.java
exception/CodeAlreadyExistsException.java
constant/RoleEnum.java

ESTRUCTURA FRONTEND (React + Vite):
src/pages/Users/UsersPage.tsx
src/pages/Users/UserForm.tsx
src/pages/Auth/LoginPage.tsx
src/pages/Auth/RegisterPage.tsx
src/services/userService.ts
src/services/authService.ts
src/types/user.ts
src/types/auth.ts
src/context/AuthContext.tsx
src/components/UserTable.tsx
src/components/ProtectedRoute.tsx
src/interceptors/axiosInterceptor.ts

TESTS OBLIGATORIOS:
Backend:
- UserServiceTest.java (unit tests: crear, actualizar, eliminar, buscar, validaciones)
- UserControllerTest.java (integration tests: todos los endpoints)
- AuthControllerTest.java (login exitoso, login fallido, registro, logout)
- JwtServiceTest.java (generación y validación de tokens)
- SecurityConfigTest.java (protección de endpoints)

Frontend:
- UserForm.test.tsx (validaciones y renderizado)
- AuthContext.test.tsx (login, logout, estado)
- userService.test.ts (mock de API)

REGLAS DE IMPLEMENTACIÓN:
✅ Seguir EXACTAMENTE las convenciones del proyecto existente
✅ Usar @Valid para validaciones con mensajes personalizados
✅ Implementar GlobalExceptionHandler para manejar excepciones de seguridad
✅ Usar MapStruct para mapeos Entity ↔ DTO
✅ Documentar con Swagger/OpenAPI (@Operation, @ApiResponses)
✅ Usar @PreAuthorize para control de acceso en métodos
✅ Loggear acciones importantes (login, cambios de rol, eliminaciones)
✅ Asegurar cobertura JaCoCo >= 70%
✅ Usar variables de entorno para JWT_SECRET y configuraciones
✅ Implementar rate limiting en login (3 intentos fallidos → bloqueo 15 min)

CONSIDERACIONES ADICIONALES:
- Encriptar passwords con BCryptPasswordEncoder (strength=10)
- Manejar CORS: solo permitir origen del frontend
- En producción: usar HTTPS, HttpOnly cookies para JWT
- Agregar auditoría de acciones sensibles
- Implementar refresh token si es necesario

EJECUTA LA IMPLEMENTACIÓN COMPLETA SIGUIENDO LA ARQUITECTURA EXISTENTE DEL PROYECTO.
