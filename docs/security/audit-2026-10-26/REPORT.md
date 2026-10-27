# Auditoría de seguridad — 26 de octubre de 2026

La aplicación tiene controles reales de autenticación y autorización en el backend,
pero no corresponde considerarla completamente segura: se reprodujo una eliminación
indebida de un superadministrador y se confirmó que el login no exige segundo factor,
incluso para cuentas con `totpEnabled=true`.

## Alcance y método

Se revisó el árbol de trabajo actual, incluidos sus cambios preexistentes, sin modificar
código de producción ni corregir hallazgos durante esta auditoría. Se inspeccionaron
frontend React, Spring Security, JWT, cookies, recuperación, roles, controladores,
servicios, persistencia y configuración de despliegue. La documentación del proyecto
no se tomó como evidencia de que una protección estuviera implementada.

Se ejecutaron 118 pruebas backend, incluidas cinco reproducciones adicionales en un
contexto Spring real con MockMvc y H2 aislada, y 36 pruebas frontend. También se hicieron
tres GET públicos para revisar cabeceras y consultas de solo lectura a Google Cloud.
No se utilizaron cuentas reales, no se eliminaron usuarios productivos, no se enviaron
correos y no se realizaron ataques ni pruebas de carga contra producción.

La revisión local no acredita que el binario desplegado sea idéntico a este árbol.
H2 no sustituye PostgreSQL. No se auditaron exhaustivamente dependencias/CVE, dispositivos,
extensiones del navegador, configuración privada de Netlify ni políticas de otros proyectos.

## Resultado de los cuatro puntos solicitados

| Punto | Conclusión |
| --- | --- |
| Tokens en localStorage/sessionStorage | No se encontró persistencia de JWT/access/refresh en esos almacenes. JWT en memoria; refresh en cookie HttpOnly. El token CSRF y los datos del usuario sí usan sessionStorage. Esto reduce exposición persistente, pero no neutraliza un XSS activo. |
| Administración controlada solo en frontend | No. Spring Security y seguridad de métodos validan permisos. Las pruebas rechazan operaciones administrativas de USER con 403. Existe una excepción grave entre ADMIN y SUPER_ADMIN: eliminación de la cuenta global. |
| Ausencia de rate limiting | Hay límites parciales, locales a cada instancia. Faltan límites generales y por IP en varios flujos. Además, recuperación multicurso retorna datos antes del limitador. |
| Ausencia de 2FA/OTP | Hay biblioteca, servicio TOTP, DTO y columnas, pero no un flujo MFA efectivo de login ni endpoints de enrolamiento/verificación conectados. El flag de TOTP no impide emitir sesiones solo con contraseña. |

## Hallazgos y prioridades

### AUD-01 — Alta / P1: ADMIN puede eliminar un SUPER_ADMIN global

