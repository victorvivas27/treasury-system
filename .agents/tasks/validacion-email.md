Tarea: implementar Gmail para verificación de usuarios y recuperación de contraseña

Objetivo

Implementar el envío de correos transaccionales mediante Gmail SMTPutilizando Nodemailer.

La integración debe utilizarse para:

Verificar el correo de los usuarios nuevos.

Recuperar una contraseña olvidada.

Permitir el cambio de contraseña mediante un enlace seguro.

Reenviar el correo de verificación cuando el enlace haya vencido oel usuario no lo haya recibido.

IMPORTANTE

No utilizar Resend ni ningún otro proveedor de correo.

No implementar OAuth.

Utilizar únicamente Gmail + Nodemailer + una contraseña deaplicación (Google App Password).

La solución debe funcionar tanto en desarrollo local como cuando laaplicación se despliegue en Google Cloud.

Mantener la arquitectura actual del proyecto. Solo cambia elproveedor de correo.

Configuración

Variables de entorno

EMAIL_PROVIDER=gmail
GMAIL_USER=tesoreria.colegio@gmail.com
GMAIL_APP_PASSWORD=xxxxxxxxxxxxxxxx
EMAIL_FROM="Tesorería Escolar <tesoreria.colegio@gmail.com>"
FRONTEND_URL=http://localhost:5173

La contraseña debe ser una Google App Password. Nunca utilizar lacontraseña normal de Gmail.

Instalación

npm install nodemailer

No instalar Resend.

Servicio de correo

Crear un servicio reutilizable:

src/
└── modules/
     └── email/
          ├── email.service.ts
          ├── email.templates.ts
          └── email.types.ts

Debe:

Centralizar toda la lógica de envío.

Utilizar Nodemailer.

Leer las credenciales desde variables de entorno.

Manejar errores.

Evitar código duplicado.

Debe exponer:

sendVerificationEmail()

sendPasswordResetEmail()

sendPasswordChangedEmail()

Registro de usuarios

Mantener exactamente el flujo existente:

Usuario se registra ↓ Cuenta pendiente de verificación ↓ Generar tokenseguro ↓ Enviar correo ↓ Usuario verifica el correo ↓ Cuenta activa

Las reglas de seguridad, generación de tokens, expiración, hash,validaciones y almacenamiento permanecen exactamente iguales.

Recuperación de contraseña

Mantener el flujo existente.

El único cambio es que los correos serán enviados mediante Gmail.

Cambio de contraseña

Mantener el comportamiento existente.

Después del cambio enviar un correo de confirmación utilizando Gmail.

Plantillas HTML

Mantener las tres plantillas:

Verificación de correo

Recuperación de contraseña

Confirmación de cambio de contraseña

Conservar el diseño de la aplicación.

Seguridad

No guardar la contraseña de Gmail en el repositorio.

Agregar .env al .gitignore.

Utilizar únicamente variables de entorno.

En producción almacenar GMAIL_APP_PASSWORD como secreto (porejemplo Secret Manager en Google Cloud).

.env.example

EMAIL_PROVIDER=gmail
GMAIL_USER=
GMAIL_APP_PASSWORD=
EMAIL_FROM=
FRONTEND_URL=http://localhost:5173

Resultado esperado

Al finalizar:

Registro de usuarios funcionando.

Verificación de correo mediante Gmail.

Recuperación de contraseña mediante Gmail.

Confirmación de cambio de contraseña mediante Gmail.

Plantillas HTML reutilizables.

Código modular y reutilizable.

Funcionamiento en local.

Compatible con despliegue posterior en Google Cloud sin implementarOAuth.

No romper los flujos actuales de autenticación.

Revisión final

Antes de finalizar:

Revisar la autenticación existente.

Reutilizar servicios y componentes.

Ejecutar pruebas.

Ejecutar el linter.

Corregir errores de TypeScript.

Actualizar README.

Documentar las nuevas variables de entorno.

Informar qué archivos fueron creados o modificados.

Explicar cómo probar el flujo completo en local.
