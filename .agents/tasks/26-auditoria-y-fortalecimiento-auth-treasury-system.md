# Auditoría y fortalecimiento de autenticación --- treasury-system

## Objetivo

Antes de modificar cualquier código, necesitamos conocer con precisión
**qué arquitectura de autenticación tiene actualmente el proyecto**.

El objetivo de esta tarea es hacer primero una auditoría del estado real
del repositorio y, solo después de revisar sus resultados, proponer e
implementar un endurecimiento de seguridad.

**Regla principal:** no asumir que la aplicación funciona como el
diagrama de referencia. El agente debe inspeccionar el código real,
configuración, frontend, backend y flujo HTTP.

------------------------------------------------------------------------

# FASE 1 --- AUDITORÍA DEL ESTADO ACTUAL

## 1. Mapear el flujo completo de autenticación

Investigar y documentar:

``` text
LOGIN
  ↓
¿Frontend o Backend valida credenciales?
  ↓
¿Dónde se genera el Access Token?
  ↓
¿Dónde se genera el Refresh Token?
  ↓
¿Dónde se almacenan?
  ↓
¿Dónde se envían?
  ↓
¿Cómo se renueva el Access Token?
  ↓
¿Cómo se detecta una sesión expirada?
  ↓
¿Cómo funciona Logout?
```

Determinar específicamente:

-   Endpoint real de login.
-   Endpoint real de refresh.
-   Endpoint real de logout.
-   Endpoint utilizado para obtener el perfil del usuario.
-   Endpoint de registro.
-   Cómo se transportan los tokens.
-   Duración real de Access Token.
-   Duración real de Refresh Token.
-   Algoritmo JWT utilizado.
-   Claims incluidos.
-   Cómo se valida la firma.
-   Cómo se valida expiración.
-   Si existe revocación.
-   Si existe gestión de sesiones.

------------------------------------------------------------------------

# 2. Auditar el FRONTEND

Buscar todas las referencias relacionadas con:

-   `localStorage`
-   `sessionStorage`
-   `document.cookie`
-   cookies
-   `Authorization`
-   `Bearer`
-   JWT
-   access token
-   refresh token
-   login
-   logout
-   refresh
-   interceptores HTTP
-   Axios/fetch
-   guards
-   rutas protegidas
-   estado global de autenticación

Determinar exactamente dónde se guarda el Access Token.

Determinar exactamente dónde se guarda el Refresh Token.

Determinar si existe un `AuthContext`, store, service, interceptor o
equivalente.

Determinar qué ocurre cuando:

``` text
GET /api/profile
```

responde:

``` text
401 Unauthorized
```

Documentar si actualmente:

1.  se intenta refresh,
2.  se reintenta la petición,
3.  se redirige al login,
4.  se elimina la sesión,
5.  o simplemente falla la petición.

También revisar si existe riesgo de múltiples refresh simultáneos cuando
varias peticiones reciben `401` al mismo tiempo.

------------------------------------------------------------------------

# 3. Auditar el BACKEND

Inspeccionar:

-   Controllers de autenticación.
-   Services de autenticación.
-   Security configuration.
-   JWT service/utilities.
-   filtros JWT.
-   configuración CORS.
-   configuración CSRF.
-   configuración de cookies.
-   repositorios relacionados con usuarios/sesiones/tokens.
-   entidades de sesión o refresh token.
-   configuración de expiración.

Buscar especialmente:

``` text
JwtAuthenticationFilter
SecurityFilterChain
AuthenticationManager
PasswordEncoder
CorsConfiguration
Cookie
ResponseCookie
refresh
logout
JWT
Authorization
```

No asumir nombres concretos; buscar también implementaciones
equivalentes.

------------------------------------------------------------------------

# 4. Determinar cómo funciona actualmente el Refresh Token

Responder explícitamente:

### ¿Dónde vive?

-   localStorage
-   sessionStorage
-   memoria
-   cookie
-   base de datos
-   combinación de varias

### ¿Es HttpOnly?

Sí / No / No aplica.

### ¿Es Secure?

Sí / No / No aplica.

### ¿Qué SameSite utiliza?

-   Strict
-   Lax
-   None
-   No configurado

### ¿Tiene Path limitado?

Sí / No.

### ¿Se rota?

Determinar si ocurre esto:

``` text
Refresh A
   ↓
/refresh
   ↓
Access B
Refresh B
```

o esto:

``` text
Refresh A
   ↓
/refresh
   ↓
Access B
Refresh A sigue siendo válido
```

### ¿Existe revocación?

Determinar qué sucede cuando el usuario hace logout.

### ¿Existe detección de reutilización?

Determinar qué sucede si un refresh token que ya fue utilizado vuelve a
presentarse.

------------------------------------------------------------------------

# 5. Auditar CORS

Revisar configuración completa de CORS.

Determinar:

-   orígenes permitidos en desarrollo.
-   orígenes permitidos en producción.
-   `allowCredentials`.
-   métodos permitidos.
-   headers permitidos.
-   headers expuestos.
-   si existe `Access-Control-Allow-Origin: *`.
-   si se permiten credenciales junto con wildcard.
-   si existen diferencias entre dev/test/prod.