**Evidencia:** [UserService.java:102](../../../backend/src/main/java/com/tesoreria/user/application/usecase/UserService.java#L102),
[UserService.java:236](../../../backend/src/main/java/com/tesoreria/user/application/usecase/UserService.java#L236),
[UserController.java:124](../../../backend/src/main/java/com/tesoreria/user/infrastructure/adapter/in/web/controller/UserController.java#L124).

`DELETE /api/v1/users/{id}` exige ADMIN, pero `findById` permite recuperar cuentas con
`organizationId=null` como alternativa al filtro del curso. `delete` no llama a
`assertSuperAdminRoleAllowed`, a diferencia de otras mutaciones. La protección del
último ADMIN tampoco aplica a un objetivo SUPER_ADMIN.

**Reproducción:** crear en H2 un ADMIN de un curso y un SUPER_ADMIN global, firmar un
JWT del ADMIN y solicitar la eliminación del segundo. La respuesta fue **204** y se
confirmó que la cuenta objetivo dejó de existir en la transacción aislada.

**Impacto:** un administrador de curso puede eliminar administración global. No se
demostró que un USER pueda hacerlo; es un fallo de jerarquía entre roles privilegiados.

**Corrección recomendada:** validar rol del objetivo y autorización del actor en el
servicio de eliminación; impedir a ADMIN gestionar SUPER_ADMIN; separar la lectura de
cuentas globales de la autorización de escritura. Añadir protección específica del
último SUPER_ADMIN y pruebas que esperen 403 y persistencia intacta.

### AUD-02 — Alta / P1: MFA no participa en la emisión de sesiones

**Evidencia:** [AuthService.java:42](../../../backend/src/main/java/com/tesoreria/user/application/usecase/AuthService.java#L42),
[AuthController.java:112](../../../backend/src/main/java/com/tesoreria/user/infrastructure/adapter/in/web/controller/AuthController.java#L112),
[LoginRequestDTO.java](../../../backend/src/main/java/com/tesoreria/user/infrastructure/adapter/in/web/dto/auth/LoginRequestDTO.java),
[TwoFactorService.java:61](../../../backend/src/main/java/com/tesoreria/user/application/usecase/TwoFactorService.java#L61).

El servicio genera secretos, QR y códigos TOTP de seis dígitos/30 segundos, y contempla
códigos de respaldo. Sin embargo, no hay llamadas de producción al verificador desde
login ni una segunda etapa que condicione la entrega del JWT y refresh. El DTO de login
solo recibe correo, contraseña y curso. Tampoco se encontró interfaz de configuración
de MFA ni controlador para sus DTO.

**Reproducción:** una cuenta ADMIN de prueba con secreto TOTP y `totpEnabled=true`
recibió **200, JWT y cookies de sesión** presentando exclusivamente correo y contraseña.

**Impacto:** conocer la contraseña basta para entrar, aunque la cuenta esté marcada
como protegida por TOTP. La existencia de la biblioteca y sus tests unitarios no prueba
que el login esté protegido.

**Corrección recomendada:** desafío temporal después del primer factor, sin JWT de
acceso ni refresh hasta validar el segundo; consumo atómico y límite de intentos;
enrolamiento confirmado; exigir MFA al menos a ADMIN/SUPER_ADMIN. Definir recuperación
y revocación segura de factores, sin vías alternativas que omitan MFA.

**Preparación incompleta adicional:** `totp_secret` y `backup_codes` son columnas de
texto sin cifrado/hash aplicado por el código inspeccionado. Los códigos de respaldo
se comparan como texto; el verificador no registra consumo de un paso TOTP para evitar
reutilización. Son aspectos que deben resolverse al activar el flujo; no se leyó la
base productiva ni se afirma que hoy existan secretos reales almacenados.

### AUD-03 — Alta / P1: limitación parcial y sin estado compartido

**Evidencia:** [LoginRateLimiter.java:15](../../../backend/src/main/java/com/tesoreria/user/application/usecase/LoginRateLimiter.java#L15),
[AuthFlowRateLimiter.java:14](../../../backend/src/main/java/com/tesoreria/user/application/usecase/AuthFlowRateLimiter.java#L14),
[InvitationAttemptFilter.java:20](../../../backend/src/main/java/com/tesoreria/user/config/security/InvitationAttemptFilter.java#L20).

Login bloquea por correo normalizado tras tres fallos durante un minuto. No combina ese
límite con IP ni un límite de solicitudes previo al procesamiento de credenciales.
El chequeo y el registro del fallo están separados. Recuperación/reenvío limita por
acción/correo cada 60 segundos. Ambos usan `ConcurrentHashMap` sin tamaño máximo ni
limpieza periódica de identidades antiguas. El filtro de invitación/reset sí tiene
Caffeine acotado y permite 20 intentos por IP/minuto, compartidos entre ambas rutas.

Todo ese estado es **local a un proceso**: no se comparte entre instancias y se pierde
al reiniciar. Cloud Run tiene ingreso `all` y máximo configurado de 20 instancias;
no hay una cuota global equivalente a los límites descritos. Esto facilita password
spraying, consumo de recursos, abuso de correos y bloqueos intencionales de identidades.
Los mapas sin cota agregan riesgo de crecimiento de memoria con correos diferentes.

Se confirmó con una prueba HTTP que el filtro de invitación devuelve **429 en el intento
21** para una misma IP. Su existencia no cubre los otros endpoints.

**Corrección recomendada:** límites atómicos compartidos por identidad y por IP,
expiración/tamaño acotados, políticas para operaciones autenticadas sensibles y
telemetría. Revisar cómo se obtiene IP detrás de proxies confiables; no basarse en un
X-Forwarded-For aportado arbitrariamente por el cliente. Evitar que bloquear un correo
sea una vía sencilla para dejar fuera a su propietario.

### AUD-04 — Media / P2: recuperación multicurso revela pertenencias y evita el límite

**Evidencia:** [AccountRecoveryService.java:204](../../../backend/src/main/java/com/tesoreria/user/application/usecase/AccountRecoveryService.java#L204),
[AuthController.java:191](../../../backend/src/main/java/com/tesoreria/user/infrastructure/adapter/in/web/controller/AuthController.java#L191).

Si un correo aparece en más de una cuenta y no se indica curso, el servicio retorna
los IDs de organizaciones **antes** de `rateLimiter.checkAndRecord`. El controlador
convierte esos IDs en nombres y los devuelve sin acreditar control del buzón.

**Reproducción:** con dos cuentas de cursos diferentes para el mismo correo de prueba,
tres solicitudes consecutivas devolvieron **200 y dos opciones de curso**, sin 429.

**Impacto:** revela que el correo pertenece a varios cursos y sus nombres/IDs; esa rama
también permite consultas repetidas sin el límite del flujo. No otorga por sí misma
acceso a las cuentas.

**Corrección recomendada:** aplicar límites antes de consultar/retornar resultados y
evitar revelar pertenencias a un solicitante no verificado. Mantener una respuesta
pública uniforme y realizar selección de curso después de probar control del correo.

### AUD-05 — Media / P2: CSP de la API no protege el documento del frontend

**Evidencia:** [frontend/nginx.conf](../../../frontend/nginx.conf),
[frontend/index.html](../../../frontend/index.html),
[SecurityConfig.java:141](../../../backend/src/main/java/com/tesoreria/user/config/security/SecurityConfig.java#L141).

Los GET públicos del 26-10-2026 confirmaron ausencia de CSP y CSP Report-Only tanto en
`https://tesoreriaescolar.app/` (servidor Netlify) como en el frontend Cloud Run. El
documento tampoco define una CSP por meta. La API sí devuelve una CSP y otras cabeceras,
pero esas cabeceras no se trasladan al HTML servido desde otro origen.

**Impacto:** falta una capa de contención frente a inyección de scripts y framing. No
se encontró ni se demostró una entrada XSS explotable en esta revisión; ausencia de CSP
no equivale a existencia de XSS. Sí importa porque un XSS podría actuar en la sesión,
interceptar JWT en memoria o llamar a refresh con el CSRF disponible al JavaScript.

React renderiza normalmente texto escapado; no se encontraron usos de
`dangerouslySetInnerHTML` en el código inspeccionado. Los reportes HTML usan iframe
sandbox sin `allow-same-origin`; no se consideran automáticamente un XSS del origen
de la aplicación.

**Corrección recomendada:** cabeceras en el alojamiento real del frontend, incluidos
Netlify y acceso directo Cloud Run; CSP diseñada para los recursos y scripts existentes,
con nonce/hash para scripts propios, primero comprobada y luego aplicada. Incluir
`frame-ancestors` y `nosniff`. Una CSP que bloquee indiscriminadamente los scripts inline
actuales rompería el arranque y no debe desplegarse sin validar.

### AUD-06 — Media / P2: enlaces de recuperación/invitación contienen tokens en query

**Evidencia:** [AccountRecoveryService.java:153](../../../backend/src/main/java/com/tesoreria/user/application/usecase/AccountRecoveryService.java#L153),
[AccountRecoveryService.java:220](../../../backend/src/main/java/com/tesoreria/user/application/usecase/AccountRecoveryService.java#L220),
[AccountFlowPages.tsx:236](../../../frontend/src/presentation/pages/auth/AccountFlowPages.tsx#L236).

Los enlaces del correo llevan `?token=...`. Son tokens opacos de un solo uso, distintos
del JWT de sesión. El frontend lee también fragmentos, pero solo limpia la dirección
en el modo invitación; recuperación conserva la query. Incluso limpiar tras cargar no
evita que la petición inicial al servidor haya incluido la query.

**Impacto potencial:** exposición en historial y logs de acceso del frontend/proxies.
No se revisaron logs productivos ni se afirma que se haya filtrado un token. La política
`no-referrer` del documento reduce la fuga por Referer, pero no elimina esos otros canales.

**Corrección recomendada:** enlaces con fragmento, captura y limpieza inmediata en ambos
modos; excluir tokens de logs/analítica. Conservar validación backend, expiración y
consumo atómico; no confundir esta mejora con autorización para ejecutar el reset.

## 01. Ciclo de vida de los tokens y cookies

| Elemento | Generación y almacenamiento | Consulta y eliminación |
| --- | --- | --- |
| Access JWT | `JwtService.generateToken`: firma HMAC, jti, userId, organizationId, emisión y expiración. `AuthController` lo entrega en login/refresh. Frontend: variable de módulo y estado React, sin persistencia Web Storage. | Interceptor agrega Authorization Bearer; backend valida firma/fechas, carga identidad/roles actuales, estado de cuenta, curso y familia. `clearSession`/logout borra memoria; expiración y revocación se verifican en backend. |
| Refresh opaco | 32 bytes aleatorios; solo hash SHA-256 en BD, ligado a cuenta/familia y hash CSRF. Cookie `treasury_refresh`, HttpOnly, ruta `/tesoreria/api/v1/auth` con el context-path actual. | Rotación transaccional de un uso, control de cuenta y familia, detección de reutilización con gracia de 10 s. Logout revoca la familia y elimina cookies; cambios de contraseña/restricciones administrativas revocan sesiones. |
| CSRF | Token aleatorio en cookie `treasury_csrf` no HttpOnly y en `sessionStorage` como respaldo. Su hash se liga al refresh en BD. | Header X-CSRF-Token debe coincidir con cookie y valor ligado a la sesión. El frontend lo limpia al cerrar sesión. No es por sí solo una credencial de acceso. |
| Datos del usuario | `treasury.auth.user` en sessionStorage, con datos de perfil y rol para la interfaz. `localStorage` guarda indicador de logout manual y preferencias. | Al restaurar sesión se consulta backend. Alterar ese rol local no altera las autoridades calculadas por Spring desde la cuenta persistida. |
| Recuperación/verificación/invitación | Token aleatorio de un uso, hash en BD, enlace de correo. Recuperación: 60 min; verificación/invitación: 24 h. | Backend valida tipo, uso, vencimiento y condiciones de la cuenta. Véase AUD-06 para el transporte en la URL. |

Referencias: [axiosInterceptor.ts:7](../../../frontend/src/core/D-config/axiosInterceptor.ts#L7),
[AuthContext.tsx:119](../../../frontend/src/presentation/context/AuthContext.tsx#L119),
[AuthController.java:319](../../../backend/src/main/java/com/tesoreria/user/infrastructure/adapter/in/web/controller/AuthController.java#L319),
[RefreshTokenService.java:106](../../../backend/src/main/java/com/tesoreria/user/application/usecase/RefreshTokenService.java#L106).

Producción configura `Secure=true` y `SameSite=None` por defecto; desarrollo usa Secure
false/Lax. None permite el despliegue entre sitios y requiere el CSRF implementado.
Aunque Spring CSRF está deshabilitado, no se concluye que refresh/logout estén sin
protección: ambos tienen validación CSRF propia. La cookie CSRF legible por JavaScript
es intencional; no debe confundirse con la cookie refresh HttpOnly.

Las duraciones difieren por configuración: application.yml usa access 15 min/refresh
7 días; el workflow de despliegue fija access 30 min/refresh 30 días. Son valores de
código/configuración, no una lectura de cookies ni secretos de una cuenta productiva.

**Valoración:** el patrón de almacenamiento está mejor protegido que persistir JWT en
localStorage. No basta para declarar seguridad completa: HttpOnly impide leer el
refresh directamente mediante JavaScript, pero no impide a un XSS activo usar la sesión.

## 02. Permisos: frontend, backend y objeto solicitado

`ProtectedRoute`, `AdminRoute`, `SuperAdminRoute` y menús cumplen una función de interfaz.
El backend añade SecurityFilterChain, `@EnableMethodSecurity`, `@PreAuthorize`, consultas
por curso y comprobaciones de identidad/propiedad. Las rutas no declaradas terminan en
`denyAll`. No depende únicamente de ocultar botones.

| Operación | Protección efectiva revisada |
| --- | --- |
| Crear/listar/eliminar usuarios, cambiar rol/estado; CRUD alumnos/apoderados/familias; administración de tesorería | ADMIN en cadena y/o métodos. SUPER_ADMIN recibe además ROLE_ADMIN en TenantUserDetails. Excepción AUD-01 para el objeto global de eliminación. |
| Perfil propio | userId y curso coincidentes mediante UserAuthorization y servicio; DTO limitado. Las pruebas rechazan mass assignment y perfiles ajenos. |
| Organizaciones y administradores de curso | SUPER_ADMIN. Arquitectura añade verificación de propietario. Reportes de calidad: ADMIN/SUPER_ADMIN. |
| Consultas financieras y operaciones propias del apoderado | Rutas USER explícitas; métodos de aprobación/rechazo/revisión de pagos siguen exigiendo ADMIN. Un GET permitido en la cadena no cancela `@PreAuthorize` del método. |
| WebSocket | Handshake público; CONNECT exige JWT/identidad; suscripciones limitadas a colas propias. No se confunde handshake público con acceso público a mensajes. |

Las pruebas HTTP confirmaron 401 anónimo y 403 para USER en eliminación/cambio de rol,
listado de usuarios, organizaciones y reportes. Las suites existentes cubren otros
dominios, perfiles, cursos y revocación. Esto no acredita automáticamente la ausencia
de cualquier IDOR/BOLA en todos los objetos del sistema.

## 03. Cobertura de rate limiting por endpoint

Rutas relativas a `/tesoreria/api/v1`; los límites descritos son por instancia.

| Endpoint/flujo | Público | Control encontrado / brecha |
| --- | --- | --- |
| POST `/auth/login` | Sí | 3 fallos por correo; bloqueo 1 min. Sin cuota IP/global previa. |
| POST `/auth/forgot-password` | Sí | 60 s por correo/curso después de la rama multicurso; véase AUD-04. |
| POST `/auth/resend-verification` | Sí | 60 s por correo; sin cuota IP/global. |
| POST `/auth/reset-password` | Sí | Filtro compartido con validate-invitation: 20/IP/min. Token aleatorio, tipado y de un uso. |
| POST `/auth/validate-invitation` | Sí | Mismo filtro, acotado; confirmado 429 al superar 20. |
| POST `/auth/verify-email` | Sí | No se encontró limitador específico; token aleatorio no elimina el riesgo de consumo de recursos. |
| POST `/auth/refresh`, `/auth/logout` | Sí en cadena | Refresh+CSRF requeridos cuando hay sesión persistente; sin cuota específica. Público no significa que emitan sesiones sin credenciales. |
| POST `/auth/bootstrap-admin` | Sí | Clave bootstrap/condición inicial de base vacía; no se encontró rate limit. Bypass local desactivado por defecto. |
| POST `/auth/register` | No operativo | `denyAll` y controlador/servicio rechazan registro. RegistrationRateLimiter existe, pero no está conectado; no se afirma un registro público ilimitado. |
| GET `/community/about` | Sí | Sin límite específico encontrado. |
| `/ws/**` | Handshake público | Sin cuotas específicas de conexiones/mensajes encontradas. CONNECT requiere JWT. |
| POST webhook Mercado Pago | Sí | Sin límite específico encontrado. Debe conservarse autenticidad y conciliación del proveedor; no se atribuye una omisión de firma a partir de permitAll. |
| PATCH `/auth/change-password`, invitaciones administrativas, cargas, notificaciones, acciones financieras | No | Permisos y validaciones de negocio no equivalen a cuotas. Sin un limitador general por usuario/IP encontrado. |
| OTP/2FA | No hay flujo efectivo | No existe etapa OTP de login que limitar. Al implementarla debe tener límite propio, además del de contraseña. |

**Infraestructura:** nginx y workflows no definen limit_req, gateway ni WAF de aplicación.
Cloud Run consultado tiene ingreso `all`, URL run.app accesible y máximo 20 instancias.
Las consultas de Cloud Armor/backend-services no pudieron inventariar políticas porque
Compute Engine API está deshabilitada en este proyecto. No se habilitó la API ni se
modificó infraestructura. No se puede certificar ausencia de controles en Netlify,
otros proyectos o proveedores externos no accesibles. Un WAF externo no debe darse por
protección efectiva si la URL directa al backend permite evitarlo.

## 04. Alcance real de 2FA/OTP

Existe soporte TOTP de biblioteca (QR y códigos de respaldo), pero está desconectado
del acceso real. No se encontró WebAuthn/passkeys, OTP de email/SMS de login ni desafío
temporal de segundo factor. La verificación de correo y los enlaces de recuperación
no constituyen MFA del inicio de sesión. Véase AUD-02 y su reproducción con TOTP activo.

## Evidencia y reproducción

Resultados: [evidence/results.json](evidence/results.json).
Código aislado: [SecurityAuditEvidenceTest.java](evidence/user/SecurityAuditEvidenceTest.java).

Las pruebas `OBSERVED_DEFECT` afirman intencionalmente el comportamiento inseguro
observado: que pasen **demuestra el hallazgo, no que esté corregido**. Están fuera de
la suite normal y se incluyen únicamente mediante un init script opcional.

Desde `backend/`:

```powershell
.\gradlew.bat --init-script ../docs/security/audit-2026-10-26/evidence/audit.init.gradle test --tests user.SecurityAuditEvidenceTest
```

La ejecución de auditoría incluyó también SecurityConfigTest, SA03AccountSecurityTest,
SA04ProfileSecurityIntegrationTest, SA05SessionSecurityIntegrationTest,
LoginRateLimiterTest, AuthFlowRateLimiterTest, RefreshTokenServiceTest,
TokenRevocationServiceTest, JwtServiceTest, TwoFactorServiceTest y AuthServiceTest:
**118 pruebas backend sin errores de ejecución**.

Frontend: axiosInterceptor.test.ts, AuthContext.test.tsx,
AuthContext.integration.test.tsx, ProtectedRoute.test.tsx, AdminRoute.test.tsx y
ArchitectureRoute.test.tsx: **36 pruebas aprobadas**.

## Orden recomendado de corrección

1. Cerrar eliminación de SUPER_ADMIN por ADMIN y cubrir el objetivo global/otros cursos.
2. Implementar MFA real para cuentas privilegiadas; no presentar el servicio TOTP como
   protección efectiva mientras el login lo omita.
3. Centralizar límites atómicos por identidad/IP, antes de ramas y trabajo costoso;
   acotar memoria y medir abuso de operaciones autenticadas.
4. Cerrar exposición multicurso y desplegar CSP en los alojamientos reales del frontend.
5. Reducir exposición de tokens en URLs y alinear/documentar duraciones de sesión.

No se corrigió ni desplegó ninguno de estos cambios durante la auditoría.

## Referencias de criterio

- [OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html): almacenamiento, cookies y límites de la protección frente a XSS.
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html): throttling y respuestas de autenticación.
- [OWASP Multifactor Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Multifactor_Authentication_Cheat_Sheet.html): MFA y recuperación.

Estas guías sustentan los criterios; los hallazgos concretos provienen del código,
las reproducciones locales y las lecturas públicas descritas.
