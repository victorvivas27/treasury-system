# Fase 4 — Frontend, enlaces y cabeceras HTTP

Fecha: 2026-10-27. **Implementada y validada localmente; no desplegada.**

Sin migraciones nuevas, instalaciones de dependencias, cambios de diseño, MFA/TOTP ni cambios en las reglas de autorización y rate limiting de las Fases 1 y 3. No se accedió a una base productiva ni se enviaron correos reales. El árbol de trabajo ya contenía cambios de otras tareas: este informe enumera únicamente los archivos intervenidos en esta fase.

## Resultado

| Elemento | Resultado | Límite o riesgo pendiente |
| --- | --- | --- |
| Tokens en URL | Nuevos enlaces con fragmento; captura en memoria antes de montar React; limpieza mediante `replaceState`; compatibilidad con query antiguo. | Un query antiguo llega al hosting antes de que JavaScript pueda limpiarlo. No se pueden retirar copias de logs o historial ya existentes. |
| Cabeceras HTTP | `nosniff`, `no-referrer`, `DENY`, Permissions-Policy y CSP mínima, también en errores. Sin duplicados en las respuestas comprobadas. | HSTS no activado en el frontend: requiere verificar previamente HTTPS y los dominios reales. |
| CSP | Política completa **Report-Only**, sin `unsafe-eval` global. Solo `frame-ancestors 'none'; object-src 'none'` se aplica de forma obligatoria. | Inline de arranque, manejadores generados por Vite e informes producen avisos esperados. No es una CSP estricta contra XSS. |
| XSS / HTML dinámico | Se mantienen escape y sandbox existentes; nuevas pruebas con contenido malicioso e impresión. | No se afirma ausencia absoluta de XSS a partir de estas pruebas. |
| Recursos externos | Sin scripts externos nuevos. Se conserva el logo de Mercado Pago en jsDelivr. | Alojar ese SVG localmente sigue siendo opcional: se preservó el recurso visual existente. |
| Compatibilidad | Regresión completa, PostgreSQL real, nginx y Chromium aprobados. | Dominio, balanceador, SMTP y configuración efectiva de producción no fueron validados remotamente. |

## Cambios y evidencia

### Enlaces

`AccountRecoveryService.inviteGuardian` y `deliverPublicMail` generan:

```text
/aceptar-invitacion#token=...
/restablecer-password#token=...
/verificar-correo#token=...
```

`captureInitialAccountLinkToken` se ejecuta en `main.tsx` antes de inicializar React/router. Solo captura las rutas de cuenta, guarda temporalmente el token en memoria del módulo y elimina sus apariciones del query y fragmento, conservando otros parámetros y el estado de historial. Se reconocen variantes de mayúsculas, codificación y barra final compatibles con el router. No utiliza localStorage, sessionStorage, cookies ni estado de navegación para guardar el token.

`useAccountLinkToken` transfiere la credencial al estado del componente y libera la copia de arranque. También permite abrir enlaces mediante navegación interna. `VerifyEmailPage` y `ResetPasswordPage` admiten fragmentos y queries antiguos. StrictMode no pierde la credencial ni duplica la verificación de correo. Si hay ambas representaciones, prevalece el fragmento y se retiran ambas de la dirección.

No se modificaron formatos de tokens, hashes, expiraciones, consumo transaccional, validaciones de pertenencia ni revocación de sesiones. Se conserva el envío de la credencial en el cuerpo de las solicitudes API, no en su URL.

Las rutas de cuenta reciben `Cache-Control: no-store`. El service worker no guarda sus respuestas de navegación, incluidos los metadatos URL de la respuesta. La actualización PWA no recarga automáticamente esas pantallas, para no perder la credencial que está exclusivamente en memoria. Una recarga manual sí exige volver a abrir el enlace del correo: es consecuencia deliberada de no persistir el token.

Los access logs de nginx usan método y `$uri`, sin query ni Referer. En la salida revisada del contenedor local no se encontraron las credenciales ficticias de los enlaces. Esto no elimina consultas de los logs de Cloud Run/balanceadores, de posibles errores de infraestructura ni de registros históricos.

### Cabeceras y CSP

`pnpm build` genera `frontend/build/security-headers.conf`, fuera del directorio público. Usa la misma variable `VITE_API_URL` y los archivos de entorno de producción que Vite; valida protocolo y ausencia de credenciales. La política incluye orígenes concretos HTTP(S)/WS(S), sin un permiso general a todos los destinos HTTPS. Para desarrollo contempla la normalización localhost/127.0.0.1 que ya hace `api.ts`.

Docker copia ese archivo a `/etc/nginx/security-headers.conf`. Se incluye explícitamente en servidor y ubicaciones que tienen cabeceras propias de caché; así no se pierden las protecciones por las reglas de herencia de nginx. Todas las cabeceras de seguridad usan `always`.

