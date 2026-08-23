# Mejorar persistencia de sesión y evitar deslogueos

## Objetivo

Revisar y mejorar el sistema de autenticación para que el usuario **permanezca logueado durante horas o días**, incluso si:

- Cierra y vuelve a abrir la app.
- El celular suspende la aplicación.
- El navegador/WebView recarga el frontend.
- El access token expira.
- La aplicación permanece varias horas en segundo plano.

La solución debe priorizar seguridad, estabilidad y buena experiencia de usuario.

## 1. Auditar el sistema actual

Antes de modificar código, revisar:

- Cómo se genera actualmente el JWT.
- Cuánto dura el token.
- Dónde se guarda en el frontend:
  - memoria
  - `localStorage`
  - `sessionStorage`
  - cookie
- Qué ocurre cuando una petición devuelve `401`.
- Si existe actualmente un refresh token.
- Si el logout ocurre porque:
  - vence el JWT
  - se pierde el almacenamiento
  - se borra una cookie
  - falla una petición
  - React reinicia el estado de autenticación

No modificar la arquitectura a ciegas. Primero identificar exactamente por qué se pierde actualmente la sesión.

## 2. Implementar Access Token + Refresh Token

La autenticación debe trabajar con dos tokens.

### Access Token

Debe utilizarse para autenticar las llamadas normales al backend.

Duración recomendada:

```text
15 a 30 minutos
```

No debe utilizarse como único mecanismo para mantener sesiones durante días.

### Refresh Token

Debe permitir obtener un nuevo access token cuando el anterior expire.

Duración recomendada:

```text
15 a 30 días
```

El refresh token debe mantenerse aunque el frontend se cierre o el celular suspenda la aplicación.

## 3. Guardar el Refresh Token en una cookie segura

El refresh token debe enviarse mediante una cookie con:

```text
HttpOnly
Secure
Path=/
Max-Age=<duración correspondiente>
```

Configurar correctamente `SameSite` según la arquitectura y los dominios actuales.

Si frontend y backend se encuentran en sitios/orígenes diferentes, revisar cuidadosamente si corresponde:

```text
SameSite=None
Secure=true
```

No aplicar esta configuración automáticamente sin verificar primero los dominios utilizados en producción.

El refresh token **no debe quedar accesible desde JavaScript**.

## 4. Crear endpoint de renovación

Agregar o revisar un endpoint similar a:

```text
POST /api/auth/refresh
```

Comportamiento:

1. Leer el refresh token desde la cookie.
2. Validarlo.
3. Verificar expiración.
4. Verificar que el usuario siga siendo válido.
5. Generar un nuevo access token.
6. Devolver el access token al frontend.
7. Preferentemente implementar rotación del refresh token si encaja con la arquitectura existente.

Una expiración normal del access token **no debe cerrar la sesión del usuario**.

## 5. Restaurar sesión al iniciar la aplicación

No depender solamente del estado de React para determinar si existe una sesión.

Cuando la aplicación arranque:

```text
App inicia
↓
Intentar restaurar la sesión
↓
Validar refresh token mediante backend
↓
Refresh token válido
↓
Crear nuevo access token
↓
Recuperar usuario
↓
Mantener sesión
```

Mientras se realiza esta comprobación, no mostrar inmediatamente la pantalla de login.

Agregar un estado equivalente a:

```text
authLoading
```

o:

```text
initializingSession
```

para evitar redirecciones incorrectas o un logout visual mientras se reconstruye la sesión.

## 6. Renovación automática ante un 401

Configurar el cliente HTTP actual (`fetch`, Axios u otro).

Si una petición devuelve:

```text
401 Unauthorized
```

no ejecutar logout inmediatamente.

Primero:

```text
1. Intentar refresh.
2. Si funciona, obtener un access token nuevo.
3. Repetir la petición original.
4. Continuar normalmente.
```

Solamente cerrar sesión si el refresh token también es inválido, fue revocado o expiró.

Evitar loops infinitos:

```text
401
→ refresh
→ 401
→ refresh
→ ...
```

Cada petición original debe reintentarse como máximo una vez después de renovar la sesión.

## 7. Evitar múltiples refresh simultáneos

Si varias peticiones reciben `401` al mismo tiempo, no enviar múltiples solicitudes de refresh.

Implementar un mecanismo de:

```text
single refresh request
```

