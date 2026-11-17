import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const directory = 'docs/architecture/modules/01-auth-security';
const revision = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
const url = 'https://github.com/victorvivas27/treasury-system.git';
const sources = new Map();
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const user = 'backend/src/main/java/com/tesoreria/user/';
const service = name => `${user}application/usecase/${name}.java`;
const security = name => `${user}config/security/${name}.java`;
const controller = name => `${user}infrastructure/adapter/in/web/controller/${name}.java`;
const entity = name => `${user}infrastructure/adapter/out/persistence/entity/${name}.java`;
const repo = name => `${user}infrastructure/adapter/out/persistence/repository/${name}.java`;
const email = name => `${user}infrastructure/adapter/out/email/${name}.java`;
const web = name => `frontend/src/presentation/pages/auth/${name}.tsx`;
const authContext = 'frontend/src/presentation/context/AuthContext.tsx';
const axios = 'frontend/src/core/D-config/axiosInterceptor.ts';
const authRepo = 'frontend/src/core/C-infra/repositories/auth/AuthRepositoryImpl.ts';
function src(path, needle, length = 18) {
  if (!sources.has(path)) {
    const bytes = execFileSync('git', ['show', `${revision}:${path}`], { cwd: root });
    sources.set(path, { bytes, lines: bytes.toString('utf8').trimEnd().split('\n') });
    if (sha(bytes.toString('utf8').replace(/\r\n/g, '\n')) !== sha(readFileSync(resolve(root, path), 'utf8').replace(/\r\n/g, '\n'))) {
      throw new Error(`Referenced source differs from HEAD: ${path}. Review before changing the reference revision.`);
    }
  }
  const { lines } = sources.get(path);
  const index = lines.findIndex(line => line.includes(needle));
  if (index < 0) throw new Error(`Source anchor missing: ${path}: ${needle}`);
  return { path, line: index + 1, end_line: Math.min(lines.length, index + length) };
}
const note = (title, ...items) => ({ dot: 'cyan', title, items });
const ids = ['architecture', 'login', 'refresh', 'password-change', 'password-reset', 'access-validation'];
const specs = Object.fromEntries(ids.map(id => [id, JSON.parse(readFileSync(resolve(root, directory, `${id}.json`), 'utf8'))]));
for (const [id, spec] of Object.entries(specs)) {
  spec.meta.repository = { url, revision };
  spec.meta.output = `${directory}/${id}.html`;
}
const refs = {
  web: [src(authContext, 'const login = async', 32), src(authRepo, 'async login(', 24)],
  'http-security': [src(security('SecurityConfig'), 'SecurityFilterChain securityFilterChain', 31), src(security('JwtAuthenticationFilter'), 'protected void doFilterInternal', 58)],
  'auth-api': [src(controller('AuthController'), '@PostMapping("/login")', 46)],
  credentials: [src(service('AuthService'), 'public LoginResult login(String correo, String password, Long organizationId, String termsVersion)', 33), src(service('CustomUserDetailsService'), 'loadUserById', 32)],
  sessions: [src(service('RefreshTokenService'), 'public IssuedTokens rotate(String refreshToken, String csrfToken)', 31), src(service('RefreshTokenService'), 'private UserDetails activeAccountDetails', 25)],
  recovery: [src(service('AccountRecoveryService'), 'public PasswordResetRequestResult requestPasswordReset', 34), src(service('AccountRecoveryService'), 'public void resetPassword', 35)],
  users: [src(entity('UserEntity'), 'class UserEntity', 80)],
  tokens: [src(entity('UserTokenEntity'), 'class UserTokenEntity', 57), src(repo('UserTokenJpaRepository'), 'revokeFamily', 8)],
  email: [src(email('GmailEmailAdapter'), 'class GmailEmailAdapter', 25), src(email('ResendEmailAdapter'), 'class ResendEmailAdapter', 35)],
  limits: [src(security('InvitationAttemptFilter'), 'private void protect', 39), src(service('SharedSecurityLimiter'), 'class SharedSecurityLimiter', 42), src(security('ClientIpResolver'), 'public String resolve', 18), src(security('TrustedProxyRequestFilter'), 'class TrustedProxyRequestFilter', 22)],
  queue: [src(service('SecurityMailQueue'), 'public void enqueue', 42), src(service('SecurityMailQueue'), 'int next = attempts + 1', 12)],
  delivery: [src(controller('ResendWebhookController'), '@PostMapping("/webhook")', 29), src(controller('ResendWebhookVerifier'), 'public void verify', 28), src(service('InvitationDeliveryService'), 'public void receive', 22)],
};
const overview = specs.architecture;
const placement = { web:[0,0], 'http-security':[1,0], 'auth-api':[2,0], credentials:[3,0],
  recovery:[0,1], sessions:[2,1], users:[3,1], queue:[0,2], email:[1,2], tokens:[2,2], limits:[1,1], delivery:[3,2] };
