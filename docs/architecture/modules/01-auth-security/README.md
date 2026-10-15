# Módulo 1 — Autenticación, usuarios y seguridad

Piloto documental de Archify, generado el 2026-10-09. Código de referencia: `88eb6f11d7a0534b518a9e4ce7ddb70dfef596b6`. Herramienta: Archify 3.0.1; Node 22.20.0. El cierre de este piloto no certifica la preparación del producto para producción.

## Abrir y recorrer

En la aplicación, entra en **Gestión → Arquitectura del sistema** con la cuenta dueña. La [guía de integración](../../INTEGRACION_EN_TESORERIA.md) explica la autorización del backend y la actualización de los gráficos.

Abre [index.html](index.html) con Chrome o Edge. Cada vista es un HTML autónomo: para consultarla no necesitas Docker, el backend ni instalar Archify. Comienza con componentes y después sigue las secuencias en orden. Puedes seleccionar componentes, consultar sus fuentes, seguir conexiones, buscar, ajustar zoom, cambiar tema y exportar desde el visor. Los enlaces al código apuntan al commit de referencia en GitHub y requieren acceso al repositorio.

El contenido está en español. La traducción de los controles de Archify es parcial; algunos controles conservan su texto en inglés.

| Vista | Qué explica | Fuente editable |
| --- | --- | --- |
| [Componentes](architecture.html) | Frontend, seguridad, servicios, tablas y correo | [JSON](architecture.json) |
| [Login](login.html) | Credenciales, estado de cuenta, elección de curso y emisión de sesión | [JSON](login.json) |
| [Refresh](refresh.html) | Cookie, CSRF, bloqueo, rotación y familia | [JSON](refresh.json) |
| [Cambio de contraseña](password-change.html) | Cambio autenticado y revocación persistente de SA-06 | [JSON](password-change.json) |
| [Recuperación e invitación](password-reset.html) | Solicitud, código, activación y transacción | [JSON](password-reset.json) |
| [HTTP y WebSocket](access-validation.html) | Validación por petición y validación en CONNECT | [JSON](access-validation.json) |

## Inventario y decisiones comprobadas

Las [evidencias](evidence.md) incluyen archivos y líneas verificadas contra Git. [snapshot.json](snapshot.json) registra la revisión y huellas de las fuentes. Los componentes agrupan responsabilidades; no representan servidores separados. Las secuencias son recorridos explicativos y sus tarjetas señalan ramas alternativas, errores y acciones internas.

| Responsabilidad | Implementación principal | Comportamiento |
| --- | --- | --- |
| Pantallas y sesión | LoginPage, AccountFlowPages, AuthContext, AuthRepositoryImpl, axiosInterceptor | JWT en memoria; usuario y CSRF en sessionStorage; restauración por refresh; selección de curso cuando el correo corresponde a varias cuentas |
| Entrada y permisos | AuthController, SecurityConfig, JwtAuthenticationFilter | Rutas públicas explícitas; registro público bloqueado; resto sujeto a autenticación y permisos |
| Identidad | AuthService, CustomUserDetailsService, UserService, JwtService | Contraseña, estado de cuenta, curso activo e identidad; privilegios ADMIN y SUPER_ADMIN; USER requiere las condiciones de verificación correspondientes |
| Usuarios e invitaciones | UserService, AccountRecoveryService, ApoderadoController | Bootstrap inicial restringido; administración de cuentas privilegiada; invitación de apoderado habilita una cuenta USER mediante código y contraseña |
| Recuperación y verificación | AccountRecoveryService, AuthController | Solicitud de recuperación limitada, código con vencimiento, verificación/reenvío de correo y consumo de códigos; invitación y recuperación comparten la entrada de reset |
| Sesiones y logout | RefreshTokenService, TokenRevocationService, AuthContext | Refresh persistido como hash y rotado con CSRF; logout limpia estado local y solicita revocación del token de acceso y refresh; cambios de contraseña y bloqueos de cuenta revocan sesiones del usuario |
| Datos | UserEntity, UserTokenEntity, repositorios JPA, migración V51 | `users`, `user_tokens`, bloqueo de cuenta antes de token y `sessions_revoked_at` persistente |
| Correo | GmailEmailAdapter / JavaMailSender | Envío de códigos y avisos; si falla el aviso requerido dentro del cambio/reset, la transacción revierte; el piloto no prueba entrega SMTP real |
| WebSocket | WebSocketAuthInterceptor | JWT, familia y cuenta se comprueban en CONNECT |