**No modificar CORS todavía.**

Primero documentar el estado actual y posibles problemas.

------------------------------------------------------------------------

# 6. Auditar CSRF

Determinar:

-   si Spring Security CSRF está habilitado o deshabilitado.
-   por qué está configurado así.
-   si el refresh token utiliza cookie.
-   si `/auth/refresh` está protegido contra CSRF de forma apropiada
    para la arquitectura actual.
-   si los endpoints que mutan estado dependen de cookies de
    autenticación.

No deshabilitar CSRF simplemente para solucionar errores de frontend.

------------------------------------------------------------------------

# 7. Auditar almacenamiento de Refresh Tokens

Si los refresh tokens se almacenan en base de datos, determinar:

-   si se almacena el token completo.
-   si se almacena un hash.
-   si existe un identificador de sesión.
-   si existe `expiresAt`.
-   si existe `revokedAt`.
-   si existe `createdAt`.
-   si existe `lastUsedAt`.
-   si existe `tokenFamilyId` o equivalente.
-   si se puede identificar el dispositivo/sesión.

Documentar el modelo actual.

------------------------------------------------------------------------

# 8. Auditar Logout

Determinar exactamente qué sucede cuando el usuario ejecuta logout.

Debe quedar claro si:

``` text
Frontend
  ↓
POST /logout
  ↓
Backend revoca sesión
  ↓
Refresh Cookie eliminada
  ↓
Frontend elimina Access Token de memoria
```

o si actualmente solo se limpia el frontend.

------------------------------------------------------------------------

# 9. Auditar seguridad de contraseñas

Verificar:

-   `PasswordEncoder`.
-   algoritmo utilizado.
-   configuración de BCrypt/Argon2 u otro algoritmo.
-   si las contraseñas se almacenan únicamente como hashes.
-   si existe política de contraseñas.
-   si existen logs que puedan exponer credenciales.

Nunca mostrar contraseñas reales ni secretos en el informe.

------------------------------------------------------------------------

# 10. Auditar secretos y configuración

Buscar referencias a:

``` text
JWT_SECRET
JWT_KEY
SECRET
PASSWORD
DATABASE_PASSWORD
GMAIL_APP_PASSWORD
```

y archivos como:

``` text
.env
application.yml
application-dev.yml
application-prod.yml
```

Determinar:

-   qué secretos están hardcodeados.
-   cuáles vienen de variables de entorno.
-   cuáles podrían terminar en Git.
-   si existe riesgo de exponer secretos al frontend.

**No imprimir valores reales de secretos en el informe.**

Indicar solamente:

``` text
JWT_SECRET: variable de entorno / hardcodeado
```

------------------------------------------------------------------------

# FASE 1 --- INFORME OBLIGATORIO

Antes de modificar código, generar un informe con esta estructura:

## Arquitectura actual

Mostrar un diagrama basado exclusivamente en lo encontrado.

Ejemplo:

``` text
                    LOGIN
                      │
                      ▼
                 BACKEND
                      │
             ┌────────┴────────┐
             ▼                 ▼
       Access Token       Refresh Token
          ??? min             ??? días
             │                 │
             ▼                 ▼
          ???              ???
```

No completar `???` mediante suposiciones.

## Matriz de autenticación

  Elemento                Estado actual
  ----------------------- ---------------
  Access Token            
  Refresh Token           
  Access Token storage    
  Refresh Token storage   
  HttpOnly                
  Secure                  
  SameSite                
  Rotation                
  Revocation              
  Reuse detection         
  CSRF                    
  CORS                    
  Logout                  
  Session management      
  Password hashing        

## Hallazgos

Clasificar:

### Crítico

Problemas que pueden permitir compromiso importante de cuentas/sesiones.

### Alto

Problemas de seguridad que deberían corregirse antes de considerar el
sistema robusto.

### Medio

Debilidades que conviene corregir.

### Bajo

Mejoras de hardening.

## Archivos relevantes

Indicar los archivos exactos que participan en la autenticación.

Ejemplo:

``` text
backend/src/main/java/.../SecurityConfig.java
backend/src/main/java/.../JwtService.java
frontend/src/.../auth/...
```

------------------------------------------------------------------------

# FASE 2 --- PROPUESTA DE ARQUITECTURA OBJETIVO

Después de terminar la auditoría, proponer una arquitectura objetivo.

La arquitectura deseada, si es compatible con el proyecto, es:

``` text
                         LOGIN
                           │
                           ▼
                    Backend valida
                     credenciales
                           │
              ┌────────────┴────────────┐
              ▼                         ▼
       Access Token              Refresh Token
          ~15 min                    ~7 días
              │                         │
              ▼                         ▼
      Memoria del frontend       HttpOnly Cookie
                                        │
                                        ▼
                               POST /auth/refresh
                                        │
                                        ▼
                               validar + rotar
                                        │
                              ┌─────────┴─────────┐
                              ▼                   ▼
                       nuevo Access       nuevo Refresh
                                                  │
                                                  ▼
                                           anterior revocado
```

La implementación final debe adaptarse al código existente.