for (const component of overview.components) component.sources = refs[component.id];
overview.components.find(c => c.id === 'email').sublabel = 'Gmail o Resend';
overview.components.find(c => c.id === 'credentials').sublabel = 'Contraseña · estado · términos';
for (const [id, label, sublabel, type] of [
  ['limits', 'Límites compartidos', 'IP · cuenta · proxies fiables', 'security'],
  ['queue', 'Cola persistente', 'security_mail_requests', 'backend'],
  ['delivery', 'Entrega de invitaciones', 'Webhook firmado · estados', 'backend'],
]) overview.components.push({ id, label, sublabel, type, sources: refs[id] });
// Re-running this builder must not duplicate the new components.
overview.components = [...new Map(overview.components.map(c => [c.id, c])).values()];
for (const component of overview.components) {
  component.sources = component.sources.slice(0, 3);
  const [col, row] = placement[component.id];
  component.pos = [40 + col * 400, 60 + row * 240];
  component.size = [230, 86];
}
overview.connections = [
  ['web','http-security','HTTP / Bearer'], ['http-security','auth-api','Permisos de ruta'],
  ['auth-api','credentials','Login y términos'], ['auth-api','sessions','Emite / rota'],
  ['credentials','users','Cuenta y aceptación'], ['sessions','tokens','Hash / familia'],
  ['auth-api','recovery','Recupera / cambia'], ['recovery','queue','Solicitud pública'],
  ['queue','email','Worker / envío'], ['email','delivery','Eventos Resend'],
  ['http-security','limits','Presupuestos por ruta'],
].map(([from,to,label], i) => ({ id:`edge-${i+1}`, from,to,label }));
overview.cards = [
  note('Identidad y términos', 'El login puede pedir curso y aceptación de términos antes de emitir sesión. JWT en memoria; usuario y CSRF en sessionStorage.', 'La emisión y rotación exigen cuenta habilitada, organización activa y términos vigentes.'),
  note('Correo y entrega', 'Recuperación y reenvío de verificación encolan una solicitud sin códigos bearer; el worker crea los enlaces y usa Gmail o Resend.', 'Invitaciones Resend registran el ID aceptado y eventos firmados. Aceptación del proveedor no significa entrega ni lectura.'),
  note('Controles y alcance', 'SharedSecurityLimiter persiste presupuestos compartidos. ClientIpResolver solo confía en X-Forwarded-For desde proxies configurados.', 'Mapa por responsabilidades. Cambios de contraseña e invitaciones también envían correo directo; ver sus secuencias. No certifica un despliegue remoto.'),
];
function participants(id, mapping) {
  for (const participant of specs[id].participants) {
    if (!mapping[participant.id]) throw new Error(`Missing references: ${id}/${participant.id}`);
    participant.sources = mapping[participant.id];
    if (participant.id === 'email') participant.sublabel = 'Gmail o Resend';
  }
}
function sequence(id, messages, cards) {
  specs[id].messages = messages.map(([from,to,label,variant], index) => ({ id:`step-${index+1}`,from,to,label,y:160+index*28,...(variant && {variant}) }));
  specs[id].meta.viewBox = [1080, Math.max(600, 270 + (messages.length - 1) * 28)];
  specs[id].cards = cards;
}
participants('login', {
  web: [src(web('LoginPage'), 'const handleSubmit', 53), ...refs.web], api: refs['auth-api'], auth: refs.credentials,
  users:refs.users, sessions:[src(service('RefreshTokenService'), 'public IssuedTokens issueForUserId', 31), src(security('JwtService'), 'public String generateToken(UserDetails userDetails, UUID', 32)], tokens:refs.tokens,
});
sequence('login', [
  ['web','api','POST /auth/login · credenciales / curso / términos','emphasis'],
  ['api','auth','Autenticar con límites compartidos','security'],
  ['auth','users','Verificar contraseña, estado y curso'],
  ['auth','api','Varias cuentas: opciones; sin sesión','return'],
  ['api','web','Elegir curso y repetir login','return'],
  ['auth','users','Cuenta única: comprobar aceptación vigente','security'],
  ['auth','api','Sin aceptación: termsAcceptanceRequired; sin sesión','return'],
  ['api','web','Aceptar documentos y repetir con termsVersion','return'],
  ['auth','users','Registrar versión y fecha de aceptación'],
  ['api','sessions','Solo tras validar: issueForUserId','emphasis'],
  ['sessions','users','Bloquear y revalidar cuenta / curso / términos','security'],
  ['sessions','tokens','Persistir hash refresh, CSRF y familia'],
  ['sessions','api','JWT con identidad, organización y familia','return'],
  ['api','web','200 · JWT + usuario + CSRF y cookies','return'],
], [
  note('Ramas alternativas', 'Curso y aceptación son respuestas alternativas que terminan sin token. Las filas siguientes representan nuevos requests, no una continuación automática.', 'El servidor fija la versión vigente de términos. Credenciales/estado inválidos se rechazan; los límites pueden responder 429.'),
  note('Cookies y frontend', 'treasury_refresh es HttpOnly; treasury_csrf es legible. Secure y SameSite dependen de configuración.', 'AuthContext sincroniza la configuración de loaders antes de establecer la sesión. Antes del login no hay configuración de curso autenticada.'),
]);
participants('refresh', { web:[src(axios, 'refreshPromise', 25),src(authContext, 'useCases.refresh()', 23)], api:[src(controller('AuthController'), '@PostMapping("/refresh")', 34),src(controller('AuthController'),'private String csrfFromRequest',20)], sessions:refs.sessions, users:[src(repo('UserJpaRepository'),'findByIdForSessionUpdate',5),src(service('RefreshTokenService'),'private UserDetails activeAccountDetails',25)],tokens:refs.tokens });
sequence('refresh', [
  ['web','api','POST /auth/refresh · cookies + X-CSRF-Token','emphasis'],
  ['api','sessions','Cabecera y cookie CSRF deben coincidir','security'],
  ['sessions','tokens','Hash refresh: resolver userId'],
  ['sessions','users','Bloquear cuenta antes del token','security'],
  ['sessions','tokens','Bloquear token; validar CSRF y vigencia','security'],
  ['sessions','users','Cuenta / curso activos y términos vigentes','security'],
  ['sessions','tokens','Válido: usar actual e insertar sucesor de familia'],
  ['sessions','api','JWT y refresh / CSRF nuevos','return'],
  ['api','web','200 · reemplazar JWT y cookies','return'],
], [
  note('Reutilización: SA-07 corregido', 'Token usado/revocado/vencido se rechaza con RefreshTokenRejectedException. noRollbackFor conserva la revocación de familia que realiza detectReuse.', 'Un token usado dentro de la gracia configurada se rechaza sin revocar la familia; fuera de ella se revoca. CSRF inválido no alcanza detectReuse.'),
  note('Concurrencia y límites', 'La cuenta se bloquea antes del token. El interceptor comparte refreshPromise para solicitudes simultáneas.', 'La rotación aplica presupuesto por familia; el filtro aplica presupuesto por IP. Fallos distintos del rechazo previsto conservan rollback transaccional.'),
]);
participants('password-change', {web:[src(authRepo,'async changePassword',5)],api:[src(controller('AuthController'),'@PatchMapping("/change-password")',12)],recovery:[src(service('AccountRecoveryService'),'public void changePassword(Long userId',24)],users:refs.users,sessions:[src(service('RefreshTokenService'),'public void revokeAllForUser',5)],tokens:refs.tokens,email:refs.email});
specs['password-change'].cards = [
  note('Transacción y límites', 'Se bloquea la cuenta por userId; se valida contraseña actual y nueva diferente. Se guarda contraseña y sessions_revoked_at y se revocan refresh.', 'El aviso usa el proveedor configurado. Si falla requireDelivery, se revierten las escrituras de BD. El filtro limita cambios autenticados por cuenta.'),
  note('Efecto observable', 'JWT con familia pierde acceso por ausencia de sucesor activo. JWT sin familia se compara con sessions_revoked_at.', 'La API y el repositorio frontend existen; no se encontró una pantalla React conectada al cambio autenticado. No se cierran aquí sockets ya abiertos.'),
];
participants('password-reset', {web:[src(web('AccountFlowPages'),'export const ForgotPasswordPage',26),src(web('AccountFlowPages'),'export const ResetPasswordPage',38)],api:[src(controller('AuthController'),'@PostMapping("/forgot-password")',30)],recovery:refs.recovery,users:refs.users,tokens:refs.tokens,email:refs.email,queue:refs.queue});
specs['password-reset'].participants.splice(3,0,{id:'queue',type:'backend',label:'Cola y worker',sublabel:'SecurityMailQueue',sources:refs.queue});
specs['password-reset'].participants = [...new Map(specs['password-reset'].participants.map(p=>[p.id,p])).values()];
sequence('password-reset', [
  ['web','api','POST /auth/forgot-password · correo','emphasis'],
  ['api','recovery','Validar / normalizar y aplicar límites','security'],
  ['recovery','queue','Persistir solicitud password-reset sin bearer'],
  ['api','web','Confirmación genérica; sin enumerar cuentas','return'],
  ['queue','recovery','Worker: deliverPublicMail en transacción'],
  ['recovery','users','Buscar cuentas elegibles del correo'],
  ['recovery','tokens','Crear hash PASSWORD_RESET por cuenta / curso'],
  ['recovery','email','Enviar resumen con enlaces de los cursos'],
  ['web','api','POST /auth/reset-password · código + contraseña','emphasis'],
  ['api','recovery','Validar contraseña y token de un uso','security'],
  ['recovery','users','Bloquear cuenta; comprobar pertenencia si invitación'],
  ['recovery','tokens','Bloquear y validar código vigente no consumido'],
  ['recovery','users','Guardar contraseña y sessions_revoked_at'],
  ['recovery','tokens','Consumir códigos y revocar refresh'],
  ['recovery','email','Avisar cambio; si falla, rollback'],
  ['api','web','Tras commit: éxito y nuevo login','return'],
], [
  note('Cola persistente', 'La respuesta pública no ofrece elección de curso: el worker envía enlaces de las cuentas elegibles en un resumen.', 'Entrega al menos una vez; SKIP LOCKED coordina workers. Hasta 8 intentos con espera creciente; solicitudes de más de 24 h pasan a FAILED. Puede haber duplicados tras un fallo externo.'),
  note('Invitación y entrega', 'La invitación se valida antes de habilitar el formulario. ACCOUNT_INVITATION comparte resetPassword y activa la cuenta tras comprobar pertenencia, correo y curso.', 'Resend publica aceptación de invitación y un webhook firmado actualiza SENT/DELIVERED/DELAYED/BOUNCED/FAILED/COMPLAINED. No demuestra lectura ni entrega sin eventos.'),
]);
participants('access-validation', {web:[src(axios,'Authorization',17)],http:refs['http-security'],jwt:[src(security('JwtService'),'ParsedToken token,',27),src(service('CustomUserDetailsService'),'loadUserById',32)],db:[src(security('TokenRevocationService'),'public boolean isUserRevokedAfter',15),src(service('RefreshTokenService'),'public boolean isFamilyActive',8)],ws:[src('backend/src/main/java/com/tesoreria/notification/config/WebSocketAuthInterceptor.java','public Message<?> preSend',30)]});
specs['access-validation'].cards = [
  note('HTTP y presupuestos', 'Cada request con JWT valida firma, expiración, identidad, cuenta, organización y revocación. Los permisos se aplican por ruta y método.', 'InvitationAttemptFilter limita rutas públicas y acciones autenticadas con SharedSecurityLimiter persistido; no sustituye la autorización. X-Forwarded-For solo se acepta desde proxies fiables.'),
  note('Límites WebSocket vigentes', 'WebSocketAuthInterceptor valida CONNECT y asigna identidad por userId. Este interceptor no revalida SEND/SUBSCRIBE posteriores.', 'SA-08/SA-09 requieren revisión específica; este diagrama no certifica destinos ni desconexión inmediata por revocación. La revocación individual de JWT sigue en memoria local.'),
];