```text
X-Content-Type-Options: nosniff
Referrer-Policy: no-referrer
X-Frame-Options: DENY
Permissions-Policy: camera=(), microphone=(), geolocation=()
Content-Security-Policy: frame-ancestors 'none'; object-src 'none'
Content-Security-Policy-Report-Only: política completa generada
```

La protección de marcos CSP y `DENY` expresan la misma restricción; no se contradicen. El resto de la política candidata no bloquea funcionalidades. `style-src` conserva inline para estilos actuales; no se concedió `unsafe-inline` a los scripts ni `unsafe-eval` en la política principal. `https://allure.invalid` solo permite el `<base>` usado para resolver el informe aislado, no acceso general a red.

No se agregó un colector CSP ni un servicio externo: los avisos se observan en consola y eventos de navegador. Esto evita enviar URLs potencialmente sensibles a un receptor de informes. La política completa debe permanecer Report-Only hasta revisar sus avisos y autorizar cualquier endurecimiento adicional.

Allure conserva su CSP interna con inline/eval y sandbox sin `allow-same-origin`. Se validaron los HTML reales locales de frontend y backend, generados el 24 de octubre; sus conteos históricos sirven para comprobar renderizado, **no** representan los resultados de regresión de esta entrega. Sus scripts de Google Tag Manager fueron bloqueados por la CSP interna existente y no fueron autorizados. Los diagramas conservan su aislamiento y funcionan con el HTML empaquetado real.

Se revisó el workflow `08-deploy-frontend.yml`: utiliza Cloud Run y la imagen nginx. No se modificó ni ejecutó. `_redirects` es una regla SPA heredada; no se encontró una configuración activa de cabeceras Netlify. Si se sirve desde Netlify u otro hosting, las cabeceras de nginx no se trasladan automáticamente.

## Archivos nuevos o modificados

Rutas relativas a la raíz; se preservaron los cambios previos de esos mismos archivos.

| Área | Archivos |
| --- | --- |
| Backend productivo | `backend/src/main/java/com/tesoreria/user/application/usecase/AccountRecoveryService.java` |
| Pruebas backend | `backend/src/test/java/user/AccountRecoveryServiceTest.java`, `SA02InvitationIntegrationTest.java` |
| Captura y consumo de credenciales | Nuevos `frontend/src/shared/security/accountLinkToken.ts`, `accountLinkToken.test.ts`, `frontend/src/presentation/hooks/useAccountLinkToken.ts`; cambios en `frontend/src/main.tsx` |
| Pantallas y pruebas | `frontend/src/presentation/pages/auth/AccountFlowPages.tsx`, `AccountFlowPages.test.tsx` |
| PWA | `frontend/public/service-worker.js` |
| nginx y compilación | `frontend/nginx.conf`, `frontend/Dockerfile`, `frontend/package.json`; nuevos `frontend/scripts/security-headers.mjs`, `security-headers.node-test.mjs` |
| Pruebas de navegador | Nuevos `frontend/playwright.security.config.ts`, `frontend/security-tests/phase4.pw.ts` |
| Regresión XSS e impresión | `frontend/src/presentation/pages/stand/standSalesReport.test.ts` |
| Documentación y evidencia | Este informe y `evidence/phase-4-final-results.json` |

No se modificaron `UserService`, `OrganizationService`, los limitadores ni la configuración de autenticación durante esta fase. No hay migración Fase 4 ni cambios de esquema.

## Pruebas ejecutadas

| Comprobación final | Resultado |
| --- | --- |
| `backend: gradlew.bat check` | **989 pruebas**, 0 fallos, 0 errores, 0 omitidas; PMD y gate JaCoCo aprobados |
| PostgreSQL real, Testcontainers PostgreSQL 16 | **227 pruebas aprobadas**, incluidas expiración, consumo y concurrencia |
| Protección SUPER_ADMIN | **40 PostgreSQL + 27 integración H2**, aprobadas |
| Fase 3 / dos instancias y limitadores | **20 PostgreSQL**, aprobadas |
| `frontend: pnpm test:run` | **873 pruebas / 125 archivos**, aprobadas |
| Generador de cabeceras, `node --test` | **2 pruebas**, aprobadas |
| Chromium + nginx **1.29.8** | **16 pruebas**, aprobadas; viewport **1216 × 552** |
| `pnpm lint`, `pnpm build` | Aprobados; avisos existentes de eval en lottie-web y tamaño de bundles |
| nginx y espacios | Sintaxis nginx y `git diff --check` aprobados |