No introducir una arquitectura completamente nueva si puede conseguirse
el mismo nivel de seguridad evolucionando la arquitectura actual.

------------------------------------------------------------------------

# FASE 3 --- HARDENING PROPUESTO

Evaluar e implementar, cuando corresponda:

## 1. Access Token corto

Objetivo aproximado:

``` text
15 minutos
```

No cambiarlo ciegamente. Primero comprobar el valor actual y evaluar el
impacto.

------------------------------------------------------------------------

## 2. Access Token en memoria

Evitar almacenar Access Tokens en:

``` text
localStorage
sessionStorage
```

si la arquitectura permite mantenerlo solamente en memoria.

------------------------------------------------------------------------

## 3. Refresh Token HttpOnly

El Refresh Token debería estar en cookie:

``` text
HttpOnly
Secure
SameSite correctamente configurado
Path apropiado
```

La configuración debe ser compatible con el despliegue real de
frontend/backend.

------------------------------------------------------------------------

## 4. Refresh Token Rotation

Implementar:

``` text
Refresh A
   ↓
/refresh
   ↓
Refresh B
   ↓
Refresh A revocado
```

Cada utilización válida debe producir un nuevo refresh token.

------------------------------------------------------------------------

## 5. Detección de reutilización

Si se presenta nuevamente un refresh token que ya fue rotado:

``` text
Refresh A
   ↓
ya fue utilizado
   ↓
🚨 reutilización detectada
```

invalidar la familia de sesión correspondiente cuando sea apropiado.

No implementar esto de forma que un refresh legítimo concurrente
destruya accidentalmente la sesión del usuario.

------------------------------------------------------------------------

## 6. Revocación

Implementar o fortalecer:

``` text
POST /auth/logout
```

de modo que el backend pueda invalidar la sesión/refresh token.

Considerar también:

``` text
logout de todas las sesiones
```

como mejora futura si el modelo de sesión lo permite.

------------------------------------------------------------------------

## 7. CORS estricto

En producción:

-   permitir únicamente los orígenes reales.
-   no utilizar wildcard con credenciales.
-   revisar `allowCredentials`.
-   revisar métodos y headers.

Mantener una configuración razonable para desarrollo local sin mezclarla
accidentalmente con producción.

------------------------------------------------------------------------

## 8. CSRF

Diseñar la protección de acuerdo con el hecho de que el Refresh Token
estará en cookie.

No aplicar una solución genérica sin considerar:

-   origen frontend.
-   origen backend.
-   `SameSite`.
-   CORS.
-   endpoints que aceptan cookies.
-   comportamiento de navegadores.

------------------------------------------------------------------------

## 9. Manejo de 401 en frontend

Implementar un flujo equivalente a:

``` text
API request
    │
    ▼
401
    │
    ▼
POST /auth/refresh
    │
    ├── éxito → guardar nuevo Access Token en memoria
    │             ↓
    │          reintentar request
    │
    └── fallo → limpiar sesión
                 ↓
              login
```

Debe existir protección contra múltiples refresh simultáneos.

Ejemplo conceptual:

``` text
Request A ──┐
Request B ──┼── 401
Request C ──┘
      │
      ▼
  UN SOLO refresh
      │
      ▼
nuevo Access Token
      │
      ▼
reintentar A/B/C
```

------------------------------------------------------------------------

# REGLAS IMPORTANTES

## No romper funcionalidad existente

Antes de modificar:

-   registrar el comportamiento actual.
-   identificar dependencias.
-   revisar tests.
-   revisar configuración dev/test/prod.

## No cambiar contratos API innecesariamente

Mantener endpoints y formatos actuales siempre que sea posible.

Si un cambio de contrato es necesario, documentarlo antes.

## No exponer secretos

Nunca incluir en el informe:

-   JWT secrets.
-   passwords.
-   tokens.
-   cookies reales.
-   credenciales.
-   claves privadas.

## No asumir

Toda conclusión debe estar respaldada por código/configuración real.

Usar frases como:

``` text
"El backend actualmente hace X porque..."
```

en lugar de:

``` text
"Probablemente hace X."
```

## No implementar todavía

**La primera ejecución de esta tarea debe ser exclusivamente de
auditoría y diagnóstico.**

No modificar código hasta presentar:

1.  arquitectura actual,
2.  flujo real de login,
3.  almacenamiento de tokens,
4.  flujo de refresh,
5.  logout,
6.  CORS,
7.  CSRF,
8.  sesiones,
9.  hallazgos,
10. arquitectura objetivo propuesta.

Después de revisar ese informe podremos decidir qué cambios implementar.

------------------------------------------------------------------------

# RESULTADO ESPERADO

Al finalizar la FASE 1, quiero poder responder con certeza:

> **¿Cómo funciona actualmente la autenticación de treasury-system,
> dónde viven exactamente mis tokens y qué tan expuesta está mi
> sesión?**

Y posteriormente:

> **¿Qué cambios concretos necesitamos para llevarla a una arquitectura
> robusta de Access Token + Refresh Token con rotation, revocación,
> detección de reutilización, cookies seguras, CORS/CSRF correctamente
> configurados y manejo robusto de 401?**
