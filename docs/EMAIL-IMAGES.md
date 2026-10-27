# Im?genes p?blicas de las plantillas de correo

## Causa y soluci?n

El correo segu?a incluyendo partes MIME de imagen. Antes llevaban `filename="inline"`;
al quitar el nombre, Gmail pod?a mostrarlas como `noname`. Eliminar el nombre o cambiar
`Content-Disposition` no elimina el recurso del mensaje y no resuelve el problema.

La soluci?n vigente elimina por completo el env?o de im?genes de plantilla como partes
MIME: no hay `addInline`, recursos CID ni im?genes base64 en este flujo. `EmailTemplates`
produce directamente etiquetas `<img src="https://?">`. Los correos de cuenta sin
adjuntos son un ?nico cuerpo `text/html; charset=UTF-8`, sin `multipart/mixed` vac?o.

Los cinco recursos son el logo (`icono-tesoreria.png`), el icono de soporte
(`support-chat.png`) y los banners de bienvenida (`principal_login.png`), recuperaci?n
(`password-reset.png`) y contrase?a modificada (`password-changed.png`). Cada plantilla
con im?genes referencia tres recursos: logo, banner e icono de soporte.

Se conservan los bytes originales de los PNG, los textos, los estilos inline, las tablas,
las dimensiones y los atributos responsive. El enlace de texto de recuperaci?n permite
ahora partir URLs largas en m?vil, igual que el de invitaci?n. Los enlaces de cuenta, la vigencia de los
tokens, el remitente y el reply-to no cambian.

## Alojamiento y configuraci?n

Las im?genes se publican en un bucket dedicado exclusivamente a ilustraciones p?blicas,
separado de los documentos y reportes privados:

```dotenv
EMAIL_ASSETS_BASE_URL=https://storage.googleapis.com/treasury-system-app-vivas-email-assets/email/v1
```

Este es tambi?n el valor predeterminado. Una variable ausente, vac?a o con espacios
utiliza la misma URL p?blica: **nunca reactiva un modo embebido**. Se puede configurar
otro directorio HTTPS p?blico; las URLs inseguras o con credenciales, query o fragmento
se rechazan al iniciar. `EmailImages.resolve` sustituye ?nicamente los `src` del cat?logo,
sin modificar links, estilos ni otros atributos.

El script `scripts/publish-email-assets.ps1` prepara exclusivamente los cinco PNG desde
`frontend/public/email/v1`. Crea un bucket nuevo, carga los archivos y concede lectura
p?blica a ese bucket. Aborta si el bucket ya existe; no cambia pol?ticas de buckets
preexistentes. No despliega el frontend ni el backend. Requiere aprobaci?n antes de
publicar. No subir datos de usuarios a este bucket p?blico.

Las URLs no requieren autenticaci?n ni cookies, no usan firmas y no caducan. Los archivos
se sirven como `image/png` y se cachean como `public,max-age=31536000,immutable`. Mantener
v1 disponible para los correos ya enviados. Los futuros cambios de im?genes deben usar
una carpeta versionada nueva; no sobrescribir estos recursos.

Las rutas `https://tesoreriaescolar.app/email/v1/...` devolv?an HTTP 200 con HTML, no PNG,
al revisarlas el 26-10-2026. Por eso no se usan como alojamiento predeterminado. Las
copias del frontend y su ruta `/email/` quedan disponibles para una migraci?n futura.

## Adjuntos reales

`EmailOutPort` no expone actualmente una operaci?n de adjuntos. La soluci?n no agrega
ning?n filtro para eliminar adjuntos ni toca otros emisores. Las pruebas componen
mensajes con las mismas im?genes remotas y un PDF real usando `MimeMessageHelper` en
modo multipart: el PDF conserva su nombre, contenido y disposici?n `attachment`, y
ninguna imagen crea partes MIME adicionales.

## Pruebas y aceptaci?n

```powershell
cd backend
.\gradlew.bat test --tests user.EmailImagesTest --tests user.GmailEmailAdapterTest pmdMain
```

Las pruebas serializan y vuelven a analizar mensajes con 0, 1, 2, 3 y 5 im?genes, con y
sin PDF, para configuraci?n predeterminada, vac?a y alternativa. Confirman cero partes
MIME de imagen, cero referencias CID y conservaci?n del PDF. En los mensajes reales
del adaptador sin adjuntos comprueban ausencia de `Content-Disposition`, `Content-ID`,
`filename` y partes `image/*`. Tambi?n revisan las tres plantillas con im?genes y sus
dimensiones responsive.

La comprobaci?n HTTP p?blica debe verificar HTTP 200, `Content-Type: image/png`, firma
PNG y hash SHA-256 id?ntico al archivo local, sin enviar autenticaci?n. HTTP 200 por s?
solo no basta: un hosting SPA puede responder con HTML para un recurso inexistente.

La aceptaci?n final en **Gmail web, Gmail para iPhone y Outlook** exige abrir mensajes
nuevos en esos clientes: comprobar logo, banner, WhatsApp y ausencia de tarjetas de
adjuntos artificiales. Probar tambi?n un PDF real, que s? debe aparecer. Las pruebas
MIME y un navegador no sustituyen esa revisi?n en clientes reales. Los correos enviados
antes del cambio conservan su MIME original. Reiniciar o desplegar el backend actualizado
para que los env?os nuevos utilicen esta implementaci?n.

Los clientes pueden bloquear la carga de im?genes remotas por preferencias de privacidad;
esa preferencia no convierte las im?genes HTTPS en archivos adjuntos del mensaje.

## Evidencia de esta implementaci?n (26-10-2026)

- Publicados los cinco PNG en el bucket dedicado; lectura p?blica habilitada ?nicamente
  para ese bucket nuevo. No se modificaron los buckets de documentos ni de Allure.
- Verificaci?n HTTP an?nima: las cinco URLs devolvieron `200 image/png`, firma PNG y
  bytes/SHA-256 iguales a los originales; cach? p?blica de un a?o.
- 46 pruebas espec?ficas aprobadas (38 de recursos/MIME y 8 del adaptador); PMD aprobado.
- Vistas de las tres plantillas generadas en `backend/build/reports/email-preview/`
  a 1216 ? 552 y 375 ? 812 CSS px, con carga de los tres recursos en cada una.
- Revisi?n en Gmail web, Gmail para iPhone y Outlook: **pendiente** de destinatarios de
  prueba y acceso a esos clientes. Una vista en Chromium no acredita esa revisi?n.
- No hab?a un backend local escuchando en 5055/8080 durante la revisi?n. Esta tarea
  public? solo los recursos est?ticos; el servicio que env?e correos debe ejecutar el
  c?digo actualizado. El despliegue de la aplicaci?n no forma parte de la publicaci?n
  de im?genes y no se ha realizado.