// Supplementary references substantiate cards even when they are not separate participants.
for (const [path, needle] of [
  [service('AccountRecoveryService'),'public void validateInvitation'],
  [service('InvitationDeliveryService'),'public void accepted'],
  [service('LoginRateLimiter'),'class LoginRateLimiter'],
  [service('AuthFlowRateLimiter'),'class AuthFlowRateLimiter'],
  ['frontend/src/shared/ui/loading/loaderConfiguration.ts','export async function loadLoaderConfiguration'],
  ['backend/src/main/java/com/tesoreria/treasury/infrastructure/adapter/in/web/controller/LoaderSettingsController.java','public LoaderSettingsService.Configuration get'],
]) src(path,needle,26);
for (const [id, spec] of Object.entries(specs)) writeFileSync(resolve(root,directory,`${id}.json`),JSON.stringify(spec,null,2)+'\n');

const overlays = [
  'frontend/src/shared/ui/loading/PageTransition.tsx', 'frontend/src/shared/ui/loading/pageTransitionPreferences.ts',
  'frontend/src/presentation/pages/home/HomePage.tsx', 'frontend/src/presentation/pages/home/components/HomeEntryTransition.tsx',
  'frontend/src/shared/assets/publicImages.ts', 'frontend/src/presentation/pages/auth/LoginMobile.css',
];
const sourceFiles = Object.fromEntries([...sources].map(([path,{bytes}])=>[path,{sha256:sha(bytes)}]));
const workingTreeFiles = Object.fromEntries(overlays.map(path=>[path,{sha256:sha(readFileSync(resolve(root,path))),baseRevision:revision}]));
writeFileSync(resolve(root,directory,'snapshot.json'),JSON.stringify({repository:{url,revision},generatedAt:'2026-11-17',archifyVersion:'3.2.0',nodeVersion:process.version,
  scope:'Diagrams reference committed sources. Working-tree UI overlays are recorded separately and described in README; GitHub links show the base revision.',sourceFiles,workingTreeFiles},null,2)+'\n');
const evidence = ['# Evidencias de autenticación y seguridad','',`Revisión de código: \`${revision}\`. Actualización: 2026-11-17.`, '',
  'Las referencias de los seis JSON se buscan por anclas del código y se comprueban contra Git. El generador rechaza fuentes citadas con cambios locales; los ajustes de interfaz de esta sesión se registran aparte en snapshot.json.', '',
  '| Fuente | SHA-256 del commit |','| --- | --- |', ...Object.entries(sourceFiles).map(([path,record])=>`| [${path}](https://github.com/victorvivas27/treasury-system/blob/${revision}/${path}) | \`${record.sha256}\` |`),'',
  '## Cambios locales de interfaz','', 'Las huellas de workingTreeFiles identifican el estado local de loaders, home e imágenes. No se atribuyen esos cambios a un commit ni a una publicación remota.', '',
  'Los recibos vigentes se guardan en review-2026-11-17. Los recibos de octubre y review-2 son históricos y no validan los nuevos artefactos.', ''];
writeFileSync(resolve(root,directory,'evidence.md'),evidence.join('\n'));
console.log(`Updated six auth specifications at ${revision}; ${sources.size} committed sources and ${overlays.length} working-tree overlays.`);