Las pruebas nuevas de concurrencia ejecutan dos transacciones independientes y exigen exactamente una operación exitosa para verificación y recuperación. Heredan ejecución H2 y PostgreSQL en las suites existentes. También se mantienen los casos previos de invitación simultánea, token vencido, usado y revocado. Se añadieron comprobaciones de verificación expirada/usada/revocada, enlaces generados sin query y almacenamiento únicamente mediante hash.

En navegador se verificaron las seis combinaciones de ruta y transporte (query/fragmento), limpieza antes del uso, ausencia del token en almacenamiento web y ausencia de la credencial fragmentada en URLs HTTP. Las respuestas de API y STOMP se simulan para comprobar el frontend compilado, CORS y conexiones en el navegador; **no** se presentan como una prueba end-to-end contra un backend productivo. El backend y los bloqueos se verificaron por separado con PostgreSQL real.

Se comprobaron cabeceras únicas en rutas SPA, recursos, service worker, variantes de rutas de cuenta y respuestas 404. Se validaron fuentes, estilos, Lottie, clickjacking bloqueado, aislamiento de iframe, Allure real, impresión, registro/caché PWA y conservación del formulario ante `controllerchange`.

El navegador headless expone BadgeService pero puede terminar el worker al invocar su puente al sistema operativo. El fixture de navegador sustituye únicamente ese puente de badges; mantiene el service worker y la caché reales. No se modificó esa funcionalidad productiva ni se validó el badge nativo del sistema operativo. Los primeros fallos de la prueba Allure se debían a buscar «Overview», etiqueta de otra versión; se comprobó el contenido real de Allure 3 sin relajar sus políticas.

Los fallos iniciales `spawn EPERM` provinieron del sandbox; las mismas comprobaciones aprobaron al autorizar los procesos locales. No se instalaron dependencias para resolverlos.

### Reproducción

```powershell
cd backend
.\gradlew.bat check
cd ../frontend
pnpm test:run
pnpm lint
pnpm build
node --test scripts/security-headers.node-test.mjs
```

Para navegador, servir `dist` mediante nginx en **127.0.0.1:5186**, con `nginx.conf` y el archivo generado montados en los destinos del Dockerfile. La suite no inicia ni despliega un servidor por sí sola.

```powershell
# Si existen los artefactos privados locales del flujo Allure:
$env:PHASE4_ALLURE_DIR='build/allure/private-preview'
pnpm exec playwright test -c playwright.security.config.ts
```

Sin esa variable se ejecutan las 14 comprobaciones que no requieren artefactos Allure generados. Las dos adicionales usan `catalog.json` y `reports/<id>/index.html`. El canal de navegador puede seleccionarse con `PHASE4_BROWSER_CHANNEL`; se usó Chromium instalado.

## Condiciones antes de producción y riesgos pendientes

1. **Desplegar primero el frontend compatible y después el backend que emite fragmentos**, solo con autorización independiente. El backend anterior admite los mismos cuerpos API, de modo que el nuevo frontend puede publicarse primero. Confirmar que el HTML de las rutas de cuenta no queda retenido por CDN o proxy. No retirar el soporte de enlaces query existentes.
2. Configurar `VITE_API_URL` con el origen HTTPS real al construir la imagen; revisar en la respuesta final el `connect-src` y su equivalente WSS. El archivo generado es parte de la imagen, no configuración runtime intercambiable.
3. **HSTS pendiente**: verificar TLS, redirecciones y dominios que atiende realmente el frontend antes de habilitarlo. No se añadieron `includeSubDomains` ni `preload`. El HSTS existente del backend y la confianza en proxies de Fase 3 no se modificaron.
4. Revisar retención/redacción de consultas en Cloud Run, balanceadores y cualquier hosting alternativo. Los enlaces antiguos pueden dejar su query en infraestructura anterior a nginx; la limpieza del navegador no puede evitar esa solicitud inicial. No registrar cuerpos API ni credenciales en futuras herramientas de observabilidad.
5. Mantener la CSP completa en Report-Only. Sus avisos de inline/eval no son fallos de funcionamiento. Una CSP estricta requerirá revisar arranque Vite, Lottie e herencia en srcdoc; no se abordó una reescritura o aislamiento adicional de informes.
6. El logo externo conserva dependencia de disponibilidad/procedencia del CDN. Se evaluó alojarlo localmente, pero no es necesario para las protecciones principales ni se cambió su apariencia. No se autorizaron nuevos scripts externos.
7. Verificar entrega y preservación de fragmentos en el proveedor de correo y clientes reales antes de publicar. La estructura se comprobó localmente; no hubo envío SMTP real ni inspección del dominio desplegado.

No se identificó un bloqueo técnico local restante en las mejoras implementadas. Las verificaciones remotas anteriores son condiciones de una futura publicación, no una autorización para desplegar. La Fase 2 permanece pospuesta.