Mientras exista una renovación en curso, las demás peticiones deben esperar su resultado y luego reintentarse con el access token nuevo.

## 8. Revisar CORS y envío de cookies

Verificar la configuración de credentials tanto en backend como frontend.

Backend debe permitir credentials para los orígenes autorizados.

Frontend con `fetch`:

```javascript
credentials: "include"
```

Con Axios:

```javascript
withCredentials: true
```

Verificar también que los orígenes permitidos en CORS sean explícitos.

No utilizar:

```text
Access-Control-Allow-Origin: *
```

junto con credentials.

## 9. Logout

Cuando el usuario presione cerrar sesión:

```text
POST /api/auth/logout
```

El backend debe:

- invalidar/revocar el refresh token si se mantiene estado del lado servidor
- eliminar la cookie del refresh token correctamente

El frontend debe:

- eliminar el access token
- limpiar usuario
- limpiar el estado de autenticación

## 10. No cerrar sesión por errores normales de red

No ejecutar logout automáticamente ante:

```text
timeout
500
502
503
sin conexión
error temporal de red
```

Un problema temporal de conectividad no significa que la sesión haya dejado de ser válida.

El logout automático debe producirse únicamente cuando se confirme que la autenticación ya no puede renovarse.

## 11. Compatibilidad con celular

Verificar especialmente:

```text
login
→ cerrar aplicación
→ esperar
→ abrir nuevamente
```

y:

```text
login
→ dejar aplicación varias horas en segundo plano
→ volver
```

En ambos casos el usuario debe seguir autenticado siempre que su refresh token continúe vigente.

También comprobar el comportamiento cuando el sistema operativo suspende o elimina el proceso de la aplicación y posteriormente esta vuelve a iniciarse.

## 12. Pruebas obligatorias

Validar como mínimo:

### Login

```text
Login correcto
→ usuario autenticado
```

### Recarga

```text
Login
→ recargar página
→ continúa logueado
```

### Cerrar y abrir

```text
Login
→ cerrar aplicación
→ abrir nuevamente
→ continúa logueado
```

### Expiración del access token

```text
Access token expirado
→ refresh automático
→ access token nuevo
→ petición original reintentada
→ continúa logueado
```

### Múltiples 401 simultáneos

```text
Varias peticiones reciben 401
→ un solo refresh
→ nuevo access token
→ peticiones pendientes reintentadas
```

### Refresh token expirado

```text
Refresh token expirado
→ no puede restaurarse sesión
→ limpiar autenticación
→ mostrar login
```

### Backend temporalmente caído

```text
Backend temporalmente caído
→ NO cerrar sesión automáticamente
→ conservar estado recuperable
```

### Logout manual

```text
Logout
→ refresh token invalidado
→ cookie eliminada
→ estado frontend eliminado
→ sesión realmente terminada
```

## 13. Seguridad

No guardar el refresh token en:

```text
localStorage
sessionStorage
variables JavaScript persistentes
```

El refresh token debe permanecer protegido mediante una cookie `HttpOnly`.

No registrar tokens completos en logs del frontend o backend.

Revisar también:

- expiración
- revocación
- rotación de refresh tokens
- protección CSRF cuando corresponda
- configuración `Secure`
- configuración `SameSite`
- CORS
- eliminación correcta de cookies durante logout

## Resultado esperado

El comportamiento final debe ser:

```text
El usuario inicia sesión una vez
        ↓
Puede cerrar o suspender la aplicación
        ↓
Puede volver horas o días después
        ↓
La aplicación restaura automáticamente la sesión
        ↓
El access token se renueva cuando sea necesario
        ↓
El usuario continúa trabajando normalmente
        ↓
Solo vuelve al login cuando el refresh token expiró,
fue revocado, es inválido o el usuario cerró sesión manualmente
```

## Importante para la implementación

Mantener la arquitectura actual siempre que sea posible.

Antes de reemplazar componentes importantes del sistema de autenticación:

1. Analizar la implementación existente.
2. Identificar la causa concreta del deslogueo actual.
3. Adaptar la solución a la estructura existente de frontend y backend.
4. Evitar cambios innecesarios fuera del sistema de autenticación.
5. Mantener compatibilidad con las funcionalidades existentes.
6. Agregar o actualizar pruebas relacionadas con autenticación.
7. Documentar brevemente los cambios realizados y cualquier nueva variable de entorno necesaria.