SA-06 aparece en las vistas de contraseña: guardar la contraseña, marcar la revocación de la cuenta y revocar refresh pertenecen a la transacción. La validación HTTP posterior comprueba familia/estado y la marca persistente según el tipo de JWT. No debe interpretarse como desconexión inmediata de conexiones WebSocket ya abiertas.

## Límites y pendientes

Actualización posterior al snapshot: SA-07 cuenta con una [reparación de la política transaccional](../../../security/sa-07/SA-07-REPARACION.md). La tarjeta pendiente del gráfico de refresh corresponde al commit histórico de referencia.

- **SA-07:** ante reutilización de refresh se intenta revocar la familia y se lanza una excepción. El rollback de la transacción sigue siendo un asunto pendiente; el gráfico no promete que esa revocación quede confirmada.
- **SA-08 y SA-09:** la comprobación mostrada corresponde a CONNECT. La autorización de destinos y la revalidación de conexiones existentes requieren su revisión propia.
- **2FA:** existe TwoFactorService, pero no se encontró integrado en el login actual. No se muestra como un segundo factor activo.
- **Cambio autenticado:** existe la operación del repositorio frontend y la API; no se encontró una pantalla conectada a ella en este recorrido.
- Los cookies Secure/SameSite dependen de configuración. Esta documentación no confirma valores de un despliegue de preproducción.

## Validación y reproducción

Las seis vistas pasaron `finalize --quality showcase`: validación, entrega, comprobación estricta de procedencia y pruebas de navegador, sin diagnósticos. También pasaron `visual-check` en temas claro/oscuro y tamaños 1440×900 y 2048×1320. La revisión humana de las capturas se registra en [review.md](review.md); un recibo de captura por sí solo no representa aprobación visual.

Para componentes, los recibos vigentes están en `review-2/`; los recibos iniciales de componentes en la carpeta raíz documentan una versión anterior. Para las cinco secuencias, los recibos vigentes están junto a los HTML. Cada `*.delivery.json` identifica el HTML entregado y su procedencia.

Usa el paquete oficial [tt-a1i/archify](https://github.com/tt-a1i/archify), versión 3.0.1. El piloto se ejecutó desde una carpeta temporal aislada, sin agregar dependencias al producto. Desde la raíz del proyecto, define `$archifyCli` con la ruta local a `archify/bin/archify.mjs` y ejecuta:

```powershell
node $archifyCli finalize architecture docs/architecture/modules/01-auth-security/architecture.json docs/architecture/modules/01-auth-security/architecture.html --repo-root . --quality showcase --json --out-dir docs/architecture/modules/01-auth-security/review-3
node $archifyCli finalize sequence docs/architecture/modules/01-auth-security/login.json docs/architecture/modules/01-auth-security/login.html --repo-root . --quality showcase --json --out-dir docs/architecture/modules/01-auth-security/login-review-2
```

Repite el segundo comando con cada secuencia. Si cambias un candidato ya comprobado, utiliza una carpeta de revisión nueva tanto para `finalize` como para `visual-check`. Para actualizar al código de otro commit, revisa primero flujos y referencias; no cambies solo el identificador de revisión. Guarda los nuevos JSON, HTML y recibos juntos. No se ejecutó nuevamente la suite del producto porque este trabajo modifica exclusivamente documentación.

## Continuidad

El módulo 2 será organizaciones y cursos, siguiendo el [plan](../../PLAN_ARCHIFY_POR_MODULOS.md). Se conservarán las convenciones: componentes por responsabilidad, secuencias compactas, evidencia por archivo/línea, commit explícito y pendientes separados. El módulo 2 todavía no se ha generado.
